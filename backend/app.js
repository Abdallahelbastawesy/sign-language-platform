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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sign Language API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
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
    
    /* Verify Tester Styles */
    .verify-tester { margin: 15px; padding: 16px; border: 1px solid #d8dde6; border-radius: 8px; font-family: Arial, sans-serif; background: #fff; }
    .verify-tester h2 { margin: 0 0 10px; font-size: 18px; }
    .verify-tester select { padding: 8px 12px; border-radius: 6px; border: 1px solid #d8dde6; font-size: 14px; margin-right: 8px; margin-bottom: 8px; font-family: sans-serif; }
    .verify-tester button { margin: 4px 8px 4px 0; padding: 9px 12px; border: 0; border-radius: 6px; cursor: pointer; color: #fff; background: #2563eb; font-weight: 700; }
    .verify-tester button:disabled { cursor: not-allowed; opacity: 0.55; }
    .verify-tester .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px; font-size: 14px; }
    .verify-tester .status-preparing { background: #fef3c7; color: #d97706; }
    .verify-tester .status-recording { background: #dbeafe; color: #2563eb; }
    .verify-tester .status-processing { background: #e0f2fe; color: #0284c7; }
    .verify-tester .status-completed { background: #dcfce7; color: #16a34a; }
    .verify-tester .status-idle { background: #f1f5f9; color: #475569; }
    .verify-tester .result-card { margin-top: 12px; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; display: none; min-width: 280px; font-size: 14px; line-height: 1.6; }
    .verify-tester .result-card.success { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
    .verify-tester .result-card.fail { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
    .verify-tester .webcam-box { position: relative; width: 320px; height: 240px; background: #000; border-radius: 6px; overflow: hidden; margin-top: 12px; }
    .verify-tester video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    .verify-tester canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none; }
    .verify-tester .warning-msg { color: #dc2626; font-weight: bold; margin-top: 8px; font-size: 14px; display: none; }
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

  <!-- Sign Verification Tester Widget -->
  <section class="verify-tester" aria-label="Sign verification tester">
    <h2>Sign Verification Tester</h2>
    <p>Perform a sign and verify if it matches the expected word using your webcam and the deep learning model.</p>
    <div style="margin-bottom: 12px;">
      <label for="verify-expected-word" style="font-weight: bold; margin-right: 8px; font-family: sans-serif; font-size: 14px;">Expected Sign:</label>
      <select id="verify-expected-word">
        <option value="أحترم نفسك">أحترم نفسك (Ahterem Nafsak)</option>
        <option value="أخويا">أخويا (Akhoya)</option>
        <option value="أسف">أسف (Asif)</option>
        <option value="أسمك">أسمك (Ismak)</option>
        <option value="أفردها">أفردها (Afredha)</option>
        <option value="ألم">ألم (Alam)</option>
        <option value="أوضه">أوضه (Oda)</option>
        <option value="ارمي ورا ضهرك">ارمي ورا ضهرك (Ermi Wara Dahrk)</option>
        <option value="الصم">الصم (El-Som)</option>
        <option value="النهارده">النهارده (El-Naharda)</option>
        <option value="بتدرس أي">بتدرس أي (Betedres Ey)</option>
        <option value="بحب">بحب (Baheb)</option>
        <option value="بضحك">بضحك (Badhak)</option>
        <option value="تعبان">تعبان (Tabaan)</option>
        <option value="جامعه">جامعه (Gamaa)</option>
        <option value="ساكن فين">ساكن فين (Saken Feen)</option>
        <option value="شكرا" selected>شكرا (Shokran)</option>
        <option value="عامل اي">عامل اي (Amel Ey)</option>
        <option value="فرحان">فرحان (Farhan)</option>
        <option value="كلية">كلية (Koleya)</option>
        <option value="مبسوط">مبسوط (Mabsout)</option>
        <option value="مخنوق">مخنوق (Makhnouq)</option>
        <option value="مدرسة">مدرسة (Madrasa)</option>
        <option value="مرتاح">مرتاح (Mertah)</option>
        <option value="مش متجوز">مش متجوز (Mesh Metgawiz)</option>
      </select>
      <button id="verify-start" type="button" onclick="startVerification()">Start Verification</button>
      <button id="verify-stop" type="button" onclick="stopVerification()" disabled style="background-color: #dc2626; margin-left: 8px;">Stop Verification</button>
      <span id="verify-status" class="status status-idle">Idle</span>
    </div>
    <div id="verify-warning" class="warning-msg">Keep hands visible in camera view!</div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start;">
      <div class="webcam-box">
        <video id="verify-webcam" autoplay playsinline muted></video>
        <canvas id="verify-overlay"></canvas>
      </div>
      <div id="verify-result-card" class="result-card"></div>
    </div>
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

    // === Sign Verification Tester JS ===
    let verifyHands = null;
    let verifyCamera = null;
    let verifyFrameQueue = [];
    let verifyIsActive = false;
    let verifyStream = null;

    function setVerifyStatus(statusClass, statusText) {
      const el = document.getElementById('verify-status');
      el.className = 'status ' + statusClass;
      el.textContent = statusText;
    }

    function initVerifyHands() {
      if (verifyHands) return;
      verifyHands = new Hands({
        locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
      });
      verifyHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });
      verifyHands.onResults(onVerifyResults);
    }

    function extractVerifyCoordinates(results) {
      let keypoints = [];
      let detected = false;
      if (results.multiHandLandmarks && results.multiHandedness) {
        detected = true;
        const handsData = [];
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          handsData.push({
            landmarks: results.multiHandLandmarks[i],
            label: results.multiHandedness[i].label,
            x0: results.multiHandLandmarks[i][0].x
          });
        }
        handsData.sort((a, b) => a.x0 - b.x0);

        for (let h = 0; h < 2; h++) {
          if (h < handsData.length) {
            const hand = handsData[h].landmarks;
            const wrist = hand[0];
            for (let i = 0; i < hand.length; i++) {
              keypoints.push(hand[i].x - wrist.x);
              keypoints.push(hand[i].y - wrist.y);
              keypoints.push(hand[i].z);
            }
          } else {
            for (let i = 0; i < 63; i++) keypoints.push(0.0);
          }
        }
      } else {
        for (let i = 0; i < 126; i++) keypoints.push(0.0);
      }

      let maxVal = 0;
      for (let i = 0; i < keypoints.length; i++) {
        const absVal = Math.abs(keypoints[i]);
        if (absVal > maxVal) maxVal = absVal;
      }
      if (maxVal > 0) {
        for (let i = 0; i < keypoints.length; i++) {
          keypoints[i] = keypoints[i] / maxVal;
        }
      }
      return { keypoints, detected };
    }

    function drawVerifyHandLandmarks(ctx, landmarks, width, height) {
      ctx.fillStyle = '#bd00ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [5,9],[9,10],[10,11],[11,12],
        [9,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [13,17],[5,17]
      ];
      connections.forEach(([from, to]) => {
        const ptFrom = landmarks[from];
        const ptTo = landmarks[to];
        ctx.beginPath();
        ctx.moveTo(ptFrom.x * width, ptFrom.y * height);
        ctx.lineTo(ptTo.x * width, ptTo.y * height);
        ctx.stroke();
      });
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    function onVerifyResults(results) {
      if (!verifyIsActive) return;
      const video = document.getElementById('verify-webcam');
      const canvas = document.getElementById('verify-overlay');
      const ctx = canvas.getContext('2d');

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          drawVerifyHandLandmarks(ctx, results.multiHandLandmarks[i], canvas.width, canvas.height);
        }
      }
      ctx.restore();

      const { keypoints, detected } = extractVerifyCoordinates(results);
      const warningEl = document.getElementById('verify-warning');

      if (detected) {
        warningEl.style.display = 'none';
        verifyFrameQueue.push(keypoints);
        setVerifyStatus('status-recording', \`Recording: (\${verifyFrameQueue.length} frames)\`);
      } else {
        warningEl.style.display = 'block';
        warningEl.textContent = 'Keep hands visible in camera view!';
      }
    }

    function resampleFrames(frames, targetLen) {
      if (frames.length === 0) {
        return Array(targetLen).fill(null).map(() => Array(126).fill(0.0));
      }
      if (frames.length === targetLen) {
        return frames;
      }
      let resampled = [];
      for (let i = 0; i < targetLen; i++) {
        let index;
        if (targetLen === 1) {
          index = 0;
        } else {
          index = Math.round(i * (frames.length - 1) / (targetLen - 1));
        }
        resampled.push(frames[index]);
      }
      return resampled;
    }

    function stopVerification() {
      if (!verifyIsActive) return;
      verifyIsActive = false;
      stopVerifyCamera();
      
      const processedFrames = resampleFrames(verifyFrameQueue, 30);
      submitVerification(processedFrames);
    }

    async function submitVerification(framesToSend) {
      setVerifyStatus('status-processing', 'Processing...');
      const expected = document.getElementById('verify-expected-word').value;
      const startTime = performance.now();

      try {
        const response = await fetch('/api/ai/verify-sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            expected_word: expected,
            frames: framesToSend
          })
        });
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        const data = await response.json();
        
        setVerifyStatus('status-completed', 'Completed');
        renderVerifyResult(data, duration);
      } catch (err) {
        setVerifyStatus('status-idle', 'Idle');
        alert('Verification request failed: ' + err.message);
      }
    }

    function renderVerifyResult(data, duration) {
      const card = document.getElementById('verify-result-card');
      card.style.display = 'block';
      if (data.error) {
        card.className = 'result-card fail';
        card.innerHTML = \`<strong>Error:</strong> \${data.error}<br>
                          <strong>Response Time:</strong> \${duration} seconds\`;
        return;
      }
      const isCorrect = data.correct;
      card.className = 'result-card ' + (isCorrect ? 'success' : 'fail');
      
      let warningHtml = '';
      if (data.warning) {
        warningHtml = \`<div style="margin-top: 8px; color: #d97706; font-size: 0.85rem;">⚠️ \${data.warning}</div>\`;
      }

      card.innerHTML = \`
        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">
          \${isCorrect ? '✅ Verification Passed!' : '❌ Verification Failed!'}
        </div>
        <strong>Expected Sign:</strong> \${data.expected}<br>
        <strong>Predicted Sign:</strong> \${data.got || 'None'}<br>
        <strong>Correct:</strong> \${isCorrect ? 'Yes' : 'No'}<br>
        <strong>Confidence:</strong> \${data.confidence}%<br>
        <strong>Response Time:</strong> \${duration} seconds
        \${warningHtml}
      \`;
    }

    function stopVerifyCamera() {
      verifyIsActive = false;
      if (verifyCamera) {
        try {
          verifyCamera.stop();
        } catch (e) {}
        verifyCamera = null;
      }
      if (verifyStream) {
        verifyStream.getTracks().forEach(track => track.stop());
        verifyStream = null;
      }
      document.getElementById('verify-webcam').srcObject = null;
      document.getElementById('verify-start').disabled = false;
      document.getElementById('verify-stop').disabled = true;
    }

    async function startVerification() {
      initVerifyHands();
      verifyFrameQueue = [];
      verifyIsActive = true;
      document.getElementById('verify-start').disabled = true;
      document.getElementById('verify-stop').disabled = false;
      document.getElementById('verify-result-card').style.display = 'none';
      document.getElementById('verify-warning').style.display = 'none';
      setVerifyStatus('status-preparing', 'Preparing...');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        verifyStream = stream;
        const video = document.getElementById('verify-webcam');
        video.srcObject = stream;
        
        verifyCamera = new Camera(video, {
          onFrame: async () => {
            if (verifyIsActive) {
              await verifyHands.send({ image: video });
            }
          },
          width: 640,
          height: 480
        });
        verifyCamera.start();
      } catch (err) {
        verifyIsActive = false;
        document.getElementById('verify-start').disabled = false;
        document.getElementById('verify-stop').disabled = true;
        setVerifyStatus('status-idle', 'Idle');
        alert('Failed to access camera: ' + err.message);
      }
    }

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
