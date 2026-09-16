import React, { useEffect, useState } from 'react';
import { MotorState } from '../types';
import { Activity, Gauge, Zap, AlertCircle, Compass, Cpu } from 'lucide-react';

interface Props {
  motorState: MotorState;
}

export const HardwareSimulator: React.FC<Props> = ({ motorState }) => {
  const [rotationAngle, setRotationAngle] = useState(0);

  // Animate motor shaft rotation based on speed and direction
  useEffect(() => {
    if (motorState.direction === 'S' || motorState.speed === 0) {
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Speed scale: 255 -> ~20 revolutions per second (1200 deg/s)
      const degPerSec = (motorState.speed / 255) * 1440;
      const directionMultiplier = motorState.direction === 'F' ? 1 : -1;

      setRotationAngle((prev) => (prev + directionMultiplier * degPerSec * delta) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [motorState.direction, motorState.speed]);

  const dutyCyclePercent = Math.round((motorState.speed / 255) * 100);
  const isRotating = motorState.direction !== 'S' && motorState.speed > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Simulador Físico L298N &amp; Motor DC</h3>
            <p className="text-xs text-slate-400">Respuesta electromecánica y lógica de pines en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Estado:</span>
          <span className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
            isRotating 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRotating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isRotating ? (motorState.direction === 'F' ? 'Adelante (CW)' : 'Atrás (CCW)') : 'Detenido'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual 1: Motor DC Animado con Tacómetro */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>TACÓMETRO VIRTUAL</span>
          </div>

          {/* Motor Graphic Container */}
          <div className="relative w-48 h-48 my-4 flex items-center justify-center">
            {/* Outer Stator casing */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl flex items-center justify-center">
              {/* Magnetic Poles markings */}
              <div className="absolute -top-3 text-[10px] font-mono font-bold text-red-400 tracking-wider">POLO NORTE (N)</div>
              <div className="absolute -bottom-3 text-[10px] font-mono font-bold text-blue-400 tracking-wider">POLO SUR (S)</div>
              
              {/* Copper Windings visuals */}
              <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-amber-600/40" />
            </div>

            {/* Rotating Rotor / Shaft */}
            <div 
              className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-slate-700 via-slate-600 to-slate-500 shadow-inner flex items-center justify-center transition-transform"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
              }}
            >
              {/* Rotor Notch & Spokes */}
              <div className="absolute w-full h-1.5 bg-amber-400 rounded-full shadow" />
              <div className="absolute h-full w-1.5 bg-amber-400 rounded-full shadow" />
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-300 shadow flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              </div>

              {/* Direction Indicator Arrow */}
              {isRotating && (
                <div className="absolute -top-2 right-2 text-xs font-bold text-amber-300">
                  {motorState.direction === 'F' ? '↻' : '↺'}
                </div>
              )}
            </div>

            {/* Direction Badge */}
            {isRotating && (
              <div className={`absolute -bottom-2 px-3 py-0.5 rounded-full text-[11px] font-bold shadow-md border ${
                motorState.direction === 'F' 
                  ? 'bg-emerald-600/90 text-white border-emerald-400' 
                  : 'bg-amber-600/90 text-white border-amber-400'
              }`}>
                {motorState.direction === 'F' ? 'Giro Horario (F)' : 'Giro Antihorario (R)'}
              </div>
            )}
          </div>

          {/* RPM & Electrical Telemetry */}
          <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/80 text-center">
            <div className="p-2 bg-slate-900/80 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Velocidad</span>
              <span className="text-base font-bold font-mono text-indigo-300">{motorState.rpm}</span>
              <span className="text-[10px] text-slate-500 block">RPM est.</span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Voltaje Ef.</span>
              <span className="text-base font-bold font-mono text-emerald-300">{motorState.effectiveVoltage.toFixed(1)}V</span>
              <span className="text-[10px] text-slate-500 block">en bornes DC</span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Consumo</span>
              <span className="text-base font-bold font-mono text-amber-300">{motorState.currentDrawAmps.toFixed(2)}A</span>
              <span className="text-[10px] text-slate-500 block">corriente est.</span>
            </div>
          </div>
        </div>

        {/* Visual 2: Placa Driver Puente H L298N */}
        <div className="lg:col-span-6 p-5 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>ESTADO DEL PUENTE H (L298N)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Caída VCEsat: ~1.8V</span>
          </div>

          {/* L298N Module Visual Layout */}
          <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 relative mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-red-300 tracking-wider">MÓDULO L298N DUAL H-BRIDGE</span>
              <span className="text-[10px] bg-red-900/50 text-red-200 px-2 py-0.5 rounded font-mono">Canal A (OUT1/OUT2)</span>
            </div>

            {/* Heatsink representation */}
            <div className="h-6 w-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded flex items-center justify-center gap-2 mb-3 shadow-inner">
              <span className="text-[10px] text-slate-300 font-mono font-semibold">DISIPADOR DE ALUMINIO L298N</span>
            </div>

            {/* Pins LED Status Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* IN1 */}
              <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center transition-all ${
                motorState.in1 
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                  : 'bg-slate-900/70 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${motorState.in1 ? 'bg-emerald-400 shadow-glow' : 'bg-slate-700'}`} />
                  <span className="font-bold font-mono">IN1</span>
                </div>
                <span className="text-[10px] text-slate-400">GPIO 18</span>
                <span className="font-mono font-bold mt-1">{motorState.in1 ? 'HIGH (3.3V)' : 'LOW (0V)'}</span>
              </div>

              {/* IN2 */}
              <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center transition-all ${
                motorState.in2 
                  ? 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
                  : 'bg-slate-900/70 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${motorState.in2 ? 'bg-blue-400 shadow-glow' : 'bg-slate-700'}`} />
                  <span className="font-bold font-mono">IN2</span>
                </div>
                <span className="text-[10px] text-slate-400">GPIO 19</span>
                <span className="font-mono font-bold mt-1">{motorState.in2 ? 'HIGH (3.3V)' : 'LOW (0V)'}</span>
              </div>

              {/* ENA (PWM) */}
              <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center transition-all ${
                motorState.enaPwm > 0 
                  ? 'bg-purple-950/70 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                  : 'bg-slate-900/70 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span 
                    className="w-2.5 h-2.5 rounded-full bg-purple-400 transition-opacity" 
                    style={{ opacity: motorState.enaPwm > 0 ? Math.max(0.3, motorState.enaPwm / 255) : 0.2 }}
                  />
                  <span className="font-bold font-mono">ENA (PWM)</span>
                </div>
                <span className="text-[10px] text-slate-400">GPIO 21</span>
                <span className="font-mono font-bold mt-1">{motorState.enaPwm} / 255</span>
              </div>
            </div>
          </div>

          {/* Logic Table Summary */}
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs">
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span>Tabla de verdad activa:</span>
              <span className="font-mono font-bold text-white">
                {motorState.direction === 'F' && 'IN1=1, IN2=0 (Transistores Q1 & Q4 conducen)'}
                {motorState.direction === 'R' && 'IN1=0, IN2=1 (Transistores Q2 & Q3 conducen)'}
                {motorState.direction === 'S' && 'IN1=0, IN2=0 (Freno por inercia / parada)'}
              </span>
            </div>
            
            {/* Duty cycle bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Ciclo de Trabajo PWM (LEDC):</span>
                <span className="font-mono font-bold text-indigo-400">{dutyCyclePercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-150 rounded-full"
                  style={{ width: `${dutyCyclePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
