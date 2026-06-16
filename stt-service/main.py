from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
import torch
import io
import soundfile as sf
import numpy as np

app = FastAPI(title="SiHi PhoWhisper STT Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
print("Loading PhoWhisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = pipeline(
    "automatic-speech-recognition",
    model="vinai/PhoWhisper-small",
    device=device,
)
print(f"PhoWhisper loaded on {device}")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "PhoWhisper-small",
        "device": device,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile):
    if not audio.content_type or not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Invalid audio file")

    try:
        audio_bytes = await audio.read()
        
        # Convert to numpy array
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Ensure mono
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Run inference
        result = model(
            {"raw": audio_data, "sampling_rate": sample_rate},
            generate_kwargs={"language": "vi"},
        )

        return {
            "transcript": result["text"],
            "confidence": result.get("confidence", 0.0),
            "isFinal": True,
            "language": "vi-VN",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
