import React, { useEffect, useRef, useState } from 'react';
import { MotorState } from '../types';
import { Bot, RotateCcw, Sparkles, Navigation, Gauge, Infinity as InfinityIcon } from 'lucide-react';

interface Props {
  motorState: MotorState;
}

export const RobotSimulator: React.FC<Props> = ({ motorState }) => {
  // Coordenadas absolutas acumuladas del robot (avanza infinitamente sin muros)
  const [worldX, setWorldX] = useState(0);
  const [worldY, setWorldY] = useState(0);
  const [heading, setHeading] = useState(0); // radianes, 0 = hacia adelante (+X)
  const [distanceTraveled, setDistanceTraveled] = useState(0); // metros simulados
  const [wheelTurn, setWheelTurn] = useState(0);

  // Rastro relativo para renderizar en la cámara centrada
  const [trail, setTrail] = useState<Array<{ x: number; y: number }>>([]);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Reiniciar cuentakilómetros y posición
  const handleReset = () => {
    setWorldX(0);
    setWorldY(0);
    setHeading(0);
    setDistanceTraveled(0);
    setWheelTurn(0);
    setTrail([]);
  };

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);

        if (motorState.direction !== 'S' && motorState.speed > 0) {
          const speedNorm = motorState.speed / 255;
          const linearSpeed = speedNorm * 140; // píxeles por segundo
          const dirFactor = motorState.direction === 'F' ? 1 : -1;

          const dx = Math.cos(heading) * linearSpeed * dirFactor * delta;
          const dy = Math.sin(heading) * linearSpeed * dirFactor * delta;
          const distStep = Math.hypot(dx, dy);

          setWheelTurn((prev) => (prev + dirFactor * speedNorm * 25) % 360);
          setDistanceTraveled((prev) => prev + (distStep * 0.05)); // escalado simulado en metros

          setWorldX((prevX) => {
            const nextX = prevX + dx;
            setWorldY((prevY) => {
              const nextY = prevY + dy;

              // Registrar puntos en el rastro
              setTrail((prevTrail) => {
                const last = prevTrail[prevTrail.length - 1];
                if (!last || Math.hypot(last.x - nextX, last.y - nextY) > 10) {
                  return [...prevTrail.slice(-60), { x: nextX, y: nextY }];
                }
                return prevTrail;
              });

              return nextY;
            });
            return nextX;
          });
        }
      }

      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [motorState.direction, motorState.speed, heading]);

  const speedPercent = Math.round((motorState.speed / 255) * 100);

  // El robot se mantiene siempre en el centro visual (250, 140).
  // La grilla y el rastro se desplazan en sentido opuesto (-worldX, -worldY)
  // creando la ilusión perfecta de un mundo infinito e ininterrumpido.
  const centerX = 250;
  const centerY = 140;

  // Offset del fondo infinito con repetición módulo 40px
  const gridOffsetX = (-worldX) % 40;
  const gridOffsetY = (-worldY) % 40;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Simulador Robot ESP32</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <InfinityIcon className="w-3 h-3" />
                Mundo Infinito
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Cámara en seguimiento continuo: sin límites ni colisiones
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Reiniciar odometría"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Reset Odómetro</span>
        </button>
      </div>

      {/* Infinite Canvas Viewport */}
      <div className="relative w-full h-[280px] bg-slate-950/95 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Infinite Moving Grid Floor */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle, #6366f1 1.5px, transparent 1.5px),
              linear-gradient(to right, #312e81 1px, transparent 1px),
              linear-gradient(to bottom, #312e81 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          }}
        />

        {/* Trail SVG transformado con la cámara del robot */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 500 280">
          {trail.length > 1 && (
            <polyline
              points={trail
                .map((p) => {
                  const screenX = centerX + (p.x - worldX);
                  const screenY = centerY + (p.y - worldY);
                  return `${screenX},${screenY}`;
                })
                .join(' ')}
              fill="none"
              stroke="#818cf8"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              strokeOpacity="0.65"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Robot SVG fijado en el centro con rotación */}
        <svg
          className="absolute pointer-events-none z-10 transition-transform duration-75"
          style={{
            left: `${centerX}px`,
            top: `${centerY}px`,
            transform: `translate(-50%, -50%) rotate(${heading * (180 / Math.PI)}deg)`,
            width: '94px',
            height: '74px',
          }}
          viewBox="0 0 94 74"
        >
          {/* Sombra proyectada en el suelo infinito */}
          <ellipse cx="45" cy="40" rx="38" ry="24" fill="#020617" fillOpacity="0.7" />

          {/* Rueda Superior Izquierda (con textura giratoria) */}
          <rect
            x="16"
            y="3"
            width="36"
            height="11"
            rx="3"
            fill="#0f172a"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <g transform={`rotate(${wheelTurn} 34 8)`}>
            <line x1="22" y1="3" x2="22" y2="14" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="34" y1="3" x2="34" y2="14" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="46" y1="3" x2="46" y2="14" stroke="#94a3b8" strokeWidth="1.5" />
          </g>

          {/* Rueda Inferior Derecha (con textura giratoria) */}
          <rect
            x="16"
            y="60"
            width="36"
            height="11"
            rx="3"
            fill="#0f172a"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <g transform={`rotate(${wheelTurn} 34 65)`}>
            <line x1="22" y1="60" x2="22" y2="71" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="34" y1="60" x2="34" y2="71" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="46" y1="60" x2="46" y2="71" stroke="#94a3b8" strokeWidth="1.5" />
          </g>

          {/* Rueda Loca Trasera (Caster) */}
          <circle cx="8" cy="37" r="5.5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />

          {/* Chasis Acrílico Principal */}
          <rect
            x="12"
            y="15"
            width="66"
            height="44"
            rx="9"
            fill="#090d16"
            stroke="#6366f1"
            strokeWidth="2.5"
          />

          {/* Placa ESP32 en el centro */}
          <rect
            x="24"
            y="23"
            width="34"
            height="28"
            rx="4"
            fill="#1e1b4b"
            stroke="#818cf8"
            strokeWidth="1.5"
          />
          {/* Antena PCB de oro/cobre ESP32 */}
          <path
            d="M 28 26 L 32 26 L 32 29 L 36 29 L 36 26 L 40 26"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          {/* Microcontrolador SoC metálico */}
          <rect x="42" y="27" width="12" height="12" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />

          {/* LED Azul BLE / Verde de estado en el ESP32 */}
          <circle
            cx="32"
            cy="44"
            r="2.5"
            fill={motorState.isRunning ? '#38bdf8' : '#475569'}
            className={motorState.isRunning ? 'animate-pulse' : ''}
          />
          <circle
            cx="38"
            cy="44"
            r="2.5"
            fill={motorState.isRunning ? '#10b981' : '#475569'}
            className={motorState.isRunning ? 'animate-pulse' : ''}
          />

          {/* Sensor Frontal Ultrasonido HC-SR04 (ojitos) */}
          <rect x="76" y="23" width="7" height="28" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="79.5" cy="29" r="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="79.5" cy="45" r="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />

          {/* Haz de luz de faros delanteros cuando va hacia adelante */}
          {motorState.direction === 'F' && motorState.speed > 0 && (
            <>
              <polygon points="84,26 125,10 125,40" fill="#38bdf8" fillOpacity="0.25" />
              <polygon points="84,48 125,35 125,65" fill="#38bdf8" fillOpacity="0.25" />
            </>
          )}

          {/* Luces traseras de reversa/freno */}
          {motorState.direction === 'R' && (
            <>
              <circle cx="14" cy="23" r="2.5" fill="#f43f5e" className="animate-ping" />
              <circle cx="14" cy="51" r="2.5" fill="#f43f5e" className="animate-ping" />
            </>
          )}
          {motorState.direction === 'S' && (
            <>
              <circle cx="14" cy="23" r="2" fill="#ef4444" />
              <circle cx="14" cy="51" r="2" fill="#ef4444" />
            </>
          )}
        </svg>

        {/* Overlay Telemetry HUD */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 z-20">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-sm">
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {motorState.direction === 'F'
                ? 'ADELANTE'
                : motorState.direction === 'R'
                ? 'REVERSA'
                : 'FRENADO'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-sm">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>{speedPercent}% ({motorState.speed} PWM)</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 shadow-sm">
            <InfinityIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>{distanceTraveled.toFixed(1)} m recorridos</span>
          </div>
        </div>

        {/* Controles de orientación de dirección */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/85 border border-slate-800 rounded-lg p-1 z-20 shadow-md">
          <button
            onClick={() => setHeading((h) => h - Math.PI / 4)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer font-mono transition-colors"
            title="Girar 45° a la izquierda"
          >
            ↺ -45°
          </button>
          <button
            onClick={() => setHeading((h) => h + Math.PI / 4)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer font-mono transition-colors"
            title="Girar 45° a la derecha"
          >
            ↻ +45°
          </button>
        </div>
      </div>

      {/* Simulator Footer Status */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {motorState.isRunning
              ? `Rodando sin límites por el espacio infinito (${motorState.speed} PWM)`
              : 'Robot en pausa. Presiona Adelante o Reversa para que avance sin fin.'}
          </span>
        </span>
        <span className="font-mono text-[11px] text-indigo-400">
          Pos: [{Math.round(worldX)}, {Math.round(worldY)}]
        </span>
      </div>
    </div>
  );
};
