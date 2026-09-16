import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Terminal, 
  AlertCircle,
  HelpCircle,
  Smartphone,
  Cpu
} from 'lucide-react';
import { ANDROID_PERMISSIONS_GUIDE } from '../data/sourceCodes';

export const ProtocolExplanation: React.FC = () => {
  return (
    <div className="space-y-8 text-slate-200">
      {/* SECTION 1: Arquitectura del Protocolo D:V */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">1. Arquitectura del Miniprotocolo "DIRECCIÓN:VELOCIDAD"</h3>
            <p className="text-xs text-slate-400">Estructura del paquete, serialización UTF-8 y flujo de datos de extremo a extremo</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-4">
          <p>
            Para mantener la latencia al mínimo y facilitar la depuración, el sistema implementa un protocolo textual ligero basado en caracteres ASCII/UTF-8. 
            Cada instrucción enviada desde la aplicación móvil o el cliente Web BLE se formatea de forma determinista como:
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-center my-4">
            <span className="text-emerald-400 font-bold text-lg">"D:V"</span>
            <div className="text-xs text-slate-400 mt-2 flex flex-wrap justify-center gap-6">
              <span><strong>D (Dirección):</strong> 'F' (Adelante), 'R' (Atrás), 'S' (Detener)</span>
              <span><strong>Separador:</strong> Carácter dos puntos ':' (ASCII 0x3A)</span>
              <span><strong>V (Velocidad):</strong> Entero ASCII 0 a 255 (8 bits PWM)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold block mb-1">Comando "F:200"</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Giro Adelante a 78.4% de potencia</p>
              <div className="text-slate-300 space-y-0.5">
                <div>• IN1 (GPIO 18): <strong className="text-emerald-400">HIGH (3.3V)</strong></div>
                <div>• IN2 (GPIO 19): <strong className="text-slate-400">LOW (0V)</strong></div>
                <div>• ENA (GPIO 21): <strong className="text-purple-400">PWM Duty 200/255</strong></div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-bold block mb-1">Comando "R:150"</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Giro Atrás a 58.8% de potencia</p>
              <div className="text-slate-300 space-y-0.5">
                <div>• IN1 (GPIO 18): <strong className="text-slate-400">LOW (0V)</strong></div>
                <div>• IN2 (GPIO 19): <strong className="text-blue-400">HIGH (3.3V)</strong></div>
                <div>• ENA (GPIO 21): <strong className="text-purple-400">PWM Duty 150/255</strong></div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-rose-400 font-bold block mb-1">Comando "S:0"</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Parada y frenado dinámico</p>
              <div className="text-slate-300 space-y-0.5">
                <div>• IN1 (GPIO 18): <strong className="text-slate-400">LOW (0V)</strong></div>
                <div>• IN2 (GPIO 19): <strong className="text-slate-400">LOW (0V)</strong></div>
                <div>• ENA (GPIO 21): <strong className="text-slate-400">PWM Duty 0</strong></div>
              </div>
            </div>
          </div>

          <h4 className="text-white font-semibold pt-2">Flujo de Control y Ejecución:</h4>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li><strong>Interacción en la App:</strong> El usuario presiona un botón o desliza la velocidad. La app ensambla el string (ej. <code className="text-indigo-300">"F:200"</code>).</li>
            <li><strong>Escritura GATT:</strong> La app codifica el string en bytes UTF-8 (<code className="text-indigo-300">[0x46, 0x3A, 0x32, 0x30, 0x30]</code>) y ejecuta <code className="text-indigo-300">writeCharacteristic()</code> en el UUID <code className="text-indigo-300">c565818d-6972-466d-88b0-517865f14d02</code>.</li>
            <li><strong>Interrupción en el ESP32:</strong> El stack BLE dispara el callback C++ <code className="text-indigo-300">MotorCharacteristicCallbacks::onWrite</code>.</li>
            <li><strong>Parseo y Hardware:</strong> El ESP32 localiza el separador <code className="text-indigo-300">':'</code>, extrae la dirección y convierte la subcadena de velocidad con <code className="text-indigo-300">atoi()</code>.</li>
            <li><strong>Failsafe de Desconexión:</strong> Si el enlace BLE se interrumpe (pérdida de señal o cierre de la app), el callback <code className="text-indigo-300">onDisconnect</code> detiene el motor automáticamente (<code className="text-indigo-300">setMotor('S', 0)</code>) para evitar colisiones.</li>
          </ol>
        </div>
      </div>

      {/* SECTION 2: Permisos Requeridos en Android */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">2. Permisos Requeridos en Android</h3>
            <p className="text-xs text-slate-400">Configuración para Android 12+ (API 31+) y compatibilidad con Android 6 a 11</p>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          {ANDROID_PERMISSIONS_GUIDE.sections.map((sec, idx) => (
            <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white mb-2">{sec.heading}</h4>
              {sec.content && <p className="text-slate-300 leading-relaxed mb-2">{sec.content}</p>}
              {sec.code && (
                <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
                  {sec.code}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Guía de Verificación y Pruebas Físicas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">3. Guía de Verificación Paso a Paso (Test Bench)</h3>
            <p className="text-xs text-slate-400">Validación de comandos con multímetro o en simulación</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {/* Prueba 1 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-xs font-mono">PRUEBA 1</span>
              <span>Giro Adelante: Enviar "F:200"</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <strong className="text-white block mb-1">Medición Eléctrica en Hardware:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>Multímetro en GPIO 18 (IN1): <strong>3.3V DC</strong> continuo.</li>
                  <li>Multímetro en GPIO 19 (IN2): <strong>0.0V DC</strong> continuo.</li>
                  <li>Multímetro en GPIO 21 (ENA): <strong>~2.58V DC</strong> promedio (3.3V * 200 / 255).</li>
                  <li>Borneras OUT1/OUT2 del L298N con batería de 12V: <strong>~9.4V DC</strong>.</li>
                </ul>
              </div>
              <div>
                <strong className="text-white block mb-1">Comportamiento Mecánico / Visual:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>El eje del motor debe rotar en sentido horario de forma continua y suave.</li>
                  <li>El LED verde IN1 en el L298N se ilumina firmemente.</li>
                  <li>En el simulador web: el tacómetro mostrará ~2510 RPM y el rotor girará a derechas.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Prueba 2 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-500/30">
            <div className="flex items-center gap-2 font-bold text-amber-400 mb-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-xs font-mono">PRUEBA 2</span>
              <span>Giro Atrás: Enviar "R:150"</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <strong className="text-white block mb-1">Medición Eléctrica en Hardware:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>Multímetro en GPIO 18 (IN1): <strong>0.0V DC</strong>.</li>
                  <li>Multímetro en GPIO 19 (IN2): <strong>3.3V DC</strong>.</li>
                  <li>Multímetro en GPIO 21 (ENA): <strong>~1.94V DC</strong> promedio (3.3V * 150 / 255).</li>
                  <li>Borneras OUT1/OUT2 del L298N: <strong>~ -7.0V DC</strong> (polaridad invertida).</li>
                </ul>
              </div>
              <div>
                <strong className="text-white block mb-1">Comportamiento Mecánico / Visual:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>El eje invierte inmediatamente su sentido a antihorario a una velocidad moderada (~59%).</li>
                  <li>El LED azul IN2 en el L298N se ilumina.</li>
                  <li>En el simulador web: el rotor cambia a giro antihorario con ~1880 RPM.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Prueba 3 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-rose-500/30">
            <div className="flex items-center gap-2 font-bold text-rose-400 mb-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-xs font-mono">PRUEBA 3</span>
              <span>Parada de Emergencia: Enviar "S:0"</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <strong className="text-white block mb-1">Medición Eléctrica en Hardware:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>Multímetro en GPIO 18 (IN1): <strong>0.0V DC</strong>.</li>
                  <li>Multímetro en GPIO 19 (IN2): <strong>0.0V DC</strong>.</li>
                  <li>Multímetro en GPIO 21 (ENA): <strong>0.0V DC</strong>.</li>
                  <li>Borneras OUT1/OUT2 del L298N: <strong>0.0V DC</strong> (ambos transistores desconectados).</li>
                </ul>
              </div>
              <div>
                <strong className="text-white block mb-1">Comportamiento Mecánico / Visual:</strong>
                <ul className="list-disc list-inside space-y-1">
                  <li>El motor se detiene de inmediato.</li>
                  <li>Todos los LEDs de señalización del L298N se apagan.</li>
                  <li>En el simulador web: el tacómetro cae a 0 RPM y el rotor se queda fijo.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
