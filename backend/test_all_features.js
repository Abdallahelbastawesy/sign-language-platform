const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

// 1. Force environment variables for the test environment
process.env.PORT = "5050";
process.env.MONGODB_URI = "mongodb://localhost:27017/sign_language_test";
process.env.JWT_SECRET = "test_secret_for_jwt_validation_98765";
process.env.REFRESH_SECRET = "test_secret_for_refresh_validation_56789";
process.env.RESEND_API_KEY = "re_testkey123456789000000000";
process.env.AI_BASE_URL = "https://abdallahessam29-sign-language-ai.hf.space";

// Load app and models
const app = require("./app");
const User = require("./src/models/user.model");
const Course = require("./src/models/course.model");
const Lesson = require("./src/models/lesson.model");
const SubscriptionPlan = require("./src/models/subscriptionPlan.model");
const UserSubscription = require("./src/models/userSubscription.model");
const LessonProgress = require("./src/models/lessonProgress.model");

const BASE_URL = `http://localhost:${process.env.PORT}`;
let server;

// State to share across tests
let adminToken;
let userToken;
let adminHeaders;
let userHeaders;
let userId;
let tempUserId;

let testCourseId;
let testFreeLessonId;
let testPremiumLessonId;
let testPlanId;
let testUserSubId;

async function runAllTests() {
  console.log("===============================================================================");
  console.log("🚀 STARTING GLOBAL SIGN LANGUAGE PLATFORM INTEGRATION TESTS...");
  console.log("===============================================================================\n");

  try {
    // Connect to mongoose
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔌 Connected to test database.");

    // Clean database collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Lesson.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await UserSubscription.deleteMany({});
    await LessonProgress.deleteMany({});
    console.log("🧹 Test database collections cleared.\n");

    // Start server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(process.env.PORT, resolve));
    console.log(`📡 Test server running at ${BASE_URL}\n`);

    // --- TEST SUITES ---
    await suiteAuthAPIs();
    await suiteAdminAPIs();
    await suiteUserAPIs();
    await suiteCourseLessonAPIs();
    await suiteSubscriptionProgressAPIs();
    await suiteAIModelsIntegrations();

    console.log("\n===============================================================================");
    console.log("✨ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✨");
    console.log("===============================================================================");
  } catch (error) {
    console.error("\n❌ TEST SUITE RUN FAILED:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log("\n🔌 Database connection closed. Test server stopped.");
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: AUTHENTICATION APIs
// -----------------------------------------------------------------------------
async function suiteAuthAPIs() {
  console.log("🔹 SUITE 1: Authentication APIs");

  // 1a. Register user
  const registerPayload = {
    name: "Test User",
    email: "user@test.com",
    password: "password123"
  };
  const regRes = await axios.post(`${BASE_URL}/api/auth/register`, registerPayload);
  assert(regRes.status === 201, "Register should return 201");
  assert(regRes.data.message.includes("registered"), "Success message returned");
  console.log("  ✅ POST /api/auth/register - User registered");

  // Retrieve user to manually verify email in DB (since email is mocked)
  const registeredUser = await User.findOne({ email: "user@test.com" });
  assert(registeredUser, "User should be in database");
  userId = registeredUser._id;
  
  // Verify token verification endpoint first
  const verifyRes = await axios.get(`${BASE_URL}/api/auth/verify-email/${registeredUser.verificationToken}`);
  assert(verifyRes.status === 200, "Verify email should return 200");
  console.log("  ✅ GET /api/auth/verify-email/:token - Email verified via token");

  // Ensure DB updated
  const verifiedUser = await User.findOne({ email: "user@test.com" });
  assert(verifiedUser.isEmailVerified === true, "isEmailVerified should be true");

  // 1b. Login user
  const loginPayload = {
    email: "user@test.com",
    password: "password123"
  };
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, loginPayload);
  assert(loginRes.status === 200, "Login should return 200");
  assert(loginRes.data.accessToken, "Should return access token");
  assert(loginRes.data.refreshToken, "Should return refresh token");
  userToken = loginRes.data.accessToken;
  userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
  console.log("  ✅ POST /api/auth/login - Login successful");

  // 1c. Refresh token
  const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {
    refreshToken: loginRes.data.refreshToken
  });
  assert(refreshRes.status === 200, "Refresh token should return 200");
  assert(refreshRes.data.accessToken, "Should return new access token");
  console.log("  ✅ POST /api/auth/refresh - Token refreshed");

  // 1d. Forgot password & Reset password
  const forgotRes = await axios.post(`${BASE_URL}/api/auth/forgot-password`, { email: "user@test.com" });
  assert(forgotRes.status === 200, "Forgot password should return 200");
  console.log("  ✅ POST /api/auth/forgot-password - Email reset token generated");

  // Get the reset token from database
  const userWithReset = await User.findOne({ email: "user@test.com" });
  assert(userWithReset.resetPasswordToken, "Reset token should be stored");

  const resetRes = await axios.post(`${BASE_URL}/api/auth/reset-password/${userWithReset.resetPasswordToken}`, {
    newPassword: "newpassword123"
  });
  assert(resetRes.status === 200, "Reset password should return 200");
  console.log("  ✅ POST /api/auth/reset-password/:token - Password reset successful");

  // Verify login with new password
  const newLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: "user@test.com",
    password: "newpassword123"
  });
  assert(newLoginRes.status === 200, "Login with new password successful");
  userToken = newLoginRes.data.accessToken;
  userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
  console.log("  ✅ Verified login works with new password\n");
}

// -----------------------------------------------------------------------------
// SUITE 2: ADMIN APIs
// -----------------------------------------------------------------------------
async function suiteAdminAPIs() {
  console.log("🔹 SUITE 2: Admin APIs");

  // Seed Admin user in DB
  const adminPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: adminPassword,
    role: "admin",
    isEmailVerified: true
  });

  // Seed a temp user to test deletion
  const tempUser = await User.create({
    name: "Temp User",
    email: "temp@test.com",
    password: "pwd",
    role: "user",
    isEmailVerified: true
  });
  tempUserId = tempUser._id;

  // Login as admin
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: "admin@test.com",
    password: "admin123"
  });
  adminToken = loginRes.data.accessToken;
  adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

  // 2a. GET /api/admin/users (list all users)
  const listRes = await axios.get(`${BASE_URL}/api/admin/users`, adminHeaders);
  assert(listRes.status === 200, "Admin listing users should return 200");
  assert(listRes.data.length >= 3, "Should list user, admin, and tempUser");
  console.log("  ✅ GET /api/admin/users - Users listed successfully");

  // Check user unauthorized
  try {
    await axios.get(`${BASE_URL}/api/admin/users`, userHeaders);
    throw new Error("User should be unauthorized to list users");
  } catch (err) {
    assert(err.response.status === 403, "Regular user should get 403");
    console.log("  ✅ GET /api/admin/users - Unauthorized user denied (403)");
  }

  // 2b. DELETE /api/admin/user/:id
  const delRes = await axios.delete(`${BASE_URL}/api/admin/user/${tempUserId}`, adminHeaders);
  assert(delRes.status === 200, "Delete user should return 200");
  
  const deletedCheck = await User.findById(tempUserId);
  assert(!deletedCheck, "User should be removed from database");
  console.log("  ✅ DELETE /api/admin/user/:id - User deleted successfully\n");
}

// -----------------------------------------------------------------------------
// SUITE 3: USER APIs
// -----------------------------------------------------------------------------
async function suiteUserAPIs() {
  console.log("🔹 SUITE 3: User APIs");

  // 3a. PUT /api/user/progress
  const updateRes = await axios.put(`${BASE_URL}/api/user/progress`, { progress: 85 }, userHeaders);
  assert(updateRes.status === 200, "Update progress should return 200");
  assert(updateRes.data.progress === 85, "Progress field in response matches");

  // Verify in DB
  const userCheck = await User.findById(userId);
  assert(userCheck.progress === 85, "Progress updated in DB");
  console.log("  ✅ PUT /api/user/progress - User progress updated successfully\n");
}

// -----------------------------------------------------------------------------
// SUITE 4: COURSE & LESSON APIs
// -----------------------------------------------------------------------------
async function suiteCourseLessonAPIs() {
  console.log("🔹 SUITE 4: Course & Lesson APIs");

  // 4a. Create course (Admin)
  const coursePayload = {
    title: "مستوى الكلمات الإشارية",
    description: "شرح كلمات لغة الإشارة اليومية",
    stage: "words",
    stageNumber: 3,
    level: "beginner",
    isPremium: false,
    order: 1
  };
  const courseRes = await axios.post(`${BASE_URL}/api/courses`, coursePayload, adminHeaders);
  assert(courseRes.status === 201, "Course creation returns 201");
  testCourseId = courseRes.data.course._id;
  console.log("  ✅ POST /api/courses - Course created successfully");

  // 4b. Create Lessons (Admin)
  const freeLesson = {
    courseId: testCourseId,
    title: "مرحبا",
    description: "إشارة الترحيب مرحبا",
    videoUrl: "https://example.com/hello.mp4",
    duration: 35,
    order: 1,
    isPremium: false
  };
  const freeRes = await axios.post(`${BASE_URL}/api/lessons`, freeLesson, adminHeaders);
  assert(freeRes.status === 201, "Free lesson creation returns 201");
  testFreeLessonId = freeRes.data.lesson._id;

  const premiumLesson = {
    courseId: testCourseId,
    title: "كيف حالك",
    description: "إشارة كيف حالك المميزة",
    videoUrl: "https://example.com/how_are_you.mp4",
    duration: 50,
    order: 2,
    isPremium: true
  };
  const premiumRes = await axios.post(`${BASE_URL}/api/lessons`, premiumLesson, adminHeaders);
  assert(premiumRes.status === 201, "Premium lesson creation returns 201");
  testPremiumLessonId = premiumRes.data.lesson._id;
  console.log("  ✅ POST /api/lessons - Lessons created successfully");

  // 4c. GET /api/courses (Public)
  const listCourses = await axios.get(`${BASE_URL}/api/courses`);
  assert(listCourses.status === 200, "Get courses successful");
  assert(listCourses.data.length === 1, "Should have 1 course");
  console.log("  ✅ GET /api/courses - List courses successful");

  // 4d. GET /api/lessons/course/:courseId
  const listLessons = await axios.get(`${BASE_URL}/api/lessons/course/${testCourseId}`, userHeaders);
  assert(listLessons.status === 200, "Get course lessons successful");
  assert(listLessons.data.length === 2, "Should have 2 lessons");
  console.log("  ✅ GET /api/lessons/course/:courseId - List course lessons successful\n");
}

// -----------------------------------------------------------------------------
// SUITE 5: SUBSCRIPTIONS & PROGRESS APIs
// -----------------------------------------------------------------------------
async function suiteSubscriptionProgressAPIs() {
  console.log("🔹 SUITE 5: Subscriptions & Progress APIs");

  // 5a. Create subscription plan (Admin)
  const planPayload = {
    name: "premium_annual",
    nameAr: "الخطة السنوية المميزة",
    price: 300,
    durationMonths: 12,
    features: ["كل الكورسات", "تقييم ذكي", "شهادة معتمدة"]
  };
  const planRes = await axios.post(`${BASE_URL}/api/subscriptions/plans`, planPayload, adminHeaders);
  assert(planRes.status === 201, "Plan creation returns 201");
  testPlanId = planRes.data.plan._id;
  console.log("  ✅ POST /api/subscriptions/plans - Subscription plan created");

  // 5b. Check gating before subscribing
  const courseBeforeSub = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  const lessonsBeforeSub = courseBeforeSub.data.lessons;
  const freeL = lessonsBeforeSub.find(l => l._id.toString() === testFreeLessonId.toString());
  const premiumL = lessonsBeforeSub.find(l => l._id.toString() === testPremiumLessonId.toString());

  assert(freeL.videoUrl === "https://example.com/hello.mp4", "Free lesson videoUrl visible");
  assert(premiumL.videoUrl === null, "Premium lesson videoUrl hidden");
  assert(premiumL.locked === true, "Premium lesson marked locked");
  console.log("  ✅ Verified premium lesson gating (hidden videoUrl, locked = true)");

  // 5c. Subscribe user to plan
  const subRes = await axios.post(`${BASE_URL}/api/subscriptions/subscribe`, {
    planId: testPlanId,
    paymentMethod: "instapay",
    paymentReference: "IP_TXN_555"
  }, userHeaders);
  assert(subRes.status === 201, "Subscribe returns 201");
  testUserSubId = subRes.data.subscription._id;
  console.log("  ✅ POST /api/subscriptions/subscribe - Subscribed user successfully");

  // Check status
  const statusRes = await axios.get(`${BASE_URL}/api/subscriptions/status`, userHeaders);
  assert(statusRes.data.isSubscribed === true, "isSubscribed should be true");
  console.log("  ✅ GET /api/subscriptions/status - Status active verified");

  // 5d. Check gating after subscribing
  const courseAfterSub = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  const lessonsAfterSub = courseAfterSub.data.lessons;
  const premiumLAfter = lessonsAfterSub.find(l => l._id.toString() === testPremiumLessonId.toString());

  assert(premiumLAfter.videoUrl === "https://example.com/how_are_you.mp4", "Premium videoUrl visible after subscription");
  assert(premiumLAfter.locked === false, "Premium lesson unlocked");
  console.log("  ✅ Verified subscription unlocked premium content");

  // 5e. Test lesson progress completion
  const p1 = await axios.post(`${BASE_URL}/api/progress/lesson/${testFreeLessonId}`, {}, userHeaders);
  assert(p1.status === 200, "Marking free lesson complete returns 200");
  
  const prog50 = await axios.get(`${BASE_URL}/api/progress/course/${testCourseId}`, userHeaders);
  assert(prog50.data.percentage === 50, "Progress should be 50%");
  console.log("  ✅ POST /api/progress/lesson/:id - Progress is 50% after 1/2 lessons");

  const p2 = await axios.post(`${BASE_URL}/api/progress/lesson/${testPremiumLessonId}`, {}, userHeaders);
  assert(p2.status === 200, "Marking premium lesson complete returns 200");

  const prog100 = await axios.get(`${BASE_URL}/api/progress/course/${testCourseId}`, userHeaders);
  assert(prog100.data.percentage === 100, "Progress should be 100%");
  console.log("  ✅ POST /api/progress/lesson/:id - Progress is 100% after 2/2 lessons");

  // 5f. GET /api/progress (list all progress)
  const allProgress = await axios.get(`${BASE_URL}/api/progress`, userHeaders);
  assert(allProgress.data.length === 1, "Should list progress record");
  assert(allProgress.data[0].percentage === 100, "Percentage is 100");
  console.log("  ✅ GET /api/progress - Overall progress listed");

  // 5g. Cancel subscription
  const cancelRes = await axios.post(`${BASE_URL}/api/subscriptions/cancel`, {}, userHeaders);
  assert(cancelRes.status === 200, "Cancel subscription returns 200");
  console.log("  ✅ POST /api/subscriptions/cancel - Subscription cancelled successfully\n");
}

// -----------------------------------------------------------------------------
// SUITE 6: AI MODELS & INTEGRATIONS
// -----------------------------------------------------------------------------
async function suiteAIModelsIntegrations() {
  console.log("🔹 SUITE 6: AI Models & Integrations");

  // 6a. POST /api/ai/chat (FastAPI Chatbot Integration)
  const chatPayload = { message: "ما هو تطبيق عبر؟" };
  const chatRes = await axios.post(`${BASE_URL}/api/ai/chat`, chatPayload);
  assert(chatRes.status === 200, "AI Chat should return 200");
  assert(chatRes.data.response, "Should return response text");
  assert(chatRes.data.intent, "Should return classified intent");
  console.log(`  ✅ POST /api/ai/chat - Chatbot responded: "${chatRes.data.response.substring(0, 45)}..."`);

  // 6b. POST /api/ai/predict (FastAPI Video Sign Recognition Integration)
  // Construct a valid mock keypoint frames matrix: shape (30, 126)
  const mockFrames = Array.from({ length: 30 }, () => Array(126).fill(0.0));
  const predictPayload = { frames: mockFrames };
  
  const predRes = await axios.post(`${BASE_URL}/api/ai/predict`, predictPayload);
  assert(predRes.status === 200, "AI predict should return 200");
  assert(predRes.data.label, "Should return prediction label");
  assert(predRes.data.confidence !== undefined, "Should return confidence score");
  console.log(`  ✅ POST /api/ai/predict - Video Model response: label="${predRes.data.label}", conf=${predRes.data.confidence}`);

  // 6c. POST /api/ai/verify-sign (FastAPI Sign Verification Integration)
  const verifyPayload1 = {
    expected_word: "wrong_word_test",
    frames: mockFrames
  };
  const verifyRes1 = await axios.post(`${BASE_URL}/api/ai/verify-sign`, verifyPayload1);
  assert(verifyRes1.status === 200, "AI verify-sign should return 200");
  assert(verifyRes1.data.correct === false, "Verification correct should be false for mismatch");
  assert(verifyRes1.data.got, "Should return predicted word in 'got'");
  assert(verifyRes1.data.confidence !== undefined, "Should return confidence");

  // Call again with expected_word matching what the model actually predicted ("got")
  const verifyPayload2 = {
    expected_word: verifyRes1.data.got,
    frames: mockFrames
  };
  const verifyRes2 = await axios.post(`${BASE_URL}/api/ai/verify-sign`, verifyPayload2);
  assert(verifyRes2.status === 200, "AI verify-sign should return 200");
  assert(verifyRes2.data.correct === true, "Verification correct should be true when words match");
  console.log(`  ✅ POST /api/ai/verify-sign - Verification result: correct=${verifyRes2.data.correct}, expected="${verifyRes2.data.expected}", got="${verifyRes2.data.got}"`);

  // 6d. POST /api/ai/predict-image (FastAPI Image Model Integration)
  // Construct a mock 1x1 transparent PNG buffer
  const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360180000020001730a2f140000000049454e44ae426082";
  const imgBuffer = Buffer.from(pngHex, "hex");

  const imgForm = new FormData();
  imgForm.append("file", imgBuffer, { filename: "test.png", contentType: "image/png" });

  const imgRes = await axios.post(`${BASE_URL}/api/ai/predict-image`, imgForm, {
    headers: imgForm.getHeaders()
  });
  assert(imgRes.status === 200, "AI predict-image should return 200");
  assert(imgRes.data.label, "Should return image label prediction");
  console.log(`  ✅ POST /api/ai/predict-image - Image Model response: label="${imgRes.data.label}", conf=${imgRes.data.confidence}`);

  // 6e. POST /api/ai/predict-voice (FastAPI Speech-to-Text Integration)
  // Construct a minimal silent WAV buffer
  const wavHex = "524946462400000057415645666d74201000000001000100401f0000401f0000010008006461746100000000";
  const voiceBuffer = Buffer.from(wavHex, "hex");

  const voiceForm = new FormData();
  voiceForm.append("file", voiceBuffer, { filename: "test.wav", contentType: "audio/wav" });

  const voiceRes = await axios.post(`${BASE_URL}/api/ai/predict-voice`, voiceForm, {
    headers: voiceForm.getHeaders()
  });
  assert(voiceRes.status === 200, "AI predict-voice should return 200");
  assert(voiceRes.data.status === "success" || voiceRes.data.status === "fail", "Should return status field");
  console.log(`  ✅ POST /api/ai/predict-voice - Voice Model response: status="${voiceRes.data.status}", transcribed="${voiceRes.data.text || ''}"`);

  // 6f. POST /api/sign (Video Sign Prediction Proxy)
  const proxyRes = await axios.post(`${BASE_URL}/api/sign`, predictPayload);
  assert(proxyRes.status === 200, "Proxy predict route should return 200");
  assert(proxyRes.data.label, "Proxy should forward prediction label");
  console.log(`  ✅ POST /api/sign - Proxy video model response label="${proxyRes.data.label}"\n`);
}

// Helper Assert Function
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Run the script
runAllTests();
