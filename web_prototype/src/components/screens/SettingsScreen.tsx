import React, { useState } from 'react';
import { BleManager } from '../../services/bleManager';
import { Clock, Smartphone, Info, Terminal, Send, Volume2, VolumeX, ShieldCheck, Sun } from 'lucide-react';

interface SettingsScreenProps {
  ble: BleManager;
  onNavigateToLighting: () => void;
  onOpenBleDialog: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  ble,
  onNavigateToLighting,
  onOpenBleDialog,
}) => {
  const { config, state } = ble;
  const isConnected = state === 'connected';

  const [customCmd, setCustomCmd] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isMuted, setIsMuted] = useState(ble.simulator.getIsMuted());

  const handleSyncPhoneTime = async () => {
    const now = new Date();
    const ok = await ble.setTime(now);
    if (ok) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }
  };

  const handleFormatChange = (f: 12 | 24) => {
    ble.setFormat(f);
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCmd.trim()) return;
    ble.sendCommand(customCmd.trim());
    setCustomCmd('');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    ble.simulator.setMuted(next);
  };

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold text-stone-100">Configuración del Reloj</h2>
        <p className="text-xs text-stone-400">
          Ajustes del RTC DS1307, formato horario y diagnóstico BLE
        </p>
      </div>

      {/* Sincronizar Hora RTC con el Teléfono (SET_TIME) */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-stone-100 text-sm">Ajuste de Hora del Reloj</span>
        </div>
        <p className="text-xs text-stone-400">
          Envía la hora exacta de este dispositivo al RTC DS1307 mediante el comando{' '}
          <code className="text-amber-300">SET_TIME aaaa mm dd HH MM SS</code>.
        </p>

        <button
          onClick={handleSyncPhoneTime}
          disabled={!isConnected}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        >
          <Clock className="w-4 h-4" />
          {syncSuccess ? '✓ Hora Sincronizada con Éxito' : 'Sincronizar con la Hora de este Teléfono'}
        </button>
      </div>

      {/* Formato de Hora (12h vs 24h) */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-stone-100 text-sm">Formato de Pantalla (SET_FORMAT)</span>
        </div>
        <p className="text-xs text-stone-400">
          Define si los 4 dígitos WS2812B muestran la hora en formato militar de 24 horas o estándar de 12 horas.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleFormatChange(24)}
            disabled={!isConnected}
            className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
              config.timeFormat === 24
                ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                : 'bg-stone-850 text-stone-400 border-stone-800 hover:bg-stone-800'
            } disabled:opacity-40`}
          >
            24 Horas (Ej: 14:30)
          </button>
          <button
            onClick={() => handleFormatChange(12)}
            disabled={!isConnected}
            className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
              config.timeFormat === 12
                ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                : 'bg-stone-850 text-stone-400 border-stone-800 hover:bg-stone-800'
            } disabled:opacity-40`}
          >
            12 Horas (Ej: 02:30)
          </button>
        </div>
      </div>

      {/* Acceso a Iluminación */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-stone-100 text-sm">Brillo y Color de LEDs</div>
            <div className="text-xs text-stone-400">
              Brillo actual: {Math.round((config.brightness * 100) / 255)}% · RGB({config.color.r}, {config.color.g}, {config.color.b})
            </div>
          </div>
        </div>
        <button
          onClick={onNavigateToLighting}
          className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors"
        >
          Ajustar
        </button>
      </div>

      {/* Información del Dispositivo y Protocolo BLE */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-stone-100 text-sm">Información del Hardware ESP32</span>
          </div>
          <button
            onClick={toggleMute}
            className="text-xs flex items-center gap-1 text-stone-400 hover:text-stone-200"
            title="Silenciar sonido de buzzer en simulador"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Buzzer Silenciado' : 'Buzzer Activo'}</span>
          </button>
        </div>

        <div className="text-xs space-y-2 font-mono text-stone-400 divide-y divide-stone-800/80">
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Dispositivo:</span>
            <span className="text-stone-200 font-bold">{ble.deviceName}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Modo de Conexión:</span>
            <span className="text-stone-200">{ble.mode === 'simulator' ? 'Simulador Firmware C3' : 'Web Bluetooth Físico'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Microcontrolador:</span>
            <span className="text-stone-200">ESP32-C3 SuperMini RISC-V</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Display:</span>
            <span className="text-stone-200">58x WS2812B (4x7-seg + colon)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">RTC Hardware:</span>
            <span className="text-stone-200">DS1307 I2C</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Servicio NUS:</span>
            <span className="text-[10px] text-amber-400/90 truncate max-w-[200px]">6e400001-b5a3-f393-e0a9-e50e24dcca9e</span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => ble.ping()}
            disabled={!isConnected}
            className="flex-1 py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors disabled:opacity-40"
          >
            Enviar PING
          </button>
          <button
            onClick={() => ble.stopAlert()}
            disabled={!isConnected}
            className="flex-1 py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors disabled:opacity-40"
          >
            STOP_ALERT
          </button>
        </div>
      </div>

      {/* Terminal de Comandos BLE (TX/RX en Vivo) */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-stone-100 text-sm">Terminal de Protocolo BLE</span>
        </div>

        <form onSubmit={handleSendCustom} className="flex gap-2">
          <input
            type="text"
            value={customCmd}
            disabled={!isConnected}
            onChange={(e) => setCustomCmd(e.target.value)}
            placeholder="Ej: GET_STATUS, PING, SET_BRIGHTNESS 200..."
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!isConnected || !customCmd.trim()}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="h-36 overflow-y-auto bg-black p-3 rounded-xl border border-stone-800 font-mono text-[11px] space-y-1">
          {ble.logs.length === 0 ? (
            <div className="text-stone-600 italic">No hay mensajes transmitidos aún.</div>
          ) : (
            ble.logs.slice(0, 30).map((log) => (
              <div
                key={log.id}
                className={`truncate ${
                  log.direction === 'TX'
                    ? 'text-cyan-400'
                    : log.direction === 'RX'
                    ? 'text-emerald-400'
                    : 'text-amber-400/80'
                }`}
              >
                <span className="text-stone-600 mr-1.5">[{log.timestamp}]</span>
                <span className="font-bold mr-1">{log.direction}</span>
                <span>{log.payload}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
