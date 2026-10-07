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
      const msg = 'Web Bluetooth no está habilitado o disponible en este navegador. Asegúrate de usar Chrome o Edge en Android, Windows o Mac abriendo la app directamente (no dentro de un visor web restringido).';
      console.warn(msg);
      this.onStatusChangeCallback?.('error', msg);
      return false;
    }

    try {
      this.simulated = false;
      this.onStatusChangeCallback?.('scanning', 'Buscando dispositivos Bluetooth cercanos...');

      // Estrategia de solicitud robusta:
      // Primero intentamos con filtro amplio o acceptAllDevices para máxima compatibilidad con cualquier firmware ESP32
      let device: any = null;

      try {
        device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { name: DEFAULT_CONFIG.advertisedName },
            { namePrefix: 'ESP32' },
            { namePrefix: 'esp32' },
            { services: [DEFAULT_CONFIG.serviceUuid] },
          ],
          optionalServices: [
            DEFAULT_CONFIG.serviceUuid,
            'generic_access',
            'generic_attribute',
          ],
        });
      } catch (filterErr: any) {
        // Si el filtro específico falla o fue cancelado por no ver el nombre exacto, 
        // probamos acceptAllDevices (permite al usuario elegir cualquier BLE visible)
        if (filterErr.name !== 'NotFoundError') {
          throw filterErr;
        }

        console.log('Filtro por nombre no encontró el dispositivo, intentando con acceptAllDevices...');
        device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            DEFAULT_CONFIG.serviceUuid,
            'generic_access',
            'generic_attribute',
          ],
        });
      }

      if (!device) {
        this.onStatusChangeCallback?.('disconnected', 'No se seleccionó ningún dispositivo');
        return false;
      }

      this.device = device;
      const deviceName = device.name || 'Dispositivo ESP32';
      this.onStatusChangeCallback?.('connecting', `Conectando con ${deviceName}...`);

      device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

      const server = await device.gatt.connect();
      this.server = server;

      // Descubrir servicio del motor
      let service: any = null;
      try {
        service = await server.getPrimaryService(DEFAULT_CONFIG.serviceUuid);
      } catch (serviceErr) {
        console.warn('No se encontró el servicio con UUID primario exacto, explorando servicios disponibles...', serviceErr);
        // Intentar obtener todos los servicios primarios para hallar la característica
        const services = await server.getPrimaryServices();
        for (const s of services) {
          try {
            const char = await s.getCharacteristic(DEFAULT_CONFIG.characteristicUuid);
            if (char) {
              service = s;
              this.characteristic = char;
              break;
            }
          } catch {
            // continuar probando otros servicios
          }
        }
      }

      if (!this.characteristic) {
        if (!service) {
          throw new Error(`No se encontró el servicio GATT (${DEFAULT_CONFIG.serviceUuid}). Revisa el código de tu ESP32.`);
        }
        this.characteristic = await service.getCharacteristic(DEFAULT_CONFIG.characteristicUuid);
      }

      this.onStatusChangeCallback?.('connected', `Conectado a ${deviceName}`);
      return true;
    } catch (err: any) {
      console.warn('BLE connect error:', err);
      if (err.name === 'NotFoundError') {
        this.onStatusChangeCallback?.('disconnected', 'Búsqueda cancelada o no se seleccionó dispositivo');
      } else if (err.name === 'SecurityError') {
        this.onStatusChangeCallback?.(
          'error',
          'Acceso a Bluetooth restringido por permisos o entorno iframe. Abre la aplicación en una pestaña nueva del navegador.'
        );
      } else if (err.name === 'NotSupportedError') {
        this.onStatusChangeCallback?.('error', 'Web Bluetooth no está soportado en este sistema operativo o navegador.');
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
