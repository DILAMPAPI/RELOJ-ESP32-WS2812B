import JSZip from 'jszip';

export interface FlutterFile {
  path: string;
  name: string;
  category: 'core' | 'model' | 'service' | 'screen' | 'config';
  code: string;
  language: 'dart' | 'yaml' | 'xml' | 'markdown';
}

export const FLUTTER_PROJECT_FILES: FlutterFile[] = [
  {
    path: 'pubspec.yaml',
    name: 'pubspec.yaml',
    category: 'config',
    language: 'yaml',
    code: `name: reloj_esp32
description: "App móvil Flutter Material 3 para controlar por BLE un reloj de pared ESP32-C3 con 58 LEDs WS2812B."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_blue_plus: ^2.3.10
  provider: ^6.1.2
  intl: ^0.19.0
  flutter_colorpicker: ^1.1.0
  google_fonts: ^6.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'config',
    language: 'xml',
    code: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.reloj_esp32">

    <!-- Permisos BLE Android 12+ y anteriores -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />

    <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
        android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />

    <application
        android:label="Reloj ESP32"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`,
  },
  {
    path: 'lib/models/clock_status.dart',
    name: 'clock_status.dart',
    category: 'model',
    language: 'dart',
    code: `/// Representa el estado actual del reloj ESP32 recibido por GET_STATUS
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
    final clean = line.replaceFirst(RegExp(r'^STATUS\\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\\s+'));
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

  String get formattedRemaining {
    if (remainingSec == null) return '00:00';
    final h = remainingSec! ~/ 3600;
    final m = (remainingSec! % 3600) ~/ 60;
    final s = remainingSec! % 60;
    if (h > 0) {
      return '\${h.toString().padLeft(2, '0')}:\${m.toString().padLeft(2, '0')}:\${s.toString().padLeft(2, '0')}';
    }
    return '\${m.toString().padLeft(2, '0')}:\${s.toString().padLeft(2, '0')}';
  }
}`,
  },
  {
    path: 'lib/models/clock_config.dart',
    name: 'clock_config.dart',
    category: 'model',
    language: 'dart',
    code: `import 'package:flutter/material.dart';

/// Configuración persistida en el reloj ESP32 (GET_CONFIG):
/// "CONFIG brightness=50 color=255,255,255 format=24"
class ClockConfig {
  final int brightness; // 0 a 255
  final Color color;
  final int timeFormat; // 12 o 24

  const ClockConfig({
    this.brightness = 128,
    this.color = const Color.fromARGB(255, 255, 140, 0),
    this.timeFormat = 24,
  });

  int get r => color.red;
  int get g => color.green;
  int get b => color.blue;

  factory ClockConfig.parse(String line) {
    final clean = line.replaceFirst(RegExp(r'^CONFIG\\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\\s+'));
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
}`,
  },
  {
    path: 'lib/models/clock_alarm.dart',
    name: 'clock_alarm.dart',
    category: 'model',
    language: 'dart',
    code: `/// Representa una alarma del reloj ESP32 (índices 0 a 4)
/// Protocolo: "ALARM idx=0 time=7:30 days=62 enabled=1"
class ClockAlarm {
  final int index;
  final int hour;
  final int minute;
  final int days; // bitmask 0..127 (bit0=Dom...bit6=Sab)
  final bool enabled;
  final String label;

  const ClockAlarm({
    required this.index,
    required this.hour,
    required this.minute,
    required this.days,
    required this.enabled,
    this.label = '',
  });

  factory ClockAlarm.empty(int idx) {
    return ClockAlarm(
      index: idx,
      hour: 7,
      minute: 0,
      days: 0b0111110, // Lun-Vie
      enabled: false,
      label: 'Alarma \${idx + 1}',
    );
  }

  factory ClockAlarm.parse(String line, {String existingLabel = ''}) {
    final clean = line.replaceFirst(RegExp(r'^ALARM\\s+'), '').trim();
    final tokens = clean.split(RegExp(r'\\s+'));
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
      label: existingLabel.isNotEmpty ? existingLabel : 'Alarma \${index + 1}',
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

  bool isDayEnabled(int dayBit) {
    if (dayBit < 0 || dayBit > 6) return false;
    return (days & (1 << dayBit)) != 0;
  }

  static int toggleDayInMask(int currentMask, int dayBit) {
    return currentMask ^ (1 << dayBit);
  }

  String get daysSummary {
    if (days == 0) return 'Una sola vez';
    if (days == 127) return 'Todos los días';
    if (days == 62) return 'Lun a Vie';
    if (days == 65) return 'Fines de semana';

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
    return '\$h:\$m';
  }

  String toAddCommand() {
    return 'ADD_ALARM \$index \$hour \$minute \$days \${enabled ? 1 : 0}';
  }
}`,
  },
  {
    path: 'lib/services/ble_service.dart',
    name: 'ble_service.dart',
    category: 'service',
    language: 'dart',
    code: `import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/clock_status.dart';
import '../models/clock_config.dart';
import '../models/clock_alarm.dart';

enum BleConnectionState {
  disconnected,
  scanning,
  connecting,
  connected,
}

class BleService extends ChangeNotifier {
  static final Guid serviceUuid = Guid('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  static final Guid rxUuid = Guid('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
  static final Guid txUuid = Guid('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  static const String targetDeviceName = 'Reloj ESP32';

  BluetoothDevice? _device;
  BluetoothCharacteristic? _rxCharacteristic;
  BluetoothCharacteristic? _txCharacteristic;

  StreamSubscription<BluetoothConnectionState>? _connectionStateSub;
  StreamSubscription<List<int>>? _txSubscription;
  Timer? _statusPollTimer;

  BleConnectionState _state = BleConnectionState.disconnected;
  BleConnectionState get state => _state;
  bool get isConnected => _state == BleConnectionState.connected;

  String? _lastError;
  String? get lastError => _lastError;

  ClockStatus _status = ClockStatus();
  ClockStatus get status => _status;

  ClockConfig _config = const ClockConfig();
  ClockConfig get config => _config;

  final List<ClockAlarm> _alarms = List.generate(5, (i) => ClockAlarm.empty(i));
  List<ClockAlarm> get alarms => List.unmodifiable(_alarms);

  final List<String> _logs = [];
  List<String> get logs => List.unmodifiable(_logs);

  String _txBuffer = '';

  void _log(String message) {
    final timestamp = DateTime.now().toIso8601String().substring(11, 19);
    final entry = '[\$timestamp] \$message';
    _logs.add(entry);
    if (_logs.length > 100) _logs.removeAt(0);
    notifyListeners();
  }

  Future<void> connect() async {
    try {
      _lastError = null;
      _state = BleConnectionState.scanning;
      notifyListeners();

      BluetoothDevice? foundDevice;
      final scanSub = FlutterBluePlus.scanResults.listen((results) {
        for (final r in results) {
          if (r.device.platformName == targetDeviceName ||
              r.advertisementData.advName == targetDeviceName ||
              r.advertisementData.serviceUuids.contains(serviceUuid)) {
            foundDevice = r.device;
            FlutterBluePlus.stopScan();
            break;
          }
        }
      });

      await FlutterBluePlus.startScan(withServices: [serviceUuid], timeout: const Duration(seconds: 6));
      await FlutterBluePlus.isScanning.where((val) => val == false).first;
      await scanSub.cancel();

      if (foundDevice == null) {
        _handleError('No se encontró el Reloj ESP32 cerca.');
        return;
      }

      await _connectToDevice(foundDevice!);
    } catch (e) {
      _handleError('Error en escaneo BLE: \$e');
    }
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    _state = BleConnectionState.connecting;
    _device = device;
    notifyListeners();

    try {
      await device.connect(timeout: const Duration(seconds: 8));
      final services = await device.discoverServices();
      final nus = services.firstWhere((s) => s.uuid == serviceUuid);
      _rxCharacteristic = nus.characteristics.firstWhere((c) => c.uuid == rxUuid);
      _txCharacteristic = nus.characteristics.firstWhere((c) => c.uuid == txUuid);

      await _txCharacteristic!.setNotifyValue(true);
      _txSubscription = _txCharacteristic!.onValueReceived.listen(_handleIncomingData);

      _state = BleConnectionState.connected;
      notifyListeners();

      // Sincronización obligatoria al conectar
      await syncAll();
      _startStatusPolling();
    } catch (e) {
      _handleError('Fallo al conectar: \$e');
      await disconnect();
    }
  }

  void _handleIncomingData(List<int> bytes) {
    _txBuffer += utf8.decode(bytes, allowMalformed: true);
    while (_txBuffer.contains('\\n')) {
      final idx = _txBuffer.indexOf('\\n');
      final line = _txBuffer.substring(0, idx).replaceAll('\\r', '').trim();
      _txBuffer = _txBuffer.substring(idx + 1);
      if (line.isNotEmpty) _processResponseLine(line);
    }
  }

  void _processResponseLine(String line) {
    _log('RX ← \$line');
    if (line.startsWith('STATUS')) {
      _status = ClockStatus.parse(line);
      notifyListeners();
    } else if (line.startsWith('CONFIG')) {
      _config = ClockConfig.parse(line);
      notifyListeners();
    } else if (line.startsWith('ALARM')) {
      final a = ClockAlarm.parse(line);
      if (a.index >= 0 && a.index < 5) {
        _alarms[a.index] = a;
        notifyListeners();
      }
    } else if (line.startsWith('ERR')) {
      _lastError = line;
      notifyListeners();
    }
  }

  Future<bool> sendCommand(String cmd) async {
    if (!isConnected || _rxCharacteristic == null) return false;
    _log('TX → \$cmd');
    await _rxCharacteristic!.write(utf8.encode('\$cmd\\n'));
    return true;
  }

  Future<void> syncAll() async {
    await sendCommand('GET_STATUS');
    await Future.delayed(const Duration(milliseconds: 80));
    await sendCommand('GET_CONFIG');
    await Future.delayed(const Duration(milliseconds: 80));
    await sendCommand('GET_ALARMS');
  }

  void _startStatusPolling() {
    _statusPollTimer?.cancel();
    _statusPollTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (isConnected) sendCommand('GET_STATUS');
    });
  }

  Future<void> disconnect() async {
    _statusPollTimer?.cancel();
    _txSubscription?.cancel();
    if (_device != null) {
      try { await _device!.disconnect(); } catch (_) {}
    }
    _device = null;
    _state = BleConnectionState.disconnected;
    notifyListeners();
  }

  void _handleError(String msg) {
    _lastError = msg;
    _state = BleConnectionState.disconnected;
    notifyListeners();
  }

  void clearLastError() {
    _lastError = null;
    notifyListeners();
  }

  // Comandos
  Future<bool> setClockTime(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return sendCommand('SET_TIME \$y \$m \$d \$h \$mi \$s');
  }

  Future<bool> setBrightness(int n) => sendCommand('SET_BRIGHTNESS \$n');
  Future<bool> setColor(int r, int g, int b) => sendCommand('SET_COLOR \$r \$g \$b');
  Future<bool> setFormat(int f) => sendCommand('SET_FORMAT \$f');
  Future<bool> saveAlarm(ClockAlarm a) => sendCommand(a.toAddCommand());
  Future<bool> removeAlarm(int idx) => sendCommand('REMOVE_ALARM \$idx');
  Future<bool> toggleAlarm(int idx, bool en) => sendCommand('TOGGLE_ALARM \$idx \${en ? 1 : 0}');
  Future<bool> startTimer(int h, int m, int s) => sendCommand('START_TIMER \$h \$m \$s');
  Future<bool> pauseTimer() => sendCommand('PAUSE_TIMER');
  Future<bool> resumeTimer() => sendCommand('RESUME_TIMER');
  Future<bool> stopTimer() => sendCommand('STOP_TIMER');
  Future<bool> startPomodoro(int w, int b, int r) => sendCommand('START_POMODORO \$w \$b \$r');
  Future<bool> pausePomodoro() => sendCommand('PAUSE_POMODORO');
  Future<bool> resumePomodoro() => sendCommand('RESUME_POMODORO');
  Future<bool> stopPomodoro() => sendCommand('STOP_POMODORO');
  Future<bool> stopAlert() => sendCommand('STOP_ALERT');
  Future<bool> ping() => sendCommand('PING');
}`,
  },
  {
    path: 'lib/main.dart',
    name: 'main.dart',
    category: 'core',
    language: 'dart',
    code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/ble_service.dart';
import 'screens/home_screen.dart';
import 'screens/lighting_screen.dart';
import 'screens/alarms_screen.dart';
import 'screens/timer_screen.dart';
import 'screens/pomodoro_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => BleService(),
      child: const RelojEsp32App(),
    ),
  );
}

class RelojEsp32App extends StatelessWidget {
  const RelojEsp32App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Reloj ESP32',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFF6D00), brightness: Brightness.dark),
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _idx = 0;
  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onNavigateToTab: (i) => setState(() => _idx = i)),
      const LightingScreen(),
      const AlarmsScreen(),
      const TimerScreen(),
      const PomodoroScreen(),
      const SettingsScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _idx, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.palette_outlined), selectedIcon: Icon(Icons.palette), label: 'Luz'),
          NavigationDestination(icon: Icon(Icons.alarm_outlined), selectedIcon: Icon(Icons.alarm), label: 'Alarmas'),
          NavigationDestination(icon: Icon(Icons.timer_outlined), selectedIcon: Icon(Icons.timer), label: 'Timer'),
          NavigationDestination(icon: Icon(Icons.psychology_outlined), selectedIcon: Icon(Icons.psychology), label: 'Pomodoro'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Ajustes'),
        ],
      ),
    );
  }
}`,
  },
];

export async function downloadFlutterZip() {
  const zip = new JSZip();
  const root = zip.folder('reloj_esp32_flutter');

  if (!root) return;

  for (const file of FLUTTER_PROJECT_FILES) {
    root.file(file.path, file.code);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reloj_esp32_flutter_project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
