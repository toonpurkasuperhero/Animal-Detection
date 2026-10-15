#include <WiFi.h>
#include <WebServer.h>
#include <AccelStepper.h>

// --- Wi-Fi Credentials ---
const char* ssid = "asus";
const char* password = "asus1234";

// --- Server Setup ---
WebServer server(80);

// --- Stepper 1 Setup (Level 1) ---
const int stepPin1 = 19;
const int dirPin1 = 18;
AccelStepper stepper1(1, stepPin1, dirPin1);
float targetSpeed1 = 0.0; 

// --- Stepper 2 Setup (Level 2) ---
const int stepPin2 = 21;
const int dirPin2 = 22;
AccelStepper stepper2(1, stepPin2, dirPin2);
float targetSpeed2 = 0.0;

const float maxSpeed = 800.0; // Max steps per second for both motors

// --- HTML & JavaScript Interface ---
const char MAIN_page[] PROGMEM = R"=====(
<!DOCTYPE html>
<html>
<head>
  <title>Dual Level Lamp Control</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 30px; background-color: #f4f4f9;}
    h1 { color: #333; font-size: 24px;}
    h2 { color: #555; margin-top: 30px; }
    .control-panel { background: white; padding: 20px; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); display: inline-block; margin: 10px; }
    .button { background-color: #007BFF; color: white; border: none; padding: 15px 25px; font-size: 18px; margin: 5px; border-radius: 5px; cursor: pointer; width: 120px; }
    .button.stop { background-color: #DC3545; }
    .button:active { opacity: 0.8; transform: scale(0.98); }
  </style>
  <script>
    // This sends the command without reloading the page
    function sendCommand(url) {
      fetch(url).catch(err => console.error('Error:', err));
    }
  </script>
</head>
<body>
  <h1>Lamp Control Panel</h1>
  
  <div class="control-panel">
    <h2>Upper Level</h2>
    <button class="button" onclick="sendCommand('/L1_left')">Move Left</button>
    <button class="button stop" onclick="sendCommand('/L1_stop')">Stop</button>
    <button class="button" onclick="sendCommand('/L1_right')">Move Right</button>
  </div>

  <br>

  <div class="control-panel">
    <h2>Lower Level</h2>
    <button class="button" onclick="sendCommand('/L2_left')">Move Left</button>
    <button class="button stop" onclick="sendCommand('/L2_stop')">Stop</button>
    <button class="button" onclick="sendCommand('/L2_right')">Move Right</button>
  </div>
</body>
</html>
)=====";

// --- Route Handlers ---
void handleRoot() {
  server.send(200, "text/html", MAIN_page);
}

// Level 1 Controls
void L1_Left()  { targetSpeed1 = -maxSpeed; server.send(200, "text/plain", "OK"); }
void L1_Right() { targetSpeed1 = maxSpeed;  server.send(200, "text/plain", "OK"); }
void L1_Stop()  { targetSpeed1 = 0.0;       server.send(200, "text/plain", "OK"); }

// Level 2 Controls
void L2_Left()  { targetSpeed2 = -maxSpeed; server.send(200, "text/plain", "OK"); }
void L2_Right() { targetSpeed2 = maxSpeed;  server.send(200, "text/plain", "OK"); }
void L2_Stop()  { targetSpeed2 = 0.0;       server.send(200, "text/plain", "OK"); }


void setup() {
  Serial.begin(9600);
  
  // Configure both steppers
  stepper1.setMaxSpeed(1000.0);
  stepper2.setMaxSpeed(1000.0);
  
  // Connect to Wi-Fi
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected.");
  Serial.print("Control Panel IP: ");
  Serial.println(WiFi.localIP());

  // Define web server endpoints
  server.on("/", handleRoot);
  server.on("/L1_left", L1_Left);
  server.on("/L1_right", L1_Right);
  server.on("/L1_stop", L1_Stop);
  server.on("/L2_left", L2_Left);
  server.on("/L2_right", L2_Right);
  server.on("/L2_stop", L2_Stop);

  server.begin();
}

void loop() {
  // 1. Check for web requests
  server.handleClient();

  // 2. Apply target speeds
  stepper1.setSpeed(targetSpeed1);
  stepper2.setSpeed(targetSpeed2);

  // 3. Keep the motors stepping smoothly
  // These functions return instantly if a step isn't due yet
  stepper1.runSpeed();
  stepper2.runSpeed();
}