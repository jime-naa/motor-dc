import React, { useState, useEffect, useRef } from 'react';
import { MotorDirection } from '../types';
import { 
  ArrowUp, 
  ArrowDown, 
  Square, 
  Zap, 
  Sliders, 
  AlertOctagon, 
  Send, 
  RotateCw, 
  RotateCcw,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Props {
  currentDirection: MotorDirection;
  currentSpeed: number;
  lastCommand: string;
  lastBytes: number[];
  isConnected: boolean;
  onSendCommand: (dir: MotorDirection, speed: number) => void;
}

export const MotorController: React.FC<Props> = ({
  currentDirection,
  currentSpeed,
  lastCommand,
  lastBytes,
  isConnected,
  onSendCommand,
}) => {
  const [speed, setSpeed] = useState<number>(currentSpeed);
  const [direction, setDirection] = useState<MotorDirection>(currentDirection);
  const [isLiveSending, setIsLiveSending] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSpeed(currentSpeed);
  }, [currentSpeed]);

  useEffect(() => {
    setDirection(currentDirection);
  }, [currentDirection]);

  // Handle direction click: triggers command immediately
  const handleDirectionClick = (newDir: MotorDirection) => {
    setDirection(newDir);
    const effectiveSpeed = newDir === 'S' ? 0 : (speed === 0 ? 150 : speed);
    if (newDir === 'S') {
      setSpeed(0);
    } else if (speed === 0) {
      setSpeed(150);
    }
    onSendCommand(newDir, effectiveSpeed);
  };

  // Handle slider changes
  const handleSliderChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    setIsLiveSending(true);

    // Debounce slider commands to ~60ms to prevent BLE GATT queue saturation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // If currently running, send new speed with active direction
      const activeDir = direction === 'S' ? 'F' : direction;
      if (direction === 'S') {
        setDirection('F');
      }
      onSendCommand(activeDir, newSpeed);
      setIsLiveSending(false);
    }, 60);
  };

  // Preset speed buttons
  const setPresetSpeed = (preset: number) => {
    setSpeed(preset);
    const activeDir = direction === 'S' ? 'F' : direction;
    if (direction === 'S') setDirection('F');
    onSendCommand(activeDir, preset);
  };

  // Emergency stop
  const handleEmergencyStop = () => {
    setSpeed(0);
    setDirection('S');
    onSendCommand('S', 0);
  };

  const commandPreview = `${direction}:${Math.round(speed)}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Controles de Movimiento y PWM</h3>
            <p className="text-xs text-slate-400">Generación y despacho de tramas UTF-8 hacia el ESP32</p>
          </div>
        </div>

        {/* Real-time Armed Command HUD */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Trama Armada</span>
            <span className="text-lg font-bold text-indigo-400 tracking-wider">
              {commandPreview}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Confirmado</span>
            <span className="text-sm font-semibold text-emerald-400">
              {lastCommand || 'Listo'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Direction Buttons */}
      <div className="mb-8">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
          1. Sentido de Giro (Dirección)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Forward */}
          <button
            id="btn-adelante"
            onClick={() => handleDirectionClick('F')}
            className={`p-4 rounded-xl border font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
              direction === 'F'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/40 ring-2 ring-emerald-500/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <ArrowUp className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base">Adelante</div>
              <div className="text-xs opacity-80 font-mono">Comando "F"</div>
            </div>
          </button>

          {/* Reverse */}
          <button
            id="btn-atras"
            onClick={() => handleDirectionClick('R')}
            className={`p-4 rounded-xl border font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
              direction === 'R'
                ? 'bg-amber-600 border-amber-400 text-white shadow-amber-900/40 ring-2 ring-amber-500/50'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <ArrowDown className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base">Atrás</div>
              <div className="text-xs opacity-80 font-mono">Comando "R"</div>
            </div>
          </button>

          {/* Stop Button */}
          <button
            id="btn-detener"
            onClick={() => handleDirectionClick('S')}
            className={`p-4 rounded-xl border font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
              direction === 'S'
                ? 'bg-slate-700 border-slate-500 text-white ring-2 ring-slate-400/30'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-600/30 text-slate-300">
              <Square className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base">Detener</div>
              <div className="text-xs opacity-80 font-mono">Comando "S"</div>
            </div>
          </button>
        </div>
      </div>

      {/* Speed Slider Section */}
      <div className="mb-6 p-5 bg-slate-950/70 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              2. Modulación por Ancho de Pulso (PWM / ENA)
            </label>
            <span className="text-xs text-slate-500">Rango estándar de 8 bits para ESP32 LEDC (0 - 255)</span>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-indigo-400">{Math.round(speed)}</span>
            <span className="text-xs text-slate-500 font-mono"> / 255 ({Math.round((speed / 255) * 100)}%)</span>
          </div>
        </div>

        {/* The Slider */}
        <div className="py-2">
          <input
            id="slider-velocidad"
            type="range"
            min="0"
            max="255"
            step="1"
            value={speed}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          {/* Ticks and marks */}
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-2 px-1">
            <span>0 (0%)</span>
            <span>64 (25%)</span>
            <span>128 (50%)</span>
            <span>192 (75%)</span>
            <span>255 (100%)</span>
          </div>
        </div>

        {/* Quick Speed Presets */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-900">
          <span className="text-xs text-slate-400 mr-2">Preajustes Rápidos:</span>
          {[
            { label: '25% (64)', val: 64 },
            { label: '50% (128)', val: 128 },
            { label: '75% (192)', val: 192 },
            { label: '100% (255)', val: 255 },
          ].map((preset) => (
            <button
              key={preset.val}
              onClick={() => setPresetSpeed(preset.val)}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => handleSliderChange(Math.max(0, speed - 5))}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Disminuir 5"
            >
              -5
            </button>
            <button
              onClick={() => handleSliderChange(Math.min(255, speed + 5))}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Aumentar 5"
            >
              +5
            </button>
          </div>
        </div>
      </div>

      {/* Emergency E-Stop Button */}
      <div className="mb-6">
        <button
          id="btn-parada-emergencia"
          onClick={handleEmergencyStop}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-3 shadow-lg shadow-red-950/50 transition-all cursor-pointer border border-red-500 active:scale-[0.99]"
        >
          <AlertOctagon className="w-5 h-5 animate-pulse" />
          <span>PARADA DE EMERGENCIA INMEDIATA (S:0)</span>
        </button>
      </div>

      {/* Low-Level Serialized Bytes Inspector */}
      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500 uppercase">Inspección de Bytes UTF-8 (Capa BLE):</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>GATT Write OK</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Payload:</span>
            <span className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              "{lastCommand || commandPreview}"
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Hexadecimal:</span>
            <div className="flex gap-1">
              {(lastBytes.length > 0 ? lastBytes : Array.from(new TextEncoder().encode(commandPreview))).map((b, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-indigo-950/60 text-indigo-300 rounded border border-indigo-900/50">
                  0x{b.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
