const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const swaggerJsdoc = require("swagger-jsdoc");
const multer = require("multer");

const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const userRoutes = require("./src/routes/user.routes");
const signRoutes = require("./src/routes/sign.routes");
const aiRouter = require("./src/routes/ai.routes");

const app = express();

app.use(cors());
app.use(express.json());

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Sign Language API", version: "1.0.0" },
    servers: [{ url: process.env.BASE_URL || "http://localhost:5000" }],
  },
  apis: ["./src/routes/*.js"],
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
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "https://sign-language-platform-cd91.vercel.app/api-docs/json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`);
});

connectDB();

app.get("/", (req, res) => res.send("API is running 🚀"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/sign", signRoutes);

const upload = multer({ storage: multer.memoryStorage() });
app.use("/api/ai", upload.single("file"), aiRouter);

module.exports = app;
