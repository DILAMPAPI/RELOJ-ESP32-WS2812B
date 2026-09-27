import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';
import '../models/clock_status.dart';

class PomodoroScreen extends StatefulWidget {
  const PomodoroScreen({super.key});

  @override
  State<PomodoroScreen> createState() => _PomodoroScreenState();
}

class _PomodoroScreenState extends State<PomodoroScreen> {
  int _workMin = 25;
  int _breakMin = 5;
  int _rounds = 4;

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final status = ble.status;
    final isConnected = ble.isConnected;
    final isPomodoroActive = status.mode == ClockMode.pomodoro;
    final isBreak = isPomodoroActive && status.phase == PomodoroPhase.breakPhase;
    final theme = Theme.of(context);

    // Color temático: Verde para Descanso (como en los LEDs físicos del firmware), Naranja/Rojo para Trabajo
    final phaseColor = isBreak ? const Color(0xFF00E676) : const Color(0xFFFF5722);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Método Pomodoro'),
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
                      child: Text('Conecta por BLE para sincronizar y correr Pomodoro en el hardware ESP32.'),
                    ),
                  ],
                ),
              ),
            ),

          // Tarjeta Principal de Pomodoro con distinción Trabajo vs Descanso (verde en descanso como los LEDs físicos)
          Card(
            elevation: 4,
            color: Colors.black87,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(
                color: isPomodoroActive ? phaseColor : Colors.transparent,
                width: 2,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: phaseColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: phaseColor.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isBreak ? Icons.coffee : Icons.psychology,
                          size: 18,
                          color: phaseColor,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isPomodoroActive
                              ? (isBreak ? 'FASE: DESCANSO (LEDS VERDES)' : 'FASE: TRABAJO ENFOCADO')
                              : 'POMODORO DETENIDO',
                          style: TextStyle(
                            color: phaseColor,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    isPomodoroActive
                        ? status.formattedRemaining
                        : '${_workMin.toString().padLeft(2, '0')}:00',
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 64,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                      color: phaseColor,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (isPomodoroActive) ...[
                    Text(
                      'Ronda ${status.currentRound ?? 1} de ${status.totalRounds ?? _rounds}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (status.isPaused)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade900,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'PAUSADO EN RELOJ',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ] else
                    Text(
                      'Ciclo: $_workMin min trabajo / $_breakMin min descanso ($_rounds rondas)',
                      style: const TextStyle(color: Colors.white60, fontSize: 13),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Botones de Acción
          if (isPomodoroActive) ...[
            Row(
              children: [
                Expanded(
                  child: status.isPaused
                      ? FilledButton.icon(
                          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                          onPressed: isConnected ? () => ble.resumePomodoro() : null,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Reanudar'),
                        )
                      : FilledButton.tonalIcon(
                          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                          onPressed: isConnected ? () => ble.pausePomodoro() : null,
                          icon: const Icon(Icons.pause),
                          label: const Text('Pausar'),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                    onPressed: isConnected ? () => ble.stopPomodoro() : null,
                    icon: const Icon(Icons.stop),
                    label: const Text('Reiniciar'),
                  ),
                ),
              ],
            ),
          ] else ...[
            FilledButton.icon(
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                backgroundColor: phaseColor,
              ),
              onPressed: isConnected ? () => ble.startPomodoro(_workMin, _breakMin, _rounds) : null,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Iniciar Pomodoro en Reloj', style: TextStyle(fontSize: 16)),
            ),
          ],

          const SizedBox(height: 32),

          // Configurador de Pomodoro
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Parámetros del Ciclo',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),

                  // Tiempo de Trabajo
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tiempo de Trabajo:'),
                      Text(
                        '$_workMin minutos',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Slider(
                    value: _workMin.toDouble(),
                    min: 5,
                    max: 60,
                    divisions: 11,
                    onChanged: (val) => setState(() => _workMin = val.round()),
                  ),

                  const SizedBox(height: 8),

                  // Tiempo de Descanso
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tiempo de Descanso:'),
                      Text(
                        '$_breakMin minutos',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Slider(
                    value: _breakMin.toDouble(),
                    min: 1,
                    max: 30,
                    divisions: 29,
                    onChanged: (val) => setState(() => _breakMin = val.round()),
                  ),

                  const SizedBox(height: 8),

                  // Número de Rondas
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Número de Rondas:'),
                      Text(
                        '$_rounds rondas',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Slider(
                    value: _rounds.toDouble(),
                    min: 1,
                    max: 8,
                    divisions: 7,
                    onChanged: (val) => setState(() => _rounds = val.round()),
                  ),

                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  Text(
                    'Preajustes Clásicos:',
                    style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        label: const Text('25/5 min (Clásico)'),
                        onPressed: () => setState(() {
                          _workMin = 25;
                          _breakMin = 5;
                          _rounds = 4;
                        }),
                      ),
                      ActionChip(
                        label: const Text('50/10 min (Extendido)'),
                        onPressed: () => setState(() {
                          _workMin = 50;
                          _breakMin = 10;
                          _rounds = 4;
                        }),
                      ),
                      ActionChip(
                        label: const Text('15/3 min (Rápido)'),
                        onPressed: () => setState(() {
                          _workMin = 15;
                          _breakMin = 3;
                          _rounds = 3;
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
}
