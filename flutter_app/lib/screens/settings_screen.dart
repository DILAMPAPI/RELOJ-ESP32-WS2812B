import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback? onGoToLighting;

  const SettingsScreen({super.key, this.onGoToLighting});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _customCmdCtrl = TextEditingController();

  @override
  void dispose() {
    _customCmdCtrl.dispose();
    super.dispose();
  }

  void _sendCustomCommand(BleService ble) {
    final cmd = _customCmdCtrl.text.trim();
    if (cmd.isNotEmpty) {
      ble.sendCommand(cmd);
      _customCmdCtrl.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final config = ble.config;
    final isConnected = ble.isConnected;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración del Reloj'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Sincronización de Hora con el Teléfono
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.update, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Ajuste de Hora RTC DS1307',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Envía la fecha y hora exacta de este teléfono al reloj mediante el comando SET_TIME.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: isConnected
                        ? () async {
                            final now = DateTime.now();
                            final ok = await ble.setClockTime(now);
                            if (mounted && ok) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Hora del reloj sincronizada exitosamente'),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          }
                        : null,
                    icon: const Icon(Icons.sync),
                    label: const Text('Sincronizar Hora del Teléfono'),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Formato de Hora (12h vs 24h)
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.schedule, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Formato de Visualización',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Configura si los 58 LEDs muestran la hora en formato 24 horas o 12 horas (AM/PM).',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 14),
                  SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 24, label: Text('24 Horas (14:30)'), icon: Icon(Icons.view_headline)),
                      ButtonSegment(value: 12, label: Text('12 Horas (02:30)'), icon: Icon(Icons.sunny)),
                    ],
                    selected: {config.timeFormat},
                    onSelectionChanged: isConnected
                        ? (newSelection) {
                            ble.setFormat(newSelection.first);
                          }
                        : null,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Información del Hardware y BLE
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.memory, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Información del Reloj ESP32-C3',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow('Dispositivo BLE:', 'Reloj ESP32'),
                  _buildInfoRow('Estado:', isConnected ? 'Conectado' : 'Desconectado'),
                  _buildInfoRow('Hardware:', 'ESP32-C3 SuperMini + DS1307 RTC'),
                  _buildInfoRow('Pantalla:', '58 LEDs WS2812B (4x7-seg + colon)'),
                  _buildInfoRow('Servicio NUS:', '6e400001-b5a3-f393-e0a9-e50e24dcca9e'),
                  _buildInfoRow('RX (Escritura):', '6e400002-b5a3-f393-e0a9-e50e24dcca9e'),
                  _buildInfoRow('TX (Notificación):', '6e400003-b5a3-f393-e0a9-e50e24dcca9e'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: isConnected ? () => ble.ping() : null,
                        icon: const Icon(Icons.network_ping),
                        label: const Text('Enviar PING'),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        onPressed: isConnected ? () => ble.stopAlert() : null,
                        icon: const Icon(Icons.volume_off),
                        label: const Text('STOP_ALERT'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Consola de Depuración BLE (TX/RX)
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.terminal, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Terminal de Comandos BLE',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _customCmdCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Ej: GET_STATUS, GET_CONFIG...',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          onSubmitted: (_) => _sendCustomCommand(ble),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        icon: const Icon(Icons.send),
                        onPressed: isConnected ? () => _sendCustomCommand(ble) : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    height: 150,
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListView.builder(
                      itemCount: ble.logs.length,
                      reverse: true,
                      itemBuilder: (ctx, idx) {
                        final logIndex = ble.logs.length - 1 - idx;
                        final line = ble.logs[logIndex];
                        final isRx = line.contains('RX ←');
                        final isErr = line.contains('ERROR');
                        return Text(
                          line,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: isErr
                                ? Colors.redAccent
                                : (isRx ? Colors.greenAccent : Colors.cyanAccent),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
