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
 * =========================================================================
 * SERVIDOR BLE PARA CONTROL DE MOTOR DC CON PUENTE H L298N Y ESP32
 * =========================================================================
 * Service UUID:        4fafc201-1fb5-459e-8fcc-c5c9c331914b
 * Characteristic UUID: c565818d-6972-466d-88b0-517865f14d02
 *
 * Conexión de Pines Hardware:
 *   - GPIO 18 -> IN1 (Dirección 1 del L298N)
 *   - GPIO 19 -> IN2 (Dirección 2 del L298N)
 *   - GPIO 21 -> ENA (Habilitación PWM de velocidad del L298N)
 *   - GND     -> GND común del L298N y fuente externa
 *
 * Protocolo de Comandos: "DIRECCION:VELOCIDAD"
 *   - 'F': Forward / Adelante  -> IN1=HIGH, IN2=LOW, ENA=PWM
 *   - 'R': Reverse / Atrás     -> IN1=LOW,  IN2=HIGH, ENA=PWM
 *   - 'S': Stop / Detener      -> IN1=LOW,  IN2=LOW,  ENA=0
 * =========================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "c565818d-6972-466d-88b0-517865f14d02"

// Definición de Pines de Hardware
const int PIN_IN1 = 18;
const int PIN_IN2 = 19;
const int PIN_ENA = 21;

// Configuración de canal PWM (LEDC de ESP32)
const int PWM_CHANNEL = 0;
const int PWM_FREQ    = 5000; // 5 kHz para motor DC
const int PWM_RES     = 8;    // Resolución de 8 bits (valores 0 a 255)

bool deviceConnected = false;
BLECharacteristic *pCharacteristic = nullptr;

// Función para aplicar movimiento al motor
void setMotor(char direction, int speed) {
  // Limitar rango de velocidad
  speed = constrain(speed, 0, 255);

  Serial.printf("[MOTOR] Aplicando: Dir='%c', Vel=%d\\n", direction, speed);

  switch (direction) {
    case 'F': // Adelante
      digitalWrite(PIN_IN1, HIGH);
      digitalWrite(PIN_IN2, LOW);
      ledcWrite(PWM_CHANNEL, speed);
      break;

    case 'R': // Reversa
      digitalWrite(PIN_IN1, LOW);
      digitalWrite(PIN_IN2, HIGH);
      ledcWrite(PWM_CHANNEL, speed);
      break;

    case 'S': // Detener (Freno activo)
    default:
      digitalWrite(PIN_IN1, LOW);
      digitalWrite(PIN_IN2, LOW);
      ledcWrite(PWM_CHANNEL, 0);
      break;
  }
}

// Callback para eventos de conexión del Servidor BLE
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("[BLE] Cliente conectado con éxito.");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("[BLE] Cliente desconectado. Apagando motor por seguridad.");
    setMotor('S', 0); // Failsafe automático: detener motor si se pierde enlace
    pServer->startAdvertising(); // Reiniciar publicidad BLE para nueva reconexión
  }
};

// Callback al recibir escritura en la Característica BLE
class MotorCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) {
    std::string value = pChar->getValue();

    if (value.length() > 0) {
      Serial.print("[BLE RECIBIDO] Raw: ");
      Serial.println(value.c_str());

      // Parsear formato "DIRECCION:VELOCIDAD", ej. "F:255"
      int separatorIndex = value.find(':');
      if (separatorIndex != std::string::npos) {
        char direction = value[0];
        std::string speedStr = value.substr(separatorIndex + 1);
        int speed = atoi(speedStr.c_str());

        setMotor(direction, speed);
      } else {
        // Si no contiene separador, evaluar si es comando simple de parada 'S'
        if (value[0] == 'S') {
          setMotor('S', 0);
        } else {
          Serial.println("[ERROR] Formato de comando inválido. Se espera 'D:V'.");
        }
      }
    }
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("\\n=== INICIANDO ESP32 MOTOR BLE CONTROLLER ===");

  // 1. Configurar Pines de Dirección como Salidas
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);

  // 2. Configurar Generador PWM LEDC para ENA
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_ENA, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0); // Iniciar apagado

  // 3. Inicializar Dispositivo BLE
  BLEDevice::init("ESP32_Motor_Control");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // 4. Crear Servicio y Característica
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_WRITE |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->setCallbacks(new MotorCharacteristicCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());

  // 5. Iniciar Servicio y Publicidad (Advertising)
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Parámetros de compatibilidad iPhone/Android
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Servidor listo y publicitando como 'ESP32_Motor_Control'");
  Serial.println("[INFO] Esperando conexión desde App Móvil o Web BLE...");
}

void loop() {
  // El manejo de BLE y PWM es completamente asíncrono e interrumpido por hardware.
  delay(50);
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
