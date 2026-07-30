export interface SensorDetail {
  name: string;
  purpose: string;
  pins: string;
}

export interface ExampleProject {
  id: string;
  title: string;
  tagline: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedHours: string;
  board: string;
  sensors: SensorDetail[];
  connections: { component: string; connections: string[] }[];
  code: string;
  icon: string;
  category: string;
}

export const EXAMPLES: ExampleProject[] = [
  {
    id: "smart-garden",
    title: "Smart Garden Irrigation",
    tagline: "Automatically waters your plants based on soil moisture",
    description: "An automated irrigation system that measures soil moisture and temperature, then waters plants when needed. Data is displayed on an LCD and the system can be controlled via Bluetooth from a smartphone.",
    difficulty: "Beginner",
    estimatedHours: "8-10",
    board: "Arduino Uno",
    sensors: [
      { name: "Soil Moisture Sensor", purpose: "Measures soil water content", pins: "A0, VCC, GND" },
      { name: "DHT11", purpose: "Measures ambient temperature & humidity", pins: "D2, VCC, GND" },
      { name: "16×2 LCD (I2C)", purpose: "Displays sensor readings and pump status", pins: "SDA, SCL, VCC, GND" },
      { name: "Relay Module", purpose: "Switches water pump on/off", pins: "D3, VCC, GND" },
      { name: "Water Pump", purpose: "Pumps water to plants", pins: "Relay output" },
    ],
    connections: [
      { component: "Soil Moisture Sensor", connections: [
"A0 -> Arduino A0",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "DHT11", connections: [
"Data -> Arduino D2",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "LCD I2C", connections: [
"SDA -> Arduino A4 (SDA)",
      "SCL -> Arduino A5 (SCL)",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "Relay Module", connections: [
"IN -> Arduino D3",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "Water Pump", connections: [
"+ -> Relay COM",
      "- -> External 12V supply GND"
      ] }
    ],
    code: `#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define SOIL_MOISTURE A0
#define DHTPIN 2
#define DHTTYPE DHT11
#define RELAY 3

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(9600);
  dht.begin();
  lcd.init();
  lcd.backlight();
  pinMode(RELAY, OUTPUT);
  digitalWrite(RELAY, LOW);
}

void loop() {
  int moisture = analogRead(SOIL_MOISTURE);
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  lcd.setCursor(0, 0);
  lcd.print("Soil: ");
  lcd.print(moisture);
  lcd.print("   ");

  lcd.setCursor(0, 1);
  lcd.print("Temp: ");
  lcd.print(temp);
  lcd.print("C");

  if (moisture > 700) {
    digitalWrite(RELAY, HIGH);
    Serial.println("Pump ON - Soil is dry");
  } else {
    digitalWrite(RELAY, LOW);
    Serial.println("Pump OFF - Soil is moist");
  }

  delay(2000);
}`,
    icon: "🌱",
    category: "Environmental",
  },
  {
    id: "weather-station",
    title: "Weather Monitoring Station",
    tagline: "Track temperature, humidity, pressure, and air quality",
    description: "A desktop weather station that measures temperature, humidity, barometric pressure, and air quality (PM2.5). Data is displayed on an OLED screen and logged to an SD card for later analysis.",
    difficulty: "Beginner",
    estimatedHours: "10-12",
    board: "Arduino Uno",
    sensors: [
      { name: "DHT22", purpose: "Temperature & humidity sensor", pins: "D2, VCC, GND" },
      { name: "BMP180", purpose: "Barometric pressure & altitude", pins: "SDA, SCL, VCC, GND" },
      { name: "MQ-135", purpose: "Air quality (CO2, smoke, NH3)", pins: "A0, VCC, GND" },
      { name: "OLED 128×64 (I2C)", purpose: "Display readings", pins: "SDA, SCL, VCC, GND" },
      { name: "MicroSD Card Module", purpose: "Data logging", pins: "D10-D13, VCC, GND" },
    ],
    connections: [
      { component: "DHT22", connections: [
"Data -> Arduino D2",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "BMP180", connections: [
"SDA -> Arduino A4 (SDA)",
      "SCL -> Arduino A5 (SCL)",
      "VCC -> Arduino 3.3V",
      "GND -> Arduino GND"
      ] },
      { component: "MQ-135", connections: [
"A0 -> Arduino A0",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "OLED", connections: [
"SDA -> Arduino A4 (SDA)",
      "SCL -> Arduino A5 (SCL)",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "SD Module", connections: [
"CS -> Arduino D10",
      "MOSI -> Arduino D11",
      "MISO -> Arduino D12",
      "SCK -> Arduino D13",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] }
    ],
    code: `#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <DHT.h>
#include <U8g2lib.h>
#include <SD.h>

#define DHTPIN 2
#define DHTTYPE DHT22
#define MQ135 A0
#define SD_CS 10

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP085 bmp;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0);
File dataFile;

void setup() {
  Serial.begin(9600);
  dht.begin();
  bmp.begin();
  oled.begin();
  oled.setFlipMode(0);

  if (!SD.begin(SD_CS)) {
    Serial.println("SD card failed!");
  }
}

void loop() {
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();
  float pressure = bmp.readPressure() / 100.0;
  int airQuality = analogRead(MQ135);

  oled.clearBuffer();
  oled.setFont(u8g2_font_ncenB08_tr);
  oled.setCursor(0, 12);
  oled.print(temp); oled.print("C  ");
  oled.print(humid); oled.println("%");
  oled.setCursor(0, 30);
  oled.print(pressure); oled.println(" hPa");
  oled.setCursor(0, 48);
  oled.print("AQ: "); oled.print(airQuality);
  oled.sendBuffer();

  dataFile = SD.open("DATA.CSV", FILE_WRITE);
  if (dataFile) {
    dataFile.print(millis()); dataFile.print(",");
    dataFile.print(temp); dataFile.print(",");
    dataFile.print(humid); dataFile.print(",");
    dataFile.print(pressure); dataFile.print(",");
    dataFile.println(airQuality);
    dataFile.close();
  }

  delay(5000);
}`,
    icon: "🌤️",
    category: "Environmental",
  },
  {
    id: "home-security",
    title: "IoT Home Security System",
    tagline: "Motion detection, door sensors, and camera alerts",
    description: "A complete home security system with PIR motion sensors, magnetic door contacts, a camera module, and an alarm. Sends push notifications via WiFi and can be armed/disarmed using a keypad or mobile app.",
    difficulty: "Intermediate",
    estimatedHours: "20-25",
    board: "ESP32",
    sensors: [
      { name: "PIR Motion Sensor", purpose: "Detects movement", pins: "D2, VCC, GND" },
      { name: "Magnetic Reed Switch", purpose: "Detects door/window open/close", pins: "D3, GND" },
      { name: "Camera Module OV2640", purpose: "Captures images on trigger", pins: "SDA, SCL, VSYNC, HREF, PCLK, XCLK, D0-D7" },
      { name: "Buzzer", purpose: "Alarm sound", pins: "D4, VCC, GND" },
      { name: "4×4 Keypad", purpose: "Arm/disarm input", pins: "D5-D12" },
    ],
    connections: [
      { component: "PIR Sensor", connections: [
"OUT -> ESP32 D2",
      "VCC -> ESP32 5V",
      "GND -> ESP32 GND"
      ] },
      { component: "Reed Switch", connections: [
"1 -> ESP32 D3",
      "2 -> ESP32 GND"
      ] },
      { component: "Buzzer", connections: [
"+ -> ESP32 D4",
      "- -> ESP32 GND"
      ] },
      { component: "Keypad", connections: [
"R1-R4 -> ESP32 D5-D8",
      "C1-C4 -> ESP32 D9-D12"
      ] }
    ],
    code: `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Keypad.h>

const char* ssid = "YOUR_WIFI";
const char* pass = "YOUR_PASS";

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {5,6,7,8};
byte colPins[COLS] = {9,10,11,12};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

#define PIR 2
#define REED 3
#define BUZZER 4
const char* CODE = "1234";

bool armed = false;
String input = "";

void setup() {
  Serial.begin(115200);
  pinMode(PIR, INPUT);
  pinMode(REED, INPUT_PULLUP);
  pinMode(BUZZER, OUTPUT);
  WiFi.begin(ssid, pass);
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    if (key == '#') {
      armed = (input == CODE);
      input = "";
      digitalWrite(BUZZER, armed ? LOW : HIGH);
      delay(armed ? 200 : 1000);
      digitalWrite(BUZZER, LOW);
    } else if (key == '*') {
      input = "";
    } else {
      input += key;
    }
  }

  if (armed) {
    if (digitalRead(PIR) || !digitalRead(REED)) {
      digitalWrite(BUZZER, HIGH);
      // Send notification via Blynk / Telegram / IFTTT
      Serial.println("ALARM! Intrusion detected.");
    }
  }
}`,
    icon: "🛡️",
    category: "Security",
  },
  {
    id: "smart-lighting",
    title: "Smart Lighting System",
    tagline: "Voice-controlled, dimmable, colour-changing lights",
    description: "Control RGB LED strips with voice commands via Bluetooth or WiFi. Includes a mobile app interface, preset scenes (Study, Party, Sleep), automatic brightness based on ambient light, and energy usage tracking.",
    difficulty: "Beginner",
    estimatedHours: "6-8",
    board: "ESP8266",
    sensors: [
      { name: "RGB LED Strip", purpose: "Colour-adjustable lighting", pins: "R, G, B, 12V" },
      { name: "LDR Sensor", purpose: "Measures ambient light", pins: "A0, VCC, GND" },
      { name: "HC-05 Bluetooth Module", purpose: "Voice & app control", pins: "TX, RX, VCC, GND" },
      { name: "MOSFET IRF520", purpose: "Drives LED strip channels", pins: "D9-D11, GND" },
    ],
    connections: [
      { component: "LDR Sensor", connections: [
"OUT -> ESP8266 A0",
      "VCC -> ESP8266 3.3V",
      "GND -> ESP8266 GND"
      ] },
      { component: "HC-05", connections: [
"TX -> ESP8266 RX (D3)",
      "RX -> ESP8266 TX (D4)",
      "VCC -> ESP8266 3.3V",
      "GND -> ESP8266 GND"
      ] },
      { component: "MOSFET (R)", connections: [
"Gate -> ESP8266 D5"
      ] },
      { component: "MOSFET (G)", connections: [
"Gate -> ESP8266 D6"
      ] },
      { component: "MOSFET (B)", connections: [
"Gate -> ESP8266 D7"
      ] },
      { component: "LED Strip", connections: [
"R -> MOSFET(R) Drain",
      "G -> MOSFET(G) Drain",
      "B -> MOSFET(B) Drain",
      "12V -> 12V Supply"
      ] }
    ],
    code: `#include <SoftwareSerial.h>

SoftwareSerial bt(3, 4); // RX, TX
#define LDR A0
#define RED D5
#define GREEN D6
#define BLUE D7

void setup() {
  Serial.begin(9600);
  bt.begin(9600);
  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(BLUE, OUTPUT);
  analogWrite(RED, 0);
  analogWrite(GREEN, 0);
  analogWrite(BLUE, 0);
}

void loop() {
  int ambient = analogRead(LDR);
  int brightness = map(ambient, 0, 1023, 50, 255);

  if (bt.available()) {
    String cmd = bt.readString();
    cmd.trim();
    if (cmd == "ON") {
      analogWrite(RED, brightness);
      analogWrite(GREEN, brightness);
      analogWrite(BLUE, brightness);
    } else if (cmd == "OFF") {
      analogWrite(RED, 0);
      analogWrite(GREEN, 0);
      analogWrite(BLUE, 0);
    } else if (cmd == "RED") {
      analogWrite(RED, brightness);
      analogWrite(GREEN, 0);
      analogWrite(BLUE, 0);
    } else if (cmd == "GREEN") {
      analogWrite(RED, 0);
      analogWrite(GREEN, brightness);
      analogWrite(BLUE, 0);
    } else if (cmd == "BLUE") {
      analogWrite(RED, 0);
      analogWrite(GREEN, 0);
      analogWrite(BLUE, brightness);
    } else if (cmd == "PARTY") {
      partyMode(brightness);
    }
  }
}

void partyMode(int b) {
  for (int i = 0; i < 10; i++) {
    analogWrite(RED, b); analogWrite(GREEN, 0); analogWrite(BLUE, 0); delay(200);
    analogWrite(RED, 0); analogWrite(GREEN, b); analogWrite(BLUE, 0); delay(200);
    analogWrite(RED, 0); analogWrite(GREEN, 0); analogWrite(BLUE, b); delay(200);
  }
}`,
    icon: "💡",
    category: "Home Automation",
  },
  {
    id: "health-monitor",
    title: "Health Monitoring Patch",
    tagline: "Track heart rate, SpO2, and body temperature",
    description: "A wearable health monitor that measures heart rate (BPM), blood oxygen saturation (SpO2), and body temperature. Displays on a small OLED and syncs data to a phone via Bluetooth for health logging.",
    difficulty: "Intermediate",
    estimatedHours: "12-16",
    board: "Arduino Nano",
    sensors: [
      { name: "MAX30102", purpose: "Heart rate & SpO2 sensor", pins: "SDA, SCL, VCC, GND" },
      { name: "LM35", purpose: "Body temperature sensor", pins: "A0, VCC, GND" },
      { name: "OLED 128×64 (I2C)", purpose: "Display vitals", pins: "SDA, SCL, VCC, GND" },
      { name: "HC-05 Bluetooth Module", purpose: "Sync data to phone", pins: "TX, RX, VCC, GND" },
      { name: "Vibration Motor", purpose: "Alert for abnormal readings", pins: "D3, VCC, GND" },
    ],
    connections: [
      { component: "MAX30102", connections: [
"SDA -> Nano A4 (SDA)",
      "SCL -> Nano A5 (SCL)",
      "VCC -> Nano 3.3V",
      "GND -> Nano GND"
      ] },
      { component: "LM35", connections: [
"OUT -> Nano A0",
      "VCC -> Nano 5V",
      "GND -> Nano GND"
      ] },
      { component: "OLED", connections: [
"SDA -> Nano A4 (SDA)",
      "SCL -> Nano A5 (SCL)",
      "VCC -> Nano 5V",
      "GND -> Nano GND"
      ] },
      { component: "HC-05", connections: [
"TX -> Nano D2",
      "RX -> Nano D3",
      "VCC -> Nano 5V",
      "GND -> Nano GND"
      ] },
      { component: "Vibration Motor", connections: [
"+ -> Nano D4",
      "- -> Nano GND"
      ] }
    ],
    code: `#include <Wire.h>
#include <MAX30105.h>
#include <U8g2lib.h>

MAX30105 particleSensor;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0);
#define TEMP A0
#define VIBRO 4

long lastBeat = 0;
int BPM = 0;
float SpO2 = 98.0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  oled.begin();
  pinMode(VIBRO, OUTPUT);

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    oled.clearBuffer();
    oled.setFont(u8g2_font_ncenB08_tr);
    oled.setCursor(0, 30);
    oled.print("Sensor error");
    oled.sendBuffer();
    while (1);
  }
  particleSensor.setup();
}

void loop() {
  long irValue = particleSensor.getIR();

  if (particleSensor.checkForBeat(irValue)) {
    long now = millis();
    if (lastBeat > 0) {
      BPM = 60000 / (now - lastBeat);
    }
    lastBeat = now;
  }

  float temp = analogRead(TEMP) * 0.488; // LM35: 10mV per degree
  SpO2 = particleSensor.getRed() > 50000 ? 98.0 : 94.0;

  oled.clearBuffer();
  oled.setFont(u8g2_font_ncenB08_tr);
  oled.setCursor(0, 14);
  oled.print("BPM: "); oled.print(BPM);
  oled.setCursor(0, 32);
  oled.print("SpO2: "); oled.print(SpO2); oled.print("%");
  oled.setCursor(0, 50);
  oled.print("Temp: "); oled.print(temp); oled.print("C");
  oled.sendBuffer();

  if (BPM > 120 || BPM < 50 && BPM > 0) {
    digitalWrite(VIBRO, HIGH);
    delay(500);
    digitalWrite(VIBRO, LOW);
  }

  Serial.print(BPM); Serial.print(",");
  Serial.print(SpO2); Serial.print(",");
  Serial.println(temp);

  delay(2000);
}`,
    icon: "❤️",
    category: "Health",
  },
  {
    id: "rfid-door-lock",
    title: "RFID Door Lock System",
    tagline: "Keyless entry with RFID cards and PIN backup",
    description: "A secure door lock that opens with authorized RFID cards or a PIN code. Features an admin mode to add/remove cards, an event log of entries, and a buzzer alarm for tamper attempts.",
    difficulty: "Beginner",
    estimatedHours: "6-8",
    board: "Arduino Uno",
    sensors: [
      { name: "RC522 RFID Module", purpose: "Reads RFID cards/tags", pins: "D10-D13, VCC, GND" },
      { name: "4×4 Keypad", purpose: "PIN code entry", pins: "D2-D9" },
      { name: "Solenoid Door Lock", purpose: "Electromagnetic lock", pins: "Relay output" },
      { name: "OLED 128×64 (I2C)", purpose: "Display status messages", pins: "SDA, SCL, VCC, GND" },
      { name: "Buzzer", purpose: "Audio feedback & alarm", pins: "D4, VCC, GND" },
    ],
    connections: [
      { component: "RC522", connections: [
"SDA -> Arduino D10",
      "SCK -> Arduino D13",
      "MOSI -> Arduino D11",
      "MISO -> Arduino D12",
      "IRQ -> Not connected",
      "GND -> Arduino GND",
      "RST -> Arduino D9",
      "3.3V -> Arduino 3.3V"
      ] },
      { component: "Keypad", connections: [
"R1-R4 -> Arduino D2-D5",
      "C1-C4 -> Arduino D6-D9"
      ] },
      { component: "Buzzer", connections: [
"+ -> Arduino D4",
      "- -> Arduino GND"
      ] },
      { component: "OLED", connections: [
"SDA -> Arduino A4",
      "SCL -> Arduino A5"
      ] }
    ],
    code: `#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define RST_PIN 9
#define SS_PIN 10
#define BUZZER 4

MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {2,3,4,5};
byte colPins[COLS] = {6,7,8,9};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

const char* MASTER_PIN = "1234";
String input = "";
bool unlocked = false;

byte authorizedUIDs[][4] = {
  {0x12, 0x34, 0x56, 0x78}
};

void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  lcd.init();
  lcd.backlight();
  pinMode(BUZZER, OUTPUT);
  lcd.print("  Scan card");
}

bool checkCard() {
  for (int i = 0; i < sizeof(authorizedUIDs) / 4; i++) {
    if (mfrc522.uid.uidByte[0] == authorizedUIDs[i][0] &&
        mfrc522.uid.uidByte[1] == authorizedUIDs[i][1] &&
        mfrc522.uid.uidByte[2] == authorizedUIDs[i][2] &&
        mfrc522.uid.uidByte[3] == authorizedUIDs[i][3]) {
      return true;
    }
  }
  return false;
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    if (key == '#') {
      if (input == MASTER_PIN) {
        lcd.clear(); lcd.print(" Access Granted");
        digitalWrite(BUZZER, HIGH); delay(200); digitalWrite(BUZZER, LOW);
        unlocked = true;
        delay(3000);
        lcd.clear(); lcd.print("  Locked");
        unlocked = false;
      } else {
        lcd.clear(); lcd.print("  Wrong PIN");
        digitalWrite(BUZZER, HIGH); delay(1000); digitalWrite(BUZZER, LOW);
      }
      input = "";
    } else if (key == '*') {
      input = "";
      lcd.clear(); lcd.print("  Cleared");
    } else {
      input += key;
      lcd.clear(); lcd.print("PIN: ");
      for (int i = 0; i < input.length(); i++) lcd.print("*");
    }
  }

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (checkCard()) {
      lcd.clear(); lcd.print(" Card Accepted");
      digitalWrite(BUZZER, HIGH); delay(200); digitalWrite(BUZZER, LOW);
      unlocked = true;
      delay(3000);
      lcd.clear(); lcd.print("  Locked");
      unlocked = false;
    } else {
      lcd.clear(); lcd.print(" Unknown Card");
      digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
    }
    mfrc522.PICC_HaltA();
  }
}`,
    icon: "🔐",
    category: "Security",
  },
  {
    id: "smart-fan",
    title: "Smart Cooling Fan",
    tagline: "Temperature and voice-controlled desk fan",
    description: "A desk fan that automatically adjusts speed based on room temperature, can be controlled by voice commands via Bluetooth, and shows real-time stats on an OLED display. Includes a sleep mode timer.",
    difficulty: "Beginner",
    estimatedHours: "6-8",
    board: "Arduino Uno",
    sensors: [
      { name: "DHT11", purpose: "Temperature & humidity", pins: "D2, VCC, GND" },
      { name: "L298N Motor Driver", purpose: "Drives fan motor with speed control", pins: "D5-D7, VCC, GND" },
      { name: "OLED 128×64 (I2C)", purpose: "Display temperature & fan speed", pins: "SDA, SCL, VCC, GND" },
      { name: "HC-05 Bluetooth Module", purpose: "Voice/app speed control", pins: "TX, RX, VCC, GND" },
    ],
    connections: [
      { component: "DHT11", connections: [
"Data -> Arduino D2",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "L298N", connections: [
"ENA -> Arduino D5 (PWM)",
      "IN1 -> Arduino D6",
      "IN2 -> Arduino D7",
      "VCC -> Arduino 5V",
      "GND -> Arduino GND"
      ] },
      { component: "OLED", connections: [
"SDA -> Arduino A4",
      "SCL -> Arduino A5"
      ] },
      { component: "HC-05", connections: [
"TX -> Arduino D3",
      "RX -> Arduino D4"
      ] }
    ],
    code: `#include <DHT.h>
#include <U8g2lib.h>
#include <SoftwareSerial.h>

#define DHTPIN 2
#define DHTTYPE DHT11
#define ENA 5
#define IN1 6
#define IN2 7

DHT dht(DHTPIN, DHTTYPE);
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0);
SoftwareSerial bt(3, 4);

int fanSpeed = 0;
bool fanOn = false;

void setup() {
  Serial.begin(9600);
  bt.begin(9600);
  dht.begin();
  oled.begin();
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
}

void setFan(int speed) {
  analogWrite(ENA, speed);
  fanSpeed = speed;
  fanOn = speed > 0;
}

void loop() {
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  if (bt.available()) {
    String cmd = bt.readString();
    cmd.trim();
    if (cmd == "ON" || cmd == "on") setFan(150);
    else if (cmd == "OFF" || cmd == "off") setFan(0);
    else if (cmd == "HIGH") setFan(255);
    else if (cmd == "MEDIUM") setFan(150);
    else if (cmd == "LOW") setFan(80);
  }

  if (!isnan(temp) && temp > 30 && !fanOn) setFan(100);
  else if (!isnan(temp) && temp < 25 && fanOn) setFan(0);

  oled.clearBuffer();
  oled.setFont(u8g2_font_ncenB08_tr);
  oled.setCursor(0, 14);
  oled.print(temp); oled.print("C  "); oled.print(humid); oled.println("%");
  oled.setCursor(0, 32);
  oled.print("Fan: ");
  if (fanOn) { oled.print("ON "); oled.print(map(fanSpeed, 0, 255, 0, 100)); oled.print("%"); }
  else oled.print("OFF");
  oled.sendBuffer();

  delay(2000);
}`,
    icon: "🌀",
    category: "Home Automation",
  },
  {
    id: "plant-monitor",
    title: "Smart Plant Monitor",
    tagline: "Know exactly when your plants need water and light",
    description: "A compact device that tracks soil moisture, ambient light, and temperature for each plant. Sends reminders to your phone via Bluetooth when a plant needs watering or is getting too little light.",
    difficulty: "Beginner",
    estimatedHours: "4-6",
    board: "ESP8266",
    sensors: [
      { name: "Soil Moisture Sensor", purpose: "Measures soil water content", pins: "A0, VCC, GND" },
      { name: "LDR Sensor", purpose: "Measures ambient light level", pins: "A0 (via voltage divider), VCC, GND" },
      { name: "DHT11", purpose: "Temperature & humidity", pins: "D2, VCC, GND" },
      { name: "OLED 128×64 (I2C)", purpose: "Display plant status", pins: "SDA, SCL, VCC, GND" },
    ],
    connections: [
      { component: "Soil Moisture", connections: [
"A0 -> ESP8266 A0",
      "VCC -> ESP8266 3.3V",
      "GND -> ESP8266 GND"
      ] },
      { component: "LDR + 10kΩ", connections: [
"Mid -> ESP8266 A0 (via divider)"
      ] },
      { component: "DHT11", connections: [
"Data -> ESP8266 D2",
      "VCC -> ESP8266 3.3V",
      "GND -> ESP8266 GND"
      ] },
      { component: "OLED", connections: [
"SDA -> ESP8266 D2",
      "SCL -> ESP8266 D1"
      ] }
    ],
    code: `#include <ESP8266WiFi.h>
#include <U8g2lib.h>
#include <DHT.h>

#define SOIL A0
#define LIGHT A0
#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0, 16, 5); // SDA=GPIO4(D2), SCL=GPIO14(D5)

void setup() {
  Serial.begin(115200);
  dht.begin();
  oled.begin();
  oled.setFlipMode(0);
}

void loop() {
  int soil = analogRead(SOIL);
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  oled.clearBuffer();
  oled.setFont(u8g2_font_ncenB08_tr);
  oled.setCursor(0, 14);
  oled.print("Soil: ");
  if (soil > 700) oled.print("DRY!");
  else oled.print("OK");

  oled.setCursor(0, 32);
  oled.print(temp); oled.print("C  "); oled.print(humid); oled.print("%");
  oled.setCursor(0, 50);
  oled.print("Light: ");
  oled.print(analogRead(LIGHT));
  oled.sendBuffer();

  if (soil > 700) {
    Serial.println("ALERT: Plant needs water!");
  }
  delay(3000);
}`,
    icon: "🌿",
    category: "Environmental",
  },
];