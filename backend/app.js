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
</head>
<body>
  <div style="background: linear-gradient(135deg, #00f0ff, #bd00ff); padding: 15px; text-align: center; font-family: sans-serif; font-weight: bold; border-radius: 8px; margin: 15px; color: white; box-shadow: 0 4px 15px rgba(0, 240, 255, 0.2);">
    🎥 Real-Time Sign Language Translator: Test real-time hand-landmark predictions via your webcam! 
    <a href="/translator" style="color: #00ff66; text-decoration: underline; margin-left: 10px; font-size: 1.1rem;">👉 Open Webcam Translator</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
  url: "https://sign-language-platform.vercel.app/api-docs/json",
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
