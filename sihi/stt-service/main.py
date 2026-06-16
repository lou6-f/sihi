"""
PhoWhisper STT Service — Vietnamese Speech-to-Text
Uses vinai/PhoWhisper-base model via Hugging Face Transformers.
"""

import io
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
import torchaudio
from transformers import pipeline

app = FastAPI(title="SiHi STT Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model on startup
print("🔄 Loading PhoWhisper model...")
try:
    stt_pipeline = pipeline(
        "automatic-speech-recognition",
        model="vinai/PhoWhisper-base",
        device="cuda" if torch.cuda.is_available() else "cpu",
    )
    print(f"✅ PhoWhisper loaded on {'GPU' if torch.cuda.is_available() else 'CPU'}")
except Exception as e:
    print(f"⚠️ Model load failed: {e}")
    stt_pipeline = None


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": stt_pipeline is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if stt_pipeline is None:
        raise HTTPException(500, "Model not loaded")

    start = time.time()

    try:
        # Read audio bytes
        content = await audio.read()
        
        # Load audio with torchaudio
        waveform, sample_rate = torchaudio.load(io.BytesIO(content))
        
        # Resample to 16kHz if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            waveform = resampler(waveform)
        
        # Convert to numpy
        audio_array = waveform.squeeze().numpy()
        
        # Transcribe
        result = stt_pipeline(
            {"raw": audio_array, "sampling_rate": 16000},
            return_timestamps=True,
        )

        duration = time.time() - start

        return {
            "text": result["text"],
            "chunks": result.get("chunks", []),
            "language": "vi",
            "duration": round(duration, 3),
            "audio_duration": round(len(audio_array) / 16000, 2),
        }

    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
