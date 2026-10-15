import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
import io
import base64
import os

MODEL_PATH = r"D:\animal_detection\runs\detect\train3\weights\best.onnx"
CLASS_NAMES = ["tapir", "jaguarundi", "maned_wolf", "puma", "giant_anteater"]
INPUT_SIZE = 640
CONF_THRESHOLD = 0.35
IOU_THRESHOLD = 0.45

# Color palette per class (BGR for OpenCV)
CLASS_COLORS = {
    "tapir":          (0, 165, 255),    # orange
    "jaguarundi":     (0, 0, 255),      # red
    "maned_wolf":     (0, 255, 128),    # green
    "puma":           (128, 0, 255),    # purple
    "giant_anteater": (255, 200, 0),    # cyan
}


class AnimalDetector:
    def __init__(self):
        self.session = None
        self.input_name = None
        self.load_model()

    def load_model(self):
        providers = ["CPUExecutionProvider"]
        self.session = ort.InferenceSession(MODEL_PATH, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        print(f"[Model] Loaded: {MODEL_PATH}")
        print(f"[Model] Input: {self.input_name}")

    def preprocess(self, image_bgr: np.ndarray):
        """Letterbox resize + normalize to [0,1], CHW float32."""
        h, w = image_bgr.shape[:2]
        scale = INPUT_SIZE / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image_bgr, (new_w, new_h))
        # Pad to square
        pad_top = (INPUT_SIZE - new_h) // 2
        pad_left = (INPUT_SIZE - new_w) // 2
        padded = np.full((INPUT_SIZE, INPUT_SIZE, 3), 114, dtype=np.uint8)
        padded[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = resized
        # Normalize and transpose
        img = padded[:, :, ::-1].astype(np.float32) / 255.0  # BGR->RGB
        img = np.transpose(img, (2, 0, 1))[np.newaxis]        # NCHW
        return img, scale, pad_top, pad_left

    def postprocess(self, outputs, scale, pad_top, pad_left, orig_h, orig_w):
        """Decode YOLOv8 output tensor (1, 9, 8400) -> detections list."""
        pred = outputs[0][0]  # shape: (9, 8400)  or (8400, 9)
        # YOLOv8 ONNX output: (1, 4+nc, 8400)
        if pred.shape[0] < pred.shape[1]:
            # shape is (9, 8400) — columns are anchors
            cx, cy, bw, bh = pred[0], pred[1], pred[2], pred[3]
            class_scores = pred[4:]  # (nc, 8400)
        else:
            # shape is (8400, 9) 
            pred = pred.T
            cx, cy, bw, bh = pred[0], pred[1], pred[2], pred[3]
            class_scores = pred[4:].T  # (nc, 8400)

        # Confidence per anchor: max class score
        if class_scores.ndim == 2 and class_scores.shape[0] == len(CLASS_NAMES):
            confidences = np.max(class_scores, axis=0)
            class_ids = np.argmax(class_scores, axis=0)
        else:
            class_scores_t = class_scores.T if class_scores.shape[1] == len(CLASS_NAMES) else class_scores
            confidences = np.max(class_scores_t, axis=1)
            class_ids = np.argmax(class_scores_t, axis=1)

        mask = confidences >= CONF_THRESHOLD
        cx, cy, bw, bh = cx[mask], cy[mask], bh[mask], bw[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        # Convert cx,cy,bw,bh -> x1,y1,x2,y2 in padded image coords
        x1 = cx - bw / 2
        y1 = cy - bh / 2
        x2 = cx + bw / 2
        y2 = cy + bh / 2

        # Remove padding offset and rescale back to original image
        x1 = (x1 - pad_left) / scale
        y1 = (y1 - pad_top) / scale
        x2 = (x2 - pad_left) / scale
        y2 = (y2 - pad_top) / scale

        # Clip to image bounds
        x1 = np.clip(x1, 0, orig_w)
        y1 = np.clip(y1, 0, orig_h)
        x2 = np.clip(x2, 0, orig_w)
        y2 = np.clip(y2, 0, orig_h)

        # NMS
        boxes = np.stack([x1, y1, x2, y2], axis=1).tolist()
        scores = confidences.tolist()
        class_ids = class_ids.tolist()

        indices = cv2.dnn.NMSBoxes(
            [[b[0], b[1], b[2]-b[0], b[3]-b[1]] for b in boxes],
            scores, CONF_THRESHOLD, IOU_THRESHOLD
        )

        detections = []
        if len(indices) > 0:
            indices = indices.flatten()
            for i in indices:
                cid = int(class_ids[i])
                label = CLASS_NAMES[cid] if cid < len(CLASS_NAMES) else "unknown"
                detections.append({
                    "animal": label,
                    "confidence": round(float(scores[i]), 4),
                    "bbox": [int(boxes[i][0]), int(boxes[i][1]), int(boxes[i][2]), int(boxes[i][3])],
                    "class_id": cid,
                })
        return detections

    def detect_from_array(self, image_bgr: np.ndarray):
        """Run detection on a numpy BGR image, return detections list."""
        orig_h, orig_w = image_bgr.shape[:2]
        blob, scale, pad_top, pad_left = self.preprocess(image_bgr)
        outputs = self.session.run(None, {self.input_name: blob})
        return self.postprocess(outputs, scale, pad_top, pad_left, orig_h, orig_w)

    def draw_detections(self, image_bgr: np.ndarray, detections: list) -> np.ndarray:
        """Draw bounding boxes on image and return annotated copy."""
        img = image_bgr.copy()
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            label = det["animal"].replace("_", " ").title()
            conf = det["confidence"]
            color = CLASS_COLORS.get(det["animal"], (255, 255, 255))
            # Box
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            # Label background
            text = f"{label}: {conf:.0%}"
            (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 6, y1), color, -1)
            cv2.putText(img, text, (x1 + 3, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        return img

    def image_to_b64(self, image_bgr: np.ndarray, quality: int = 85) -> str:
        _, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return base64.b64encode(buffer).decode("utf-8")

    def detect_and_annotate(self, image_bgr: np.ndarray):
        """Full pipeline: detect + draw. Returns (detections, annotated_b64)."""
        detections = self.detect_from_array(image_bgr)
        annotated = self.draw_detections(image_bgr, detections)
        annotated_b64 = self.image_to_b64(annotated)
        return detections, annotated_b64


# Singleton
_detector: AnimalDetector = None


def get_detector() -> AnimalDetector:
    global _detector
    if _detector is None:
        _detector = AnimalDetector()
    return _detector
