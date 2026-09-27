import React, { useEffect, useState } from 'react';
import { BleManager } from '../../services/bleManager';
import { ClockAlarm } from '../../types/clock';
import { Bell, Edit3, Trash2, Check, X, RefreshCw } from 'lucide-react';

interface AlarmsScreenProps {
  ble: BleManager;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const AlarmsScreen: React.FC<AlarmsScreenProps> = ({ ble }) => {
  const { alarms, state } = ble;
  const isConnected = state === 'connected';

  const [editingAlarm, setEditingAlarm] = useState<ClockAlarm | null>(null);

  // Al entrar a la pantalla, sincronizar alarmas con GET_ALARMS
  useEffect(() => {
    if (isConnected) {
      ble.sendCommand('GET_ALARMS');
    }
  }, [isConnected, ble]);

  const handleToggle = (idx: number, currentEnabled: boolean) => {
    ble.toggleAlarm(idx, !currentEnabled);
  };

  const handleRemove = (idx: number) => {
    ble.removeAlarm(idx);
    if (editingAlarm?.index === idx) {
      setEditingAlarm(null);
    }
  };

  const handleSaveAlarm = (updated: ClockAlarm) => {
    ble.saveAlarm(updated);
    setEditingAlarm(null);
  };

  const formatDaysSummary = (daysMask: number): string => {
    if (daysMask === 0) return 'Una sola vez';
    if (daysMask === 127) return 'Todos los días';
    if (daysMask === 62) return 'Lun a Vie';
    if (daysMask === 65) return 'Fines de semana';

    const active: string[] = [];
    for (let i = 0; i < 7; i++) {
      if ((daysMask & (1 << i)) !== 0) {
        active.push(DAY_LABELS[i]);
      }
    }
    return active.join(', ');
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-100">Alarmas del Reloj</h2>
          <p className="text-xs text-stone-400">Hasta 5 alarmas en memoria no volátil del ESP32</p>
        </div>
        <button
          onClick={() => ble.sendCommand('GET_ALARMS')}
          disabled={!isConnected}
          className="p-2 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          title="Recargar GET_ALARMS"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar</span>
        </button>
      </div>

      {/* Lista de las 5 Alarmas (idx 0 a 4) */}
      <div className="space-y-3">
        {alarms.map((alarm) => {
          const isSlotActive = alarm.enabled;
          const h = alarm.hour.toString().padStart(2, '0');
          const m = alarm.minute.toString().padStart(2, '0');

          return (
            <div
              key={alarm.index}
              className={`p-4 rounded-2xl border transition-all ${
                isSlotActive
                  ? 'bg-stone-900/90 border-amber-500/40 shadow-sm'
                  : 'bg-stone-900/50 border-stone-800 text-stone-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSlotActive ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    #{alarm.index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-2xl font-mono font-bold tracking-tight ${
                          isSlotActive ? 'text-stone-100' : 'text-stone-500'
                        }`}
                      >
                        {h}:{m}
                      </span>
                      {alarm.label && (
                        <span className="text-xs text-stone-400 font-medium">({alarm.label})</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400">{formatDaysSummary(alarm.days)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón Editar */}
                  <button
                    onClick={() => setEditingAlarm(alarm)}
                    disabled={!isConnected}
                    className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-40"
                    title="Editar alarma"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Botón Borrar */}
                  <button
                    onClick={() => handleRemove(alarm.index)}
                    disabled={!isConnected}
                    className="p-2 hover:bg-red-950/40 rounded-xl text-stone-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Eliminar alarma (REMOVE_ALARM)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Switch Toggle (TOGGLE_ALARM) */}
                  <button
                    onClick={() => handleToggle(alarm.index, alarm.enabled)}
                    disabled={!isConnected}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 disabled:opacity-40 ${
                      alarm.enabled ? 'bg-amber-500' : 'bg-stone-800'
                    }`}
                    title={alarm.enabled ? 'Desactivar alarma' : 'Activar alarma'}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        alarm.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Editor de Alarma */}
      {editingAlarm && (
        <AlarmEditorModal
          alarm={editingAlarm}
          onSave={handleSaveAlarm}
          onCancel={() => setEditingAlarm(null)}
        />
      )}
    </div>
  );
};

interface AlarmEditorModalProps {
  alarm: ClockAlarm;
  onSave: (alarm: ClockAlarm) => void;
  onCancel: () => void;
}

const AlarmEditorModal: React.FC<AlarmEditorModalProps> = ({ alarm, onSave, onCancel }) => {
  const [hour, setHour] = useState(alarm.hour);
  const [minute, setMinute] = useState(alarm.minute);
  const [days, setDays] = useState(alarm.days);
  const [enabled, setEnabled] = useState(alarm.enabled);
  const [label, setLabel] = useState(alarm.label || `Alarma ${alarm.index + 1}`);

  const toggleDay = (dayBit: number) => {
    setDays((prev) => prev ^ (1 << dayBit));
  };

  const handleSave = () => {
    onSave({
      index: alarm.index,
      hour,
      minute,
      days,
      enabled,
      label,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-stone-100 text-base">Editar Alarma #{alarm.index + 1}</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Hora y Minuto */}
        <div className="flex justify-center items-center gap-3 py-2">
          <div className="flex flex-col items-center">
            <label className="text-[11px] text-stone-400 mb-1">Hora (0-23)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              className="w-20 text-center text-4xl font-mono font-bold bg-stone-800 border border-stone-700 rounded-2xl py-2 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <span className="text-3xl font-mono font-bold text-stone-400 mt-5">:</span>
          <div className="flex flex-col items-center">
            <label className="text-[11px] text-stone-400 mb-1">Minuto (0-59)</label>
            <input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              className="w-20 text-center text-4xl font-mono font-bold bg-stone-800 border border-stone-700 rounded-2xl py-2 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Selector de Días (Bitmask 0-127) */}
        <div>
          <label className="text-xs font-semibold text-stone-300 block mb-2">
            Días de Repetición (Bitmask actual: {days})
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((dName, bit) => {
              const isSelected = (days & (1 << bit)) !== 0;
              return (
                <button
                  key={bit}
                  type="button"
                  onClick={() => toggleDay(bit)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750'
                  }`}
                >
                  {dName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nombre Local */}
        <div>
          <label className="text-xs font-semibold text-stone-300 block mb-1">
            Nombre / Etiqueta (local en app)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            placeholder="Ej: Despertador, Medicamento..."
          />
        </div>

        {/* Activar / Desactivar */}
        <div className="flex items-center justify-between p-3 bg-stone-800/60 rounded-xl border border-stone-700/50">
          <span className="text-xs font-medium text-stone-300">Alarma habilitada</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Guardar en ESP32
          </button>
        </div>
      </div>
    </div>
  );
};
