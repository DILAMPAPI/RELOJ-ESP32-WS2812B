import 'package:flutter/material.dart';

/// Configuración persistida en el reloj ESP32 recibida por GET_CONFIG:
/// "CONFIG brightness=50 color=255,255,255 format=24 alarmDurationSec=60 timerAlertDurationSec=30 pomoTransitionAlertSec=5 pomoFinishedAlertSec=30"
class ClockConfig {
  final int brightness; // 0 a 255
  final Color color;
  final int timeFormat; // 12 o 24
  final int alarmDurationSec;
  final int timerAlertDurationSec;
  final int pomoTransitionAlertSec;
  final int pomoFinishedAlertSec;

  const ClockConfig({
    this.brightness = 128,
    this.color = const Color.fromARGB(255, 255, 140, 0), // Naranja cálido por defecto
    this.timeFormat = 24,
    this.alarmDurationSec = 60,
    this.timerAlertDurationSec = 30,
    this.pomoTransitionAlertSec = 5,
    this.pomoFinishedAlertSec = 30,
  });

  int get r => (color.r * 255.0).round().clamp(0, 255);
  int get g => (color.g * 255.0).round().clamp(0, 255);
  int get b => (color.b * 255.0).round().clamp(0, 255);

  factory ClockConfig.parse(String line) {
    // Quitar prefijo "CONFIG "
    final clean = line.replaceFirst(RegExp(r'^CONFIG\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\s+'));
    final map = <String, String>{};

    for (final token in tokens) {
      final parts = token.split('=');
      if (parts.length == 2) {
        map[parts[0].toLowerCase()] = parts[1];
      }
    }

    int brightness = 128;
    if (map.containsKey('brightness')) {
      brightness = (int.tryParse(map['brightness']!) ?? 128).clamp(0, 255);
    }

    Color color = const Color(0xFFFF8C00);
    if (map.containsKey('color')) {
      final rgb = map['color']!.split(',');
      if (rgb.length == 3) {
        final r = (int.tryParse(rgb[0]) ?? 255).clamp(0, 255);
        final g = (int.tryParse(rgb[1]) ?? 140).clamp(0, 255);
        final b = (int.tryParse(rgb[2]) ?? 0).clamp(0, 255);
        color = Color.fromARGB(255, r, g, b);
      }
    }

    int timeFormat = 24;
    if (map.containsKey('format')) {
      final f = int.tryParse(map['format']!) ?? 24;
      timeFormat = (f == 12) ? 12 : 24;
    }

    int alarmDurationSec = 60;
    if (map.containsKey('alarmdurationsec') || map.containsKey('alarm_sec') || map.containsKey('alarmdur')) {
      alarmDurationSec = int.tryParse(map['alarmdurationsec'] ?? map['alarm_sec'] ?? map['alarmdur'] ?? '60') ?? 60;
    }

    int timerAlertDurationSec = 30;
    if (map.containsKey('timeralertdurationsec') || map.containsKey('timer_sec') || map.containsKey('timerdur')) {
      timerAlertDurationSec = int.tryParse(map['timeralertdurationsec'] ?? map['timer_sec'] ?? map['timerdur'] ?? '30') ?? 30;
    }

    int pomoTransitionAlertSec = 5;
    if (map.containsKey('pomotransitionalertsec') || map.containsKey('pomo_trans_sec') || map.containsKey('pomotransdur')) {
      pomoTransitionAlertSec = int.tryParse(map['pomotransitionalertsec'] ?? map['pomo_trans_sec'] ?? map['pomotransdur'] ?? '5') ?? 5;
    }

    int pomoFinishedAlertSec = 30;
    if (map.containsKey('pomofinishedalertsec') || map.containsKey('pomo_fin_sec') || map.containsKey('pomofindur')) {
      pomoFinishedAlertSec = int.tryParse(map['pomofinishedalertsec'] ?? map['pomo_fin_sec'] ?? map['pomofindur'] ?? '30') ?? 30;
    }

    return ClockConfig(
      brightness: brightness,
      color: color,
      timeFormat: timeFormat,
      alarmDurationSec: alarmDurationSec,
      timerAlertDurationSec: timerAlertDurationSec,
      pomoTransitionAlertSec: pomoTransitionAlertSec,
      pomoFinishedAlertSec: pomoFinishedAlertSec,
    );
  }

  ClockConfig copyWith({
    int? brightness,
    Color? color,
    int? timeFormat,
    int? alarmDurationSec,
    int? timerAlertDurationSec,
    int? pomoTransitionAlertSec,
    int? pomoFinishedAlertSec,
  }) {
    return ClockConfig(
      brightness: brightness ?? this.brightness,
      color: color ?? this.color,
      timeFormat: timeFormat ?? this.timeFormat,
      alarmDurationSec: alarmDurationSec ?? this.alarmDurationSec,
      timerAlertDurationSec: timerAlertDurationSec ?? this.timerAlertDurationSec,
      pomoTransitionAlertSec: pomoTransitionAlertSec ?? this.pomoTransitionAlertSec,
      pomoFinishedAlertSec: pomoFinishedAlertSec ?? this.pomoFinishedAlertSec,
    );
  }
}
