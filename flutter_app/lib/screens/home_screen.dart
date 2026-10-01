import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';
import '../models/clock_status.dart';

class HomeScreen extends StatelessWidget {
  final Function(int)? onNavigateToTab;

  const HomeScreen({super.key, this.onNavigateToTab});

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final status = ble.status;
    final isConnected = ble.isConnected;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reloj ESP32'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sincronizar reloj',
            onPressed: isConnected ? () => ble.syncAll() : null,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          if (isConnected) {
            await ble.syncAll();
          } else {
            await ble.connect();
          }
        },
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Banner de Alerta / Alarma Activa
            if (status.alert) ...[
              Card(
                color: theme.colorScheme.errorContainer,
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 36, color: theme.colorScheme.onErrorContainer),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '¡ALARMA ACTIVA!',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.onErrorContainer,
                              ),
                            ),
                            Text(
                              'El reloj está emitiendo sonido y parpadeo rojo.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onErrorContainer,
                              ),
                            ),
                          ],
                        ),
                      ),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: theme.colorScheme.error,
                          foregroundColor: theme.colorScheme.onError,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        onPressed: () => ble.stopAlert(),
                        icon: const Icon(Icons.stop, size: 18),
                        label: const Text('DETENER'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Tarjeta de Estado de Conexión BLE
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: isConnected
                              ? theme.colorScheme.primaryContainer
                              : theme.colorScheme.surfaceContainerHighest,
                          child: Icon(
                            isConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                            color: isConnected ? theme.colorScheme.primary : theme.colorScheme.outline,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isConnected ? 'Conectado a Reloj ESP32' : 'Reloj Desconectado',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              Text(
                                isConnected
                                    ? 'Sincronizado vía BLE Nordic UART'
                                    : (ble.state == BleConnectionState.scanning
                                        ? 'Buscando dispositivo...'
                                        : 'Pulsa para buscar y conectar'),
                                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
                              ),
                            ],
                          ),
                        ),
                        if (ble.state == BleConnectionState.scanning ||
                            ble.state == BleConnectionState.connecting)
                          const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        else
                          FilledButton.tonal(
                            onPressed: () {
                              if (isConnected) {
                                ble.disconnect();
                              } else {
                                ble.connect();
                              }
                            },
                            child: Text(isConnected ? 'Desconectar' : 'Conectar'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Reloj Principal Digital
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.surfaceContainerHigh,
                      theme.colorScheme.surfaceContainer,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.access_time_filled, size: 18, color: theme.colorScheme.primary),
                        const SizedBox(width: 8),
                        Text(
                          'HORA REAL DEL RELOJ',
                          style: theme.textTheme.labelMedium?.copyWith(
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isConnected ? status.time : '--:--:--',
                      style: theme.textTheme.displayLarge?.copyWith(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        letterSpacing: 4,
                        color: isConnected
                            ? ble.config.color
                            : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.tune, size: 16),
                          label: Text('Brillo: ${(ble.config.brightness * 100 ~/ 255)}%'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.schedule, size: 16),
                          label: Text('Modo: ${status.mode.label}'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Widget de Estado Activo si está en Temporizador o Pomodoro
            if (status.mode != ClockMode.clock) ...[
              Card(
                elevation: 2,
                color: status.mode == ClockMode.pomodoro && status.phase == PomodoroPhase.breakPhase
                    ? Colors.green.shade900.withValues(alpha: 0.3)
                    : theme.colorScheme.secondaryContainer,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                status.mode == ClockMode.pomodoro ? Icons.hourglass_top : Icons.timer,
                                color: theme.colorScheme.onSecondaryContainer,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                status.mode == ClockMode.pomodoro
                                    ? 'POMODORO (${status.phase?.label.toUpperCase()})'
                                    : 'TEMPORIZADOR ACTIVO',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: theme.colorScheme.onSecondaryContainer,
                                ),
                              ),
                            ],
                          ),
                          if (status.isPaused)
                            Chip(
                              backgroundColor: Colors.amber.shade700,
                              label: const Text('PAUSADO', style: TextStyle(color: Colors.white, fontSize: 11)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        status.formattedRemaining,
                        style: theme.textTheme.displayMedium?.copyWith(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onSecondaryContainer,
                        ),
                      ),
                      if (status.mode == ClockMode.pomodoro && status.currentRound != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Ronda ${status.currentRound} de ${status.totalRounds ?? 4}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSecondaryContainer,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (status.isPaused)
                            FilledButton.icon(
                              onPressed: () {
                                if (status.mode == ClockMode.pomodoro) {
                                  ble.resumePomodoro();
                                } else {
                                  ble.resumeTimer();
                                }
                              },
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Reanudar'),
                            )
                          else
                            FilledButton.tonalIcon(
                              onPressed: () {
                                if (status.mode == ClockMode.pomodoro) {
                                  ble.pausePomodoro();
                                } else {
                                  ble.pauseTimer();
                                }
                              },
                              icon: const Icon(Icons.pause),
                              label: const Text('Pausar'),
                            ),
                          const SizedBox(width: 12),
                          OutlinedButton.icon(
                            onPressed: () {
                              if (status.mode == ClockMode.pomodoro) {
                                ble.stopPomodoro();
                              } else {
                                ble.stopTimer();
                              }
                            },
                            icon: const Icon(Icons.stop),
                            label: const Text('Detener'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Accesos Rápidos a las secciones
            Text(
              'Accesos Rápidos',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.4,
              children: [
                _buildQuickCard(
                  context,
                  icon: Icons.palette_outlined,
                  title: 'Iluminación',
                  subtitle: 'Color y brillo de LEDs',
                  tabIndex: 1,
                ),
                _buildQuickCard(
                  context,
                  icon: Icons.alarm,
                  title: 'Alarmas',
                  subtitle: '${ble.alarms.where((a) => a.enabled).length} activas (de 5)',
                  tabIndex: 2,
                ),
                _buildQuickCard(
                  context,
                  icon: Icons.timer_outlined,
                  title: 'Temporizador',
                  subtitle: 'Cuenta regresiva',
                  tabIndex: 3,
                ),
                _buildQuickCard(
                  context,
                  icon: Icons.psychology_outlined,
                  title: 'Pomodoro',
                  subtitle: 'Bloques de enfoque',
                  tabIndex: 4,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required int tabIndex,
  }) {
    final theme = Theme.of(context);
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          if (onNavigateToTab != null) {
            onNavigateToTab!(tabIndex);
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: theme.colorScheme.primary, size: 28),
              const Spacer(),
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
