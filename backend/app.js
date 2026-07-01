const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const swaggerJsdoc = require("swagger-jsdoc");


const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const userRoutes = require("./src/routes/user.routes");
const signRoutes = require("./src/routes/sign.routes");
const aiRoutes = require("./src/routes/ai.routes");
const courseRoutes = require("./src/routes/course.routes");
const lessonRoutes = require("./src/routes/lesson.routes");
const subscriptionRoutes = require("./src/routes/subscription.routes");
const progressRoutes = require("./src/routes/progress.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Critical for Vercel serverless: ensure DB is connected before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection error:", error.message);
    res.status(503).json({ error: "Database connection failed. Please try again." });
  }
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Sign Language API", version: "1.0.0" },
    servers: [
      { url: "/", description: "Current Server (Relative)" },
      { url: "https://sign-language-platform.vercel.app", description: "Production Server (Vercel)" },
      { url: "http://localhost:5000", description: "Local Server" }
    ],
  },
  apis: ["./backend/src/routes/*.js"],
};
const specs = swaggerJsdoc(options);

app.get("/api-docs/json", (req, res) => res.json(specs));

app.get("/docs", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sign Language API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    .voice-recorder { margin: 15px; padding: 16px; border: 1px solid #d8dde6; border-radius: 8px; font-family: Arial, sans-serif; background: #fff; }
    .voice-recorder h2 { margin: 0 0 10px; font-size: 18px; }
    .voice-recorder button { margin: 4px 8px 4px 0; padding: 9px 12px; border: 0; border-radius: 6px; cursor: pointer; color: #fff; background: #2563eb; font-weight: 700; }
    .voice-recorder button:disabled { cursor: not-allowed; opacity: 0.55; }
    .voice-recorder .stop { background: #dc2626; }
    .voice-recorder .status { margin-top: 8px; color: #334155; }
    .voice-recorder pre { overflow: auto; max-height: 260px; padding: 12px; background: #0f172a; color: #e2e8f0; border-radius: 6px; direction: ltr; }
    .voice-video-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
    .voice-video-list video { width: 100%; max-height: 240px; background: #000; border-radius: 6px; }
  </style>
</head>
<body>
  <div style="background: linear-gradient(135deg, #00f0ff, #bd00ff); padding: 15px; text-align: center; font-family: sans-serif; font-weight: bold; border-radius: 8px; margin: 15px; color: white; box-shadow: 0 4px 15px rgba(0, 240, 255, 0.2);">
    🎥 Real-Time Sign Language Translator: Test real-time hand-landmark predictions via your webcam! 
    <a href="/translator" style="color: #00ff66; text-decoration: underline; margin-left: 10px; font-size: 1.1rem;">👉 Open Webcam Translator</a>
  </div>
  <section class="voice-recorder" aria-label="Voice to sign recorder">
    <h2>Voice to Sign Recorder</h2>
    <p>Record Arabic speech, upload it to <code>/api/ai/predict-voice</code>, and preview the returned sign videos.</p>
    <button id="voice-start" type="button">Start recording</button>
    <button id="voice-stop" class="stop" type="button" disabled>Stop and upload</button>
    <span id="voice-status" class="status">Idle</span>
    <audio id="voice-playback" controls style="display:none; width:100%; margin-top:10px;"></audio>
    <pre id="voice-response" style="display:none;"></pre>
    <div id="voice-videos" class="voice-video-list"></div>
  </section>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    let voiceMediaRecorder;
    let voiceChunks = [];

    function setVoiceStatus(message) {
      document.getElementById('voice-status').textContent = message;
    }

    function renderVoiceResponse(data) {
      const responseEl = document.getElementById('voice-response');
      const videosEl = document.getElementById('voice-videos');
      responseEl.style.display = 'block';
      responseEl.textContent = JSON.stringify(data, null, 2);
      videosEl.innerHTML = '';

      if (Array.isArray(data.videos)) {
        data.videos.forEach(function(item) {
          const wrapper = document.createElement('div');
          const title = document.createElement('div');
          title.textContent = (item.order || '') + ' ' + (item.label || item.filename || 'video');
          const video = document.createElement('video');
          video.controls = true;
          video.src = item.url;
          wrapper.appendChild(title);
          wrapper.appendChild(video);
          videosEl.appendChild(wrapper);
        });
      }
    }

    async function uploadVoiceBlob(blob) {
      const extension = blob.type.includes('webm') ? 'webm' : 'wav';
      const file = new File([blob], 'swagger-recording.' + extension, { type: blob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      setVoiceStatus('Uploading...');
      const response = await fetch('/api/ai/predict-voice', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      renderVoiceResponse(data);
      setVoiceStatus(response.ok ? 'Uploaded' : 'Upload failed');
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('voice-start').addEventListener('click', async function() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : '';
          voiceChunks = [];
          voiceMediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          voiceMediaRecorder.ondataavailable = function(event) {
            if (event.data && event.data.size > 0) voiceChunks.push(event.data);
          };
          voiceMediaRecorder.onstop = async function() {
            stream.getTracks().forEach(function(track) { track.stop(); });
            const blob = new Blob(voiceChunks, { type: voiceMediaRecorder.mimeType || 'audio/webm' });
            const playback = document.getElementById('voice-playback');
            playback.src = URL.createObjectURL(blob);
            playback.style.display = 'block';
            await uploadVoiceBlob(blob);
          };
          voiceMediaRecorder.start();
          document.getElementById('voice-start').disabled = true;
          document.getElementById('voice-stop').disabled = false;
          setVoiceStatus('Recording...');
        } catch (error) {
          setVoiceStatus('Microphone error: ' + error.message);
        }
      });

      document.getElementById('voice-stop').addEventListener('click', function() {
        if (voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') {
          document.getElementById('voice-start').disabled = false;
          document.getElementById('voice-stop').disabled = true;
          setVoiceStatus('Processing...');
          voiceMediaRecorder.stop();
        }
      });
    });

    window.onload = function() {
      SwaggerUIBundle({
  url: "/api-docs/json",
  dom_id: '#swagger-ui',
  deepLinking: true,
  presets: [SwaggerUIBundle.presets.apis],
  layout: "BaseLayout"
});
    };
  </script>
</body>
</html>`);
});

const fs = require("fs");
const path = require("path");

app.get("/translator", (req, res) => {
  const htmlPath = path.join(__dirname, "src", "views", "translator.html");
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send("Translator view not found");
  }
});

app.get("/", (req, res) => res.send("API is running 🚀"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/sign", signRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/progress", progressRoutes);



module.exports = app;
