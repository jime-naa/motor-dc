import { DEFAULT_CONFIG, MotorDirection } from '../types';

export class BleService {
  private device: any | null = null;
  private server: any | null = null;
  private characteristic: any | null = null;
  private onStatusChangeCallback: ((status: string, message?: string) => void) | null = null;
  private onCommandSentCallback: ((cmd: string, bytes: number[]) => void) | null = null;
  private simulated: boolean = false;

  public isWebBleAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && typeof (navigator as any).bluetooth?.requestDevice === 'function';
  }

  public isInIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  public setCallbacks(
    onStatusChange: (status: string, message?: string) => void,
    onCommandSent: (cmd: string, bytes: number[]) => void
  ) {
    this.onStatusChangeCallback = onStatusChange;
    this.onCommandSentCallback = onCommandSent;
  }

  public async connectRealDevice(): Promise<boolean> {
    if (!this.isWebBleAvailable()) {
      const msg = 'Web Bluetooth API no está disponible en este navegador o entorno. Usa Google Chrome en Android, Windows o Mac (abierto directamente en una pestaña), o activa el modo Simulación.';
      console.warn(msg);
      this.onStatusChangeCallback?.('error', msg);
      return false;
    }

    try {
      this.simulated = false;
      this.onStatusChangeCallback?.('scanning', 'Buscando "ESP32_Motor_Control"...');

      // Request device with name or service filter
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: DEFAULT_CONFIG.advertisedName },
          { namePrefix: 'ESP32' },
          { services: [DEFAULT_CONFIG.serviceUuid] },
        ],
        optionalServices: [DEFAULT_CONFIG.serviceUuid],
      });

      this.device = device;
      this.onStatusChangeCallback?.('connecting', `Conectando con ${device.name || 'ESP32'}...`);

      device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

      const server = await device.gatt.connect();
      this.server = server;

      const service = await server.getPrimaryService(DEFAULT_CONFIG.serviceUuid);
      this.characteristic = await service.getCharacteristic(DEFAULT_CONFIG.characteristicUuid);

      this.onStatusChangeCallback?.('connected', `Conectado a ${device.name || 'ESP32'}`);
      return true;
    } catch (err: any) {
      console.warn('BLE connect error:', err);
      if (err.name === 'NotFoundError') {
        this.onStatusChangeCallback?.('disconnected', 'Búsqueda cancelada o no se seleccionó ningún dispositivo');
      } else if (err.name === 'SecurityError') {
        this.onStatusChangeCallback?.(
          'error',
          'Acceso a Bluetooth restringido por la política de seguridad del iframe. Abre la aplicación en una pestaña nueva o usa el modo Simulación.'
        );
      } else if (err.name === 'NotSupportedError') {
        this.onStatusChangeCallback?.('error', 'Web Bluetooth no está soportado en este sistema operativo/navegador.');
      } else {
        this.onStatusChangeCallback?.('error', err.message || 'Error al conectar con el ESP32');
      }
      return false;
    }
  }

  public connectSimulator(): void {
    this.simulated = true;
    this.onStatusChangeCallback?.('connecting', 'Iniciando simulador de ESP32 local...');
    setTimeout(() => {
      this.onStatusChangeCallback?.('connected', 'Conectado a ESP32_Motor_Control [Simulador]');
    }, 200);
  }

  public async disconnect(): Promise<void> {
    if (this.simulated) {
      this.simulated = false;
      this.onStatusChangeCallback?.('disconnected', 'Desconectado del simulador');
      return;
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.onStatusChangeCallback?.('disconnecting', 'Desconectando...');
      try {
        this.device.gatt.disconnect();
      } catch (e) {
        console.warn('Error disconnecting gatt:', e);
      }
    } else {
      this.onStatusChangeCallback?.('disconnected', 'Desconectado');
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  private handleDisconnection() {
    this.onStatusChangeCallback?.('disconnected', 'El ESP32 se ha desconectado');
    this.characteristic = null;
    this.server = null;
  }

  public async sendCommand(direction: MotorDirection, speed: number): Promise<boolean> {
    // Protocol format: "D:V" e.g. "F:255"
    const clampedSpeed = Math.max(0, Math.min(255, Math.round(speed)));
    const commandString = `${direction}:${clampedSpeed}`;
    const encoder = new TextEncoder();
    const rawBytes = Array.from(encoder.encode(commandString));

    // If simulated or if there's no real hardware connected, simulate seamlessly
    if (this.simulated || !this.characteristic) {
      if (!this.simulated) {
        this.simulated = true;
        this.onStatusChangeCallback?.('connected', 'Conectado a ESP32_Motor_Control [Simulador]');
      }
      this.onCommandSentCallback?.(commandString, rawBytes);
      return true;
    }

    try {
      const buffer = encoder.encode(commandString);
      if (this.characteristic.writeValueWithResponse) {
        await this.characteristic.writeValueWithResponse(buffer);
      } else {
        await this.characteristic.writeValue(buffer);
      }
      this.onCommandSentCallback?.(commandString, rawBytes);
      return true;
    } catch (err: any) {
      console.error('Error enviando comando BLE:', err);
      this.onStatusChangeCallback?.('error', `Fallo al enviar comando: ${err.message}`);
      throw err;
    }
  }

  public isSimulated(): boolean {
    return this.simulated;
  }

  public isConnected(): boolean {
    if (this.simulated) return true;
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  public getDeviceName(): string | null {
    if (this.simulated) return `${DEFAULT_CONFIG.advertisedName} (Virtual)`;
    return this.device?.name || null;
  }
}

export const bleService = new BleService();
