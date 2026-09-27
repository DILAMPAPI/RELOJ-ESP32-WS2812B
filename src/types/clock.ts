export type ClockMode = 'CLOCK' | 'TIMER' | 'POMODORO';
export type PomodoroPhase = 'WORK' | 'BREAK';

export interface ClockStatus {
  mode: ClockMode;
  time: string; // "HH:MM:SS"
  alert: boolean; // 1 si hay alarma o alerta sonando
  remainingSec?: number;
  paused: boolean;
  phase?: PomodoroPhase;
  currentRound?: number;
  totalRounds?: number;
  lastUpdated: number;
}

export interface ClockConfig {
  brightness: number; // 0-255
  color: {
    r: number;
    g: number;
    b: number;
  };
  timeFormat: 12 | 24;
}

export interface ClockAlarm {
  index: number; // 0..4
  hour: number; // 0..23
  minute: number; // 0..59
  days: number; // bitmask 0..127 (bit0=Dom, bit1=Lun, ..., bit6=Sab)
  enabled: boolean;
  label?: string; // Etiqueta local en la app
}

export interface BlePacketLog {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'SYS';
  payload: string;
  type?: 'status' | 'config' | 'alarm' | 'ok' | 'err' | 'info';
}

export type ConnectionMode = 'simulator' | 'web_ble';
export type BleState = 'disconnected' | 'scanning' | 'connecting' | 'connected';
