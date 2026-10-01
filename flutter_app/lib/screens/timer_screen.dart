import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';
import '../models/clock_status.dart';

class TimerScreen extends StatefulWidget {
  const TimerScreen({super.key});

  @override
  State<TimerScreen> createState() => _TimerScreenState();
}

class _TimerScreenState extends State<TimerScreen> {
  int _hours = 0;
  int _minutes = 5;
  int _seconds = 0;

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final status = ble.status;
    final isConnected = ble.isConnected;
    final isTimerActive = status.mode == ClockMode.timer;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Temporizador'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20.0),
        children: [
          if (!isConnected)
            Card(
              color: theme.colorScheme.surfaceContainerHighest,
              margin: const EdgeInsets.only(bottom: 20),
              child: const Padding(
                padding: EdgeInsets.all(12.0),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text('Conéctate por BLE para controlar el temporizador físico en el reloj.'),
                    ),
                  ],
                ),
              ),
            ),

          // Display Grande del Contador (Sincronizado con remainingSec de GET_STATUS)
          Card(
            elevation: 3,
            color: Colors.black87,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.timer,
                        size: 20,
                        color: isTimerActive ? Colors.orangeAccent : Colors.white54,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isTimerActive ? 'TEMPORIZADOR EN HARDWARE' : 'TEMPORIZADOR EN ESPERA',
                        style: theme.textTheme.labelMedium?.copyWith(
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.bold,
                          color: isTimerActive ? Colors.orangeAccent : Colors.white54,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isTimerActive
                        ? status.formattedRemaining
                        : '${_hours.toString().padLeft(2, '0')}:${_minutes.toString().padLeft(2, '0')}:${_seconds.toString().padLeft(2, '0')}',
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 64,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                      color: isTimerActive
                          ? (status.isPaused ? Colors.amberAccent : Colors.orangeAccent)
                          : Colors.white,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (isTimerActive && status.isPaused)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade900.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.amberAccent),
                      ),
                      child: const Text(
                        'PAUSADO EN RELOJ',
                        style: TextStyle(
                          color: Colors.amberAccent,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    )
                  else if (isTimerActive)
                    const Text(
                      'Sincronizado vía GET_STATUS (1/s)',
                      style: TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Controles de Acción (Iniciar, Pausar, Reanudar, Reiniciar)
          if (isTimerActive) ...[
            Row(
              children: [
                Expanded(
                  child: status.isPaused
                      ? FilledButton.icon(
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          onPressed: isConnected ? () => ble.resumeTimer() : null,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Reanudar'),
                        )
                      : FilledButton.tonalIcon(
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          onPressed: isConnected ? () => ble.pauseTimer() : null,
                          icon: const Icon(Icons.pause),
                          label: const Text('Pausar'),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: isConnected ? () => ble.stopTimer() : null,
                    icon: const Icon(Icons.stop),
                    label: const Text('Detener'),
                  ),
                ),
              ],
            ),
          ] else ...[
            FilledButton.icon(
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: (isConnected && (_hours > 0 || _minutes > 0 || _seconds > 0))
                  ? () => ble.startTimer(_hours, _minutes, _seconds)
                  : null,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Iniciar en Reloj ESP32', style: TextStyle(fontSize: 16)),
            ),
          ],

          const SizedBox(height: 32),

          // Configuración de Tiempo (Horas, Minutos, Segundos)
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Configurar Tiempo',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildTimePickerColumn('Horas', _hours, 23, (val) => setState(() => _hours = val)),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 4),
                          child: Text(':', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                        ),
                        _buildTimePickerColumn('Minutos', _minutes, 59, (val) => setState(() => _minutes = val)),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 4),
                          child: Text(':', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                        ),
                        _buildTimePickerColumn('Segundos', _seconds, 59, (val) => setState(() => _seconds = val)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Preajustes Rápidos:',
                    style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        label: const Text('1 min'),
                        onPressed: () => setState(() {
                          _hours = 0;
                          _minutes = 1;
                          _seconds = 0;
                        }),
                      ),
                      ActionChip(
                        label: const Text('3 min'),
                        onPressed: () => setState(() {
                          _hours = 0;
                          _minutes = 3;
                          _seconds = 0;
                        }),
                      ),
                      ActionChip(
                        label: const Text('5 min'),
                        onPressed: () => setState(() {
                          _hours = 0;
                          _minutes = 5;
                          _seconds = 0;
                        }),
                      ),
                      ActionChip(
                        label: const Text('10 min'),
                        onPressed: () => setState(() {
                          _hours = 0;
                          _minutes = 10;
                          _seconds = 0;
                        }),
                      ),
                      ActionChip(
                        label: const Text('15 min'),
                        onPressed: () => setState(() {
                          _hours = 0;
                          _minutes = 15;
                          _seconds = 0;
                        }),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePickerColumn(String label, int value, int max, Function(int) onChanged) {
    return Column(
      children: [
        IconButton(
          icon: const Icon(Icons.keyboard_arrow_up),
          onPressed: () => onChanged((value + 1) % (max + 1)),
        ),
        Container(
          width: 56,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            value.toString().padLeft(2, '0'),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.keyboard_arrow_down),
          onPressed: () => onChanged((value - 1 < 0) ? max : value - 1),
        ),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
