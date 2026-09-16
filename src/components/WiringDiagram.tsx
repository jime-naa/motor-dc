import React from 'react';
import { Cpu, Zap, AlertTriangle, CheckCircle2, BatteryCharging, ArrowRight } from 'lucide-react';

export const WiringDiagram: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 mb-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-white">Esquemático de Conexión: ESP32 + Driver L298N + Motor DC</h3>
          <p className="text-xs text-slate-400">Distribución de pines físicos, masa común y alimentación de potencia</p>
        </div>
      </div>

      {/* Pin Mapping Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>DIRECCIÓN 1</span>
            <span className="text-emerald-400 font-bold">IN1</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white mb-1">
            <span className="text-indigo-400">ESP32 GPIO 18</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-emerald-400">L298N IN1</span>
          </div>
          <p className="text-[11px] text-slate-400">Controla el semi-puente 1 (Adelante = HIGH, Atrás = LOW)</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>DIRECCIÓN 2</span>
            <span className="text-blue-400 font-bold">IN2</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white mb-1">
            <span className="text-indigo-400">ESP32 GPIO 19</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-blue-400">L298N IN2</span>
          </div>
          <p className="text-[11px] text-slate-400">Controla el semi-puente 2 (Adelante = LOW, Atrás = HIGH)</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>VELOCIDAD PWM</span>
            <span className="text-purple-400 font-bold">ENA</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white mb-1">
            <span className="text-indigo-400">ESP32 GPIO 21</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-purple-400">L298N ENA</span>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold text-amber-300">
            ¡Quitar el jumper negro de ENA antes de conectar GPIO 21!
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>TIERRA COMÚN</span>
            <span className="text-slate-300 font-bold">GND</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white mb-1">
            <span className="text-indigo-400">ESP32 GND</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">L298N GND</span>
          </div>
          <p className="text-[11px] text-rose-300 font-semibold">
            ¡Obligatorio unir la tierra del ESP32 con la tierra de la batería!
          </p>
        </div>
      </div>

      {/* Visual Diagram Table */}
      <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 mb-6">
        <h4 className="text-sm font-bold text-white mb-3">Diagrama de Bloques de Alimentación y Conexiones</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Box 1: ESP32 */}
          <div className="p-4 rounded-lg bg-slate-900 border border-indigo-500/40">
            <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm mb-2">
              <Cpu className="w-4 h-4" />
              <span>ESP32 (Controlador BLE)</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>• Alimentado por USB 5V o pin VIN</li>
              <li>• <span className="text-emerald-400">GPIO 18</span> ───&gt; Cable Señal a L298N IN1</li>
              <li>• <span className="text-blue-400">GPIO 19</span> ───&gt; Cable Señal a L298N IN2</li>
              <li>• <span className="text-purple-400">GPIO 21</span> ───&gt; PWM (LEDC 5kHz) a L298N ENA</li>
              <li>• <span className="text-slate-200 font-bold">GND</span> ────────&gt; Bus GND común</li>
            </ul>
          </div>

          {/* Box 2: L298N Driver */}
          <div className="p-4 rounded-lg bg-slate-900 border border-red-500/40">
            <div className="flex items-center gap-2 font-bold text-red-300 text-sm mb-2">
              <Zap className="w-4 h-4" />
              <span>Módulo Puente H L298N</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>• <span className="text-amber-400">Bornera 12V</span> &lt;─── Batería (+) 7V a 12V</li>
              <li>• <span className="text-slate-200 font-bold">Bornera GND</span> &lt;─── Batería (-) Y ESP32 GND</li>
              <li>• <span className="text-emerald-400 font-bold">Jumper 5V</span>: Puesto (si batería es ≤12V)</li>
              <li>• <span className="text-purple-400 font-bold">Pin ENA</span>: Sin jumper, conectado a GPIO 21</li>
              <li>• <span className="text-cyan-400">OUT1 y OUT2</span> ──&gt; Bornes del Motor DC</li>
            </ul>
          </div>

          {/* Box 3: Motor & Power */}
          <div className="p-4 rounded-lg bg-slate-900 border border-amber-500/40">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm mb-2">
              <BatteryCharging className="w-4 h-4" />
              <span>Potencia &amp; Motor DC</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>• Batería externa recomendada: 2x 18650 Li-Ion (7.4V) o batería 12V</li>
              <li>• Motor DC estándar de 6V a 12V (amarillo TT o motorreductor metálico)</li>
              <li>• <span className="text-rose-400">Aviso:</span> El L298N tiene una caída interna de ~1.8V a 2V en sus transistores bipolares. Con 7.4V, al motor le llegarán máximo ~5.5V.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Critical Hardware Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block text-sm mb-1">
              1. Jumper ENA del Driver L298N
            </span>
            <p className="text-slate-300 leading-relaxed">
              El módulo L298N viene de fábrica con un pequeño jumper plástico colocado sobre los pines de <strong>ENA</strong>, 
              lo que mantiene la velocidad siempre al 100% conectándolo a 5V internos. 
              <strong> Es indispensable retirar este jumper</strong> y conectar el pin macho descubierto de ENA al <strong>GPIO 21</strong> del ESP32 
              para permitir el control de velocidad mediante modulación PWM.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300 block text-sm mb-1">
              2. Referencia de Tierra Común (GND)
            </span>
            <p className="text-slate-300 leading-relaxed">
              Si alimentas el ESP32 por USB y el motor con una batería externa conectada al L298N, 
              <strong> DEBES conectar un cable entre el pin GND del ESP32 y la bornera GND del L298N</strong>. 
              Sin esta masa común, las señales de control de GPIO 18, 19 y 21 no tendrán nivel de referencia, provocando que el motor no gire o se mueva erráticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
