/* Representa el estado actual del reloj ESP32 recibido por GET_STATUS
   Ejemplos:
   "STATUS mode=CLOCK time=14:05:30 alert=0"
   "STATUS mode=TIMER time=14:05:30 alert=0 remainingSec=45 paused=0"
   "STATUS mode=POMODORO time=14:05:30 alert=0 phase=WORK round=2/4 remainingSec=900 paused=0" */

enum ClockMode {
  clock,
  timer,
  pomodoro;

  static ClockMode fromString(String raw) {
    switch (raw.toUpperCase()) {
      case 'TIMER':
        return ClockMode.timer;
      case 'POMODORO':
        return ClockMode.pomodoro;
      case 'CLOCK':
      default:
        return ClockMode.clock;
    }
  }

  String get label {
    switch (this) {
      case ClockMode.clock:
        return 'Reloj';
      case ClockMode.timer:
        return 'Temporizador';
      case ClockMode.pomodoro:
        return 'Pomodoro';
    }
  }
}

enum PomodoroPhase {
  work,
  breakPhase;

  static PomodoroPhase fromString(String raw) {
    if (raw.toUpperCase() == 'BREAK') {
      return PomodoroPhase.breakPhase;
    }
    return PomodoroPhase.work;
  }

  String get label => this == PomodoroPhase.work ? 'Trabajo' : 'Descanso';
}

class ClockStatus {
  final ClockMode mode;
  final String time; // "14:05:30"
  final bool alert; // Alarma o alerta sonando (parpadeo rojo + buzzer)
  final int? remainingSec;
  final bool isPaused;
  final PomodoroPhase? phase;
  final int? currentRound;
  final int? totalRounds;
  final DateTime receivedAt;

  ClockStatus({
    this.mode = ClockMode.clock,
    this.time = '--:--:--',
    this.alert = false,
    this.remainingSec,
    this.isPaused = false,
    this.phase,
    this.currentRound,
    this.totalRounds,
    DateTime? receivedAt,
  }) : receivedAt = receivedAt ?? DateTime.now();

  factory ClockStatus.parse(String line) {
    // Quitar "STATUS " si viene en el payload
    final clean = line.replaceFirst(RegExp(r'^STATUS\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\s+'));
    final map = <String, String>{};

    for (final token in tokens) {
      final parts = token.split('=');
      if (parts.length == 2) {
        map[parts[0].toLowerCase()] = parts[1];
      }
    }

    final modeStr = map['mode'] ?? 'CLOCK';
    final mode = ClockMode.fromString(modeStr);
    final time = map['time'] ?? '--:--:--';
    final alert = map['alert'] == '1';

    int? remainingSec;
    if (map.containsKey('remainingsec')) {
      remainingSec = int.tryParse(map['remainingsec']!);
    }

    final isPaused = map['paused'] == '1';

    PomodoroPhase? phase;
    if (map.containsKey('phase')) {
      phase = PomodoroPhase.fromString(map['phase']!);
    }

    int? currentRound;
    int? totalRounds;
    if (map.containsKey('round')) {
      final roundParts = map['round']!.split('/');
      if (roundParts.isNotEmpty) {
        currentRound = int.tryParse(roundParts[0]);
      }
      if (roundParts.length > 1) {
        totalRounds = int.tryParse(roundParts[1]);
      }
    }

    return ClockStatus(
      mode: mode,
      time: time,
      alert: alert,
      remainingSec: remainingSec,
      isPaused: isPaused,
      phase: phase,
      currentRound: currentRound,
      totalRounds: totalRounds,
    );
  }

  factory ClockStatus.parseShort(String line) {
    final clean = line.replaceFirst(RegExp(r'^ST\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\s+'));
    
    ClockMode mode = ClockMode.clock;
    String time = '--:--:--';
    bool alert = false;
    int? remainingSec;
    bool isPaused = false;
    PomodoroPhase? phase;
    int? currentRound;
    int? totalRounds;

    if (tokens.isNotEmpty) {
      final modeChar = tokens[0].toUpperCase();
      if (modeChar == 'T') mode = ClockMode.timer;
      else if (modeChar == 'P') mode = ClockMode.pomodoro;
      else mode = ClockMode.clock;
    }
    if (tokens.length > 1) time = tokens[1];
    if (tokens.length > 2) alert = tokens[2] == '1';

    final map = <String, String>{};
    for (int i = 3; i < tokens.length; i++) {
      final parts = tokens[i].split('=');
      if (parts.length == 2) {
        map[parts[0].toLowerCase()] = parts[1];
      }
    }

    if (map.containsKey('rem')) {
      remainingSec = int.tryParse(map['rem']!);
    }
    if (map.containsKey('ps')) {
      isPaused = map['ps'] == '1';
    }
    if (map.containsKey('w')) {
      phase = map['w'] == '1' ? PomodoroPhase.work : PomodoroPhase.breakPhase;
    }
    if (map.containsKey('r')) {
      final roundParts = map['r']!.split('/');
      if (roundParts.isNotEmpty) currentRound = int.tryParse(roundParts[0]);
      if (roundParts.length > 1) totalRounds = int.tryParse(roundParts[1]);
    }

    return ClockStatus(
      mode: mode,
      time: time,
      alert: alert,
      remainingSec: remainingSec,
      isPaused: isPaused,
      phase: phase,
      currentRound: currentRound,
      totalRounds: totalRounds,
    );
  }

  String get formattedRemaining {
    if (remainingSec == null) return '00:00';
    final h = remainingSec! ~/ 3600;
    final m = (remainingSec! % 3600) ~/ 60;
    final s = remainingSec! % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
