import { BlePacketLog, BleState, ClockAlarm, ClockConfig, ClockStatus, ConnectionMode } from '../types/clock';
import { Esp32Simulator } from './esp32Simulator';
import { WebBleService } from './webBleService';

export class BleManager {
  private static instance: BleManager;

  public simulator = new Esp32Simulator();
  public webBle = new WebBleService();

  public mode: ConnectionMode = 'simulator';
  public state: BleState = 'connected'; // Inicia conectado al simulador por defecto para feedback instantáneo
  public deviceName: string = 'Reloj ESP32 (Simulador)';

  public status: ClockStatus = {
    mode: 'CLOCK',
    time: '--:--:--',
    alert: false,
    paused: false,
    lastUpdated: Date.now(),
  };

  public config: ClockConfig = {
    brightness: 140,
    color: { r: 255, g: 140, b: 0 },
    timeFormat: 24,
  };

  public alarms: ClockAlarm[] = [
    { index: 0, hour: 7, minute: 30, days: 62, enabled: true, label: 'Despertador Lun-Vie' },
    { index: 1, hour: 8, minute: 0, days: 65, enabled: false, label: 'Fin de semana' },
    { index: 2, hour: 13, minute: 30, days: 62, enabled: false, label: 'Almuerzo' },
    { index: 3, hour: 19, minute: 0, days: 127, enabled: false, label: 'Ejercicio' },
    { index: 4, hour: 22, minute: 30, days: 127, enabled: false, label: 'Dormir' },
  ];

  public logs: BlePacketLog[] = [];
  public lastError: string | null = null;

  private pollInterval: any = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Escuchar respuestas TX del simulador
    this.simulator.onTxResponse = (line) => {
      if (this.mode === 'simulator') {
        this.handleRxLine(line);
      }
    };

    // Escuchar respuestas TX de Web Bluetooth
    this.webBle.onTxResponse = (line) => {
      if (this.mode === 'web_ble') {
        this.handleRxLine(line);
      }
    };

    this.webBle.onDisconnected = () => {
      if (this.mode === 'web_ble') {
        this.state = 'disconnected';
        this.addLog('SYS', 'Dispositivo BLE desconectado por el sistema o fuera de alcance.');
        this.stopPolling();
        this.notify();
      }
    };

    // Inicializar sincronización con el simulador
    this.syncAll();
    this.startPolling();
  }

  public static getInstance(): BleManager {
    if (!BleManager.instance) {
      BleManager.instance = new BleManager();
    }
    return BleManager.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public addLog(direction: 'TX' | 'RX' | 'SYS', payload: string) {
    const entry: BlePacketLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      direction,
      payload,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) this.logs.pop();
    this.notify();
  }

  public async connectSimulator(): Promise<void> {
    this.mode = 'simulator';
    this.state = 'connected';
    this.deviceName = 'Reloj ESP32 (Simulador)';
    this.addLog('SYS', 'Conectado al Simulador ESP32-C3 SuperMini');
    await this.syncAll();
    this.startPolling();
    this.notify();
  }

  public async connectWebBle(): Promise<void> {
    try {
      this.lastError = null;
      this.state = 'scanning';
      this.notify();
      this.addLog('SYS', 'Buscando dispositivo BLE "Reloj ESP32" vía Web Bluetooth...');

      const name = await this.webBle.requestAndConnect();
      this.mode = 'web_ble';
      this.state = 'connected';
      this.deviceName = name;
      this.addLog('SYS', `Conectado exitosamente por BLE a: ${name}`);

      await this.syncAll();
      this.startPolling();
      this.notify();
    } catch (err: any) {
      this.state = 'disconnected';
      this.lastError = err.message || 'Error al conectar Bluetooth';
      this.addLog('SYS', `Error BLE: ${this.lastError}`);
      this.notify();
    }
  }

  public disconnect(): void {
    this.stopPolling();
    if (this.mode === 'web_ble') {
      this.webBle.disconnect();
    }
    this.state = 'disconnected';
    this.addLog('SYS', 'Desconectado del reloj');
    this.notify();
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (this.state !== 'connected') {
      this.lastError = 'No hay conexión BLE activa';
      this.notify();
      return false;
    }

    this.addLog('TX', cmd);

    try {
      if (this.mode === 'simulator') {
        this.simulator.handleCommand(cmd);
      } else {
        await this.webBle.sendCommand(cmd);
      }
      return true;
    } catch (err: any) {
      this.lastError = `Error al enviar comando: ${err.message}`;
      this.addLog('SYS', this.lastError!);
      this.notify();
      return false;
    }
  }

  private handleRxLine(line: string) {
    this.addLog('RX', line);

    if (line.startsWith('STATUS')) {
      this.parseStatus(line);
    } else if (line.startsWith('CONFIG')) {
      this.parseConfig(line);
    } else if (line.startsWith('ALARM')) {
      this.parseAlarm(line);
    } else if (line.startsWith('ERR')) {
      this.lastError = this.translateError(line);
    }
    this.notify();
  }

  private parseStatus(line: string) {
    const clean = line.replace(/^STATUS\s+/, '').trim();
    const tokens = clean.split(/\s+/);
    const map: Record<string, string> = {};

    for (const t of tokens) {
      const [k, v] = t.split('=');
      if (k && v !== undefined) map[k.toLowerCase()] = v;
    }

    const mode = (map['mode']?.toUpperCase() || 'CLOCK') as any;
    const time = map['time'] || '--:--:--';
    const alert = map['alert'] === '1';
    const paused = map['paused'] === '1';
    const remainingSec = map['remainingsec'] ? parseInt(map['remainingsec'], 10) : undefined;
    const phase = map['phase'] as any;

    let currentRound: number | undefined;
    let totalRounds: number | undefined;
    if (map['round']) {
      const [c, t] = map['round'].split('/');
      currentRound = parseInt(c, 10);
      totalRounds = parseInt(t, 10);
    }

    this.status = {
      mode,
      time,
      alert,
      remainingSec,
      paused,
      phase,
      currentRound,
      totalRounds,
      lastUpdated: Date.now(),
    };
  }

  private parseConfig(line: string) {
    const clean = line.replace(/^CONFIG\s+/, '').trim();
    const tokens = clean.split(/\s+/);
    const map: Record<string, string> = {};

    for (const t of tokens) {
      const [k, v] = t.split('=');
      if (k && v !== undefined) map[k.toLowerCase()] = v;
    }

    if (map['brightness']) {
      this.config.brightness = Math.min(255, Math.max(0, parseInt(map['brightness'], 10) || 128));
    }

    if (map['color']) {
      const [r, g, b] = map['color'].split(',').map((x) => parseInt(x, 10) || 0);
      this.config.color = {
        r: Math.min(255, Math.max(0, r)),
        g: Math.min(255, Math.max(0, g)),
        b: Math.min(255, Math.max(0, b)),
      };
    }

    if (map['format']) {
      const f = parseInt(map['format'], 10);
      this.config.timeFormat = f === 12 ? 12 : 24;
    }
  }

  private parseAlarm(line: string) {
    const clean = line.replace(/^ALARM\s+/, '').trim();
    const tokens = clean.split(/\s+/);
    const map: Record<string, string> = {};

    for (const t of tokens) {
      const [k, v] = t.split('=');
      if (k && v !== undefined) map[k.toLowerCase()] = v;
    }

    const idx = parseInt(map['idx'] || '0', 10);
    if (idx >= 0 && idx < 5) {
      let hour = 7;
      let minute = 0;
      if (map['time']) {
        const [h, m] = map['time'].split(':');
        hour = parseInt(h, 10) || 0;
        minute = parseInt(m, 10) || 0;
      }
      const days = parseInt(map['days'] || '0', 10);
      const enabled = map['enabled'] === '1';

      const existingLabel = this.alarms[idx]?.label;
      this.alarms[idx] = {
        index: idx,
        hour,
        minute,
        days,
        enabled,
        label: existingLabel || `Alarma ${idx + 1}`,
      };
    }
  }

  private translateError(raw: string): string {
    if (raw.includes('INVALID_ARGS')) return 'Argumentos inválidos en el comando enviado al reloj';
    if (raw.includes('NOT_IN_TIMER_MODE')) return 'El reloj no está corriendo un temporizador';
    if (raw.includes('NOT_IN_POMODORO_MODE')) return 'El reloj no está en modo Pomodoro';
    return raw;
  }

  public async syncAll(): Promise<void> {
    await this.sendCommand('GET_STATUS');
    await new Promise((r) => setTimeout(r, 60));
    await this.sendCommand('GET_CONFIG');
    await new Promise((r) => setTimeout(r, 60));
    await this.sendCommand('GET_ALARMS');
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.state === 'connected') {
        this.sendCommand('GET_STATUS');
      }
    }, 1000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Comandos de conveniencia
  public setTime(d: Date = new Date()): Promise<boolean> {
    const y = d.getFullYear().toString().padStart(4, '0');
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');
    const da = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const mi = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return this.sendCommand(`SET_TIME ${y} ${mo} ${da} ${h} ${mi} ${s}`);
  }

  public setBrightness(val: number): Promise<boolean> {
    const cl = Math.min(255, Math.max(0, Math.round(val)));
    this.config.brightness = cl;
    this.notify();
    return this.sendCommand(`SET_BRIGHTNESS ${cl}`);
  }

  public setColor(r: number, g: number, b: number): Promise<boolean> {
    const cr = Math.min(255, Math.max(0, Math.round(r)));
    const cg = Math.min(255, Math.max(0, Math.round(g)));
    const cb = Math.min(255, Math.max(0, Math.round(b)));
    this.config.color = { r: cr, g: cg, b: cb };
    this.notify();
    return this.sendCommand(`SET_COLOR ${cr} ${cg} ${cb}`);
  }

  public setFormat(format: 12 | 24): Promise<boolean> {
    this.config.timeFormat = format;
    this.notify();
    return this.sendCommand(`SET_FORMAT ${format}`);
  }

  public saveAlarm(alarm: ClockAlarm): Promise<boolean> {
    this.alarms[alarm.index] = { ...alarm };
    this.notify();
    return this.sendCommand(`ADD_ALARM ${alarm.index} ${alarm.hour} ${alarm.minute} ${alarm.days} ${alarm.enabled ? 1 : 0}`);
  }

  public removeAlarm(idx: number): Promise<boolean> {
    if (idx >= 0 && idx < 5) {
      this.alarms[idx] = { index: idx, hour: 7, minute: 0, days: 0, enabled: false, label: `Alarma ${idx + 1}` };
      this.notify();
    }
    return this.sendCommand(`REMOVE_ALARM ${idx}`);
  }

  public toggleAlarm(idx: number, enabled: boolean): Promise<boolean> {
    if (idx >= 0 && idx < 5) {
      this.alarms[idx] = { ...this.alarms[idx], enabled };
      this.notify();
    }
    return this.sendCommand(`TOGGLE_ALARM ${idx} ${enabled ? 1 : 0}`);
  }

  public startTimer(h: number, m: number, s: number): Promise<boolean> {
    return this.sendCommand(`START_TIMER ${h} ${m} ${s}`);
  }

  public pauseTimer(): Promise<boolean> {
    return this.sendCommand('PAUSE_TIMER');
  }

  public resumeTimer(): Promise<boolean> {
    return this.sendCommand('RESUME_TIMER');
  }

  public stopTimer(): Promise<boolean> {
    return this.sendCommand('STOP_TIMER');
  }

  public startPomodoro(workMin: number, breakMin: number, rounds: number): Promise<boolean> {
    return this.sendCommand(`START_POMODORO ${workMin} ${breakMin} ${rounds}`);
  }

  public pausePomodoro(): Promise<boolean> {
    return this.sendCommand('PAUSE_POMODORO');
  }

  public resumePomodoro(): Promise<boolean> {
    return this.sendCommand('RESUME_POMODORO');
  }

  public stopPomodoro(): Promise<boolean> {
    return this.sendCommand('STOP_POMODORO');
  }

  public stopAlert(): Promise<boolean> {
    return this.sendCommand('STOP_ALERT');
  }

  public ping(): Promise<boolean> {
    return this.sendCommand('PING');
  }

  public clearLastError(): void {
    this.lastError = null;
    this.notify();
  }
}
