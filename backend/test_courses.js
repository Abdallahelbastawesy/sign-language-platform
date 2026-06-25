const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// 1. Force environment variables for the test environment
process.env.PORT = "5050";
process.env.MONGODB_URI = "mongodb://localhost:27017/sign_language_test";
process.env.JWT_SECRET = "test_secret_for_jwt_validation_98765";
process.env.REFRESH_SECRET = "test_secret_for_refresh_validation_56789";
process.env.RESEND_API_KEY = "re_testkey123456789000000000";

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
let adminToken;
let userToken;
let adminHeaders;
let userHeaders;

let testCourseId;
let testFreeLessonId;
let testPremiumLessonId;
let testPlanId;

async function runTests() {
  console.log("🚀 Starting Courses Feature Integration Tests...");

  try {
    // Connect to mongoose directly for seeding/clearing
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to test database.");

    // Clean database collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Lesson.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await UserSubscription.deleteMany({});
    await LessonProgress.deleteMany({});
    console.log("Cleared test database tables.");

    // Seed users
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await User.create({
      name: "Test Admin",
      email: "admin@test.com",
      password: adminPassword,
      role: "admin",
      isEmailVerified: true
    });

    const userPassword = await bcrypt.hash("user123", 10);
    const regularUser = await User.create({
      name: "Test User",
      email: "user@test.com",
      password: userPassword,
      role: "user",
      isEmailVerified: true
    });

    // Generate tokens
    adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    userToken = jwt.sign({ id: regularUser._id, role: regularUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };

    console.log("Users and tokens initialized.");

    // Start server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(process.env.PORT, resolve));
    console.log(`Test server running at ${BASE_URL}\n`);

    // --- TEST SUITES ---
    await testCourseManagement();
    await testLessonManagement();
    await testSubscriptionPlanManagement();
    await testPremiumGatingAndAccess();
    await testProgressTracking();

    console.log("\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨");
  } catch (error) {
    console.error("\n❌ TEST RUN FAILED:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  } finally {
    // Cleanup and close
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log("Database connection closed. Test server stopped.");
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE: COURSE MANAGEMENT
// -----------------------------------------------------------------------------
async function testCourseManagement() {
  console.log("--- 1. Course Management Tests ---");

  // Create course as Admin
  const newCourse = {
    title: "تعلم الحروف العربية",
    description: "شرح كامل للغة الإشارة للحروف العربية",
    stage: "letters",
    stageNumber: 2,
    level: "beginner",
    isPremium: false,
    order: 1,
    whatYouWillLearn: ["الألف والباء", "الحركات الأساسية"]
  };

  const createRes = await axios.post(`${BASE_URL}/api/courses`, newCourse, adminHeaders);
  assert(createRes.status === 201, "Admin should be able to create a course");
  assert(createRes.data.course._id, "Created course should have an ID");
  testCourseId = createRes.data.course._id;
  console.log("✅ Admin created course successfully.");

  // Check user unauthorized to create course
  try {
    await axios.post(`${BASE_URL}/api/courses`, newCourse, userHeaders);
    throw new Error("User should not be allowed to create course");
  } catch (err) {
    assert(err.response.status === 403, "Regular user creating course should get 403");
    console.log("✅ Regular user denied course creation (403).");
  }

  // Get all courses (Public)
  const getAllRes = await axios.get(`${BASE_URL}/api/courses`);
  assert(getAllRes.status === 200, "Get all courses should be successful");
  assert(Array.isArray(getAllRes.data), "Result should be an array");
  assert(getAllRes.data.length === 1, "There should be 1 course in the list");
  assert(getAllRes.data[0].title === "تعلم الحروف العربية", "Course title should match");
  console.log("✅ Public courses listing retrieved successfully.");

  // Update course as Admin
  const updateRes = await axios.put(`${BASE_URL}/api/courses/${testCourseId}`, { level: "intermediate" }, adminHeaders);
  assert(updateRes.status === 200, "Update course should be successful");
  assert(updateRes.data.course.level === "intermediate", "Course level should be updated");
  console.log("✅ Course updated by Admin successfully.");
}

// -----------------------------------------------------------------------------
// TEST SUITE: LESSON MANAGEMENT
// -----------------------------------------------------------------------------
async function testLessonManagement() {
  console.log("\n--- 2. Lesson Management Tests ---");

  // Create free lesson
  const freeLesson = {
    courseId: testCourseId,
    title: "حرف الألف",
    description: "تعلم إشارة حرف الألف",
    videoUrl: "https://example.com/alif.mp4",
    duration: 60,
    order: 1,
    isPremium: false
  };

  const freeRes = await axios.post(`${BASE_URL}/api/lessons`, freeLesson, adminHeaders);
  assert(freeRes.status === 201, "Admin should create free lesson");
  testFreeLessonId = freeRes.data.lesson._id;
  console.log("✅ Free lesson created successfully.");

  // Create premium lesson
  const premiumLesson = {
    courseId: testCourseId,
    title: "حرف الباء",
    description: "تعلم إشارة حرف الباء بالتفصيل",
    videoUrl: "https://example.com/baa_premium.mp4",
    duration: 120,
    order: 2,
    isPremium: true
  };

  const premiumRes = await axios.post(`${BASE_URL}/api/lessons`, premiumLesson, adminHeaders);
  assert(premiumRes.status === 201, "Admin should create premium lesson");
  testPremiumLessonId = premiumRes.data.lesson._id;
  console.log("✅ Premium lesson created successfully.");
}

// -----------------------------------------------------------------------------
// TEST SUITE: SUBSCRIPTION PLANS
// -----------------------------------------------------------------------------
async function testSubscriptionPlanManagement() {
  console.log("\n--- 3. Subscription Plan Management Tests ---");

  // Create plan as Admin
  const newPlan = {
    name: "premium_monthly",
    nameAr: "الخطة الشهرية المميزة",
    price: 50,
    durationMonths: 1,
    features: ["الوصول لجميع الدروس", "تقييم ذكي بالفيديو"]
  };

  const planRes = await axios.post(`${BASE_URL}/api/subscriptions/plans`, newPlan, adminHeaders);
  assert(planRes.status === 201, "Admin should create subscription plan");
  testPlanId = planRes.data.plan._id;
  console.log("✅ Subscription plan created successfully.");

  // List plans
  const listPlans = await axios.get(`${BASE_URL}/api/subscriptions/plans`);
  assert(listPlans.status === 200, "Get plans list successful");
  assert(listPlans.data.length === 1, "There should be 1 plan");
  console.log("✅ Plans retrieved successfully.");
}

// -----------------------------------------------------------------------------
// TEST SUITE: PREMIUM GATING & ACCESS
// -----------------------------------------------------------------------------
async function testPremiumGatingAndAccess() {
  console.log("\n--- 4. Premium Gating & Content Access Tests ---");

  // 4a. Verify gating for regular non-subscribed user
  // Fetch course details - free lessons should show videoUrl, premium lessons should hide videoUrl
  const courseResUser = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  assert(courseResUser.status === 200, "Get course by ID successful");
  
  const userLessons = courseResUser.data.lessons;
  const freeL = userLessons.find(l => l._id.toString() === testFreeLessonId.toString());
  const premiumL = userLessons.find(l => l._id.toString() === testPremiumLessonId.toString());

  assert(freeL.videoUrl === "https://example.com/alif.mp4", "Free lesson should expose video URL to non-subscribers");
  assert(freeL.locked === false, "Free lesson should not be locked");
  assert(premiumL.videoUrl === null, "Premium lesson should mask video URL to non-subscribers");
  assert(premiumL.locked === true, "Premium lesson should be marked as locked");
  console.log("✅ Non-subscribed user correctly gated (free URL visible, premium URL null).");

  // Attempt to fetch single premium lesson directly -> should fail with 403
  try {
    await axios.get(`${BASE_URL}/api/lessons/${testPremiumLessonId}`, userHeaders);
    throw new Error("Direct premium lesson access should have been blocked");
  } catch (err) {
    assert(err.response.status === 403, "Direct access to premium lesson without sub should return 403");
    assert(err.response.data.error === "subscription_required", "Should return subscription_required error");
    console.log("✅ Direct access to premium lesson without subscription successfully blocked (403).");
  }

  // Admin access check -> Admins should see the premium URL
  const courseResAdmin = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, adminHeaders);
  const adminLessons = courseResAdmin.data.lessons;
  const adminPremiumL = adminLessons.find(l => l._id.toString() === testPremiumLessonId.toString());
  assert(adminPremiumL.videoUrl === "https://example.com/baa_premium.mp4", "Admin should bypass premium gating in course details");
  assert(adminPremiumL.locked === false, "Admin premium lesson should not be locked");

  const adminSingleL = await axios.get(`${BASE_URL}/api/lessons/${testPremiumLessonId}`, adminHeaders);
  assert(adminSingleL.data.videoUrl === "https://example.com/baa_premium.mp4", "Admin should bypass premium gating in direct fetch");
  console.log("✅ Admin successfully bypassed premium gating.");

  // 4b. Subscribe user and verify gating turns off
  const subscribeRes = await axios.post(`${BASE_URL}/api/subscriptions/subscribe`, {
    planId: testPlanId,
    paymentMethod: "visa",
    paymentReference: "TEST_TXN_999"
  }, userHeaders);

  assert(subscribeRes.status === 201, "User should be able to subscribe to active plan");
  console.log("✅ User successfully subscribed to premium plan.");

  // Check subscription status
  const statusRes = await axios.get(`${BASE_URL}/api/subscriptions/status`, userHeaders);
  assert(statusRes.data.isSubscribed === true, "User status should show isSubscribed = true");
  console.log("✅ User subscription status verified active.");

  // Re-fetch course details for user -> Premium lesson should now expose video URL!
  const courseResUserSubbed = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  const userSubbedLessons = courseResUserSubbed.data.lessons;
  const premiumLSubbed = userSubbedLessons.find(l => l._id.toString() === testPremiumLessonId.toString());
  
  assert(premiumLSubbed.videoUrl === "https://example.com/baa_premium.mp4", "Subscribed user should see premium video URL");
  assert(premiumLSubbed.locked === false, "Subscribed user premium lesson should not be locked");
  
  // Re-fetch single premium lesson directly -> should work now!
  const subbedSingleL = await axios.get(`${BASE_URL}/api/lessons/${testPremiumLessonId}`, userHeaders);
  assert(subbedSingleL.status === 200, "Subscribed user should fetch premium lesson successfully");
  assert(subbedSingleL.data.videoUrl === "https://example.com/baa_premium.mp4", "Exposed correct premium video url");
  console.log("✅ Subscribed user successfully bypassed premium gating on lessons.");
}

// -----------------------------------------------------------------------------
// TEST SUITE: PROGRESS TRACKING
// -----------------------------------------------------------------------------
async function testProgressTracking() {
  console.log("\n--- 5. Progress Tracking Tests ---");

  // Get initial course progress -> should be 0%
  const initialProg = await axios.get(`${BASE_URL}/api/progress/course/${testCourseId}`, userHeaders);
  assert(initialProg.data.percentage === 0, "Initial course progress should be 0%");
  assert(initialProg.data.completedLessons === 0, "Initial completed lessons should be 0");
  assert(initialProg.data.totalLessons === 2, "Total course lessons should be 2");
  console.log("✅ Initial progress starts at 0% (0/2 lessons completed).");

  // Mark free lesson complete
  const comp1 = await axios.post(`${BASE_URL}/api/progress/lesson/${testFreeLessonId}`, {}, userHeaders);
  assert(comp1.status === 200, "Should mark free lesson complete");
  assert(comp1.data.progress.isCompleted === true, "Progress isCompleted should be true");
  console.log("✅ Free lesson marked completed.");

  // Get course progress -> should be 50%
  const prog50 = await axios.get(`${BASE_URL}/api/progress/course/${testCourseId}`, userHeaders);
  assert(prog50.data.percentage === 50, "Course progress should be 50%");
  assert(prog50.data.completedLessons === 1, "Completed lessons should be 1");
  console.log("✅ Progress updated to 50% (1/2 lessons completed).");

  // Mark premium lesson complete
  const comp2 = await axios.post(`${BASE_URL}/api/progress/lesson/${testPremiumLessonId}`, {}, userHeaders);
  assert(comp2.status === 200, "Should mark premium lesson complete (user is subbed)");
  console.log("✅ Premium lesson marked completed.");

  // Get course progress -> should be 100%
  const prog100 = await axios.get(`${BASE_URL}/api/progress/course/${testCourseId}`, userHeaders);
  assert(prog100.data.percentage === 100, "Course progress should be 100%");
  console.log("✅ Progress updated to 100% (2/2 lessons completed).");

  // Get all progress for user
  const allProg = await axios.get(`${BASE_URL}/api/progress`, userHeaders);
  assert(Array.isArray(allProg.data), "All progress should return an array");
  assert(allProg.data.length === 1, "Should have progress record for 1 course");
  assert(allProg.data[0].percentage === 100, "First progress record should show 100%");
  console.log("✅ Overall progress profile retrieved successfully.");
}

// Helper Assert Function
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Execute tests
runTests();
