import React, { useState } from 'react';
import { BleManager } from '../services/bleManager';
import { WebBleService } from '../services/webBleService';
import { Bluetooth, Cpu, X, Check, AlertCircle, Radio } from 'lucide-react';

interface BleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  ble: BleManager;
}

export const BleConnectModal: React.FC<BleConnectModalProps> = ({ isOpen, onClose, ble }) => {
  const [connecting, setConnecting] = useState(false);
  const isWebBleSupported = WebBleService.isSupported();

  if (!isOpen) return null;

  const handleConnectSimulator = async () => {
    await ble.connectSimulator();
    onClose();
  };

  const handleConnectWebBle = async () => {
    setConnecting(true);
    try {
      await ble.connectWebBle();
      onClose();
    } catch {
      // Error handled in manager
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    ble.disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">Conexión BLE - Reloj ESP32</h3>
              <p className="text-xs text-stone-400">Nordic UART Service (NUS)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado actual */}
        <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                ble.state === 'connected' ? 'bg-emerald-400' : 'bg-stone-600'
              }`}
            />
            <span className="text-stone-300 font-medium">
              {ble.state === 'connected' ? `Conectado a ${ble.deviceName}` : 'Desconectado'}
            </span>
          </div>
          {ble.state === 'connected' && (
            <button
              onClick={handleDisconnect}
              className="text-red-400 hover:text-red-300 font-semibold"
            >
              Desconectar
            </button>
          )}
        </div>

        {/* Opciones de conexión */}
        <div className="space-y-3">
          {/* Opción 1: Simulador Integrado */}
          <button
            onClick={handleConnectSimulator}
            className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              ble.mode === 'simulator' && ble.state === 'connected'
                ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-stone-850 hover:bg-stone-800 border-stone-800'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-100 text-sm">Simulador ESP32-C3 SuperMini</span>
                {ble.mode === 'simulator' && ble.state === 'connected' && (
                  <Check className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Firmware completo simulado en tiempo real con 58 LEDs WS2812B, RTC DS1307, buzzer piezoeléctrico y protocolo NUS idéntico.
              </p>
            </div>
          </button>

          {/* Opción 2: Web Bluetooth Directo */}
          <button
            onClick={handleConnectWebBle}
            disabled={!isWebBleSupported || connecting}
            className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              ble.mode === 'web_ble' && ble.state === 'connected'
                ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30'
                : 'bg-stone-850 hover:bg-stone-800 border-stone-800'
            } disabled:opacity-40 disabled:hover:bg-stone-850`}
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 mt-0.5">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-100 text-sm">Reloj Físico por Web Bluetooth</span>
                {ble.mode === 'web_ble' && ble.state === 'connected' && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Conexión BLE directa desde tu navegador al microcontrolador ESP32-C3 con el nombre &quot;Reloj ESP32&quot;.
              </p>
              {!isWebBleSupported && (
                <div className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Requiere Google Chrome, Edge o Android Chrome con Bluetooth activado.</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Info adicional */}
        <div className="p-3 bg-stone-950 rounded-xl text-[11px] text-stone-500 space-y-1">
          <div className="font-mono text-stone-400">UUID Servicio NUS: 6e400001-b5a3-f393-e0a9-e50e24dcca9e</div>
          <div>Cada conexión sincroniza automáticamente STATUS, CONFIG y ALARMS.</div>
        </div>
      </div>
    </div>
  );
};
