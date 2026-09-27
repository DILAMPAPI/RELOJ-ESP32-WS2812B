import React, { useState, useEffect } from 'react';
import { BleManager } from './services/bleManager';
import { HomeScreen } from './components/screens/HomeScreen';
import { LightingScreen } from './components/screens/LightingScreen';
import { AlarmsScreen } from './components/screens/AlarmsScreen';
import { TimerScreen } from './components/screens/TimerScreen';
import { PomodoroScreen } from './components/screens/PomodoroScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { BleConnectModal } from './components/BleConnectModal';
import { FlutterExportModal } from './components/FlutterExportModal';
import { HardwareInspector } from './components/HardwareInspector';
import {
  Home,
  Palette,
  Bell,
  Clock,
  Sparkles,
  Settings,
  Bluetooth,
  FileCode,
  Smartphone,
  Cpu,
  X,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [ble] = useState(() => BleManager.getInstance());
  const [, setTick] = useState(0);

  const [activeTab, setActiveTab] = useState(0);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showFlutterModal, setShowFlutterModal] = useState(false);
  const [showHardwarePanel, setShowHardwarePanel] = useState(true);
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Suscribirse a cambios del BleManager
  useEffect(() => {
    return ble.subscribe(() => setTick((t) => t + 1));
  }, [ble]);

  const navItems = [
    { label: 'Inicio', icon: Home },
    { label: 'Luz', icon: Palette },
    { label: 'Alarmas', icon: Bell },
    { label: 'Timer', icon: Clock },
    { label: 'Pomodoro', icon: Sparkles },
    { label: 'Ajustes', icon: Settings },
  ];

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 0:
        return (
          <HomeScreen
            ble={ble}
            onNavigate={(idx) => setActiveTab(idx)}
            onOpenBleDialog={() => setShowConnectModal(true)}
          />
        );
      case 1:
        return <LightingScreen ble={ble} />;
      case 2:
        return <AlarmsScreen ble={ble} />;
      case 3:
        return <TimerScreen ble={ble} />;
      case 4:
        return <PomodoroScreen ble={ble} />;
      case 5:
        return (
          <SettingsScreen
            ble={ble}
            onNavigateToLighting={() => setActiveTab(1)}
            onOpenBleDialog={() => setShowConnectModal(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Barra Superior Global */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800 px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Marca y Estado */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-stone-100">
              Reloj ESP32
            </h1>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                ble.state === 'connected' ? 'bg-emerald-400' : 'bg-stone-600'
              }`}
            />
            <span className="truncate max-w-[130px] hidden sm:inline">
              {ble.state === 'connected' ? ble.deviceName : 'Desconectado'}
            </span>
            <span className="sm:hidden">BLE</span>
          </button>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-2">
          {/* Alternar Hardware 58 LEDs */}
          <button
            onClick={() => setShowHardwarePanel(!showHardwarePanel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showHardwarePanel
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
            title="Mostrar u ocultar los 58 LEDs físicos simulados"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">58 LEDs WS2812B</span>
          </button>

          {/* Alternar Vista Móvil / Pantalla Completa */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
              isMobileFrame
                ? 'bg-stone-800 text-stone-200 border-stone-700'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
            title="Alternar marco de smartphone o vista adaptable"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Botón Código Flutter */}
          <button
            onClick={() => setShowFlutterModal(true)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/40 transition-all"
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">Código Flutter</span>
          </button>
        </div>
      </header>

      {/* Banner de Notificación de Errores */}
      {ble.lastError && (
        <div className="bg-red-950/80 border-b border-red-800 px-4 py-2.5 text-xs text-red-200 flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{ble.lastError}</span>
          </div>
          <button
            onClick={() => ble.clearLastError()}
            className="p-1 hover:bg-red-900/60 rounded text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full max-w-7xl mx-auto">
        {/* Panel del Hardware Físico (58 LEDs WS2812B + DS1307) */}
        {showHardwarePanel && (
          <div className="w-full mb-6">
            <HardwareInspector ble={ble} />
          </div>
        )}

        {/* Contenedor de la Aplicación Móvil */}
        <div
          className={`w-full transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[420px] bg-stone-900/70 border-2 border-stone-800 rounded-[36px] shadow-2xl p-4 overflow-hidden relative'
              : 'max-w-2xl bg-stone-900/40 border border-stone-800/80 rounded-3xl p-4 sm:p-6 shadow-xl relative'
          }`}
        >
          {/* Pantalla Activa */}
          <div className="min-h-[520px]">{renderActiveScreen()}</div>

          {/* Barra de Navegación Inferior (Material 3 NavigationBar) */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-30 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 flex justify-around items-center px-2 py-2 max-w-2xl mx-auto ${
              isMobileFrame ? 'rounded-b-[34px]' : 'rounded-b-2xl'
            }`}
          >
            {navItems.map((item, index) => {
              const IconComp = item.icon;
              const isActive = activeTab === index;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(index)}
                  className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] rounded-2xl transition-all ${
                    isActive ? 'text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div
                    className={`px-3 py-1 rounded-full transition-all ${
                      isActive ? 'bg-amber-500/20' : ''
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal de Conexión BLE */}
      <BleConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        ble={ble}
      />

      {/* Modal de Código y Exportación Flutter */}
      <FlutterExportModal
        isOpen={showFlutterModal}
        onClose={() => setShowFlutterModal(false)}
      />
    </div>
  );
}
