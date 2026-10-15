<div align="center">

# 🐆 WildGuard AI
### Brazilian Road Wildlife Detection & Monitoring System

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-ONNX-FF6B35?style=for-the-badge&logo=pytorch&logoColor=white)](https://ultralytics.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Real-time AI detection of 5 endangered Brazilian road animals using YOLOv8 + ONNX Runtime, with sensor-triggered camera capture, detection history, and a full analytics dashboard.**

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Dataset](#-dataset) · [Hardware](#-hardware-integration)

</div>

---

## 🌿 Overview

WildGuard AI is an end-to-end wildlife monitoring platform designed to detect and track animals commonly involved in road accidents in Brazil. Using a custom-trained **YOLOv8n** model exported to ONNX, it runs efficient real-time inference from both **uploaded images** and **live webcam feeds**.

A key feature is **sensor-triggered detection**: an ESP32/Arduino connected to an ultrasonic distance sensor and a PIR motion sensor automatically activates the camera when an animal approaches within 20 cm — reducing false activations and saving computation.

### Detected Species

| Class | Common Name | Status |
|-------|------------|--------|
| `tapir` | Brazilian Tapir (*Tapirus terrestris*) | Vulnerable |
| `jaguarundi` | Jaguarundi (*Herpailurus yagouaroundi*) | Least Concern |
| `maned_wolf` | Maned Wolf (*Chrysocyon brachyurus*) | Near Threatened |
| `puma` | Puma (*Puma concolor*) | Least Concern |
| `giant_anteater` | Giant Anteater (*Myrmecophaga tridactyla*) | Vulnerable |

---

## ✨ Features

- 🖼️ **Image Detection** — Upload any image; get annotated output with bounding boxes and confidence scores
- 📹 **Live Webcam Detection** — Frame-by-frame real-time inference with session tracking
- 📡 **Sensor-Triggered Camera** — Auto-activates when an ultrasonic sensor detects proximity < 20 cm
- 📊 **Analytics Dashboard** — Hourly/daily detection trends, species breakdowns, source distribution (Recharts)
- 🗂️ **Detection History** — Searchable, filterable log of all detections with thumbnails; exportable to CSV
- 🌐 **REST API** — Full FastAPI backend with interactive Swagger docs at `/docs`
- 💾 **SQLite Storage** — Lightweight, zero-config persistent storage for all detection events
- 🔴 **Live Sensor Monitor** — Real-time distance & PIR status panel with auto-start/stop logic

---

## 🏗️ Architecture

```
animal_detection/
├── backend/                    # FastAPI + ONNX inference server
│   ├── main.py                 # API routes (detect, history, analytics, sensor, export)
│   ├── model.py                # YOLOv8 ONNX inference class (preprocess → infer → NMS)
│   ├── database.py             # SQLite helpers (init, CRUD, analytics queries)
│   ├── requirements.txt        # Python dependencies
│   └── detections.db           # Auto-created SQLite database
│
├── frontend/                   # React + Vite + Tailwind CSS dashboard
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx   # Overview stats & recent activity
│       │   ├── ImageDetection.jsx  # Drag-and-drop image upload + annotated result
│       │   ├── LiveDetection.jsx   # Webcam feed + sensor monitor panel
│       │   ├── History.jsx     # Filterable detection log + CSV export
│       │   └── Analytics.jsx   # Charts: hourly, daily, species, sources
│       ├── components/
│       │   ├── Sidebar.jsx     # Navigation sidebar
│       │   ├── StatCard.jsx    # Reusable metric card
│       │   ├── AlertBanner.jsx # Contextual alert component
│       │   └── AnimalTag.jsx   # Color-coded species badge
│       └── services/api.js     # Axios-based API service layer
│
├── sketch_mar19a/
│   └── sketch_mar19a.ino       # ESP32 firmware (Wi-Fi web server + stepper control)
│
├── runs/detect/train3/weights/
│   └── best.onnx               # Trained YOLOv8n model (ONNX format)
│
├── bra_dataset.yaml            # Dataset config for YOLOv8 training
├── model_training.ipynb        # Jupyter notebook: training, evaluation, export
└── sensor_log.csv              # Live sensor feed (Distance + PIR readings)
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- A webcam (for live detection)
- *(Optional)* ESP32 with HC-SR04 ultrasonic + PIR sensor

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/animal_detection.git
cd animal_detection
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API server starts at **`http://localhost:8001`**.  
Interactive docs available at **`http://localhost:8001/docs`**.

> **Note:** The model path in `model.py` must point to `runs/detect/train3/weights/best.onnx`. Update `MODEL_PATH` if your directory differs.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard opens at **`http://localhost:5173`**.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/detect/image` | Detect animals in an uploaded image |
| `POST` | `/api/detect/frame` | Detect from a base64 webcam frame |
| `GET` | `/api/history` | Get detection history (filterable) |
| `POST` | `/api/history/save` | Manually save a detection record |
| `DELETE`| `/api/history/{id}` | Delete a detection record |
| `GET` | `/api/analytics` | Aggregated analytics (counts, hourly, daily) |
| `GET` | `/api/sensor/latest` | Latest sensor reading (distance + PIR + trigger) |
| `GET` | `/api/export/csv` | Export detection history as CSV |

### Example: `/api/detect/image` Response

```json
{
  "detections": [
    {
      "animal": "puma",
      "confidence": 0.8712,
      "bbox": [142, 85, 430, 320],
      "class_id": 3
    }
  ],
  "annotated_image": "<base64-encoded JPEG>",
  "timestamp": "2026-03-20 14:32:11",
  "count": 1
}
```

### Example: `/api/sensor/latest` Response

```json
{
  "distance_cm": 15.2,
  "pir": "Motion Detected",
  "triggered": true,
  "threshold_cm": 20.0
}
```

---

## 📦 Dataset

The model was trained on the **[Brazilian Road Animals (BRA) Dataset](https://universe.roboflow.com/)**, a curated set of images of 5 Brazilian fauna species captured in road/wildlife corridor settings.

**Dataset config (`bra_dataset.yaml`):**

```yaml
path: D:/animal_detection/archive/Dataset
train: images/train
val:   images/val
test:  images/test

names:
  0: tapir
  1: jaguarundi
  2: maned_wolf
  3: puma
  4: giant_anteater
```

### Model Training

Training was performed in `model_training.ipynb` using the Ultralytics YOLOv8 framework:

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.train(data="bra_dataset.yaml", epochs=100, imgsz=640)
model.export(format="onnx")   # produces best.onnx
```

**Inference settings:**

| Parameter | Value |
|-----------|-------|
| Input size | 640 × 640 |
| Confidence threshold | 0.35 |
| IOU threshold (NMS) | 0.45 |
| Runtime | ONNX Runtime (CPU) |

---

## 🔌 Hardware Integration

### Sensor-Triggered Camera (ESP32 + HC-SR04 + PIR)

The system supports **automatic camera activation** when an animal is sensed nearby:

1. An **ESP32** reads distance from an **HC-SR04 ultrasonic sensor** and a **PIR motion sensor**
2. Readings are logged to `sensor_log.csv` in the format:
   ```
   Distance: 15.20 cm | PIR: Motion Detected
   Distance: 156.79 cm | PIR: No Motion
   ```
3. The backend polls this file and exposes `/api/sensor/latest`
4. The frontend **Live Detection** page polls this endpoint every 2 seconds:
   - If `distance_cm < 20` → **auto-starts** the webcam
   - When distance clears → **auto-stops** (unless manually started)

### ESP32 Firmware

The `sketch_mar19a.ino` sketch also includes a **Wi-Fi web server** for dual stepper motor control (used for a motorized camera gimbal / lamp positioning rig).

**Pin mapping:**

| Component | Pin |
|-----------|-----|
| Stepper 1 STEP | GPIO 19 |
| Stepper 1 DIR | GPIO 18 |
| Stepper 2 STEP | GPIO 21 |
| Stepper 2 DIR | GPIO 22 |

---

## 🖥️ Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Real-time stats, recent detections, API status |
| **Image Detection** | `/image` | Upload & analyze images with annotated results |
| **Live Detection** | `/live` | Webcam feed, sensor monitor, auto-trigger logic |
| **History** | `/history` | Searchable log with filters, thumbnails, CSV export |
| **Analytics** | `/analytics` | Charts: species breakdown, hourly & daily trends |

**Tech stack:** React 19 · React Router v7 · Tailwind CSS v4 · Recharts · Axios · Vite

---

## 🗄️ Database Schema

Detection events are stored in **SQLite** (`backend/detections.db`):

```sql
CREATE TABLE detections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL,        -- "YYYY-MM-DD HH:MM:SS"
    animal      TEXT NOT NULL,        -- species name
    confidence  REAL NOT NULL,        -- 0.0–1.0
    source      TEXT NOT NULL,        -- "image" | "webcam"
    thumbnail   TEXT,                 -- base64 JPEG (160×120)
    bbox        TEXT,                 -- JSON array [x1, y1, x2, y2]
    session_id  TEXT                  -- webcam session UUID
);
```

---

## 🛠️ Tech Stack

### Backend
| Library | Purpose |
|---------|---------|
| FastAPI | REST API framework |
| ONNX Runtime | Model inference |
| OpenCV | Image processing & annotation |
| Pillow | Image utilities |
| SQLite3 | Detection persistence |
| Uvicorn | ASGI server |

### Frontend
| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool & dev server |
| Tailwind CSS 4 | Styling |
| Recharts | Analytics charts |
| Axios | HTTP client |
| React Router 7 | Client-side routing |

---

## 📋 Requirements

### Backend (`backend/requirements.txt`)

```
fastapi
uvicorn[standard]
onnxruntime
opencv-python-headless
numpy
pillow
python-multipart
aiofiles
```

### Frontend

```
react ^19 · react-dom · react-router-dom ^7
recharts ^3 · axios · react-icons
tailwindcss ^4 · vite ^7
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-species`)
3. Commit your changes (`git commit -m 'Add new species class'`)
4. Push to your branch (`git push origin feature/new-species`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for Brazilian Wildlife Conservation

**WildGuard AI** · YOLOv8 + ONNX Runtime · BRA Dataset

*Tapir · Jaguarundi · Maned Wolf · Puma · Giant Anteater*

</div>
