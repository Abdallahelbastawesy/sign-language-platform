const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const multer = require("multer");

// Routes
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const userRoutes = require("./src/routes/user.routes");
const signRoutes = require("./src/routes/sign.routes");
const aiRouter = require("./src/routes/ai.routes");

const app = express();

// Middleware أولاً
app.use(cors());
app.use(express.json());

// Swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sign Language API",
      version: "1.0.0",
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:5000",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};
const specs = swaggerJsdoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCssUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js",
    ],
  }),
);
// DB
connectDB();

// Routes
app.get("/", (req, res) => res.send("API is running 🚀"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/sign", signRoutes);

// AI Routes
const upload = multer({ storage: multer.memoryStorage() });
app.use("/api/ai", upload.single("file"), aiRouter);

module.exports = app;
app.get("/api-docs/json", (req, res) => {
  res.json(specs);
});

app.get("/docs", (req, res) => {
  res.sendFile(__dirname + "/swagger.html");
});
