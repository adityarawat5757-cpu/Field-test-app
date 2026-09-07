from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import hashlib
import io
import os
from datetime import datetime, timezone

import cv2
import numpy as np

app = FastAPI(
    title="Digital Companion — Prototype Analysis API",
    version="1.0.0",
    description="Prototype-only image analysis for synthetic field-test images. Not laboratory confirmation."
)

# Comma-separated list of allowed origins, e.g.:
#   ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:5173"
# Falls back to local dev origins if not set.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_VERSION = "CV-Prototype-1.0"


def classify_synthetic_color(image: np.ndarray):
    """
    Safe prototype classifier for the demo UI.
    It detects broad visual colour characteristics only; it does NOT identify
    a real controlled substance or validate a real forensic kit.
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Focus on saturated pixels and ignore very dark/light background pixels.
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    mask = (sat > 55) & (val > 45) & (val < 245)

    if int(mask.sum()) < 100:
        return "Inconclusive", 56, 2, "LOW — insufficient colour information"

    h = hsv[:, :, 0][mask].astype(np.float32)
    s = sat[mask].astype(np.float32)
    v = val[mask].astype(np.float32)

    # OpenCV hue ranges: red/pink ~0/170+, purple ~125-165, green ~35-90.
    purple = ((h >= 120) & (h <= 170)).mean()
    green = ((h >= 35) & (h <= 95)).mean()
    yellow = ((h >= 15) & (h <= 38)).mean()

    # The generated synthetic test fixture uses a purple result.
    if purple > 0.16:
        confidence = min(97, round(78 + purple * 35))
        return "Presumptive Positive", confidence, 4, "GOOD — strong synthetic colour signal"

    if green > 0.18 and purple < 0.10:
        confidence = min(96, round(78 + green * 30))
        return "Negative", confidence, 0, "GOOD — strong synthetic colour signal"

    # Yellow/other mixed colours are intentionally treated as inconclusive.
    confidence = min(78, round(52 + max(yellow, purple, green) * 30))
    return "Inconclusive", confidence, 2, "FAIR — colour does not clearly match prototype ranges"


@app.get("/")
def root():
    return {
        "service": "Digital Companion Prototype API",
        "status": "online",
        "model_version": MODEL_VERSION,
        "warning": "Prototype visual classifier only; laboratory confirmation required."
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image is larger than 12 MB.")

    image_hash = hashlib.sha256(raw).hexdigest()
    array = np.frombuffer(raw, dtype=np.uint8)
    decoded = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if decoded is None:
        raise HTTPException(status_code=400, detail="Could not decode the image.")

    result, confidence, swatch_index, quality = classify_synthetic_color(decoded)

    return {
        "result": result,
        "confidence": confidence,
        "swatch_index": swatch_index,
        "quality": quality,
        "image_hash": image_hash,
        "model_version": MODEL_VERSION,
        "analysis_source": "FastAPI + OpenCV",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Presumptive prototype result only. Laboratory confirmation required."
    }
