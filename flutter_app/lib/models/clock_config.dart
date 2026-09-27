import 'package:flutter/material.dart';

/// Configuración persistida en el reloj ESP32 recibida por GET_CONFIG:
/// "CONFIG brightness=50 color=255,255,255 format=24"
class ClockConfig {
  final int brightness; // 0 a 255
  final Color color;
  final int timeFormat; // 12 o 24

  const ClockConfig({
    this.brightness = 128,
    this.color = const Color.fromARGB(255, 255, 140, 0), // Naranja cálido por defecto
    this.timeFormat = 24,
  });

  int get r => color.red;
  int get g => color.green;
  int get b => color.blue;

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

    return ClockConfig(
      brightness: brightness,
      color: color,
      timeFormat: timeFormat,
    );
  }

  ClockConfig copyWith({
    int? brightness,
    Color? color,
    int? timeFormat,
  }) {
    return ClockConfig(
      brightness: brightness ?? this.brightness,
      color: color ?? this.color,
      timeFormat: timeFormat ?? this.timeFormat,
    );
  }
}
