import base64
import csv
import io
import os
import re
import uuid
from datetime import datetime
from typing import Optional

# Path to the sensor log produced by Arduino/ESP32
SENSOR_LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sensor_log.csv")
SENSOR_LOG_PATH = os.path.normpath(SENSOR_LOG_PATH)
DISTANCE_TRIGGER_CM = 20.0  # Camera auto-triggers below this distance

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import init_db, insert_detection, get_detections, delete_detection, get_analytics
from model import get_detector

app = FastAPI(title="Animal Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()
    get_detector()  # load model on startup
    print("[Startup] DB initialized, model loaded.")


# --- Models ---
class FrameRequest(BaseModel):
    frame: str          # base64-encoded JPEG/PNG
    session_id: Optional[str] = None
    save_detections: Optional[bool] = True


class SaveRequest(BaseModel):
    animal: str
    confidence: float
    source: str
    thumbnail: Optional[str] = None
    bbox: Optional[list] = None
    session_id: Optional[str] = None


# --- Endpoints ---

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    """Accept an image file, run ONNX inference, return annotated image + detections."""
    detector = get_detector()
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    detections, annotated_b64 = detector.detect_and_annotate(img_bgr)

    # Save top-detection to history
    if detections:
        top = max(detections, key=lambda d: d["confidence"])
        # Create small thumbnail from original
        thumb = cv2.resize(img_bgr, (160, 120))
        thumb_b64 = detector.image_to_b64(thumb, quality=60)
        insert_detection(
            animal=top["animal"],
            confidence=top["confidence"],
            source="image",
            thumbnail=thumb_b64,
            bbox=top["bbox"],
        )

    return {
        "detections": detections,
        "annotated_image": annotated_b64,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(detections),
    }


@app.post("/api/detect/frame")
async def detect_frame(req: FrameRequest):
    """Accept a base64 webcam frame, run inference, return annotated frame + detections."""
    detector = get_detector()
    try:
        img_data = base64.b64decode(req.frame)
        np_arr = np.frombuffer(img_data, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 frame")

    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode frame")

    detections, annotated_b64 = detector.detect_and_annotate(img_bgr)

    # Save each unique detection to history
    if req.save_detections and detections:
        thumb = cv2.resize(img_bgr, (160, 120))
        thumb_b64 = detector.image_to_b64(thumb, quality=60)
        for det in detections[:3]:  # cap at 3 per frame to avoid spam
            insert_detection(
                animal=det["animal"],
                confidence=det["confidence"],
                source="webcam",
                thumbnail=thumb_b64,
                bbox=det["bbox"],
                session_id=req.session_id,
            )

    return {
        "detections": detections,
        "annotated_frame": annotated_b64,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(detections),
    }


@app.get("/api/history")
def history(
    animal: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    limit: int = Query(200),
):
    records = get_detections(animal, date_from, date_to, min_confidence, limit)
    return {"records": records, "count": len(records)}


@app.post("/api/history/save")
def save_detection(req: SaveRequest):
    rid = insert_detection(
        animal=req.animal,
        confidence=req.confidence,
        source=req.source,
        thumbnail=req.thumbnail,
        bbox=req.bbox,
        session_id=req.session_id,
    )
    return {"id": rid, "status": "saved"}


@app.delete("/api/history/{record_id}")
def delete_record(record_id: int):
    ok = delete_detection(record_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "deleted"}


@app.get("/api/analytics")
def analytics():
    data = get_analytics()
    return data


@app.get("/api/sensor/latest")
def sensor_latest():
    """Read the last valid sensor line from sensor_log.csv and return distance, PIR, and trigger status."""
    distance_cm = None
    pir = "Unknown"

    try:
        with open(SENSOR_LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        # Walk from last line backwards to find first valid sensor reading
        pattern = re.compile(
            r"Distance:\s*([\d.]+)\s*cm\s*\|\s*PIR:\s*(.+)",
            re.IGNORECASE,
        )
        for line in reversed(lines):
            m = pattern.search(line.strip())
            if m:
                distance_cm = float(m.group(1))
                pir = m.group(2).strip()
                break
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="sensor_log.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading sensor log: {e}")

    if distance_cm is None:
        return {
            "distance_cm": None,
            "pir": "No data",
            "triggered": False,
            "threshold_cm": DISTANCE_TRIGGER_CM,
        }

    return {
        "distance_cm": distance_cm,
        "pir": pir,
        "triggered": distance_cm < DISTANCE_TRIGGER_CM,
        "threshold_cm": DISTANCE_TRIGGER_CM,
    }


@app.get("/api/export/csv")
def export_csv(
    animal: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
):
    records = get_detections(animal, date_from, date_to, min_confidence, limit=10000)
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "timestamp", "animal", "confidence", "source", "session_id"],
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(records)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=detections.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
