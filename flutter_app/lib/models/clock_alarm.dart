/// Representa una alarma del reloj ESP32 (índices 0 a 4, máximo 5)
/// Protocolo:
/// "ALARM idx=0 time=7:30 days=62 enabled=1"
/// days: bitmask 0-127 (bit0=Dom, bit1=Lun, bit2=Mar, bit3=Mie, bit4=Jue, bit5=Vie, bit6=Sab)
/// enabled: 0 o 1
class ClockAlarm {
  final int index; // 0..4
  final int hour; // 0..23
  final int minute; // 0..59
  final int days; // bitmask 0..127
  final bool enabled;
  final String label; // Etiqueta local en la app para conveniencia

  const ClockAlarm({
    required this.index,
    required this.hour,
    required this.minute,
    required this.days,
    required this.enabled,
    this.label = '',
  });

  /// Crea una alarma vacía por defecto para un índice
  factory ClockAlarm.empty(int idx) {
    return ClockAlarm(
      index: idx,
      hour: 7,
      minute: 0,
      days: 62, // Lun-Vie por defecto (0b0111110 = 62)
      enabled: false,
      label: 'Alarma ${idx + 1}',
    );
  }

  factory ClockAlarm.parse(String line, {String existingLabel = ''}) {
    final clean = line.replaceFirst(RegExp(r'^ALARM\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\s+'));
    final map = <String, String>{};

    for (final token in tokens) {
      final parts = token.split('=');
      if (parts.length == 2) {
        map[parts[0].toLowerCase()] = parts[1];
      }
    }

    final index = int.tryParse(map['idx'] ?? '0') ?? 0;

    int hour = 7;
    int minute = 0;
    if (map.containsKey('time')) {
      final timeParts = map['time']!.split(':');
      if (timeParts.length == 2) {
        hour = int.tryParse(timeParts[0]) ?? 7;
        minute = int.tryParse(timeParts[1]) ?? 0;
      }
    }

    final days = int.tryParse(map['days'] ?? '0') ?? 0;
    final enabled = map['enabled'] == '1';

    return ClockAlarm(
      index: index,
      hour: hour,
      minute: minute,
      days: days,
      enabled: enabled,
      label: existingLabel.isNotEmpty ? existingLabel : 'Alarma ${index + 1}',
    );
  }

  ClockAlarm copyWith({
    int? index,
    int? hour,
    int? minute,
    int? days,
    bool? enabled,
    String? label,
  }) {
    return ClockAlarm(
      index: index ?? this.index,
      hour: hour ?? this.hour,
      minute: minute ?? this.minute,
      days: days ?? this.days,
      enabled: enabled ?? this.enabled,
      label: label ?? this.label,
    );
  }

  /// Verifica si el bit de un día está activo (0=Dom, 1=Lun, ..., 6=Sab)
  bool isDayEnabled(int dayBit) {
    if (dayBit < 0 || dayBit > 6) return false;
    return (days & (1 << dayBit)) != 0;
  }

  /// Retorna un nuevo bitmask alternando el día
  static int toggleDayInMask(int currentMask, int dayBit) {
    return currentMask ^ (1 << dayBit);
  }

  /// Cadena legible de los días (ej: "Lun, Mar, Mié", "Todos los días", "Lun a Vie", "Fines de semana")
  String get daysSummary {
    if (days == 0) return 'Una sola vez';
    if (days == 127) return 'Todos los días';
    if (days == 62) return 'Lun a Vie'; // bits 1,2,3,4,5
    if (days == 65) return 'Fines de semana'; // bits 0 y 6 (Dom y Sab)

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    final active = <String>[];
    for (int i = 0; i < 7; i++) {
      if ((days & (1 << i)) != 0) {
        active.add(dayNames[i]);
      }
    }
    return active.join(', ');
  }

  String get formattedTime {
    final h = hour.toString().padLeft(2, '0');
    final m = minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  /// Comando para ADD_ALARM: ADD_ALARM idx HH MM days enabled
  String toAddCommand() {
    return 'ADD_ALARM $index $hour $minute $days ${enabled ? 1 : 0}';
  }
}
