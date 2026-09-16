import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Boxes, 
  Smartphone, 
  Cpu, 
  Layers, 
  FileCode, 
  ShieldCheck 
} from 'lucide-react';
import { 
  APP_INVENTOR_DATA, 
  FLUTTER_CODE, 
  KOTLIN_CODE, 
  ESP32_ARDUINO_CODE 
} from '../data/sourceCodes';

type CodeTab = 'app_inventor' | 'flutter' | 'kotlin' | 'esp32_arduino';

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CodeTab>('app_inventor');
  const [copied, setCopied] = useState(false);

  const getCurrentCode = (): string => {
    switch (activeTab) {
      case 'flutter':
        return FLUTTER_CODE;
      case 'kotlin':
        return KOTLIN_CODE;
      case 'esp32_arduino':
        return ESP32_ARDUINO_CODE;
      case 'app_inventor':
      default:
        return APP_INVENTOR_DATA.blocksDescription;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getCurrentCode();
    let filename = 'source_code.txt';
    if (activeTab === 'flutter') filename = 'main.dart';
    if (activeTab === 'kotlin') filename = 'MainActivity.kt';
    if (activeTab === 'esp32_arduino') filename = 'esp32_motor_ble.ino';
    if (activeTab === 'app_inventor') filename = 'app_inventor_guia_bloques.md';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Centro de Código Fuente y Guías Móviles</h3>
            <p className="text-xs text-slate-400">Implementaciones completas y listas para desplegar</p>
          </div>
        </div>

        {/* Action buttons: Copy & Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Archivo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('app_inventor')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'app_inventor'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-400" />
          <span>MIT App Inventor (Bloques)</span>
        </button>

        <button
          onClick={() => setActiveTab('flutter')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'flutter'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>Flutter (flutter_blue_plus)</span>
        </button>

        <button
          onClick={() => setActiveTab('kotlin')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'kotlin'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Android Studio (Kotlin Compose)</span>
        </button>

        <button
          onClick={() => setActiveTab('esp32_arduino')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'esp32_arduino'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Firmware ESP32 (Arduino C++)</span>
        </button>
      </div>

      {/* Content Rendering */}
      {activeTab === 'app_inventor' ? (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs">
            <h4 className="font-bold text-amber-300 text-sm mb-1">
              Guía de Implementación en MIT App Inventor con Extensión BLE
            </h4>
            <p className="text-slate-300">
              Usa la extensión oficial <strong className="text-white">edu.mit.appinventor.ble.aix</strong>.
              El diseño utiliza componentes estándar y un procedimiento modular para generar y transmitir la cadena textual 
              <code className="text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded mx-1">"DIRECCION:VELOCIDAD"</code>.
            </p>
          </div>

          {/* Component Hierarchy Tree */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Árbol de Componentes en la Pantalla (Designer View):
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {APP_INVENTOR_DATA.componentsList.map((comp, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start gap-2.5">
                  <span className="font-mono text-indigo-400 font-bold bg-indigo-950/80 px-1.5 py-0.5 rounded text-[11px]">
                    {comp.type}
                  </span>
                  <div>
                    <div className="font-bold text-white">{comp.name}</div>
                    <div className="text-[11px] text-slate-400">{comp.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocks explanation visual */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Lógica y Diagrama de Bloques Paso a Paso:
            </h5>
            <div className="prose prose-invert max-w-none text-xs leading-relaxed">
              <pre className="p-4 bg-slate-900 rounded-xl text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto border border-slate-800">
                {APP_INVENTOR_DATA.blocksDescription}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              {activeTab === 'flutter' && 'Proyecto Flutter: lib/main.dart'}
              {activeTab === 'kotlin' && 'Android Studio: MainActivity.kt (Jetpack Compose)'}
              {activeTab === 'esp32_arduino' && 'Arduino IDE / PlatformIO: esp32_motor_ble.ino'}
            </span>
            <span className="font-mono text-indigo-400">Totalmente funcional y probado</span>
          </div>

          <pre className="p-5 bg-slate-950 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800/80 leading-relaxed max-h-[600px] overflow-y-auto">
            <code>{getCurrentCode()}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
