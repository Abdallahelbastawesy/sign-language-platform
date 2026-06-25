const mongoose = require("mongoose");

// Cache the connection across serverless function invocations (Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return existing connection if alive
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "❌ MONGODB_URI is not defined. Add it to your .env file or Vercel environment variables."
    );
  }

  // Reuse pending connection promise to avoid duplicate connections
  if (!cached.promise) {
    const opts = {
      bufferCommands: true,           // Queue commands while connecting (critical for serverless)
      serverSelectionTimeoutMS: 10000, // 10s to select a server
      socketTimeoutMS: 45000,          // 45s socket timeout
      connectTimeoutMS: 10000,         // 10s connection timeout
      maxPoolSize: 5,                  // Keep connection pool small for serverless
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null; // Reset so next call retries
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
