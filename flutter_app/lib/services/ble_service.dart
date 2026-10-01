import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
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
  // UUIDs oficiales Nordic UART Service (NUS)
  static final Guid serviceUuid = Guid('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  static final Guid rxUuid = Guid('6e400002-b5a3-f393-e0a9-e50e24dcca9e'); // Write (App -> ESP32)
  static final Guid txUuid = Guid('6e400003-b5a3-f393-e0a9-e50e24dcca9e'); // Notify (ESP32 -> App)
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

  // Estado sincronizado del reloj
  ClockStatus _status = ClockStatus();
  ClockStatus get status => _status;

  ClockConfig _config = const ClockConfig();
  ClockConfig get config => _config;

  // 5 slots de alarma (0..4)
  final List<ClockAlarm> _alarms = List.generate(5, (i) => ClockAlarm.empty(i));
  List<ClockAlarm> get alarms => List.unmodifiable(_alarms);

  // Registro de logs / depuración BLE
  final List<String> _logs = [];
  List<String> get logs => List.unmodifiable(_logs);

  String _txBuffer = '';

  void _log(String message) {
    final timestamp = DateTime.now().toIso8601String().substring(11, 19);
    final entry = '[$timestamp] $message';
    _logs.add(entry);
    if (_logs.length > 100) _logs.removeAt(0);
    debugPrint(entry);
    notifyListeners();
  }

  /// Inicia el escaneo y conexión automática al "Reloj ESP32"
  Future<void> connect() async {
    if (_state == BleConnectionState.connecting || _state == BleConnectionState.connected) {
      return;
    }

    try {
      _lastError = null;
      _setState(BleConnectionState.scanning);
      _log('Iniciando escaneo BLE buscando "$targetDeviceName"...');

      // Verificar que el adaptador bluetooth esté disponible y encendido
      final isSupported = await FlutterBluePlus.isSupported;
      if (!isSupported) {
        _handleError('Bluetooth no soportado en este dispositivo');
        return;
      }

      final adapterState = await FlutterBluePlus.adapterState.first;
      if (adapterState != BluetoothAdapterState.on) {
        _handleError('Bluetooth apagado. Por favor encienda el Bluetooth.');
        return;
      }

      BluetoothDevice? foundDevice;

      // Escuchar resultados de escaneo
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

      // Escanear por 6 segundos filtrando por servicio
      await FlutterBluePlus.startScan(
        withServices: [serviceUuid],
        timeout: const Duration(seconds: 6),
      );

      await FlutterBluePlus.isScanning.where((val) => val == false).first;
      await scanSub.cancel();

      if (foundDevice == null) {
        // Segundo intento: buscar por nombre si no anunció UUID directamente
        final allResults = FlutterBluePlus.lastScanResults;
        for (final r in allResults) {
          if (r.device.platformName.contains('ESP32') || r.device.platformName == targetDeviceName) {
            foundDevice = r.device;
            break;
          }
        }
      }

      if (foundDevice == null) {
        _handleError('No se encontró el "$targetDeviceName". Asegúrate de que esté encendido y cerca.');
        return;
      }

      await _connectToDevice(foundDevice!);
    } catch (e) {
      _handleError('Error en escaneo BLE: $e');
    }
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    _setState(BleConnectionState.connecting);
    _device = device;
    _log('Conectando a ${device.platformName} (${device.remoteId})...');

    _connectionStateSub?.cancel();
    _connectionStateSub = device.connectionState.listen((state) {
      if (state == BluetoothConnectionState.disconnected) {
        _log('Dispositivo desconectado');
        _onDisconnected();
      }
    });

    try {
      await device.connect(timeout: const Duration(seconds: 8), autoConnect: false, license: License.nonprofit);
      _log('Conectado. Descubriendo servicios Nordic UART...');

      final services = await device.discoverServices();
      BluetoothService? nusService;

      for (final s in services) {
        if (s.uuid == serviceUuid) {
          nusService = s;
          break;
        }
      }

      if (nusService == null) {
        _handleError('Servicio Nordic UART no encontrado en el ESP32');
        await device.disconnect();
        return;
      }

      for (final c in nusService.characteristics) {
        if (c.uuid == rxUuid) {
          _rxCharacteristic = c;
        } else if (c.uuid == txUuid) {
          _txCharacteristic = c;
        }
      }

      if (_rxCharacteristic == null || _txCharacteristic == null) {
        _handleError('Características RX/TX no encontradas en el firmware');
        await device.disconnect();
        return;
      }

      // Suscribirse a notificaciones TX (ESP32 -> App)
      await _txCharacteristic!.setNotifyValue(true);
      _txSubscription?.cancel();
      _txSubscription = _txCharacteristic!.onValueReceived.listen(_handleIncomingData);

      _setState(BleConnectionState.connected);
      _log('BLE listo. Sincronizando estado inicial con el reloj...');

      // Secuencia inicial obligatoria: GET_STATUS, GET_CONFIG, GET_ALARMS
      await syncAll();

      // Iniciar sondeo periódico de estado (~1 vez por segundo)
      _startStatusPolling();
    } catch (e) {
      _handleError('Fallo al conectar con el ESP32: $e');
      await disconnect();
    }
  }

  void _handleIncomingData(List<int> bytes) {
    final text = utf8.decode(bytes, allowMalformed: true);
    _txBuffer += text;

    // Procesar líneas completas delimitadas por \n o \r\n
    while (_txBuffer.contains('\n')) {
      final idx = _txBuffer.indexOf('\n');
      final line = _txBuffer.substring(0, idx).replaceAll('\r', '').trim();
      _txBuffer = _txBuffer.substring(idx + 1);

      if (line.isNotEmpty) {
        _processResponseLine(line);
      }
    }
  }

  void _processResponseLine(String line) {
    _log('RX ← $line');

    if (line.startsWith('STATUS')) {
      _status = ClockStatus.parse(line);
      notifyListeners();
    } else if (line.startsWith('CONFIG')) {
      _config = ClockConfig.parse(line);
      notifyListeners();
    } else if (line.startsWith('ALARM')) {
      final parsed = ClockAlarm.parse(line);
      if (parsed.index >= 0 && parsed.index < 5) {
        final existingLabel = _alarms[parsed.index].label;
        _alarms[parsed.index] = ClockAlarm.parse(line, existingLabel: existingLabel);
        notifyListeners();
      }
    } else if (line.startsWith('OK')) {
      // Confirmación exitosa de comando
    } else if (line.startsWith('ERR')) {
      final reason = line.replaceFirst(RegExp(r'^ERR\s*'), '');
      _lastError = _translateError(reason);
      notifyListeners();
    } else if (line == 'PONG') {
      _log('Latido PONG recibido del ESP32');
    }
  }

  String _translateError(String rawReason) {
    switch (rawReason.toUpperCase().trim()) {
      case 'INVALID_ARGS':
        return 'Argumentos inválidos en el comando';
      case 'OUT_OF_RANGE':
        return 'Valor fuera de rango permitido';
      case 'UNKNOWN_CMD':
        return 'Comando no reconocido por el reloj';
      default:
        return 'Error del reloj: $rawReason';
    }
  }

  /// Envía comando en texto plano terminado en salto de línea
  Future<bool> sendCommand(String command) async {
    if (!isConnected || _rxCharacteristic == null) {
      _lastError = 'No hay conexión BLE con el reloj';
      notifyListeners();
      return false;
    }

    try {
      _log('TX → $command');
      final data = utf8.encode('$command\n');
      await _rxCharacteristic!.write(data, withoutResponse: false);
      return true;
    } catch (e) {
      _log('Error al enviar comando: $e');
      _lastError = 'Error de transmisión BLE: $e';
      notifyListeners();
      return false;
    }
  }

  /// Sincroniza estado completo del reloj: STATUS, CONFIG y ALARMS
  Future<void> syncAll() async {
    await sendCommand('GET_STATUS');
    await Future.delayed(const Duration(milliseconds: 100));
    await sendCommand('GET_CONFIG');
    await Future.delayed(const Duration(milliseconds: 100));
    await sendCommand('GET_ALARMS');
  }

  void _startStatusPolling() {
    _statusPollTimer?.cancel();
    _statusPollTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (isConnected) {
        sendCommand('GET_STATUS');
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> disconnect() async {
    _statusPollTimer?.cancel();
    _statusPollTimer = null;
    _txSubscription?.cancel();
    _txSubscription = null;
    _connectionStateSub?.cancel();
    _connectionStateSub = null;

    if (_device != null) {
      try {
        await _device!.disconnect();
      } catch (_) {}
      _device = null;
    }
    _rxCharacteristic = null;
    _txCharacteristic = null;
    _onDisconnected();
  }

  void _onDisconnected() {
    _setState(BleConnectionState.disconnected);
    _statusPollTimer?.cancel();
    _statusPollTimer = null;
  }

  void _setState(BleConnectionState newState) {
    _state = newState;
    notifyListeners();
  }

  void _handleError(String message) {
    _lastError = message;
    _log('ERROR: $message');
    _setState(BleConnectionState.disconnected);
  }

  void clearLastError() {
    _lastError = null;
    notifyListeners();
  }

  // -------------------------------------------------------------
  // Comandos de Alto Nivel
  // -------------------------------------------------------------

  /// SET_TIME aaaa mm dd HH MM SS
  Future<bool> setClockTime(DateTime dt) {
    final year = dt.year.toString().padLeft(4, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final day = dt.day.toString().padLeft(2, '0');
    final hour = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    final sec = dt.second.toString().padLeft(2, '0');
    return sendCommand('SET_TIME $year $month $day $hour $min $sec');
  }

  /// SET_BRIGHTNESS n (0-255)
  Future<bool> setBrightness(int n) {
    final clamped = n.clamp(0, 255);
    _config = _config.copyWith(brightness: clamped);
    notifyListeners();
    return sendCommand('SET_BRIGHTNESS $clamped');
  }

  /// SET_COLOR r g b (0-255 cada uno)
  Future<bool> setColor(int r, int g, int b) {
    final cr = r.clamp(0, 255);
    final cg = g.clamp(0, 255);
    final cb = b.clamp(0, 255);
    _config = _config.copyWith(color: Color.fromARGB(255, cr, cg, cb));
    notifyListeners();
    return sendCommand('SET_COLOR $cr $cg $cb');
  }

  /// SET_FORMAT 12|24
  Future<bool> setFormat(int format) {
    final f = (format == 12) ? 12 : 24;
    _config = _config.copyWith(timeFormat: f);
    notifyListeners();
    return sendCommand('SET_FORMAT $f');
  }

  /// SET_ALERT_DURATIONS alarmSec timerSec pomoTransSec pomoFinSec
  Future<bool> setAlertDurations(int alarmSec, int timerSec, int pomoTransSec, int pomoFinSec) {
    _config = _config.copyWith(
      alarmDurationSec: alarmSec,
      timerAlertDurationSec: timerSec,
      pomoTransitionAlertSec: pomoTransSec,
      pomoFinishedAlertSec: pomoFinSec,
    );
    notifyListeners();
    return sendCommand('SET_ALERT_DURATIONS $alarmSec $timerSec $pomoTransSec $pomoFinSec');
  }

  /// ADD_ALARM idx HH MM days enabled
  Future<bool> saveAlarm(ClockAlarm alarm) {
    if (alarm.index >= 0 && alarm.index < 5) {
      _alarms[alarm.index] = alarm;
      notifyListeners();
    }
    return sendCommand(alarm.toAddCommand());
  }

  /// REMOVE_ALARM idx
  Future<bool> removeAlarm(int idx) {
    if (idx >= 0 && idx < 5) {
      _alarms[idx] = ClockAlarm.empty(idx);
      notifyListeners();
    }
    return sendCommand('REMOVE_ALARM $idx');
  }

  /// TOGGLE_ALARM idx 0|1
  Future<bool> toggleAlarm(int idx, bool enabled) {
    if (idx >= 0 && idx < 5) {
      _alarms[idx] = _alarms[idx].copyWith(enabled: enabled);
      notifyListeners();
    }
    return sendCommand('TOGGLE_ALARM $idx ${enabled ? 1 : 0}');
  }

  /// START_TIMER h m s
  Future<bool> startTimer(int h, int m, int s) => sendCommand('START_TIMER $h $m $s');
  Future<bool> pauseTimer() => sendCommand('PAUSE_TIMER');
  Future<bool> resumeTimer() => sendCommand('RESUME_TIMER');
  Future<bool> stopTimer() => sendCommand('STOP_TIMER');

  /// START_POMODORO workMin breakMin rounds
  Future<bool> startPomodoro(int workMin, int breakMin, int rounds) =>
      sendCommand('START_POMODORO $workMin $breakMin $rounds');
  Future<bool> pausePomodoro() => sendCommand('PAUSE_POMODORO');
  Future<bool> resumePomodoro() => sendCommand('RESUME_POMODORO');
  Future<bool> stopPomodoro() => sendCommand('STOP_POMODORO');

  /// STOP_ALERT (apaga manualmente alarma o alerta que esté sonando)
  Future<bool> stopAlert() => sendCommand('STOP_ALERT');

  /// PING -> responde PONG
  Future<bool> ping() => sendCommand('PING');

  @override
  void dispose() {
    _statusPollTimer?.cancel();
    _txSubscription?.cancel();
    _connectionStateSub?.cancel();
    super.dispose();
  }
}
