import React, { useState, useEffect, useCallback } from 'react';
import { 
  MotorDirection, 
  MotorState, 
  BleDeviceState, 
  CommandLogEntry, 
  DEFAULT_CONFIG 
} from './types';
import { bleService } from './services/bleService';
import { BleConnectionPanel } from './components/BleConnectionPanel';
import { MotorController } from './components/MotorController';
import { CodeViewer } from './components/CodeViewer';
import { WiringDiagram } from './components/WiringDiagram';
import { ProtocolExplanation } from './components/ProtocolExplanation';
import { 
  Sliders, 
  Code2, 
  Cpu, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Play, 
  RotateCcw,
  History,
  Trash2
} from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'controller' | 'code' | 'wiring' | 'protocol'>('controller');

  // BLE state
  const [bleState, setBleState] = useState<BleDeviceState>({
    status: 'disconnected',
    deviceName: null,
    deviceId: null,
    errorMessage: null,
    isSimulated: false,
  });

  // Motor state
  const [motorState, setMotorState] = useState<MotorState>({
    direction: 'S',
    speed: 0,
    isRunning: false,
    rpm: 0,
    in1: false,
    in2: false,
    enaPwm: 0,
    effectiveVoltage: 0,
    currentDrawAmps: 0,
  });

  const [lastCommand, setLastCommand] = useState<string>('S:0');
  const [lastBytes, setLastBytes] = useState<number[]>([0x53, 0x3a, 0x30]);
  const [commandLogs, setCommandLogs] = useState<CommandLogEntry[]>([]);

  // Setup BLE callbacks
  useEffect(() => {
    bleService.setCallbacks(
      (statusStr: string, msg?: string) => {
        setBleState((prev) => ({
          ...prev,
          status: statusStr as any,
          deviceName: bleService.getDeviceName(),
          errorMessage: statusStr === 'error' ? msg || 'Error de conexión' : null,
          isSimulated: bleService.isSimulated(),
        }));
      },
      (cmd: string, bytes: number[]) => {
        setLastCommand(cmd);
        setLastBytes(bytes);

        // Parse command to update motor simulation
        const parts = cmd.split(':');
        const dir = (parts[0] || 'S') as MotorDirection;
        const vel = parseInt(parts[1] || '0', 10);

        const in1 = dir === 'F';
        const in2 = dir === 'R';
        const enaPwm = dir === 'S' ? 0 : vel;
        const effectiveVoltage = enaPwm > 0 ? (12.0 - 1.8) * (enaPwm / 255) : 0;
        const rpm = Math.round((enaPwm / 255) * 3200);
        const currentDraw = enaPwm > 0 ? 0.25 + (enaPwm / 255) * 0.75 : 0;

        setMotorState({
          direction: dir,
          speed: vel,
          isRunning: dir !== 'S' && vel > 0,
          rpm,
          in1,
          in2,
          enaPwm,
          effectiveVoltage,
          currentDrawAmps: currentDraw,
        });

        // Add to history logs
        setCommandLogs((prev) => [
          {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            command: cmd,
            rawBytes: bytes,
            direction: dir,
            speed: vel,
            status: bleService.isSimulated() ? 'simulated' : 'sent',
          },
          ...prev.slice(0, 29), // Keep last 30 logs
        ]);
      }
    );

    // Conectar automáticamente al simulador virtual al iniciar
    // para garantizar operatividad instantánea en entornos web e iframes
    bleService.connectSimulator();
  }, []);

  // Handle command dispatch
  const handleSendCommand = useCallback(async (dir: MotorDirection, speed: number) => {
    try {
      await bleService.sendCommand(dir, speed);
    } catch (err: any) {
      console.error('Error al despachar comando:', err);
    }
  }, []);

  const isConnected = bleState.status === 'connected';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                  ESP32 BLE Motor Studio
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  L298N + BLE v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Servidor: <span className="font-mono text-slate-300">{DEFAULT_CONFIG.advertisedName}</span>
              </p>
            </div>
          </div>

          {/* Quick Connection Indicator in Header */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 border font-mono ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="hidden sm:inline">
                {isConnected 
                  ? (bleState.isSimulated ? 'ESP32 (Simulador)' : 'ESP32 (BLE Real)') 
                  : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-800/40 py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('controller')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'controller'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Controlador &amp; Simulador Físico</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código App (App Inventor / Flutter / Kotlin / ESP32)</span>
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'protocol'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Arquitectura Protocolo &amp; Permisos Android</span>
          </button>

          <button
            onClick={() => setActiveTab('wiring')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'wiring'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Esquemático de Pines &amp; Conexiones</span>
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'controller' && (
          <div className="space-y-6">
            {/* 1. BLE Connection Panel */}
            <BleConnectionPanel
              deviceState={bleState}
              onConnectReal={async () => {
                try {
                  await bleService.connectRealDevice();
                } catch (e) {
                  console.warn('Connect real error:', e);
                }
              }}
              onConnectSimulator={() => bleService.connectSimulator()}
              onDisconnect={() => bleService.disconnect()}
              onClearError={() => setBleState((prev) => ({ ...prev, errorMessage: null }))}
              isWebBleAvailable={bleService.isWebBleAvailable()}
            />

            {/* 2. Interactive Motor Controller */}
            <div className="max-w-2xl mx-auto w-full">
              <MotorController
                currentDirection={motorState.direction}
                currentSpeed={motorState.speed}
                lastCommand={lastCommand}
                lastBytes={lastBytes}
                isConnected={isConnected}
                onSendCommand={handleSendCommand}
              />
            </div>

            {/* 4. Live Transmission History Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>REGISTRO DE TRANSMISIONES BLE (Últimos comandos)</span>
                </div>
                {commandLogs.length > 0 && (
                  <button
                    onClick={() => setCommandLogs([])}
                    className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>

              {commandLogs.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono text-center py-4">
                  Sin comandos emitidos todavía. Conecta el dispositivo o simulador y pulsa Adelante/Atrás/Slider.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 font-mono text-xs">
                  {commandLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-slate-950/70 rounded-lg border border-slate-800/80 flex items-center justify-between text-slate-300"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.direction === 'F' 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : log.direction === 'R' 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {log.command}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="hidden sm:inline">Bytes:</span>
                        <span className="text-indigo-300">
                          [{log.rawBytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'code' && <CodeViewer />}
        {activeTab === 'protocol' && <ProtocolExplanation />}
        {activeTab === 'wiring' && <WiringDiagram />}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>Controlador BLE de Motor DC con Driver Puente H L298N &amp; ESP32 • Protocolo "DIRECCIÓN:VELOCIDAD"</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Service UUID: {DEFAULT_CONFIG.serviceUuid} | Characteristic UUID: {DEFAULT_CONFIG.characteristicUuid}
        </p>
      </footer>
    </div>
  );
}
