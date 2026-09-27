import React, { useEffect, useState } from 'react';
import { BleManager } from '../../services/bleManager';
import { Sun, Palette, Sliders, RefreshCw, Check } from 'lucide-react';
import { LedDisplay58 } from '../LedDisplay58';

interface LightingScreenProps {
  ble: BleManager;
}

const PRESET_COLORS = [
  { name: 'Ámbar Cálido', r: 255, g: 140, b: 0 },
  { name: 'Rojo Carmesí', r: 255, g: 23, b: 68 },
  { name: 'Verde Esmeralda', r: 0, g: 230, b: 118 },
  { name: 'Azul Eléctrico', r: 41, g: 121, b: 255 },
  { name: 'Cian Neón', r: 0, g: 229, b: 255 },
  { name: 'Amarillo Sol', r: 255, g: 214, b: 0 },
  { name: 'Magenta Púrpura', r: 213, g: 0, b: 249 },
  { name: 'Blanco Puro', r: 255, g: 255, b: 255 },
  { name: 'Blanco Cálido', r: 255, g: 224, b: 178 },
  { name: 'Rosa Neón', r: 255, g: 64, b: 129 },
];

export const LightingScreen: React.FC<LightingScreenProps> = ({ ble }) => {
  const { config, state } = ble;
  const isConnected = state === 'connected';

  const [brightness, setBrightness] = useState<number>(config.brightness);
  const [rgb, setRgb] = useState<{ r: number; g: number; b: number }>(config.color);

  // Al entrar a la pantalla, solicitar GET_CONFIG para precargar valores reales del reloj
  useEffect(() => {
    if (isConnected) {
      ble.sendCommand('GET_CONFIG');
    }
  }, [isConnected, ble]);

  // Sincronizar estado local cuando config cambia desde BLE
  useEffect(() => {
    setBrightness(config.brightness);
    setRgb(config.color);
  }, [config.brightness, config.color]);

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    ble.setBrightness(val);
  };

  const handleColorPreset = (c: { r: number; g: number; b: number }) => {
    setRgb(c);
    ble.setColor(c.r, c.g, c.b);
  };

  const handleRgbChannel = (channel: 'r' | 'g' | 'b', value: number) => {
    const updated = { ...rgb, [channel]: value };
    setRgb(updated);
    ble.setColor(updated.r, updated.g, updated.b);
  };

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-100">Iluminación WS2812B</h2>
          <p className="text-xs text-stone-400">Control de brillo y tono cromático de los 58 LEDs</p>
        </div>
        <button
          onClick={() => ble.sendCommand('GET_CONFIG')}
          disabled={!isConnected}
          className="p-2 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          title="Recargar GET_CONFIG"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar</span>
        </button>
      </div>

      {/* Vista previa en tiempo real de los 58 LEDs */}
      <div className="flex flex-col items-center">
        <LedDisplay58
          d1="1"
          d2="2"
          colon={true}
          d3="3"
          d4="0"
          color={rgb}
          brightness={brightness}
          className="w-full max-w-md"
        />
        <div className="text-[11px] font-mono text-stone-400 mt-2">
          Color: RGB({rgb.r}, {rgb.g}, {rgb.b}) · Brillo: {Math.round((brightness * 100) / 255)}% ({brightness}/255)
        </div>
      </div>

      {/* Slider de Brillo (0-255) -> SET_BRIGHTNESS */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-stone-100 text-sm">Brillo General (0 - 255)</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {Math.round((brightness * 100) / 255)}% ({brightness})
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="255"
          value={brightness}
          disabled={!isConnected}
          onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
        />

        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => handleBrightnessChange(15)}
            disabled={!isConnected}
            className="py-1 px-2 text-xs rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-center transition-colors disabled:opacity-40"
          >
            6% Noche
          </button>
          <button
            onClick={() => handleBrightnessChange(64)}
            disabled={!isConnected}
            className="py-1 px-2 text-xs rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-center transition-colors disabled:opacity-40"
          >
            25% Tenue
          </button>
          <button
            onClick={() => handleBrightnessChange(140)}
            disabled={!isConnected}
            className="py-1 px-2 text-xs rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-center transition-colors disabled:opacity-40"
          >
            55% Medio
          </button>
          <button
            onClick={() => handleBrightnessChange(255)}
            disabled={!isConnected}
            className="py-1 px-2 text-xs rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-center transition-colors disabled:opacity-40"
          >
            100% Máx
          </button>
        </div>
      </div>

      {/* Paleta de Colores Predefinidos */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-stone-100 text-sm">Paleta Recomendada WS2812B</span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {PRESET_COLORS.map((preset, idx) => {
            const isSelected =
              rgb.r === preset.r && rgb.g === preset.g && rgb.b === preset.b;
            return (
              <button
                key={idx}
                onClick={() => handleColorPreset(preset)}
                disabled={!isConnected}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  isSelected ? 'ring-2 ring-amber-400 bg-stone-800' : 'bg-stone-850 hover:bg-stone-800'
                } disabled:opacity-40`}
                title={preset.name}
              >
                <div
                  className="w-8 h-8 rounded-full border border-stone-700 shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})`,
                    boxShadow: isSelected
                      ? `0 0 12px rgb(${preset.r}, ${preset.g}, ${preset.b})`
                      : undefined,
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-black stroke-[3]" />}
                </div>
                <span className="text-[10px] text-stone-400 mt-1 truncate max-w-full text-center">
                  {preset.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ajuste Fino Canales RGB (0-255) */}
      <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-stone-100 text-sm">Ajuste Fino Canales RGB (SET_COLOR)</span>
        </div>

        <div className="space-y-3">
          {/* Rojo */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-red-400 font-medium">Canal Rojo (R)</span>
              <span className="font-mono text-stone-300 font-bold">{rgb.r}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.r}
              disabled={!isConnected}
              onChange={(e) => handleRgbChannel('r', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-40"
            />
          </div>

          {/* Verde */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400 font-medium">Canal Verde (G)</span>
              <span className="font-mono text-stone-300 font-bold">{rgb.g}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.g}
              disabled={!isConnected}
              onChange={(e) => handleRgbChannel('g', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
            />
          </div>

          {/* Azul */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-blue-400 font-medium">Canal Azul (B)</span>
              <span className="font-mono text-stone-300 font-bold">{rgb.b}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.b}
              disabled={!isConnected}
              onChange={(e) => handleRgbChannel('b', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
