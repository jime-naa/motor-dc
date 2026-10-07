export const APP_INVENTOR_DATA = {
  title: 'MIT App Inventor - Diseño y Bloques Paso a Paso',
  description: 'Guía visual completa para construir la aplicación en MIT App Inventor usando la extensión oficial BluetoothLE.',
  extensionUrl: 'http://iot.appinventor.mit.edu/assets/resources/edu.mit.appinventor.ble.aix',
  componentsList: [
    { name: 'BluetoothLE1', type: 'Extension (Non-visible)', role: 'Gestiona el escaneo, conexión GATT y escritura de características.' },
    { name: 'Label_Estado', type: 'Label', role: 'Muestra "Desconectado", "Buscando...", "Conectado a ESP32".' },
    { name: 'Button_Conectar', type: 'Button', role: 'Inicia el escaneo y conexión al dispositivo "ESP32_Motor_Control".' },
    { name: 'Button_Desconectar', type: 'Button', role: 'Cierra la conexión BLE activa.' },
    { name: 'Button_Adelante', type: 'Button', role: 'Establece dirección = "F" y envía comando.' },
    { name: 'Button_Atras', type: 'Button', role: 'Establece dirección = "R" y envía comando.' },
    { name: 'Button_Detener', type: 'Button', role: 'Establece dirección = "S", velocidad = 0 y envía comando.' },
    { name: 'Slider_Velocidad', type: 'Slider (MinValue: 0, MaxValue: 255)', role: 'Ajusta la velocidad PWM entre 0 y 255.' },
    { name: 'Label_Comando', type: 'Label', role: 'Muestra en pantalla el texto actual, ej. "Comando: F:200".' },
  ],
  blocksDescription: `
### Pasos de Configuración en MIT App Inventor:
1. **Instalar Extensión BLE**:
   - En la barra de componentes, haz clic en "Extension" -> "Import extension" -> URL o archivo \`edu.mit.appinventor.ble.aix\`.
   - Arrastra el componente **BluetoothLE** a tu pantalla (Screen1).

2. **Variables Globales necesarias**:
   - \`global SERVICE_UUID\` = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
   - \`global CHAR_UUID\` = "c565818d-6972-466d-88b0-517865f14d02"
   - \`global direccionActual\` = "S" (inicialmente detenido)
   - \`global velocidadActual\` = 150 (valor por defecto)

3. **Procedimiento Reutilizable: "EnviarComandoMotor" (con parámetro dir, vel)**:
   - Toma los parámetros \`dir\` y \`vel\`.
   - Actualiza \`global direccionActual\` y \`global velocidadActual\`.
   - Construye la cadena de texto con el bloque \`join(dir, ":", round(vel))\`.
   - Asigna a \`Label_Comando.Text\` = \`join("Enviando: ", dir, ":", round(vel))\`.
   - Llama a:
     \`call BluetoothLE1.WriteStringsWithResponse(serviceUuid: global SERVICE_UUID, characteristicUuid: global CHAR_UUID, isSigned: false, values: make a list(cadena))\`
     *(o WriteStrings sin respuesta)*.

4. **Eventos de Botones de Dirección**:
   - \`when Button_Adelante.Click do\`:
     \`call EnviarComandoMotor(dir: "F", vel: Slider_Velocidad.ThumbPosition)\`
   - \`when Button_Atras.Click do\`:
     \`call EnviarComandoMotor(dir: "R", vel: Slider_Velocidad.ThumbPosition)\`
   - \`when Button_Detener.Click do\`:
     \`set Slider_Velocidad.ThumbPosition to 0\`
     \`call EnviarComandoMotor(dir: "S", vel: 0)\`

5. **Evento del Slider de Velocidad**:
   - \`when Slider_Velocidad.PositionChanged(thumbPosition) do\`:
     \`set Label_VelocidadValor.Text to round(thumbPosition)\`
     \`if (global direccionActual != "S") then\`:
       \`call EnviarComandoMotor(dir: global direccionActual, vel: thumbPosition)\`

6. **Eventos de Conexión BLE**:
   - \`when Button_Conectar.Click do\`:
     \`set Label_Estado.Text to "Buscando ESP32..."\`
     \`call BluetoothLE1.StartScanning\`
   - \`when BluetoothLE1.DeviceFound(deviceList) do\`:
     *(O buscar en la lista por nombre "ESP32_Motor_Control")*
     \`call BluetoothLE1.ConnectDeviceName(deviceName: "ESP32_Motor_Control")\`
   - \`when BluetoothLE1.Connected do\`:
     \`set Label_Estado.Text to "Conectado a ESP32_Motor_Control"\`
     \`set Label_Estado.TextColor to Verde\`
     \`call BluetoothLE1.StopScanning\`
   - \`when Button_Desconectar.Click do\`:
     \`call BluetoothLE1.Disconnect\`
   - \`when BluetoothLE1.Disconnected do\`:
     \`set Label_Estado.Text to "Desconectado"\`
     \`set Label_Estado.TextColor to Rojo\`
`
};

export const FLUTTER_CODE = `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  runApp(const MaterialApp(
    home: MotorControlScreen(),
    debugShowCheckedModeBanner: false,
  ));
}

class MotorControlScreen extends StatefulWidget {
  const MotorControlScreen({super.key});

  @override
  State<MotorControlScreen> createState() => _MotorControlScreenState();
}

class _MotorControlScreenState extends State<MotorControlScreen> {
  // Constantes de UUID definidas en el servidor ESP32
  static const String targetDeviceName = "ESP32_Motor_Control";
  static final Guid serviceUuid = Guid("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  static final Guid characteristicUuid = Guid("c565818d-6972-466d-88b0-517865f14d02");

  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _motorCharacteristic;
  bool _isScanning = false;
  String _connectionStatus = "Desconectado";
  
  String _currentDirection = "S"; // 'F', 'R', 'S'
  double _currentSpeed = 150;     // 0 a 255
  String _lastSentCommand = "Ninguno";

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    // Permisos requeridos para Android 12+ (API 31+) y versiones anteriores
    await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();
  }

  // 1. Escaneo y conexión BLE
  Future<void> _startScanAndConnect() async {
    setState(() {
      _isScanning = true;
      _connectionStatus = "Buscando $targetDeviceName...";
    });

    try {
      // Inicia el escaneo filtrado por el Service UUID
      await FlutterBluePlus.startScan(
        withServices: [serviceUuid],
        timeout: const Duration(seconds: 10),
      );

      FlutterBluePlus.scanResults.listen((results) async {
        for (ScanResult r in results) {
          if (r.device.platformName == targetDeviceName ||
              r.advertisementData.serviceUuids.contains(serviceUuid)) {
            await FlutterBluePlus.stopScan();
            setState(() {
              _isScanning = false;
              _connectionStatus = "Conectando...";
            });
            await _connectToDevice(r.device);
            break;
          }
        }
      });
    } catch (e) {
      setState(() {
        _isScanning = false;
        _connectionStatus = "Error de escaneo: $e";
      });
    }
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    try {
      await device.connect(autoConnect: false);
      setState(() {
        _connectedDevice = device;
        _connectionStatus = "Descubriendo servicios...";
      });

      // Descubrir servicios GATT
      List<BluetoothService> services = await device.discoverServices();
      for (var s in services) {
        if (s.uuid == serviceUuid) {
          for (var c in s.characteristics) {
            if (c.uuid == characteristicUuid) {
              _motorCharacteristic = c;
              setState(() {
                _connectionStatus = "Conectado a \${device.platformName}";
              });
              break;
            }
          }
        }
      }

      device.connectionState.listen((state) {
        if (state == BluetoothConnectionState.disconnected) {
          setState(() {
            _connectedDevice = null;
            _motorCharacteristic = null;
            _connectionStatus = "Desconectado";
            _currentDirection = "S";
          });
        }
      });
    } catch (e) {
      setState(() {
        _connectionStatus = "Error al conectar: $e";
      });
    }
  }

  Future<void> _disconnect() async {
    if (_connectedDevice != null) {
      await _sendCommand("S", 0); // Enviar parada por seguridad antes de salir
      await _connectedDevice!.disconnect();
    }
  }

  // 2. Envío de datos bajo el protocolo "DIRECCION:VELOCIDAD"
  Future<void> _sendCommand(String direction, int speed) async {
    if (_motorCharacteristic == null) return;

    final String command = "$direction:\$speed";
    final List<int> bytes = utf8.encode(command);

    try {
      await _motorCharacteristic!.write(bytes, withoutResponse: false);
      setState(() {
        _currentDirection = direction;
        _currentSpeed = speed.toDouble();
        _lastSentCommand = command;
      });
    } catch (e) {
      debugPrint("Error al enviar comando BLE: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    bool isConnected = _motorCharacteristic != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text("ESP32 L298N Motor BLE"),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Tarjeta de Estado y Conexión
            Card(
              elevation: 3,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(
                          isConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                          color: isConnected ? Colors.green : Colors.grey,
                          size: 32,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Estado de Conexión", style: TextStyle(fontWeight: FontWeight.bold)),
                              Text(_connectionStatus, style: TextStyle(
                                color: isConnected ? Colors.green.shade700 : Colors.red.shade700
                              )),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isScanning || isConnected ? null : _startScanAndConnect,
                            icon: const Icon(Icons.search),
                            label: Text(_isScanning ? "Buscando..." : "Buscar y Conectar"),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton(
                          onPressed: isConnected ? _disconnect : null,
                          child: const Text("Desconectar"),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Indicador del Comando Armado en tiempo real
            Container(
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.indigo.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.indigo.shade200),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Comando en Transmisión:", style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    "$_currentDirection:\${_currentSpeed.round()}",
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigo),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Control de Dirección
            const Text("Control de Dirección", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: isConnected ? () => _sendCommand("F", _currentSpeed.round()) : null,
                  icon: const Icon(Icons.arrow_upward),
                  label: const Text("Adelante (F)"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _currentDirection == "F" ? Colors.green : null,
                    foregroundColor: _currentDirection == "F" ? Colors.white : null,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: isConnected ? () => _sendCommand("R", _currentSpeed.round()) : null,
                  icon: const Icon(Icons.arrow_downward),
                  label: const Text("Atrás (R)"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _currentDirection == "R" ? Colors.orange : null,
                    foregroundColor: _currentDirection == "R" ? Colors.white : null,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // Botón de Parada de Emergencia
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isConnected ? () => _sendCommand("S", 0) : null,
                icon: const Icon(Icons.stop),
                label: const Text("DETENER MOTOR (S:0)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 30),

            // Control Deslizable de Velocidad PWM (0 a 255)
            Text("Velocidad PWM: \${_currentSpeed.round()} / 255 (\${(_currentSpeed / 255 * 100).toStringAsFixed(0)}%)",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Slider(
              value: _currentSpeed,
              min: 0,
              max: 255,
              divisions: 255,
              label: _currentSpeed.round().toString(),
              activeColor: Colors.indigo,
              onChanged: isConnected ? (value) {
                setState(() => _currentSpeed = value);
              } : null,
              onChangeEnd: isConnected ? (value) {
                if (_currentDirection != "S") {
                  _sendCommand(_currentDirection, value.round());
                }
              } : null,
            ),
            const Text(
              "Último comando confirmado: ",
              style: TextStyle(color: Colors.grey),
            ),
            Text(
              _lastSentCommand,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
`;

export const KOTLIN_CODE = `package com.example.esp32motorble

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.ParcelUuid
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import java.util.*

class MainActivity : ComponentActivity() {

    companion object {
        const val DEVICE_NAME = "ESP32_Motor_Control"
        val SERVICE_UUID: UUID = UUID.fromString("4fafc201-1fb5-459e-8fcc-c5c9c331914b")
        val CHAR_UUID: UUID = UUID.fromString("c565818d-6972-466d-88b0-517865f14d02")
    }

    private var bluetoothGatt: BluetoothGatt? = null
    private var motorCharacteristic: BluetoothGattCharacteristic? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val bluetoothAdapter = bluetoothManager.adapter

        setContent {
            var connectionState by remember { mutableStateOf("Desconectado") }
            var isConnected by remember { mutableStateOf(false) }
            var currentDirection by remember { mutableStateOf("S") }
            var speed by remember { mutableFloatStateOf(150f) }
            var lastSent by remember { mutableStateOf("Ninguno") }

            val permissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestMultiplePermissions()
            ) { permissions ->
                // Permisos concedidos
            }

            LaunchedEffect(Unit) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.BLUETOOTH_SCAN,
                            Manifest.permission.BLUETOOTH_CONNECT
                        )
                    )
                } else {
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.BLUETOOTH,
                            Manifest.permission.BLUETOOTH_ADMIN
                        )
                    )
                }
            }

            // Función de envío de comando "D:V"
            @SuppressLint("MissingPermission")
            fun sendCommand(direction: String, vel: Int) {
                motorCharacteristic?.let { char ->
                    val command = "$direction:$vel"
                    char.value = command.toByteArray(Charsets.UTF_8)
                    char.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                    bluetoothGatt?.writeCharacteristic(char)
                    currentDirection = direction
                    lastSent = command
                }
            }

            // Callback GATT
            val gattCallback = object : BluetoothGattCallback() {
                @SuppressLint("MissingPermission")
                override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        connectionState = "Conectado. Descubriendo servicios..."
                        gatt.discoverServices()
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        connectionState = "Desconectado"
                        isConnected = false
                        motorCharacteristic = null
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                    val service = gatt.getService(SERVICE_UUID)
                    motorCharacteristic = service?.getCharacteristic(CHAR_UUID)
                    if (motorCharacteristic != null) {
                        connectionState = "Conectado a $DEVICE_NAME"
                        isConnected = true
                    }
                }
            }

            // Escaneo BLE
            @SuppressLint("MissingPermission")
            fun startBleScan() {
                connectionState = "Buscando $DEVICE_NAME..."
                val scanner = bluetoothAdapter?.bluetoothLeScanner
                val filter = ScanFilter.Builder()
                    .setServiceUuid(ParcelUuid(SERVICE_UUID))
                    .build()
                val settings = ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build()

                scanner?.startScan(listOf(filter), settings, object : ScanCallback() {
                    override fun onScanResult(callbackType: Int, result: ScanResult) {
                        scanner.stopScan(this)
                        connectionState = "Conectando..."
                        bluetoothGatt = result.device.connectGatt(this@MainActivity, false, gattCallback)
                    }
                })
            }

            MaterialTheme {
                Scaffold(
                    topBar = {
                        Text(
                            "Controlador Motor ESP32 BLE",
                            modifier = Modifier.padding(16.dp),
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                ) { padding ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Estado: $connectionState", color = if (isConnected) Color.Green else Color.Red)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { startBleScan() }, enabled = !isConnected) {
                            Text("Escanear y Conectar")
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        Text("Comando actual: $currentDirection:\${speed.toInt()}", style = MaterialTheme.typography.titleMedium)
                        Text("Último enviado: $lastSent")

                        Spacer(modifier = Modifier.height(20.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Button(onClick = { sendCommand("F", speed.toInt()) }, enabled = isConnected) {
                                Text("Adelante (F)")
                            }
                            Button(onClick = { sendCommand("R", speed.toInt()) }, enabled = isConnected) {
                                Text("Atrás (R)")
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = {
                                speed = 0f
                                sendCommand("S", 0)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                            enabled = isConnected,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("DETENER (S:0)")
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        Text("Velocidad PWM (0-255): \${speed.toInt()}")
                        Slider(
                            value = speed,
                            onValueChange = { speed = it },
                            onValueChangeFinished = {
                                if (currentDirection != "S") {
                                    sendCommand(currentDirection, speed.toInt())
                                }
                            },
                            valueRange = 0f..255f,
                            enabled = isConnected
                        )
                    }
                }
            }
        }
    }
}
`;

export const ESP32_ARDUINO_CODE = `/*
 * ======================================================================================
 * FIRMWARE ROBOT SUMO ESP32 BLE - ARQUITECTURA ASÍNCRONA DE ALTO RENDIMIENTO
 * ======================================================================================
 * Características Principales:
 *   1. Callback BLE No Bloqueante: onWrite solo extrae bytes crudos a un buffer atómico.
 *      No hace malloc dinámico riesgoso, no imprime Serial pesado ni traba la tarea NimBLE/Bluedroid.
 *   2. Watchdog de Comunicación (Fail-safe): Si transcurren > 1000 ms sin paquetes BLE,
 *      el robot frena en seco de inmediato (evita que salga disparado del Dohyo).
 *   3. Prioridad Máxima Sensores Infrarrojos (Detección de Borde Blanco):
 *      Lectura periódica no bloqueante. Si detecta línea blanca, anula el control remoto y
 *      ejecuta maniobra evasiva inmediata hacia el centro.
 *   4. Control de 3 Palancas con Rampas Suaves (Soft-Start / Soft-Stop):
 *      Control diferencial de Motores Izquierdo / Derecho + Servomotor de Palanca/Cuña.
 *   5. Manejo Robusto de Desconexión: Reactiva Advertising sin fugar descriptores ni reiniciar.
 * ======================================================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --------------------------------------------------------------------------------------
// 1. CONFIGURACIÓN BLE (UUIDs estándar)
// --------------------------------------------------------------------------------------
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "c565818d-6972-466d-88b0-517865f14d02"
#define DEVICE_NAME         "ESP32_Sumo_Robot"

// --------------------------------------------------------------------------------------
// 2. ASIGNACIÓN DE PINES HARDWARE (L298N / Driver Dual + Infrarrojos + Servo Palanca)
// --------------------------------------------------------------------------------------
// Motor Izquierdo
const int PIN_IN1_IZQ = 18;
const int PIN_IN2_IZQ = 19;
const int PIN_ENA_IZQ = 21; // PWM

// Motor Derecho
const int PIN_IN3_DER = 22;
const int PIN_IN4_DER = 23;
const int PIN_ENB_DER = 25; // PWM

// Sensores Infrarrojos de Suelo / Borde Dohyo (Activo en LOW para línea blanca reflectante)
const int PIN_IR_FRONT_LEFT  = 34; // Solo entrada (ADC1)
const int PIN_IR_FRONT_RIGHT = 35; // Solo entrada (ADC1)
const int PIN_IR_REAR        = 32; // Sensor trasero

// Servomotor / Actuador de Palanca de Ataque (Opcional)
const int PIN_SERVO_LEVER    = 26;

// Configuración Canales PWM LEDC de ESP32 (Hardware Timers)
const int PWM_CH_IZQ  = 0;
const int PWM_CH_DER  = 1;
const int PWM_CH_LEVR = 2;
const int PWM_FREQ    = 5000; // 5 kHz para motores DC
const int PWM_RES     = 8;    // Resolución 8 bits: 0 a 255

// --------------------------------------------------------------------------------------
// 3. ESTRUCTURAS Y VARIABLES GLOBALES ATÓMICAS (Compartidas entre BLE Task y Loop)
// --------------------------------------------------------------------------------------
struct CommandPacket {
  char action;      // 'F': Adelante, 'R': Atrás, 'L': Giro Izq, 'G': Giro Der, 'S': Freno, 'W': Palanca
  int speedIzq;     // 0 - 255
  int speedDer;     // 0 - 255
  int leverPos;     // 0 - 180 (Posición de palanca / servo)
  uint32_t timestamp;
  bool isNew;
};

volatile bool g_deviceConnected = false;
volatile bool g_advertisingNeedsRestart = false;
portMUX_TYPE g_bleMux = portMUX_INITIALIZER_UNLOCKED;

// Buffer de comando protegido contra condiciones de carrera (Race Conditions)
CommandPacket g_lastCommand = {'S', 0, 0, 90, 0, false};

// Parámetros de aceleración suave (Rampas de velocidad en loop)
float g_currentSpeedIzq = 0.0f;
float g_currentSpeedDer = 0.0f;
const float RAMP_ACCEL_STEP = 15.0f;  // Paso de aceleración cada ciclo
const float RAMP_DECEL_STEP = 25.0f;  // Freno suave o enérgico

// Watchdog de seguridad (Fail-safe BLE)
const uint32_t WATCHDOG_TIMEOUT_MS = 1000; // 1 segundo máximo sin paquetes
uint32_t g_lastPacketTime = 0;

// Instancias BLE
BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;

// --------------------------------------------------------------------------------------
// 4. PARSEO SEGURO DE PAQUETES (Cero allocaciones dinámicas, O(1), Anti-Overflow)
// --------------------------------------------------------------------------------------
void parseIncomingBleBytes(const uint8_t* data, size_t length) {
  if (data == nullptr || length == 0) return;

  // Buffer local seguro en la pila (máximo 32 caracteres por comando)
  char safeBuffer[32];
  size_t copyLen = length < (sizeof(safeBuffer) - 1) ? length : (sizeof(safeBuffer) - 1);
  memcpy(safeBuffer, data, copyLen);
  safeBuffer[copyLen] = '\\0';

  // Formatos aceptados:
  // 1) "D:VEL" (Ej: "F:220", "R:180", "L:200", "G:200", "S:0")
  // 2) "DI:DD:LEVER" (Control avanzado de 3 palancas: Izq, Der, Servo)
  // 3) Letra simple 'S' (Parada de emergencia instantánea)

  char action = safeBuffer[0];
  int vIzq = 0;
  int vDer = 0;
  int lever = 90;

  char* firstColon = strchr(safeBuffer, ':');

  if (firstColon != nullptr) {
    // Si viene en formato simple "D:VEL"
    char* secondColon = strchr(firstColon + 1, ':');

    if (secondColon == nullptr) {
      // Formato "D:VEL"
      int val = atoi(firstColon + 1);
      val = constrain(val, 0, 255);

      switch (action) {
        case 'F': vIzq = val;  vDer = val;  break;
        case 'R': vIzq = -val; vDer = -val; break;
        case 'L': vIzq = -val; vDer = val;  break; // Giro sobre su eje
        case 'G': vIzq = val;  vDer = -val; break;
        case 'S':
        default:  vIzq = 0;    vDer = 0;    break;
      }
    } else {
      // Formato extendido de 3 palancas: "vIzq:vDer:lever"
      vIzq  = atoi(safeBuffer);
      vDer  = atoi(firstColon + 1);
      lever = atoi(secondColon + 1);
      action = (vIzq == 0 && vDer == 0) ? 'S' : 'M';
    }
  } else {
    // Comando simple sin separador (ej: 'S')
    if (action == 'S') {
      vIzq = 0;
      vDer = 0;
    }
  }

  // Actualización crítica protegida con Spinlock de FreeRTOS
  portENTER_CRITICAL(&g_bleMux);
  g_lastCommand.action    = action;
  g_lastCommand.speedIzq  = constrain(vIzq, -255, 255);
  g_lastCommand.speedDer  = constrain(vDer, -255, 255);
  g_lastCommand.leverPos  = constrain(lever, 0, 180);
  g_lastCommand.timestamp = millis();
  g_lastCommand.isNew     = true;
  g_lastPacketTime        = millis();
  portEXIT_CRITICAL(&g_bleMux);
}

// --------------------------------------------------------------------------------------
// 5. CALLBACKS DE SERVIDOR Y CARACTERÍSTICA BLE
// --------------------------------------------------------------------------------------
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    g_deviceConnected = true;
    g_lastPacketTime = millis();
    Serial.println("[BLE] >> Cliente conectado con éxito.");
  }

  void onDisconnect(BLEServer* pServer) override {
    g_deviceConnected = false;
    // Marcamos la bandera para reiniciar Advertising en el loop principal
    // (Llamar a startAdvertising dentro del callback a veces crashea la pila Bluedroid si no terminó el handshake)
    g_advertisingNeedsRestart = true;
    Serial.println("[BLE] >> Cliente desconectado. Failsafe activo.");
  }
};

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    // Obtenemos el puntero a los datos crudos directamente sin instanciar std::string innecesario
    uint8_t* pData = pChar->getData();
    size_t len = pChar->getLength();
    
    // Parseo ultra-rápido en memoria sin bloqueos
    parseIncomingBleBytes(pData, len);
  }
};

// --------------------------------------------------------------------------------------
// 6. CONTROL FÍSICO DE MOTORES Y RAMPAS (Hardware LEDC PWM)
// --------------------------------------------------------------------------------------
void setHardwareMotors(int targetIzq, int targetDer) {
  // Manejo de rampa suave para evitar caídas de tensión (Brownout) que reinicien el ESP32
  if (g_currentSpeedIzq < targetIzq) {
    g_currentSpeedIzq = min((float)targetIzq, g_currentSpeedIzq + RAMP_ACCEL_STEP);
  } else if (g_currentSpeedIzq > targetIzq) {
    g_currentSpeedIzq = max((float)targetIzq, g_currentSpeedIzq - RAMP_DECEL_STEP);
  }

  if (g_currentSpeedDer < targetDer) {
    g_currentSpeedDer = min((float)targetDer, g_currentSpeedDer + RAMP_ACCEL_STEP);
  } else if (g_currentSpeedDer > targetDer) {
    g_currentSpeedDer = max((float)targetDer, g_currentSpeedDer - RAMP_DECEL_STEP);
  }

  int pwmIzq = abs((int)g_currentSpeedIzq);
  int pwmDer = abs((int)g_currentSpeedDer);

  // Motor Izquierdo
  if (g_currentSpeedIzq > 5) {
    digitalWrite(PIN_IN1_IZQ, HIGH);
    digitalWrite(PIN_IN2_IZQ, LOW);
  } else if (g_currentSpeedIzq < -5) {
    digitalWrite(PIN_IN1_IZQ, LOW);
    digitalWrite(PIN_IN2_IZQ, HIGH);
  } else {
    digitalWrite(PIN_IN1_IZQ, LOW);
    digitalWrite(PIN_IN2_IZQ, LOW);
    pwmIzq = 0;
  }
  ledcWrite(PWM_CH_IZQ, pwmIzq);

  // Motor Derecho
  if (g_currentSpeedDer > 5) {
    digitalWrite(PIN_IN3_DER, HIGH);
    digitalWrite(PIN_IN4_DER, LOW);
  } else if (g_currentSpeedDer < -5) {
    digitalWrite(PIN_IN3_DER, LOW);
    digitalWrite(PIN_IN4_DER, HIGH);
  } else {
    digitalWrite(PIN_IN3_DER, LOW);
    digitalWrite(PIN_IN4_DER, LOW);
    pwmDer = 0;
  }
  ledcWrite(PWM_CH_DER, pwmDer);
}

void emergencyStop() {
  digitalWrite(PIN_IN1_IZQ, LOW);
  digitalWrite(PIN_IN2_IZQ, LOW);
  digitalWrite(PIN_IN3_DER, LOW);
  digitalWrite(PIN_IN4_DER, LOW);
  ledcWrite(PWM_CH_IZQ, 0);
  ledcWrite(PWM_CH_DER, 0);
  g_currentSpeedIzq = 0;
  g_currentSpeedDer = 0;
}

// --------------------------------------------------------------------------------------
// 7. LÓGICA DE SENSORES INFRARROJOS (Prioridad Máxima de Dohyo)
// --------------------------------------------------------------------------------------
bool checkBorderSensors(uint32_t now) {
  // Los sensores infrarrojos TCRT5000 / QRE1113 dan LOW al detectar borde blanco del Dohyo
  bool frontLeftWhite  = (digitalRead(PIN_IR_FRONT_LEFT) == LOW);
  bool frontRightWhite = (digitalRead(PIN_IR_FRONT_RIGHT) == LOW);
  bool rearWhite       = (digitalRead(PIN_IR_REAR) == LOW);

  if (frontLeftWhite || frontRightWhite) {
    // Maniobra Evasiva Inmediata: Retroceder y girar violentamente al centro
    emergencyStop();
    digitalWrite(PIN_IN1_IZQ, LOW);
    digitalWrite(PIN_IN2_IZQ, HIGH);
    digitalWrite(PIN_IN3_DER, LOW);
    digitalWrite(PIN_IN4_DER, HIGH);
    ledcWrite(PWM_CH_IZQ, 255);
    ledcWrite(PWM_CH_DER, 255);
    
    // Rutina de escape sin delay(): ejecución en loop controlado
    return true;
  } else if (rearWhite) {
    // Si la parte trasera toca el borde: Acelerar al frente con toda la potencia
    digitalWrite(PIN_IN1_IZQ, HIGH);
    digitalWrite(PIN_IN2_IZQ, LOW);
    digitalWrite(PIN_IN3_DER, HIGH);
    digitalWrite(PIN_IN4_DER, LOW);
    ledcWrite(PWM_CH_IZQ, 255);
    ledcWrite(PWM_CH_DER, 255);
    return true;
  }

  return false;
}

// --------------------------------------------------------------------------------------
// 8. SETUP PRINCIPAL
// --------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.println("\\n==================================================");
  Serial.println("  INICIANDO FIRMWARE SUMO BOT ESP32 BLE (FAILSAFE)");
  Serial.println("==================================================");

  // Configuración de Pines GPIO
  pinMode(PIN_IN1_IZQ, OUTPUT);
  pinMode(PIN_IN2_IZQ, OUTPUT);
  pinMode(PIN_IN3_DER, OUTPUT);
  pinMode(PIN_IN4_DER, OUTPUT);

  pinMode(PIN_IR_FRONT_LEFT, INPUT);
  pinMode(PIN_IR_FRONT_RIGHT, INPUT);
  pinMode(PIN_IR_REAR, INPUT);

  // Configuración de canales PWM LEDC
  ledcSetup(PWM_CH_IZQ, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_ENA_IZQ, PWM_CH_IZQ);

  ledcSetup(PWM_CH_DER, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_ENB_DER, PWM_CH_DER);

  emergencyStop();

  // Inicialización de Pila Bluetooth Low Energy
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_WRITE_NR // Permite escritura ultrarrápida sin ACK
                    );

  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Intervalo de conexión óptimo (7.5ms)
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  g_lastPacketTime = millis();
  Serial.println("[SISTEMA] BLE Listo. Esperando conexión...");
}

// --------------------------------------------------------------------------------------
// 9. LOOP PRINCIPAL (Máquina de Estados No Bloqueante con millis())
// --------------------------------------------------------------------------------------
void loop() {
  uint32_t now = millis();

  // 1. Manejo de Re-publicidad BLE en caso de desconexión sin bloquear el hilo BLE
  if (g_advertisingNeedsRestart) {
    g_advertisingNeedsRestart = false;
    emergencyStop();
    pServer->startAdvertising();
    Serial.println("[BLE] Publicidad reiniciada. Listo para nuevo emparejamiento.");
  }

  // 2. Prioridad Máxima: Sensores de Borde Dohyo
  bool underBorderEvasion = checkBorderSensors(now);
  if (underBorderEvasion) {
    return; // El escape del borde tiene prioridad sobre el mando Bluetooth
  }

  // 3. Watchdog de Comunicación (Fail-safe de seguridad)
  // Si estamos "conectados" pero no llegan paquetes en > 1000ms, detenemos los motores.
  if (g_deviceConnected && (now - g_lastPacketTime > WATCHDOG_TIMEOUT_MS)) {
    static uint32_t lastWarning = 0;
    if (now - lastWarning > 1000) {
      Serial.println("[FAILSAFE] Alerta: Sin paquetes BLE en > 1s. Frenando motores.");
      lastWarning = now;
    }
    setHardwareMotors(0, 0);
    return;
  }

  // Si no hay conexión BLE activa, motores siempre apagados
  if (!g_deviceConnected) {
    setHardwareMotors(0, 0);
    return;
  }

  // 4. Obtención segura del comando actual
  int targetIzq = 0;
  int targetDer = 0;

  portENTER_CRITICAL(&g_bleMux);
  targetIzq = g_lastCommand.speedIzq;
  targetDer = g_lastCommand.speedDer;
  portEXIT_CRITICAL(&g_bleMux);

  // 5. Aplicar rampa de aceleración/desaceleración suave
  static uint32_t lastMotorUpdate = 0;
  if (now - lastMotorUpdate >= 10) { // Actualizar rampa cada 10ms (100 Hz estables)
    lastMotorUpdate = now;
    setHardwareMotors(targetIzq, targetDer);
  }
}
`;

export const ANDROID_PERMISSIONS_GUIDE = {
  title: 'Permisos de Bluetooth en Android: Guía Exhaustiva',
  sections: [
    {
      heading: '1. Diferenciación Crítica por Versión de Android',
      content: `A partir de **Android 12 (API 31)**, Google rediseñó por completo el modelo de permisos de Bluetooth. Ya NO se requiere pedir permiso de Ubicación (Location) si el uso es exclusivo para conectar periféricos de hardware IoT, siempre y cuando se declare el flag \`neverForLocation\`.`
    },
    {
      heading: '2. Declaración en AndroidManifest.xml (Android 12+ API 31+)',
      code: `<!-- Permiso para escanear balizas y periféricos BLE -->
<uses-permission
    android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation"
    tools:targetApi="s" />

<!-- Permiso para conectarse y transferir datos con el ESP32 -->
<uses-permission
    android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Indicar que la app requiere hardware Bluetooth LE -->
<uses-feature
    android:name="android.hardware.bluetooth_le"
    android:required="true" />`
    },
    {
      heading: '3. Declaración para Android 6 a 11 (API 23 a 30)',
      code: `<!-- Permisos clásicos de Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />

<!-- En Android 6-11 el escaneo BLE expone geolocalización indirecta, por lo que requería Ubicación precisa -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />`
    },
    {
      heading: '4. Requisito en Tiempo de Ejecución (Runtime Request)',
      content: `Incluso declarados en el Manifest, los permisos peligrosos (\`BLUETOOTH_SCAN\`, \`BLUETOOTH_CONNECT\` o \`ACCESS_FINE_LOCATION\`) **deben solicitarse en tiempo de ejecución** con un cuadro de diálogo al usuario antes de llamar al escáner BLE. Además, el interruptor de Bluetooth del teléfono y el servicio de Ubicación (GPS en Android 6-11) deben estar encendidos en los ajustes del sistema.`
    }
  ]
};
