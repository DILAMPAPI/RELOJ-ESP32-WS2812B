/**
 * Simulador de Firmware para ESP32-C3 SuperMini + RTC DS1307 + 58 LEDs WS2812B + Buzzer
 * Implementa fielmente el protocolo Nordic UART Service (NUS)
 */

import { ClockAlarm, ClockConfig, ClockMode, PomodoroPhase } from '../types/clock';

export class Esp32Simulator {
  // Configuración interna persistida en memoria EEPROM / NVS
  private brightness: number = 140;
  private color = { r: 255, g: 140, b: 0 }; // Ámbar WS2812B cálido
  private timeFormat: 12 | 24 = 24;

  // 5 slots de alarmas
  private alarms: ClockAlarm[] = [
    { index: 0, hour: 7, minute: 30, days: 62, enabled: true, label: 'Despertador Lun-Vie' }, // Lun a Vie (62)
    { index: 1, hour: 8, minute: 0, days: 65, enabled: false, label: 'Fin de semana' }, // Dom y Sab (65)
    { index: 2, hour: 13, minute: 30, days: 62, enabled: false, label: 'Almuerzo' },
    { index: 3, hour: 19, minute: 0, days: 127, enabled: false, label: 'Ejercicio' },
    { index: 4, hour: 22, minute: 30, days: 127, enabled: false, label: 'Hora de dormir' },
  ];

  // Estado del reloj (DS1307 RTC)
  private rtcOffsetMs: number = 0;
  private mode: ClockMode = 'CLOCK';
  private alert: boolean = false;

  // Temporizador
  private timerRemainingSec: number = 0;
  private timerPaused: boolean = false;
  private timerInterval: any = null;

  // Pomodoro
  private pomodoroWorkSec: number = 25 * 60;
  private pomodoroBreakSec: number = 5 * 60;
  private pomodoroTotalRounds: number = 4;
  private pomodoroCurrentRound: number = 1;
  private pomodoroPhase: PomodoroPhase = 'WORK';
  private pomodoroRemainingSec: number = 25 * 60;
  private pomodoroPaused: boolean = false;
  private pomodoroInterval: any = null;

  // Buzzer Audio Synthesis
  private audioCtx: AudioContext | null = null;
  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Callback de salida TX (ESP32 -> App)
  public onTxResponse: ((line: string) => void) | null = null;

  constructor() {
    this.startRtcCheckLoop();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.buzzerGain) {
      this.buzzerGain.gain.setValueAtTime(0, this.audioCtx?.currentTime || 0);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private startRtcCheckLoop() {
    setInterval(() => {
      // Si estamos en modo reloj, verificar alarmas
      const now = this.getSimulatedRtcTime();
      const sec = now.getSeconds();

      if (sec === 0 && !this.alert) {
        const hour = now.getHours();
        const minute = now.getMinutes();
        const dayBit = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.

        for (const alarm of this.alarms) {
          if (alarm.enabled && alarm.hour === hour && alarm.minute === minute) {
            const isToday = (alarm.days & (1 << dayBit)) !== 0;
            if (isToday) {
              this.triggerAlert();
              break;
            }
          }
        }
      }
    }, 1000);
  }

  public getSimulatedRtcTime(): Date {
    return new Date(Date.now() + this.rtcOffsetMs);
  }

  public getFormattedRtcTime(): string {
    const d = this.getSimulatedRtcTime();
    let hours = d.getHours();
    if (this.timeFormat === 12) {
      hours = hours % 12 || 12;
    }
    const h = hours.toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  public getConfig(): ClockConfig {
    return {
      brightness: this.brightness,
      color: { ...this.color },
      timeFormat: this.timeFormat,
    };
  }

  public getAlarms(): ClockAlarm[] {
    return [...this.alarms];
  }

  public getStatusString(): string {
    const timeStr = this.getFormattedRtcTime();
    const alertInt = this.alert ? 1 : 0;

    if (this.mode === 'TIMER') {
      const pausedInt = this.timerPaused ? 1 : 0;
      return `STATUS mode=TIMER time=${timeStr} alert=${alertInt} remainingSec=${this.timerRemainingSec} paused=${pausedInt}`;
    }

    if (this.mode === 'POMODORO') {
      const pausedInt = this.pomodoroPaused ? 1 : 0;
      const roundStr = `${this.pomodoroCurrentRound}/${this.pomodoroTotalRounds}`;
      return `STATUS mode=POMODORO time=${timeStr} alert=${alertInt} phase=${this.pomodoroPhase} round=${roundStr} remainingSec=${this.pomodoroRemainingSec} paused=${pausedInt}`;
    }

    return `STATUS mode=CLOCK time=${timeStr} alert=${alertInt}`;
  }

  public getDisplayDigits(): {
    d1: string;
    d2: string;
    colon: boolean;
    d3: string;
    d4: string;
    color: { r: number; g: number; b: number };
    brightness: number;
    isFlashing: boolean;
  } {
    let text = '0000';
    let colon = true;
    let currentColor = { ...this.color };

    if (this.alert) {
      // Parpadeo rojo en alerta/alarma
      currentColor = { r: 255, g: 0, b: 0 };
    } else if (this.mode === 'TIMER') {
      const m = Math.floor(this.timerRemainingSec / 60);
      const s = this.timerRemainingSec % 60;
      text = `${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`;
      colon = true;
      currentColor = this.timerPaused ? { r: 255, g: 190, b: 0 } : { r: 255, g: 100, b: 0 };
    } else if (this.mode === 'POMODORO') {
      const m = Math.floor(this.pomodoroRemainingSec / 60);
      const s = this.pomodoroRemainingSec % 60;
      text = `${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`;
      colon = true;
      if (this.pomodoroPhase === 'BREAK') {
        // En descanso el firmware físico muestra LEDs verdes
        currentColor = { r: 0, g: 230, b: 118 };
      } else {
        currentColor = { r: 255, g: 87, b: 34 };
      }
    } else {
      // Modo Reloj
      const d = this.getSimulatedRtcTime();
      let hours = d.getHours();
      if (this.timeFormat === 12) {
        hours = hours % 12 || 12;
      }
      const hStr = hours.toString().padStart(2, '0');
      const mStr = d.getMinutes().toString().padStart(2, '0');
      text = `${hStr}${mStr}`;
      // Colon parpadea cada segundo en modo reloj físico
      colon = d.getSeconds() % 2 === 0;
    }

    return {
      d1: text[0] || '0',
      d2: text[1] || '0',
      colon,
      d3: text[2] || '0',
      d4: text[3] || '0',
      color: currentColor,
      brightness: this.brightness,
      isFlashing: this.alert,
    };
  }

  /**
   * Recibe y procesa comando de texto plano (RX: App -> ESP32)
   */
  public handleCommand(rawCmd: string): void {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    const parts = cmd.split(/\s+/);
    const op = parts[0].toUpperCase();

    switch (op) {
      case 'PING':
        this.emitTx('PONG');
        break;

      case 'GET_STATUS':
        this.emitTx(this.getStatusString());
        break;

      case 'GET_CONFIG':
        this.emitTx(
          `CONFIG brightness=${this.brightness} color=${this.color.r},${this.color.g},${this.color.b} format=${this.timeFormat}`
        );
        break;

      case 'GET_ALARMS':
        for (const a of this.alarms) {
          const hStr = a.hour.toString();
          const mStr = a.minute.toString().padStart(2, '0');
          this.emitTx(`ALARM idx=${a.index} time=${hStr}:${mStr} days=${a.days} enabled=${a.enabled ? 1 : 0}`);
        }
        break;

      case 'SET_TIME':
        // SET_TIME aaaa mm dd HH MM SS
        if (parts.length >= 7) {
          const year = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1;
          const day = parseInt(parts[3], 10);
          const hour = parseInt(parts[4], 10);
          const min = parseInt(parts[5], 10);
          const sec = parseInt(parts[6], 10);

          const targetDate = new Date(year, month, day, hour, min, sec);
          if (!isNaN(targetDate.getTime())) {
            this.rtcOffsetMs = targetDate.getTime() - Date.now();
            this.emitTx('OK SET_TIME');
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'SET_BRIGHTNESS':
        if (parts.length >= 2) {
          const val = parseInt(parts[1], 10);
          if (!isNaN(val) && val >= 0 && val <= 255) {
            this.brightness = val;
            this.emitTx(`OK SET_BRIGHTNESS ${val}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'SET_COLOR':
        if (parts.length >= 4) {
          const r = parseInt(parts[1], 10);
          const g = parseInt(parts[2], 10);
          const b = parseInt(parts[3], 10);
          if ([r, g, b].every((v) => !isNaN(v) && v >= 0 && v <= 255)) {
            this.color = { r, g, b };
            this.emitTx(`OK SET_COLOR ${r} ${g} ${b}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'SET_FORMAT':
        if (parts.length >= 2) {
          const f = parseInt(parts[1], 10);
          if (f === 12 || f === 24) {
            this.timeFormat = f as 12 | 24;
            this.emitTx(`OK SET_FORMAT ${f}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'ADD_ALARM':
        // ADD_ALARM idx HH MM days enabled
        if (parts.length >= 6) {
          const idx = parseInt(parts[1], 10);
          const hh = parseInt(parts[2], 10);
          const mm = parseInt(parts[3], 10);
          const days = parseInt(parts[4], 10);
          const enabled = parts[5] === '1';

          if (idx >= 0 && idx < 5 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && days >= 0 && days <= 127) {
            const existingLabel = this.alarms[idx]?.label;
            this.alarms[idx] = {
              index: idx,
              hour: hh,
              minute: mm,
              days,
              enabled,
              label: existingLabel || `Alarma ${idx + 1}`,
            };
            this.emitTx(`OK ADD_ALARM ${idx}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'REMOVE_ALARM':
        if (parts.length >= 2) {
          const idx = parseInt(parts[1], 10);
          if (idx >= 0 && idx < 5) {
            this.alarms[idx] = {
              index: idx,
              hour: 7,
              minute: 0,
              days: 0,
              enabled: false,
              label: `Alarma ${idx + 1}`,
            };
            this.emitTx(`OK REMOVE_ALARM ${idx}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'TOGGLE_ALARM':
        // TOGGLE_ALARM idx 0|1
        if (parts.length >= 3) {
          const idx = parseInt(parts[1], 10);
          const en = parts[2] === '1';
          if (idx >= 0 && idx < 5) {
            this.alarms[idx] = { ...this.alarms[idx], enabled: en };
            this.emitTx(`OK TOGGLE_ALARM ${idx} ${en ? 1 : 0}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'START_TIMER':
        // START_TIMER h m s
        if (parts.length >= 4) {
          const h = parseInt(parts[1], 10) || 0;
          const m = parseInt(parts[2], 10) || 0;
          const s = parseInt(parts[3], 10) || 0;
          const total = h * 3600 + m * 60 + s;
          if (total > 0) {
            this.mode = 'TIMER';
            this.timerRemainingSec = total;
            this.timerPaused = false;
            this.startTimerInterval();
            this.emitTx(`OK START_TIMER ${total}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'PAUSE_TIMER':
        if (this.mode === 'TIMER') {
          this.timerPaused = true;
          this.stopTimerInterval();
          this.emitTx('OK PAUSE_TIMER');
          return;
        }
        this.emitTx('ERR NOT_IN_TIMER_MODE');
        break;

      case 'RESUME_TIMER':
        if (this.mode === 'TIMER') {
          this.timerPaused = false;
          this.startTimerInterval();
          this.emitTx('OK RESUME_TIMER');
          return;
        }
        this.emitTx('ERR NOT_IN_TIMER_MODE');
        break;

      case 'STOP_TIMER':
        this.mode = 'CLOCK';
        this.stopTimerInterval();
        this.timerRemainingSec = 0;
        this.timerPaused = false;
        this.emitTx('OK STOP_TIMER');
        break;

      case 'START_POMODORO':
        // START_POMODORO workMin breakMin rounds
        if (parts.length >= 4) {
          const w = parseInt(parts[1], 10);
          const b = parseInt(parts[2], 10);
          const r = parseInt(parts[3], 10);
          if (w > 0 && b > 0 && r > 0) {
            this.mode = 'POMODORO';
            this.pomodoroWorkSec = w * 60;
            this.pomodoroBreakSec = b * 60;
            this.pomodoroTotalRounds = r;
            this.pomodoroCurrentRound = 1;
            this.pomodoroPhase = 'WORK';
            this.pomodoroRemainingSec = this.pomodoroWorkSec;
            this.pomodoroPaused = false;
            this.startPomodoroInterval();
            this.emitTx(`OK START_POMODORO ${w} ${b} ${r}`);
            return;
          }
        }
        this.emitTx('ERR INVALID_ARGS');
        break;

      case 'PAUSE_POMODORO':
        if (this.mode === 'POMODORO') {
          this.pomodoroPaused = true;
          this.stopPomodoroInterval();
          this.emitTx('OK PAUSE_POMODORO');
          return;
        }
        this.emitTx('ERR NOT_IN_POMODORO_MODE');
        break;

      case 'RESUME_POMODORO':
        if (this.mode === 'POMODORO') {
          this.pomodoroPaused = false;
          this.startPomodoroInterval();
          this.emitTx('OK RESUME_POMODORO');
          return;
        }
        this.emitTx('ERR NOT_IN_POMODORO_MODE');
        break;

      case 'STOP_POMODORO':
        this.mode = 'CLOCK';
        this.stopPomodoroInterval();
        this.pomodoroPaused = false;
        this.emitTx('OK STOP_POMODORO');
        break;

      case 'STOP_ALERT':
        this.stopAlert();
        this.emitTx('OK STOP_ALERT');
        break;

      default:
        this.emitTx(`ERR UNKNOWN_CMD ${op}`);
        break;
    }
  }

  private startTimerInterval() {
    this.stopTimerInterval();
    this.timerInterval = setInterval(() => {
      if (!this.timerPaused && this.timerRemainingSec > 0) {
        this.timerRemainingSec--;
        if (this.timerRemainingSec === 0) {
          this.triggerAlert();
          this.stopTimerInterval();
          this.mode = 'CLOCK';
        }
      }
    }, 1000);
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startPomodoroInterval() {
    this.stopPomodoroInterval();
    this.pomodoroInterval = setInterval(() => {
      if (!this.pomodoroPaused && this.pomodoroRemainingSec > 0) {
        this.pomodoroRemainingSec--;
        if (this.pomodoroRemainingSec === 0) {
          this.triggerAlert();

          if (this.pomodoroPhase === 'WORK') {
            // Cambiar a descanso (LEDs verdes)
            this.pomodoroPhase = 'BREAK';
            this.pomodoroRemainingSec = this.pomodoroBreakSec;
          } else {
            // Fin del descanso, pasar a siguiente ronda o terminar
            if (this.pomodoroCurrentRound < this.pomodoroTotalRounds) {
              this.pomodoroCurrentRound++;
              this.pomodoroPhase = 'WORK';
              this.pomodoroRemainingSec = this.pomodoroWorkSec;
            } else {
              // Fin de todo el ciclo Pomodoro
              this.mode = 'CLOCK';
              this.stopPomodoroInterval();
            }
          }
        }
      }
    }, 1000);
  }

  private stopPomodoroInterval() {
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
      this.pomodoroInterval = null;
    }
  }

  private triggerAlert() {
    this.alert = true;
    this.startBuzzerSound();
  }

  public stopAlert() {
    this.alert = false;
    this.stopBuzzerSound();
  }

  private startBuzzerSound() {
    if (this.isMuted) return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.buzzerOsc = this.audioCtx.createOscillator();
      this.buzzerGain = this.audioCtx.createGain();

      // Frecuencia típica de buzzer piezoeléctrico de reloj: 2400 Hz
      this.buzzerOsc.type = 'square';
      this.buzzerOsc.frequency.setValueAtTime(2400, this.audioCtx.currentTime);

      // Beep intermitente (3 beeps por segundo)
      this.buzzerGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.buzzerOsc.connect(this.buzzerGain);
      this.buzzerGain.connect(this.audioCtx.destination);
      this.buzzerOsc.start();
    } catch {
      // Audio no disponible
    }
  }

  private stopBuzzerSound() {
    if (this.buzzerOsc) {
      try {
        this.buzzerOsc.stop();
        this.buzzerOsc.disconnect();
      } catch {}
      this.buzzerOsc = null;
    }
    this.buzzerGain = null;
  }

  private emitTx(line: string) {
    if (this.onTxResponse) {
      this.onTxResponse(line);
    }
  }
}
