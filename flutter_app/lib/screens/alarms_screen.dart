import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ble_service.dart';
import '../models/clock_alarm.dart';

class AlarmsScreen extends StatefulWidget {
  const AlarmsScreen({super.key});

  @override
  State<AlarmsScreen> createState() => _AlarmsScreenState();
}

class _AlarmsScreenState extends State<AlarmsScreen> {
  @override
  void initState() {
    super.initState();
    // Al entrar a la pantalla, sincronizar con GET_ALARMS
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ble = context.read<BleService>();
      if (ble.isConnected) {
        ble.sendCommand('GET_ALARMS');
      }
    });
  }

  void _showAlarmEditor(BuildContext context, ClockAlarm alarm) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => _AlarmEditorModal(alarm: alarm),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleService>();
    final alarms = ble.alarms;
    final isConnected = ble.isConnected;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alarmas del Reloj'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Sincronizar alarmas',
            onPressed: isConnected ? () => ble.sendCommand('GET_ALARMS') : null,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          if (!isConnected)
            Card(
              color: theme.colorScheme.surfaceContainerHighest,
              margin: const EdgeInsets.only(bottom: 16),
              child: const Padding(
                padding: EdgeInsets.all(12.0),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text('Conecta el Bluetooth para consultar y editar las alarmas en el hardware.'),
                    ),
                  ],
                ),
              ),
            ),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Alarmas Programadas (Máx. 5)',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              Text(
                '${alarms.where((a) => a.enabled).length} de 5 activas',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
              ),
            ],
          ),
          const SizedBox(height: 12),

          ...alarms.map((alarm) {
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              elevation: alarm.enabled ? 2 : 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: alarm.enabled
                      ? theme.colorScheme.primary.withValues(alpha: 0.3)
                      : theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: isConnected ? () => _showAlarmEditor(context, alarm) : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: alarm.enabled
                            ? theme.colorScheme.primaryContainer
                            : theme.colorScheme.surfaceContainerHighest,
                        child: Text(
                          '${alarm.index + 1}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: alarm.enabled
                                ? theme.colorScheme.primary
                                : theme.colorScheme.outline,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              alarm.formattedTime,
                              style: theme.textTheme.headlineMedium?.copyWith(
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.bold,
                                color: alarm.enabled
                                    ? theme.colorScheme.onSurface
                                    : theme.colorScheme.outline,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              alarm.daysSummary,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: alarm.enabled
                                    ? theme.colorScheme.primary
                                    : theme.colorScheme.outline,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (alarm.label.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                alarm.label,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: theme.colorScheme.outline,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Switch(
                        value: alarm.enabled,
                        onChanged: isConnected
                            ? (val) {
                                ble.toggleAlarm(alarm.index, val);
                              }
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _AlarmEditorModal extends StatefulWidget {
  final ClockAlarm alarm;

  const _AlarmEditorModal({required this.alarm});

  @override
  State<_AlarmEditorModal> createState() => _AlarmEditorModalState();
}

class _AlarmEditorModalState extends State<_AlarmEditorModal> {
  late int _hour;
  late int _minute;
  late int _days;
  late bool _enabled;
  late TextEditingController _labelCtrl;

  static const List<String> _dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  @override
  void initState() {
    super.initState();
    _hour = widget.alarm.hour;
    _minute = widget.alarm.minute;
    _days = widget.alarm.days;
    _enabled = widget.alarm.enabled;
    _labelCtrl = TextEditingController(text: widget.alarm.label);
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: _hour, minute: _minute),
    );
    if (picked != null) {
      setState(() {
        _hour = picked.hour;
        _minute = picked.minute;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ble = context.read<BleService>();
    final theme = Theme.of(context);
    final formattedTime =
        '${_hour.toString().padLeft(2, '0')}:${_minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Editar Alarma ${widget.alarm.index + 1}',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                tooltip: 'Borrar alarma',
                onPressed: () {
                  ble.removeAlarm(widget.alarm.index);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Selector de Hora
          Center(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: _pickTime,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  formattedTime,
                  style: theme.textTheme.displayMedium?.copyWith(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Toca la hora para cambiarla',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
            ),
          ),
          const SizedBox(height: 20),

          // Selector de Días (Bitmask 0-127)
          Text(
            'Repetir en los días:',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (i) {
              final isSelected = (_days & (1 << i)) != 0;
              return FilterChip(
                label: Text(_dayNames[i]),
                selected: isSelected,
                showCheckmark: false,
                onSelected: (val) {
                  setState(() {
                    _days = ClockAlarm.toggleDayInMask(_days, i);
                  });
                },
              );
            }),
          ),
          const SizedBox(height: 16),

          // Nombre opcional
          TextField(
            controller: _labelCtrl,
            decoration: const InputDecoration(
              labelText: 'Nombre / Etiqueta (local en app)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.label_outline),
            ),
          ),
          const SizedBox(height: 16),

          // Switch Activar Alarma
          SwitchListTile(
            title: const Text('Alarma activada'),
            value: _enabled,
            onChanged: (val) => setState(() => _enabled = val),
          ),
          const SizedBox(height: 20),

          // Botón Guardar
          FilledButton.icon(
            icon: const Icon(Icons.check),
            label: const Text('Guardar Alarma en el Reloj'),
            onPressed: () {
              final updated = widget.alarm.copyWith(
                hour: _hour,
                minute: _minute,
                days: _days,
                enabled: _enabled,
                label: _labelCtrl.text.trim(),
              );
              ble.saveAlarm(updated);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }
}
