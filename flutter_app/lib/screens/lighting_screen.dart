import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';

class LightingScreen extends StatefulWidget {
  const LightingScreen({super.key});

  @override
  State<LightingScreen> createState() => _LightingScreenState();
}

class _LightingScreenState extends State<LightingScreen> {
  // Colores predefinidos recomendados para LEDs WS2812B
  static const List<Color> _presetColors = [
    Color(0xFFFF8C00), // Ámbar / Naranja cálido clásico
    Color(0xFFFF1744), // Rojo vivo
    Color(0xFF00E676), // Verde esmeralda
    Color(0xFF2979FF), // Azul eléctrico
    Color(0xFF00E5FF), // Cian neón
    Color(0xFFFFD600), // Amarillo cálido
    Color(0xFFD500F9), // Magenta / Púrpura
    Color(0xFFFFFFFF), // Blanco frío
    Color(0xFFFFE0B2), // Blanco cálido
    Color(0xFFFF4081), // Rosa fuerte
  ];

  @override
  void initState() {
    super.initState();
    // Al entrar a la pantalla, pedir GET_CONFIG para precargar valores reales
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ble = context.read<BleService>();
      if (ble.isConnected) {
        ble.sendCommand('GET_CONFIG');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final config = ble.config;
    final isConnected = ble.isConnected;
    final theme = Theme.of(context);

    final brightnessPercent = (config.brightness * 100 / 255).round();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Iluminación WS2812B'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar configuración',
            onPressed: isConnected ? () => ble.sendCommand('GET_CONFIG') : null,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          if (!isConnected)
            Card(
              color: theme.colorScheme.surfaceContainerHighest,
              child: const Padding(
                padding: EdgeInsets.all(12.0),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text('Conéctate por BLE para aplicar cambios de iluminación al reloj físico.'),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),

          // Simulación de Vista Previa de los 58 LEDs
          Card(
            elevation: 3,
            color: Colors.black87,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
              child: Column(
                children: [
                  Text(
                    'VISTA PREVIA DE LOS 58 LEDs',
                    style: theme.textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.5,
                      color: Colors.white54,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: config.color.withValues(alpha: (config.brightness / 255.0) * 0.4),
                          blurRadius: 24,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildSegmentDigit('1', config.color, config.brightness),
                        _buildSegmentDigit('2', config.color, config.brightness),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Column(
                            children: [
                              _buildLedDot(config.color, config.brightness),
                              const SizedBox(height: 12),
                              _buildLedDot(config.color, config.brightness),
                            ],
                          ),
                        ),
                        _buildSegmentDigit('3', config.color, config.brightness),
                        _buildSegmentDigit('0', config.color, config.brightness),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Color RGB(${config.r}, ${config.g}, ${config.b}) · Brillo: $brightnessPercent%',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Control de Brillo (0-255)
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.brightness_6, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            'Brillo General',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Text(
                        '$brightnessPercent% (${config.brightness}/255)',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Slider(
                    value: config.brightness.toDouble(),
                    min: 0,
                    max: 255,
                    divisions: 255,
                    onChanged: isConnected
                        ? (val) {
                            ble.setBrightness(val.round());
                          }
                        : null,
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: isConnected ? () => ble.setBrightness(25) : null,
                        child: const Text('10% (Noche)'),
                      ),
                      TextButton(
                        onPressed: isConnected ? () => ble.setBrightness(128) : null,
                        child: const Text('50% (Medio)'),
                      ),
                      TextButton(
                        onPressed: isConnected ? () => ble.setBrightness(255) : null,
                        child: const Text('100% (Día)'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Selector de Color
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.color_lens, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Paleta de Colores',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: _presetColors.map((color) {
                      final isSelected = config.color.toARGB32() == color.toARGB32();
                      return GestureDetector(
                        onTap: isConnected
                            ? () => ble.setColor(
                                  (color.r * 255.0).round().clamp(0, 255),
                                  (color.g * 255.0).round().clamp(0, 255),
                                  (color.b * 255.0).round().clamp(0, 255),
                                )
                            : null,
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected ? Colors.white : Colors.black26,
                              width: isSelected ? 3 : 1,
                            ),
                            boxShadow: [
                              if (isSelected)
                                BoxShadow(
                                  color: color.withValues(alpha: 0.6),
                                  blurRadius: 10,
                                  spreadRadius: 1,
                                ),
                            ],
                          ),
                          child: isSelected
                              ? Icon(
                                  Icons.check,
                                  color: color.computeLuminance() > 0.5 ? Colors.black : Colors.white,
                                )
                              : null,
                        ),
                      );
                    }).toList(),
                  ),
                  const Divider(height: 32),

                  // Ajuste fino RGB personalizado
                  Text(
                    'Ajuste Fino de Canales RGB',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _buildRgbSlider('Rojo (R)', config.r, Colors.red, (val) {
                    ble.setColor(val, config.g, config.b);
                  }, isConnected),
                  _buildRgbSlider('Verde (G)', config.g, Colors.green, (val) {
                    ble.setColor(config.r, val, config.b);
                  }, isConnected),
                  _buildRgbSlider('Azul (B)', config.b, Colors.blue, (val) {
                    ble.setColor(config.r, config.g, val);
                  }, isConnected),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRgbSlider(String label, int value, Color accent, Function(int) onChanged, bool enabled) {
    return Row(
      children: [
        SizedBox(width: 80, child: Text(label, style: const TextStyle(fontSize: 12))),
        Expanded(
          child: Slider(
            value: value.toDouble(),
            min: 0,
            max: 255,
            activeColor: accent,
            onChanged: enabled ? (v) => onChanged(v.round()) : null,
          ),
        ),
        SizedBox(
          width: 38,
          child: Text(
            '$value',
            textAlign: TextAlign.end,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildSegmentDigit(String char, Color color, int brightness) {
    return Text(
      char,
      style: TextStyle(
        fontFamily: 'monospace',
        fontSize: 48,
        fontWeight: FontWeight.w900,
        color: color.withValues(alpha: (brightness / 255.0).clamp(0.2, 1.0)),
      ),
    );
  }

  Widget _buildLedDot(Color color, int brightness) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color.withValues(alpha: (brightness / 255.0).clamp(0.2, 1.0)),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.5),
            blurRadius: 4,
          ),
        ],
      ),
    );
  }
}
