import React, { useState, useEffect } from 'react';
import { BleManager } from '../services/bleManager';
import { LedDisplay58 } from './LedDisplay58';
import { Cpu, Bell, Volume2, VolumeX, ShieldAlert, Radio } from 'lucide-react';

interface HardwareInspectorProps {
  ble: BleManager;
}

export const HardwareInspector: React.FC<HardwareInspectorProps> = ({ ble }) => {
  const [displayData, setDisplayData] = useState(ble.simulator.getDisplayDigits());
  const [isMuted, setIsMuted] = useState(ble.simulator.getIsMuted());

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayData(ble.simulator.getDisplayDigits());
    }, 250);
    return () => clearInterval(interval);
  }, [ble]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    ble.simulator.setMuted(next);
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-100 text-sm sm:text-base flex items-center gap-2">
              <span>Hardware Físico: Reloj de Pared ESP32-C3</span>
              {ble.status.alert && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full animate-bounce">
                  ¡ALERTA ACTIVA!
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-400">
              58 LEDs WS2812B · RTC DS1307 · Buzzer · BLE NUS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs flex items-center gap-1.5 transition-colors border border-stone-700/60"
            title="Activar/Desactivar sonido del buzzer piezoeléctrico"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Mute' : 'Sonido'}</span>
          </button>
        </div>
      </div>

      {/* Renderizado en Vivo de los 58 LEDs */}
      <div className="flex justify-center py-2">
        <LedDisplay58
          d1={displayData.d1}
          d2={displayData.d2}
          colon={displayData.colon}
          d3={displayData.d3}
          d4={displayData.d4}
          color={displayData.color}
          brightness={displayData.brightness}
          isFlashing={displayData.isFlashing}
          className="w-full max-w-lg"
        />
      </div>

      {/* Indicadores de Sensores & Actuadores del Hardware */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-500 font-mono">CHIP PRINCIPAL</div>
          <div className="font-bold text-stone-200 mt-0.5 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESP32-C3 SuperMini</span>
          </div>
        </div>

        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-500 font-mono">RTC DS1307 I2C</div>
          <div className="font-mono font-bold text-amber-400 mt-0.5">
            {ble.status.time || '14:05:30'}
          </div>
        </div>

        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-500 font-mono">BUZZER PIEZO</div>
          <div className={`font-bold mt-0.5 flex items-center gap-1.5 ${
            ble.status.alert ? 'text-red-400 animate-pulse' : 'text-stone-400'
          }`}>
            <Bell className="w-3.5 h-3.5" />
            <span>{ble.status.alert ? '¡SONANDO!' : 'Silencioso'}</span>
          </div>
        </div>

        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-500 font-mono">MODO FIRMWARE</div>
          <div className="font-bold text-stone-200 mt-0.5">
            {ble.status.mode} {ble.status.paused ? '(PAUSA)' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
