const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const FormData = require("form-data");

// 1. Force environment variables for the test environment
process.env.PORT = "5055";
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
const Payment = require("./src/models/payment.model");

const BASE_URL = `http://localhost:${process.env.PORT}`;
let server;
let adminToken;
let userToken;
let adminHeaders;
let userHeaders;

let testCourseId;
let testPremiumLessonId;
let testPlanId;
let coursePaymentId;
let subscriptionPaymentId;

async function runTests() {
  console.log("🚀 Starting Manual Payment Verification Integration Tests...");

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
    await Payment.deleteMany({});
    console.log("Cleared test database tables.");

    // Initialize Users & Sign In
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const admin = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
      isEmailVerified: true
    });

    const user = await User.create({
      name: "Regular User",
      email: "user@test.com",
      password: hashedPassword,
      role: "user",
      isEmailVerified: true
    });

    adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };

    console.log("Users and tokens initialized.");

    // Start Express Test Server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(process.env.PORT, resolve));
    console.log(`Test server running at ${BASE_URL}\n`);

    // Create Test Course and Lesson
    const course = await Course.create({
      title: "دورة لغة الإشارة المتقدمة",
      description: "دورة شاملة لتعلم لغة الإشارة",
      stage: "basics",
      stageNumber: 1,
      level: "advanced",
      isPremium: true
    });
    testCourseId = course._id;

    const lesson = await Lesson.create({
      courseId: course._id,
      title: "الدرس الأول: الحروف العربية بالإشارة",
      description: "فيديو توضيحي للحروف",
      videoUrl: "http://test-video.com/alphabet.mp4",
      duration: 15,
      order: 1,
      isPremium: true
    });
    testPremiumLessonId = lesson._id;

    // Create Test Subscription Plan
    const plan = await SubscriptionPlan.create({
      name: "premium_monthly",
      nameAr: "الخطة الشهرية المميزة",
      price: 150,
      currency: "EGP",
      durationMonths: 1,
      features: ["كل الكورسات", "تقييم AI"],
      isActive: true
    });
    testPlanId = plan._id;

    console.log("Seeded test course, premium lesson, and subscription plan.\n");

    // --- TEST RUNS ---
    await testPaymentInstructions();
    await testFileUpload();
    await testSubmitPaymentRequests();
    await testUserHistoryAndSecurity();
    await testAdminDashboard();
    await testApproveCoursePayment();
    await testApproveSubscriptionPayment();
    await testRejectPaymentFlow();

    console.log("\n===============================================================================");
    console.log("✨ ALL MANUAL PAYMENT TESTS PASSED SUCCESSFULLY! ✨");
    console.log("===============================================================================");
  } catch (error) {
    console.error("\n❌ TEST RUN FAILED:");
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
    console.log("\nDatabase connection closed. Test server stopped.");
  }
}

// 1. Test Retrieval of Payment Instructions
async function testPaymentInstructions() {
  console.log("--- 1. Testing Payment Instructions ---");
  const response = await axios.get(`${BASE_URL}/api/payments/instructions`, userHeaders);
  
  if (response.status !== 200) throw new Error("Could not retrieve payment instructions");
  if (!response.data.vodafoneCashNumber || !response.data.instaPayAddress) {
    throw new Error("Missing payment configurations in response");
  }
  
  console.log("✅ Payment instructions and accounts retrieved successfully.");
  console.log(`   Vodafone Cash: ${response.data.vodafoneCashNumber}`);
  console.log(`   InstaPay: ${response.data.instaPayAddress}`);
}

// 2. Test Screenshot Upload Endpoint
async function testFileUpload() {
  console.log("\n--- 2. Testing Screenshot Upload ---");
  
  const form = new FormData();
  form.append("screenshot", Buffer.from("mock-png-receipt-content"), {
    filename: "receipt.png",
    contentType: "image/png",
  });

  const response = await axios.post(`${BASE_URL}/api/payments/upload`, form, {
    headers: {
      ...userHeaders.headers,
      ...form.getHeaders()
    }
  });

  if (response.status !== 200) throw new Error("Screenshot upload failed");
  if (!response.data.imageUrl.includes("/uploads/")) {
    throw new Error(`Invalid screenshot URL returned: ${response.data.imageUrl}`);
  }

  console.log("✅ Receipt screenshot uploaded successfully.");
  console.log(`   Returned URL: ${response.data.imageUrl}`);
}

// 3. Test Submitting Payment Verification Requests
async function testSubmitPaymentRequests() {
  console.log("\n--- 3. Testing Payment Request Submission ---");
  
  // Submit payment for Course
  const courseReq = await axios.post(`${BASE_URL}/api/payments/request`, {
    courseId: testCourseId,
    paymentMethod: "Vodafone Cash",
    senderPhone: "01099998888",
    screenshot: `${BASE_URL}/uploads/receipt-123.png`,
    note: "كورس لغة الإشارة المتقدمة"
  }, userHeaders);

  if (courseReq.status !== 201) throw new Error("Course payment submission failed");
  if (courseReq.data.payment.status !== "Pending") throw new Error("Payment status must default to Pending");
  coursePaymentId = courseReq.data.payment._id;

  // Submit payment for Subscription Plan
  const planReq = await axios.post(`${BASE_URL}/api/payments/request`, {
    planId: testPlanId,
    paymentMethod: "InstaPay",
    screenshot: `${BASE_URL}/uploads/receipt-456.png`,
    note: "اشتراك شهري مميز"
  }, userHeaders);

  if (planReq.status !== 201) throw new Error("Plan payment submission failed");
  subscriptionPaymentId = planReq.data.payment._id;

  // Verify validation (invalid payment method)
  try {
    await axios.post(`${BASE_URL}/api/payments/request`, {
      courseId: testCourseId,
      paymentMethod: "Credit Card",
      screenshot: `${BASE_URL}/uploads/receipt.png`
    }, userHeaders);
    throw new Error("Should have failed for invalid payment method");
  } catch (error) {
    if (error.response.status !== 400) throw new Error(`Expected 400, got ${error.response.status}`);
  }

  // Verify validation (missing target course/plan)
  try {
    await axios.post(`${BASE_URL}/api/payments/request`, {
      paymentMethod: "Vodafone Cash",
      screenshot: `${BASE_URL}/uploads/receipt.png`
    }, userHeaders);
    throw new Error("Should have failed for missing target");
  } catch (error) {
    if (error.response.status !== 400) throw new Error(`Expected 400, got ${error.response.status}`);
  }

  console.log("✅ Manual payment requests submitted successfully (Course and Subscription).");
}

// 4. Test User History and Security Restrictions
async function testUserHistoryAndSecurity() {
  console.log("\n--- 4. Testing User History & Security Restrictions ---");

  // Get user history
  const history = await axios.get(`${BASE_URL}/api/payments/history`, userHeaders);
  if (history.status !== 200) throw new Error("Failed to retrieve user payment history");
  if (history.data.length !== 2) throw new Error(`Expected 2 items in history, got ${history.data.length}`);

  // Get status of specific request
  const statusRes = await axios.get(`${BASE_URL}/api/payments/status/${coursePaymentId}`, userHeaders);
  if (statusRes.status !== 200) throw new Error("Failed to get status");
  if (statusRes.data.status !== "Pending") throw new Error("Expected Pending status");

  // Security: Check non-auth block
  try {
    await axios.get(`${BASE_URL}/api/payments/history`);
    throw new Error("Should block unauthenticated access");
  } catch (error) {
    if (error.response.status !== 401) throw new Error("Expected 401 unauthenticated");
  }

  // Security: Check non-admin block on admin APIs
  try {
    await axios.get(`${BASE_URL}/api/payments/admin/requests`, userHeaders);
    throw new Error("Should block non-admin users from admin list endpoint");
  } catch (error) {
    if (error.response.status !== 403) throw new Error("Expected 403 forbidden");
  }

  console.log("✅ User history retrieved and security boundary verified.");
}

// 5. Test Admin Dashboard Retrieve Requests
async function testAdminDashboard() {
  console.log("\n--- 5. Testing Admin Dashboard APIs ---");

  // List all requests
  const list = await axios.get(`${BASE_URL}/api/payments/admin/requests`, adminHeaders);
  if (list.status !== 200) throw new Error("Admin list requests failed");
  if (list.data.length !== 2) throw new Error(`Expected 2 requests, got ${list.data.length}`);

  // List filtered by Pending
  const filtered = await axios.get(`${BASE_URL}/api/payments/admin/requests?status=Pending`, adminHeaders);
  if (filtered.status !== 200) throw new Error("Admin filtered list requests failed");
  if (filtered.data.length !== 2) throw new Error("Expected 2 pending requests");

  // Get details
  const details = await axios.get(`${BASE_URL}/api/payments/admin/requests/${coursePaymentId}`, adminHeaders);
  if (details.status !== 200) throw new Error("Admin details request failed");
  if (!details.data.user || !details.data.user.email) throw new Error("User info not populated");

  console.log("✅ Admin list and details endpoints verified successfully.");
}

// 6. Test Approve Course Payment Flow
async function testApproveCoursePayment() {
  console.log("\n--- 6. Testing Course Payment Approval & Gating Bypass ---");

  // Initial check: User should be GATED (cannot see premium lesson videoUrl)
  const initialCourse = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  if (initialCourse.data.lessons[0].videoUrl !== null || initialCourse.data.lessons[0].locked !== true) {
    throw new Error("Premium lesson should be locked for user before approval");
  }

  // Approve course payment
  const approve = await axios.post(`${BASE_URL}/api/payments/admin/requests/${coursePaymentId}/approve`, {}, adminHeaders);
  if (approve.status !== 200) throw new Error("Course approval request failed");
  if (approve.data.payment.status !== "Approved") throw new Error("Expected Approved status in response");

  // Verify access check: User should now have access (videoUrl visible, locked false)
  const afterApprovalCourse = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, userHeaders);
  if (afterApprovalCourse.data.lessons[0].videoUrl !== "http://test-video.com/alphabet.mp4" || afterApprovalCourse.data.lessons[0].locked !== false) {
    throw new Error("Premium lesson should be unlocked after course purchase approval");
  }

  console.log("✅ Course payment approved and course-level lesson access unlocked successfully.");
}

// 7. Test Approve Subscription Payment Flow
async function testApproveSubscriptionPayment() {
  console.log("\n--- 7. Testing Subscription Payment Approval ---");

  // Initial check: User status should show isSubscribed = false (since we just verified course-level access, not plan subscription)
  const initialSub = await axios.get(`${BASE_URL}/api/subscriptions/status`, userHeaders);
  if (initialSub.data.isSubscribed !== false) {
    throw new Error("User should not be subscribed before approval");
  }

  // Approve plan payment
  const approve = await axios.post(`${BASE_URL}/api/payments/admin/requests/${subscriptionPaymentId}/approve`, {}, adminHeaders);
  if (approve.status !== 200) throw new Error("Plan approval request failed");

  // Verify subscription status is now active
  const afterApprovalSub = await axios.get(`${BASE_URL}/api/subscriptions/status`, userHeaders);
  if (afterApprovalSub.data.isSubscribed !== true) {
    throw new Error("User should be active subscriber after plan purchase approval");
  }

  console.log("✅ Subscription payment approved and plan successfully activated.");
}

// 8. Test Rejected Payment Flow
async function testRejectPaymentFlow() {
  console.log("\n--- 8. Testing Rejected Payment Request Flow ---");

  // Create another user
  const otherUser = await User.create({
    name: "Other User",
    email: "other@test.com",
    password: "hashedpassword",
    isEmailVerified: true
  });
  const otherToken = jwt.sign({ id: otherUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const otherHeaders = { headers: { Authorization: `Bearer ${otherToken}` } };

  // Create course payment
  const rejectReq = await axios.post(`${BASE_URL}/api/payments/request`, {
    courseId: testCourseId,
    paymentMethod: "InstaPay",
    screenshot: `${BASE_URL}/uploads/receipt.png`
  }, otherHeaders);

  const paymentId = rejectReq.data.payment._id;

  // Reject the request
  const reject = await axios.post(`${BASE_URL}/api/payments/admin/requests/${paymentId}/reject`, {}, adminHeaders);
  if (reject.status !== 200) throw new Error("Reject request failed");
  if (reject.data.payment.status !== "Rejected") throw new Error("Expected Rejected status in response");

  // Verify access check: Other user should still be locked out
  const course = await axios.get(`${BASE_URL}/api/courses/${testCourseId}`, otherHeaders);
  if (course.data.lessons[0].videoUrl !== null || course.data.lessons[0].locked !== true) {
    throw new Error("Rejected user should remain locked out of premium lesson");
  }

  console.log("✅ Payment request successfully rejected and access properly denied.");
}

runTests();
