# Reloj ESP32 — App Móvil Flutter (Material 3)

App móvil desarrollada en **Flutter (Dart)** con **Material 3** para controlar de manera remota mediante **Bluetooth Low Energy (BLE)** un reloj de pared físico basado en el microcontrolador **ESP32-C3 SuperMini**, con módulo **RTC DS1307**, **58 LEDs WS2812B** (4 dígitos de 7 segmentos de 2 LEDs cada uno + 2 LEDs de dos puntos centrales) y zumbador buzzer.

---

## 📱 Estructura del Proyecto

```text
flutter_app/
├── pubspec.yaml
├── android/
│   └── app/src/main/AndroidManifest.xml   # Permisos BLE Android 12+ (BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
├── ios/
│   └── Runner/Info.plist                  # Permisos BLE iOS (NSBluetoothAlwaysUsageDescription)
└── lib/
    ├── main.dart                          # Punto de entrada, configuración Material 3 y NavigationBar
    ├── models/
    │   ├── clock_status.dart              # Parser de 'STATUS mode=... time=... alert=... remainingSec=...'
    │   ├── clock_config.dart              # Parser de 'CONFIG brightness=... color=... format=...'
    │   └── clock_alarm.dart               # Parser de 'ALARM idx=... time=... days=... enabled=...' (bitmask 0-127)
    ├── services/
    │   └── ble_service.dart               # Cliente Nordic UART Service (NUS), reconexión, cola TX y sondeo 1/s
    └── screens/
        ├── home_screen.dart               # Pantalla 1: Hora en vivo, estado BLE, banner de alerta, accesos
        ├── lighting_screen.dart           # Pantalla 2: Slider 0-255, paleta WS2812B, RGB y vista previa
        ├── alarms_screen.dart             # Pantalla 3: Lista 5 alarmas, bitmask de días, editor y toggle
        ├── timer_screen.dart              # Pantalla 4: Temporizador sincronizado con remainingSec de GET_STATUS
        ├── pomodoro_screen.dart           # Pantalla 5: Trabajo vs Descanso (LEDs verdes), rondas y cuenta regresiva
        └── settings_screen.dart           # Pantalla 6: Formato 12/24h, SET_TIME teléfono, consola de comandos BLE
```

---

## ⚡ Protocolo de Comunicación BLE (Firmware ESP32-C3)

- **Nombre BLE**: `Reloj ESP32`
- **Servicio**: Nordic UART Service (NUS)
  - **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
  - **RX (Escritura, App → ESP32)**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
  - **TX (Notificación, ESP32 → App)**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

### Comandos Soportados:

| Comando | Parámetros | Respuesta / Descripción |
|---|---|---|
| `SET_TIME` | `aaaa mm dd HH MM SS` | Sincroniza fecha y hora RTC |
| `SET_BRIGHTNESS` | `n` (0-255) | Ajusta brillo global de los 58 LEDs |
| `SET_COLOR` | `r g b` (0-255) | Ajusta color de dígitos en modo reloj |
| `SET_FORMAT` | `12` ó `24` | Formato horario en el display |
| `GET_CONFIG` | — | `CONFIG brightness=50 color=255,255,255 format=24` |
| `ADD_ALARM` | `idx HH MM days enabled` | Registra alarma (0-4), days bitmask 0-127 |
| `REMOVE_ALARM` | `idx` (0-4) | Elimina la alarma del índice |
| `TOGGLE_ALARM` | `idx 0\|1` | Activa o desactiva la alarma |
| `GET_ALARMS` | — | Devuelve 5 líneas: `ALARM idx=0 time=7:30 days=62 enabled=1` |
| `START_TIMER` | `h m s` | Inicia cuenta regresiva en el hardware |
| `PAUSE_TIMER` | — | Pausa temporizador |
| `RESUME_TIMER` | — | Reanuda temporizador |
| `STOP_TIMER` | — | Detiene y reinicia temporizador |
| `START_POMODORO` | `workMin breakMin rounds` | Inicia ciclo Pomodoro |
| `PAUSE_POMODORO` | — | Pausa ciclo Pomodoro |
| `RESUME_POMODORO` | — | Reanuda ciclo Pomodoro |
| `STOP_POMODORO` | — | Detiene ciclo Pomodoro |
| `STOP_ALERT` | — | Silencia buzzer y apaga parpadeo rojo |
| `PING` | — | `PONG` |
| `GET_STATUS` | — | `STATUS mode=... time=... alert=... remainingSec=...` |

---

## 🚀 Cómo Ejecutar en Android / iOS

1. Asegúrate de tener instalado Flutter 3.x y el SDK de Android:
   ```bash
   flutter doctor
   ```
2. Instalar dependencias:
   ```bash
   flutter pub get
   ```
3. Conectar el teléfono por USB o iniciar el emulador:
   ```bash
   flutter run
   ```
