export type MotorDirection = 'F' | 'R' | 'S';

export interface MotorState {
  direction: MotorDirection;
  speed: number; // 0 - 255
  isRunning: boolean;
  rpm: number;
  in1: boolean;
  in2: boolean;
  enaPwm: number;
  effectiveVoltage: number;
  currentDrawAmps: number;
}

export type BleConnectionStatus = 
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'unsupported'
  | 'error';

export interface BleDeviceState {
  status: BleConnectionStatus;
  deviceName: string | null;
  deviceId: string | null;
  errorMessage: string | null;
  rssi?: number;
  isSimulated: boolean;
}

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  command: string;
  rawBytes: number[];
  direction: MotorDirection;
  speed: number;
  status: 'sent' | 'failed' | 'simulated';
}

export interface HardwareConfig {
  serviceUuid: string;
  characteristicUuid: string;
  advertisedName: string;
  gpioIn1: number;
  gpioIn2: number;
  gpioEna: number;
  supplyVoltage: number; // e.g. 12V
  l298nVoltageDrop: number; // ~1.8V - 2.0V
}

export const DEFAULT_CONFIG: HardwareConfig = {
  serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  characteristicUuid: 'c565818d-6972-466d-88b0-517865f14d02',
  advertisedName: 'ESP32_Motor_Control',
  gpioIn1: 18,
  gpioIn2: 19,
  gpioEna: 21,
  supplyVoltage: 12.0,
  l298nVoltageDrop: 1.8,
};
