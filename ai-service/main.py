from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import pickle
import os

app = FastAPI()

# ===== موديل الفيديو (GRU) =====
SEQ_LEN = 30
model = Sequential()
model.add(LSTM(64, return_sequences=True, input_shape=(SEQ_LEN, 126)))
model.add(LSTM(128))
model.add(Dense(64, activation='relu'))
model.add(Dense(6, activation='softmax'))
model.build((None, SEQ_LEN, 126))
model.load_weights("sign_language.h5")
labels = np.load("labels.npy", allow_pickle=True)

# ===== موديل الصور (ResNet) =====
IMG_SIZE = 224

def load_torch_model(model_dir):
    data_dir = os.path.join(model_dir, 'data')
    pkl_path = os.path.join(model_dir, 'data.pkl')

    def persistent_load(saved_id):
        typename, storage_type, key, location, numel = saved_id
        path = os.path.join(data_dir, key)
        with open(path, 'rb') as f:
            raw = f.read()
        return torch.FloatStorage.from_buffer(raw, byte_order='little')

    with open(pkl_path, 'rb') as f:
        unpickler = pickle.Unpickler(f)
        unpickler.persistent_load = persistent_load
        return unpickler.load()

checkpoint = load_torch_model("sign_model")
image_classes = checkpoint["classes"]
resnet = models.resnet18(weights=None)
resnet.fc = nn.Linear(resnet.fc.in_features, len(image_classes))
resnet.load_state_dict(checkpoint["model"])
resnet.eval()

img_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
])

# ===== Endpoint الفيديو =====
class PredictRequest(BaseModel):
    frames: list

@app.post("/predict")
async def predict(data: PredictRequest):
    X = np.array(data.frames, dtype=np.float32).reshape(1, SEQ_LEN, 126)
    pred = model(X, training=False).numpy()
    label = labels[int(np.argmax(pred))]
    confidence = float(np.max(pred))
    return {
        "label": str(label),
        "confidence": round(confidence, 4)
    }

# ===== Endpoint الصور =====
@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    tensor = img_transforms(image).unsqueeze(0)
    with torch.no_grad():
        output = resnet(tensor)
        probs = torch.softmax(output, dim=1)
        confidence, idx = torch.max(probs, 1)
    return {
        "label": image_classes[idx.item()],
        "confidence": round(confidence.item(), 4)
    }