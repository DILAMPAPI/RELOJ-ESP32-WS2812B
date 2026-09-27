#include <Wire.h>
#include <RTClib.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>

#include <NimBLEDevice.h>
// Requiere instalar la librería "NimBLE-Arduino" (de h2zero) desde
// el Gestor de Librerías del IDE de Arduino. Es mucho más liviana
// en RAM que la pila BLE "clásica" (Bluedroid) y es la opción
// recomendada para el ESP32-C3, especialmente combinada con
// WS2812B (menos probabilidad de que el refresco de LEDs tumbe
// la conexión BLE).

// =========================
// PINES
// =========================

#define LED_PIN 5

#define SDA_PIN 8
#define SCL_PIN 9

#define BUZZER_PIN 10

#define NUM_LEDS 58

// =========================
// BLE (Nordic UART Service)
// =========================
// UUIDs estándar de "Nordic UART Service" (NUS): los reconocen
// apps genéricas como nRF Connect o Serial Bluetooth Terminal,
// mostrando una consola de texto lista para usar sin configurar
// nada del lado del teléfono.

#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E" // teléfono -> ESP32
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E" // ESP32 -> teléfono

const char* BLE_DEVICE_NAME = "Reloj ESP32";

// =========================
// OBJETOS DE HARDWARE
// =========================

Adafruit_NeoPixel strip(
  NUM_LEDS,
  LED_PIN,
  NEO_GRB + NEO_KHZ800
);

RTC_DS1307 rtc;
Preferences preferences;

// =========================
// CONFIGURACIÓN DISPLAY (mapa de segmentos)
// =========================

const int LEDS_PER_SEGMENT = 2;
const int CENTER_LEDS = 2;

// Orden físico de segmentos:
// [g, B, a, f, E, d, c]

const int segmentMap[10][7] = {

  // g  B  a  f  E  d  c

  {0, 1, 1, 1, 1, 1, 1}, // 0
  {0, 1, 0, 0, 0, 0, 1}, // 1
  {1, 1, 1, 0, 1, 1, 0}, // 2
  {1, 1, 1, 0, 0, 1, 1}, // 3
  {1, 1, 0, 1, 0, 0, 1}, // 4
  {1, 0, 1, 1, 0, 1, 1}, // 5
  {1, 0, 1, 1, 1, 1, 1}, // 6
  {0, 1, 1, 0, 0, 0, 1}, // 7
  {1, 1, 1, 1, 1, 1, 1}, // 8
  {1, 1, 1, 1, 0, 1, 1}  // 9
};

// =========================================================
// TIPOS PROPIOS (structs / enums)
// TODOS antes que cualquier función (evita el bug de
// auto-prototipado del IDE de Arduino con tipos propios).
// =========================================================

struct Config {
  uint8_t brightness;
  uint8_t red;
  uint8_t green;
  uint8_t blue;
  bool format24h;
};

struct Alarm {
  uint8_t hour;
  uint8_t minute;
  uint8_t days;     // bitmask: bit0=Domingo ... bit6=Sábado (DateTime::dayOfTheWeek())
  bool enabled;
};

enum TimerState {
  TIMER_IDLE,
  TIMER_RUNNING,
  TIMER_PAUSED,
  TIMER_FINISHED
};

enum PomodoroPhase {
  POMO_IDLE,
  POMO_WORK,
  POMO_BREAK,
  POMO_FINISHED
};

// =========================================================
// VARIABLES GLOBALES
// =========================================================

const char* PREFS_NAMESPACE = "reloj";

// --- Configuración ---
Config config = {
  50, 255, 255, 255, true
};

// --- Alarmas ---
const int MAX_ALARMS = 5;
const unsigned long ALARM_ALERT_DURATION_MS = 60000;
Alarm alarms[MAX_ALARMS];
int lastAlarmCheckMinute = -1;

// --- Alerta genérica (parpadeo + buzzer) ---
bool alertRinging = false;
unsigned long alertStartTime = 0;
unsigned long alertDurationMs = 60000;
unsigned long lastBlinkToggle = 0;
const unsigned long BLINK_INTERVAL_MS = 500;
bool blinkState = false;

// --- Temporizador simple ---
TimerState timerState = TIMER_IDLE;
unsigned long timerRemainingMs = 0;
unsigned long timerLastTick = 0;
const unsigned long TIMER_ALERT_DURATION_MS = 30000;

// --- Pomodoro ---
PomodoroPhase pomodoroPhase = POMO_IDLE;
bool pomodoroPaused = false;
uint8_t pomodoroCurrentRound = 0;
uint8_t pomodoroTotalRounds = 4;
uint16_t pomodoroWorkMinutes = 25;
uint16_t pomodoroBreakMinutes = 5;
unsigned long pomodoroRemainingMs = 0;
unsigned long pomodoroLastTick = 0;
const unsigned long POMODORO_TRANSITION_ALERT_MS = 5000;
const unsigned long POMODORO_FINISHED_ALERT_MS = 30000;

// --- Reloj / refresco de pantalla ---
const unsigned long CLOCK_UPDATE_INTERVAL_MS = 200;
unsigned long lastClockCheck = 0;
int lastDisplayedSecond = -1;
long lastDisplayedCountdownSecond = -1;
bool lastFormat24h = true;

// --- BLE ---
NimBLECharacteristic *bleTxCharacteristic = nullptr;
bool bleClientConnected = false;

// =========================================================
// FUNCIONES
// =========================================================

// ---- Configuración ----

void loadConfig() {

  preferences.begin(PREFS_NAMESPACE, true);

  config.brightness = preferences.getUChar("brightness", config.brightness);
  config.red         = preferences.getUChar("red", config.red);
  config.green       = preferences.getUChar("green", config.green);
  config.blue        = preferences.getUChar("blue", config.blue);
  config.format24h   = preferences.getBool("format24h", config.format24h);

  preferences.end();

  Serial.println("Configuración cargada desde NVS.");
}

void saveConfig() {

  preferences.begin(PREFS_NAMESPACE, false);

  preferences.putUChar("brightness", config.brightness);
  preferences.putUChar("red", config.red);
  preferences.putUChar("green", config.green);
  preferences.putUChar("blue", config.blue);
  preferences.putBool("format24h", config.format24h);

  preferences.end();

  Serial.println("Configuración guardada en NVS.");
}

void applyConfigToHardware() {
  strip.setBrightness(config.brightness);
}

int displayHour(int hour24) {

  if (config.format24h) {
    return hour24;
  }

  int hour12 = hour24 % 12;

  if (hour12 == 0) {
    hour12 = 12;
  }

  return hour12;
}

// ---- Alerta genérica (parpadeo + buzzer) ----

uint32_t alertColor() {
  return strip.Color(255, 0, 0);
}

void startAlert(unsigned long durationMs) {

  alertRinging = true;
  alertStartTime = millis();
  alertDurationMs = durationMs;
  lastBlinkToggle = 0;
  blinkState = false;
}

void stopAlert() {

  alertRinging = false;

  digitalWrite(BUZZER_PIN, LOW);

  lastDisplayedSecond = -1;
  lastDisplayedCountdownSecond = -1;
}

void updateAlert() {

  if (!alertRinging) {
    return;
  }

  unsigned long now = millis();

  if (now - alertStartTime >= alertDurationMs) {
    stopAlert();
    return;
  }

  if (now - lastBlinkToggle >= BLINK_INTERVAL_MS) {

    lastBlinkToggle = now;
    blinkState = !blinkState;

    if (blinkState) {

      for (int i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, alertColor());
      }
      strip.show();

      digitalWrite(BUZZER_PIN, HIGH);

    } else {

      strip.clear();
      strip.show();

      digitalWrite(BUZZER_PIN, LOW);
    }
  }
}

// ---- Alarmas ----

void setAlarmDefaults() {
  for (int i = 0; i < MAX_ALARMS; i++) {
    alarms[i].hour = 0;
    alarms[i].minute = 0;
    alarms[i].days = 0;
    alarms[i].enabled = false;
  }
}

void loadAlarms() {

  setAlarmDefaults();

  preferences.begin(PREFS_NAMESPACE, true);

  for (int i = 0; i < MAX_ALARMS; i++) {

    String prefix = "al" + String(i) + "_";

    alarms[i].hour    = preferences.getUChar((prefix + "h").c_str(), alarms[i].hour);
    alarms[i].minute  = preferences.getUChar((prefix + "m").c_str(), alarms[i].minute);
    alarms[i].days    = preferences.getUChar((prefix + "d").c_str(), alarms[i].days);
    alarms[i].enabled = preferences.getBool((prefix + "e").c_str(), alarms[i].enabled);
  }

  preferences.end();

  Serial.println("Alarmas cargadas desde NVS.");
}

void saveAlarms() {

  preferences.begin(PREFS_NAMESPACE, false);

  for (int i = 0; i < MAX_ALARMS; i++) {

    String prefix = "al" + String(i) + "_";

    preferences.putUChar((prefix + "h").c_str(), alarms[i].hour);
    preferences.putUChar((prefix + "m").c_str(), alarms[i].minute);
    preferences.putUChar((prefix + "d").c_str(), alarms[i].days);
    preferences.putBool((prefix + "e").c_str(), alarms[i].enabled);
  }

  preferences.end();

  Serial.println("Alarmas guardadas en NVS.");
}

void checkAlarms(const DateTime &now) {

  if (alertRinging) {
    return;
  }

  if (now.minute() == lastAlarmCheckMinute) {
    return;
  }

  lastAlarmCheckMinute = now.minute();

  uint8_t dow = now.dayOfTheWeek();

  for (int i = 0; i < MAX_ALARMS; i++) {

    if (!alarms[i].enabled) continue;

    bool activeToday = (alarms[i].days >> dow) & 0x01;
    if (!activeToday) continue;

    if (alarms[i].hour == now.hour() && alarms[i].minute == now.minute()) {
      startAlert(ALARM_ALERT_DURATION_MS);
      Serial.printf("¡Alarma %d activada!\n", i);
      break;
    }
  }
}

// ---- Pomodoro ----

void timerReset(); // se usa en pomodoroStart(); definida más abajo

void pomodoroReset() {
  pomodoroPhase = POMO_IDLE;
  pomodoroPaused = false;
  pomodoroRemainingMs = 0;
  pomodoroCurrentRound = 0;
}

void pomodoroStart(uint16_t workMin, uint16_t breakMin, uint8_t rounds) {

  timerReset();

  pomodoroWorkMinutes = workMin;
  pomodoroBreakMinutes = breakMin;
  pomodoroTotalRounds = (rounds > 0) ? rounds : 1;
  pomodoroCurrentRound = 1;
  pomodoroPhase = POMO_WORK;
  pomodoroPaused = false;
  pomodoroRemainingMs = (unsigned long)workMin * 60UL * 1000UL;
  pomodoroLastTick = millis();

  lastDisplayedCountdownSecond = -1;

  Serial.printf(
    "Pomodoro iniciado: %d min trabajo / %d min descanso, %d rondas\n",
    workMin, breakMin, pomodoroTotalRounds
  );
}

void pomodoroPause() {
  if (pomodoroPhase == POMO_WORK || pomodoroPhase == POMO_BREAK) {
    pomodoroPaused = true;
  }
}

void pomodoroResume() {
  if (pomodoroPaused) {
    pomodoroPaused = false;
    pomodoroLastTick = millis();
  }
}

void updatePomodoro() {

  if (pomodoroPhase != POMO_WORK && pomodoroPhase != POMO_BREAK) {
    return;
  }

  if (pomodoroPaused) {
    pomodoroLastTick = millis();
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - pomodoroLastTick;
  pomodoroLastTick = now;

  if (elapsed < pomodoroRemainingMs) {
    pomodoroRemainingMs -= elapsed;
    return;
  }

  pomodoroRemainingMs = 0;

  if (pomodoroPhase == POMO_WORK) {

    if (pomodoroCurrentRound >= pomodoroTotalRounds) {
      pomodoroPhase = POMO_FINISHED;
      Serial.println("¡Pomodoro completo!");
      startAlert(POMODORO_FINISHED_ALERT_MS);
      return;
    }

    pomodoroPhase = POMO_BREAK;
    pomodoroRemainingMs = (unsigned long)pomodoroBreakMinutes * 60UL * 1000UL;
    Serial.printf("Ronda %d: descanso\n", pomodoroCurrentRound);
    startAlert(POMODORO_TRANSITION_ALERT_MS);

  } else {

    pomodoroCurrentRound++;
    pomodoroPhase = POMO_WORK;
    pomodoroRemainingMs = (unsigned long)pomodoroWorkMinutes * 60UL * 1000UL;
    Serial.printf("Ronda %d: trabajo\n", pomodoroCurrentRound);
    startAlert(POMODORO_TRANSITION_ALERT_MS);
  }

  lastDisplayedCountdownSecond = -1;
}

// ---- Temporizador simple ----

void timerStart(uint8_t h, uint8_t m, uint8_t s) {

  pomodoroReset();

  uint32_t totalSeconds = (uint32_t)h * 3600UL + (uint32_t)m * 60UL + s;

  timerRemainingMs = totalSeconds * 1000UL;
  timerState = (totalSeconds > 0) ? TIMER_RUNNING : TIMER_IDLE;
  timerLastTick = millis();

  lastDisplayedCountdownSecond = -1;
}

void timerPause() {
  if (timerState == TIMER_RUNNING) {
    timerState = TIMER_PAUSED;
  }
}

void timerResume() {
  if (timerState == TIMER_PAUSED) {
    timerState = TIMER_RUNNING;
    timerLastTick = millis();
  }
}

void timerReset() {
  timerState = TIMER_IDLE;
  timerRemainingMs = 0;
}

void updateTimer() {

  if (timerState != TIMER_RUNNING) {
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - timerLastTick;
  timerLastTick = now;

  if (elapsed >= timerRemainingMs) {

    timerRemainingMs = 0;
    timerState = TIMER_FINISHED;

    Serial.println("¡Temporizador terminado!");
    startAlert(TIMER_ALERT_DURATION_MS);

  } else {
    timerRemainingMs -= elapsed;
  }
}

// ---- Dibujo en LEDs ----

void displayDigit(int digit, int position, uint32_t color) {

  int baseIndex = position * 14;

  if (position >= 2) {
    baseIndex += CENTER_LEDS;
  }

  for (int seg = 0; seg < 7; seg++) {

    for (int led = 0; led < LEDS_PER_SEGMENT; led++) {

      int pixel = baseIndex + seg * LEDS_PER_SEGMENT + led;

      if (segmentMap[digit][seg]) {
        strip.setPixelColor(pixel, color);
      } else {
        strip.setPixelColor(pixel, 0);
      }
    }
  }
}

void displayTime(int hour24, int minute) {

  strip.clear();

  uint32_t color = strip.Color(config.red, config.green, config.blue);

  int hourToShow = displayHour(hour24);

  displayDigit(hourToShow / 10, 0, color);
  displayDigit(hourToShow % 10, 1, color);

  int centerIndex = 2 * 14;

  strip.setPixelColor(centerIndex, strip.Color(255, 255, 255));
  strip.setPixelColor(centerIndex + 1, strip.Color(255, 255, 255));

  displayDigit(minute / 10, 2, color);
  displayDigit(minute % 10, 3, color);

  strip.show();
}

void displayCountdown(unsigned long remainingMs, uint32_t color) {

  strip.clear();

  unsigned long remainingSeconds = (remainingMs + 999) / 1000;

  int totalMinutes = (remainingSeconds / 60) % 100;
  int seconds = remainingSeconds % 60;

  displayDigit(totalMinutes / 10, 0, color);
  displayDigit(totalMinutes % 10, 1, color);

  int centerIndex = 2 * 14;

  strip.setPixelColor(centerIndex, strip.Color(255, 255, 255));
  strip.setPixelColor(centerIndex + 1, strip.Color(255, 255, 255));

  displayDigit(seconds / 10, 2, color);
  displayDigit(seconds % 10, 3, color);

  strip.show();
}

void refreshDisplay(const DateTime &now) {

  if (alertRinging) {
    return;
  }

  if (pomodoroPhase == POMO_WORK || pomodoroPhase == POMO_BREAK) {

    long remainingSeconds = (pomodoroRemainingMs + 999) / 1000;

    if (remainingSeconds != lastDisplayedCountdownSecond) {

      lastDisplayedCountdownSecond = remainingSeconds;

      uint32_t color = (pomodoroPhase == POMO_WORK)
        ? strip.Color(config.red, config.green, config.blue)
        : strip.Color(0, 255, 0);

      displayCountdown(pomodoroRemainingMs, color);
    }

    return;
  }

  if (timerState == TIMER_RUNNING || timerState == TIMER_PAUSED) {

    long remainingSeconds = (timerRemainingMs + 999) / 1000;

    if (remainingSeconds != lastDisplayedCountdownSecond) {

      lastDisplayedCountdownSecond = remainingSeconds;

      uint32_t color = strip.Color(config.red, config.green, config.blue);
      displayCountdown(timerRemainingMs, color);
    }

    return;
  }

  int hour = now.hour();
  int minute = now.minute();
  int second = now.second();

  bool formatChanged = (config.format24h != lastFormat24h);

  if (second != lastDisplayedSecond || formatChanged) {

    lastDisplayedSecond = second;
    lastFormat24h = config.format24h;

    displayTime(hour, minute);
  }
}

// ---- Reloj (lee el RTC y dispara alarmas + refresco) ----

void updateClock() {

  unsigned long now = millis();

  if (now - lastClockCheck < CLOCK_UPDATE_INTERVAL_MS) {
    return;
  }

  lastClockCheck = now;

  DateTime current = rtc.now();

  checkAlarms(current);
  refreshDisplay(current);
}

// ---- Envío de respuestas (Serie + BLE a la vez) ----

void sendResponse(const String &msg) {

  Serial.println(msg);

  if (bleClientConnected && bleTxCharacteristic != nullptr) {
    bleTxCharacteristic->setValue(msg.c_str());
    bleTxCharacteristic->notify();
  }
}

// ---- Respuestas de estado (para GET_CONFIG / GET_ALARMS / GET_STATUS) ----

void sendConfigStatus() {

  String msg = "CONFIG brightness=" + String(config.brightness) +
               " color=" + String(config.red) + "," + String(config.green) + "," + String(config.blue) +
               " format=" + String(config.format24h ? 24 : 12);

  sendResponse(msg);
}

void sendAlarmsStatus() {

  for (int i = 0; i < MAX_ALARMS; i++) {

    String msg = "ALARM idx=" + String(i) +
                 " time=" + String(alarms[i].hour) + ":" + String(alarms[i].minute) +
                 " days=" + String(alarms[i].days) +
                 " enabled=" + String(alarms[i].enabled ? 1 : 0);

    sendResponse(msg);
  }
}

// Da un resumen de qué está pasando ahora mismo en el reloj.
// Importante porque BLE no "recuerda" nada entre conexiones: cada
// vez que la app se conecta necesita preguntar esto para saber si
// hay un temporizador o Pomodoro corriendo, o una alerta sonando.
void sendFullStatus() {

  DateTime now = rtc.now();

  String mode;
  String extra = "";

  if (pomodoroPhase == POMO_WORK || pomodoroPhase == POMO_BREAK) {

    mode = "POMODORO";
    extra = " phase=" + String(pomodoroPhase == POMO_WORK ? "WORK" : "BREAK") +
            " round=" + String(pomodoroCurrentRound) + "/" + String(pomodoroTotalRounds) +
            " remainingSec=" + String((pomodoroRemainingMs + 999) / 1000) +
            " paused=" + String(pomodoroPaused ? 1 : 0);

  } else if (timerState == TIMER_RUNNING || timerState == TIMER_PAUSED) {

    mode = "TIMER";
    extra = " remainingSec=" + String((timerRemainingMs + 999) / 1000) +
            " paused=" + String(timerState == TIMER_PAUSED ? 1 : 0);

  } else {
    mode = "CLOCK";
  }

  char timeBuf[9];
  snprintf(timeBuf, sizeof(timeBuf), "%02d:%02d:%02d", now.hour(), now.minute(), now.second());

  String msg = "STATUS mode=" + mode + " time=" + String(timeBuf) +
               " alert=" + String(alertRinging ? 1 : 0) + extra;

  sendResponse(msg);
}

// ---- Procesamiento de comandos (compartido por Serie y BLE) ----
// Protocolo definitivo (paso 9 de la hoja de ruta). Formato de
// texto plano: "COMANDO arg1 arg2 ..." desde la app; el ESP32
// responde "OK ..." / "ERR <motivo>" o, para los GET_*, una línea
// informativa (CONFIG/ALARM/STATUS).
//
// Reloj:      SET_TIME aaaa mm dd HH MM SS
// Config:     SET_BRIGHTNESS n | SET_COLOR r g b | SET_FORMAT 12|24 | GET_CONFIG
// Alarmas:    ADD_ALARM idx HH MM days enabled | REMOVE_ALARM idx | TOGGLE_ALARM idx 0|1 | GET_ALARMS
// Temporiz.:  START_TIMER h m s | PAUSE_TIMER | RESUME_TIMER | STOP_TIMER
// Pomodoro:   START_POMODORO workMin breakMin rounds | PAUSE_POMODORO | RESUME_POMODORO | STOP_POMODORO
// Alertas:    STOP_ALERT
// General:    PING | GET_STATUS

void processCommand(String line) {

  line.trim();

  if (line.length() == 0) {
    return;
  }

  Serial.print("Comando recibido: ");
  Serial.println(line);

  // --- Reloj ---

  if (line.startsWith("SET_TIME")) {

    int yr = 2026, mo = 1, day = 1, hh = 0, mm = 0, ss = 0;
    int parsed = sscanf(line.c_str(), "SET_TIME %d %d %d %d %d %d", &yr, &mo, &day, &hh, &mm, &ss);

    if (parsed != 6) {
      sendResponse("ERR SET_TIME formato: SET_TIME aaaa mm dd HH MM SS");
      return;
    }

    rtc.adjust(DateTime(yr, mo, day, hh, mm, ss));
    sendResponse("OK SET_TIME");

  // --- Configuración ---

  } else if (line.startsWith("SET_BRIGHTNESS")) {

    int n = -1;
    sscanf(line.c_str(), "SET_BRIGHTNESS %d", &n);

    if (n < 0 || n > 255) {
      sendResponse("ERR SET_BRIGHTNESS fuera de rango (0-255)");
      return;
    }

    config.brightness = (uint8_t)n;
    applyConfigToHardware();
    saveConfig();

    sendResponse("OK SET_BRIGHTNESS " + String(n));

  } else if (line.startsWith("SET_COLOR")) {

    int r = -1, g = -1, b = -1;
    int parsed = sscanf(line.c_str(), "SET_COLOR %d %d %d", &r, &g, &b);

    if (parsed != 3 || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      sendResponse("ERR SET_COLOR formato: SET_COLOR r g b (0-255 cada uno)");
      return;
    }

    config.red = (uint8_t)r;
    config.green = (uint8_t)g;
    config.blue = (uint8_t)b;
    saveConfig();

    lastDisplayedSecond = -1; // redibuja ya con el nuevo color
    lastDisplayedCountdownSecond = -1;

    sendResponse("OK SET_COLOR " + String(r) + " " + String(g) + " " + String(b));

  } else if (line.startsWith("SET_FORMAT")) {

    int fmt = -1;
    sscanf(line.c_str(), "SET_FORMAT %d", &fmt);

    if (fmt != 12 && fmt != 24) {
      sendResponse("ERR SET_FORMAT debe ser 12 o 24");
      return;
    }

    config.format24h = (fmt == 24);
    saveConfig();

    sendResponse("OK SET_FORMAT " + String(fmt));

  } else if (line == "GET_CONFIG") {

    sendConfigStatus();
    sendResponse("OK GET_CONFIG");

  // --- Alarmas ---

  } else if (line.startsWith("ADD_ALARM")) {

    int idx = -1, hh = 0, mm = 0, days = 0, enabled = 1;
    int parsed = sscanf(line.c_str(), "ADD_ALARM %d %d %d %d %d", &idx, &hh, &mm, &days, &enabled);

    if (parsed != 5 || idx < 0 || idx >= MAX_ALARMS) {
      sendResponse("ERR ADD_ALARM formato: ADD_ALARM idx HH MM days enabled (idx 0-" + String(MAX_ALARMS - 1) + ")");
      return;
    }

    alarms[idx].hour = (uint8_t)hh;
    alarms[idx].minute = (uint8_t)mm;
    alarms[idx].days = (uint8_t)days;
    alarms[idx].enabled = (enabled != 0);
    saveAlarms();

    sendResponse("OK ADD_ALARM " + String(idx));

  } else if (line.startsWith("REMOVE_ALARM")) {

    int idx = -1;
    sscanf(line.c_str(), "REMOVE_ALARM %d", &idx);

    if (idx < 0 || idx >= MAX_ALARMS) {
      sendResponse("ERR REMOVE_ALARM idx inválido (0-" + String(MAX_ALARMS - 1) + ")");
      return;
    }

    alarms[idx] = { 0, 0, 0, false };
    saveAlarms();

    sendResponse("OK REMOVE_ALARM " + String(idx));

  } else if (line.startsWith("TOGGLE_ALARM")) {

    int idx = -1, enabled = -1;
    int parsed = sscanf(line.c_str(), "TOGGLE_ALARM %d %d", &idx, &enabled);

    if (parsed != 2 || idx < 0 || idx >= MAX_ALARMS) {
      sendResponse("ERR TOGGLE_ALARM formato: TOGGLE_ALARM idx 0|1");
      return;
    }

    alarms[idx].enabled = (enabled != 0);
    saveAlarms();

    sendResponse("OK TOGGLE_ALARM " + String(idx) + " " + String(enabled));

  } else if (line == "GET_ALARMS") {

    sendAlarmsStatus();
    sendResponse("OK GET_ALARMS");

  // --- Temporizador ---

  } else if (line.startsWith("START_TIMER")) {

    int h = 0, m = 0, s = 0;
    int parsed = sscanf(line.c_str(), "START_TIMER %d %d %d", &h, &m, &s);

    if (parsed != 3) {
      sendResponse("ERR START_TIMER formato: START_TIMER h m s");
      return;
    }

    timerStart((uint8_t)h, (uint8_t)m, (uint8_t)s);
    sendResponse("OK START_TIMER " + String(h) + " " + String(m) + " " + String(s));

  } else if (line == "PAUSE_TIMER") {

    timerPause();
    sendResponse("OK PAUSE_TIMER");

  } else if (line == "RESUME_TIMER") {

    timerResume();
    sendResponse("OK RESUME_TIMER");

  } else if (line == "STOP_TIMER") {

    timerReset();
    sendResponse("OK STOP_TIMER");

  // --- Pomodoro ---

  } else if (line.startsWith("START_POMODORO")) {

    int w = 25, b = 5, r = 4;
    int parsed = sscanf(line.c_str(), "START_POMODORO %d %d %d", &w, &b, &r);

    if (parsed != 3) {
      sendResponse("ERR START_POMODORO formato: START_POMODORO workMin breakMin rounds");
      return;
    }

    pomodoroStart((uint16_t)w, (uint16_t)b, (uint8_t)r);
    sendResponse("OK START_POMODORO " + String(w) + " " + String(b) + " " + String(r));

  } else if (line == "PAUSE_POMODORO") {

    pomodoroPause();
    sendResponse("OK PAUSE_POMODORO");

  } else if (line == "RESUME_POMODORO") {

    pomodoroResume();
    sendResponse("OK RESUME_POMODORO");

  } else if (line == "STOP_POMODORO") {

    pomodoroReset();
    sendResponse("OK STOP_POMODORO");

  // --- Alertas ---

  } else if (line == "STOP_ALERT") {

    stopAlert();
    sendResponse("OK STOP_ALERT");

  // --- General ---

  } else if (line == "PING") {

    sendResponse("PONG");

  } else if (line == "GET_STATUS") {

    sendFullStatus();

  } else {

    sendResponse("ERR comando desconocido: " + line);
  }
}

// ---- Comandos por Monitor Serie (bench, además de BLE) ----

void handleSerialCommands() {

  if (!Serial.available()) {
    return;
  }

  String line = Serial.readStringUntil('\n');
  processCommand(line);
}

// =========================================================
// BLE: callbacks de conexión y de escritura (RX)
// =========================================================
// Estas clases van DESPUÉS de processCommand()/sendResponse()
// porque las usan, y ANTES de setupBLE() porque setupBLE() las
// instancia con `new`. En C++ (a diferencia de las funciones)
// una clase sí debe estar definida antes de usarse.

class RelojServerCallbacks: public NimBLEServerCallbacks {

  // La API 2.x de NimBLE-Arduino agrega el parámetro connInfo
  // a estos callbacks respecto a versiones anteriores.
  void onConnect(NimBLEServer *server, NimBLEConnInfo &connInfo) override {
    bleClientConnected = true;
    Serial.println("BLE: cliente conectado.");
  }

  void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connInfo, int reason) override {
    bleClientConnected = false;
    Serial.println("BLE: cliente desconectado. Reanudando advertising...");
    NimBLEDevice::startAdvertising();
  }
};

class RelojRxCallbacks: public NimBLECharacteristicCallbacks {

  void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connInfo) override {

    // `auto` en vez de std::string/NimBLEAttValue explícito: el
    // tipo exacto que devuelve getValue() cambió entre versiones
    // de NimBLE-Arduino, pero todas soportan .c_str() y .length().
    auto rxValue = characteristic->getValue();

    if (rxValue.length() > 0) {
      processCommand(String(rxValue.c_str()));
    }
  }
};

void setupBLE() {

  NimBLEDevice::init(BLE_DEVICE_NAME);

  // Limita la potencia de transmisión a un nivel razonable; ayuda
  // a la estabilidad y consume algo menos. Puedes subirlo si
  // necesitas más alcance.
  NimBLEDevice::setPower(ESP_PWR_LVL_P6);

  NimBLEServer *bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new RelojServerCallbacks());

  NimBLEService *service = bleServer->createService(SERVICE_UUID);

  bleTxCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    NIMBLE_PROPERTY::NOTIFY
  );

  NimBLECharacteristic *rxCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  rxCharacteristic->setCallbacks(new RelojRxCallbacks());

  service->start();

  NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();

  Serial.println("BLE (NimBLE) listo. Anunciándose como '" + String(BLE_DEVICE_NAME) + "'.");
  Serial.println("Conéctate con nRF Connect y busca el servicio Nordic UART (NUS).");
}

// =========================================================
// SETUP
// =========================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  loadConfig();
  loadAlarms();

  strip.begin();

  applyConfigToHardware();

  strip.clear();
  strip.show();

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!rtc.begin()) {

    Serial.println("ERROR: No se encontró el DS1307");

    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(255, 0, 0));
    }

    strip.show();

    while (1);
  }

  Serial.println("DS1307 encontrado.");

  if (!rtc.isrunning()) {

    Serial.println("RTC detenido.");
    Serial.println("Ajustando hora de compilación...");

    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  lastFormat24h = config.format24h;

  setupBLE();

  Serial.println("Reloj iniciado.");
  Serial.println("Comandos (Serie o BLE):");
  Serial.println("  SET_TIME aaaa mm dd HH MM SS | SET_BRIGHTNESS n | SET_COLOR r g b | SET_FORMAT 12|24 | GET_CONFIG");
  Serial.println("  ADD_ALARM idx HH MM days enabled | REMOVE_ALARM idx | TOGGLE_ALARM idx 0|1 | GET_ALARMS");
  Serial.println("  START_TIMER h m s | PAUSE_TIMER | RESUME_TIMER | STOP_TIMER");
  Serial.println("  START_POMODORO workMin breakMin rounds | PAUSE_POMODORO | RESUME_POMODORO | STOP_POMODORO");
  Serial.println("  STOP_ALERT | PING | GET_STATUS");
}

// =========================================================
// LOOP
// =========================================================

void loop() {

  updateClock();
  updateTimer();
  updatePomodoro();
  updateAlert();
  handleSerialCommands(); // los comandos BLE llegan por interrupción (onWrite), no hace falta "revisarlos" aquí
}
