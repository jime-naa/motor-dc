import React from 'react';
import { BleDeviceState, DEFAULT_CONFIG } from '../types';
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothSearching, 
  RefreshCw, 
  Power, 
  CheckCircle2, 
  AlertTriangle,
  PlayCircle,
  Radio,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface Props {
  deviceState: BleDeviceState;
  onConnectReal: () => void;
  onConnectSimulator: () => void;
  onDisconnect: () => void;
  onClearError?: () => void;
  isWebBleAvailable: boolean;
}

export const BleConnectionPanel: React.FC<Props> = ({
  deviceState,
  onConnectReal,
  onConnectSimulator,
  onDisconnect,
  onClearError,
  isWebBleAvailable,
}) => {
  const isConnected = deviceState.status === 'connected';
  const isScanning = deviceState.status === 'scanning';
  const isConnecting = deviceState.status === 'connecting';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 mb-6">
      {/* Fallback Banner if error or Web Bluetooth unavailable */}
      {deviceState.errorMessage && (
        <div className="mb-5 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-300 mb-0.5">Aviso de compatibilidad Bluetooth</p>
              <p className="text-xs text-rose-200/90 leading-relaxed">{deviceState.errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              id="btn-activar-simulador-error"
              onClick={onConnectSimulator}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Usar Simulador Ahora</span>
            </button>
            {onClearError && (
              <button
                id="btn-cerrar-error-ble"
                onClick={onClearError}
                className="px-2.5 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800/50 text-rose-300 text-xs transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : isScanning || isConnecting
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isConnected ? (
              <BluetoothConnected className="w-5 h-5" />
            ) : isScanning ? (
              <BluetoothSearching className="w-5 h-5 animate-spin" />
            ) : (
              <Bluetooth className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Enlace Bluetooth Low Energy (BLE)</span>
              {deviceState.isSimulated && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Modo Simulación
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              GATT Server: <span className="font-mono text-indigo-300">{DEFAULT_CONFIG.advertisedName}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Estado:</span>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            isConnected
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isConnecting || isScanning
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : deviceState.status === 'error'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400'
                : isConnecting || isScanning
                ? 'bg-amber-400'
                : deviceState.status === 'error'
                ? 'bg-rose-400'
                : 'bg-slate-500'
            }`} />
            <span>
              {isConnected
                ? `Conectado: ${deviceState.deviceName || 'ESP32'}`
                : isScanning
                ? 'Escaneando dispositivos...'
                : isConnecting
                ? 'Conectando...'
                : deviceState.status === 'error'
                ? 'Error de conexión'
                : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Real BLE or Simulator */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-5">
        <div className="sm:col-span-8 flex flex-wrap gap-2">
          {isConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-desconectar-ble"
                onClick={onDisconnect}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Power className="w-4 h-4" />
                <span>Desconectar {deviceState.isSimulated ? 'Simulador' : 'BLE'}</span>
              </button>

              {deviceState.isSimulated && (
                <button
                  id="btn-cambiar-a-real"
                  onClick={onConnectReal}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-indigo-100 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>Probar Conectar ESP32 Físico</span>
                </button>
              )}

              {!deviceState.isSimulated && (
                <button
                  id="btn-volver-a-simulador"
                  onClick={onConnectSimulator}
                  className="px-4 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Cambiar a Simulador Virtual</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                id="btn-activar-simulador"
                onClick={onConnectSimulator}
                disabled={isScanning || isConnecting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/40 disabled:opacity-50"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Activar Simulador Virtual (Recomendado)</span>
              </button>

              <button
                id="btn-conectar-esp32-real"
                onClick={onConnectReal}
                disabled={isScanning || isConnecting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Bluetooth className="w-4 h-4 text-indigo-400" />
                <span>Escanear ESP32 Real</span>
              </button>
            </>
          )}
        </div>

        {/* Browser compatibility check indicator */}
        <div className="sm:col-span-4 flex items-center sm:justify-end text-xs text-slate-400">
          {isWebBleAvailable ? (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Web Bluetooth Disponible</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-900/50" title="Web Bluetooth requiere Chrome/Edge en Android o PC abriendo la web directamente.">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Modo Simulación Habilitado</span>
            </span>
          )}
        </div>
      </div>

      {/* Detailed UUID parameters */}
      <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 text-xs font-mono">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold mb-0.5">
              Service UUID (GATT Primario)
            </span>
            <span className="text-indigo-300 select-all font-mono">{DEFAULT_CONFIG.serviceUuid}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold mb-0.5">
              Characteristic UUID (Motor Write)
            </span>
            <span className="text-indigo-300 select-all font-mono">{DEFAULT_CONFIG.characteristicUuid}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
