const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load backend .env configuration
dotenv.config();

const User = require("./src/models/user.model");

const BASE_URL = "https://sign-language-platform.vercel.app";
const ADMIN_EMAIL = "admin@signlanguage.com";
const ADMIN_PASSWORD = "adminPassword123";

let adminToken;
let adminHeaders;

// Helper to generate random email
function randomEmail() {
  return `user_${crypto.randomBytes(4).toString("hex")}@test.com`;
}

async function runProductionTests() {
  console.log("===============================================================================");
  console.log("✈️ STARTING COMPREHENSIVE PRODUCTION END-TO-END PAYMENTS TEST RUNNER");
  console.log(`📡 Targeting Deployed Production Backend: ${BASE_URL}`);
  console.log("===============================================================================\n");

  try {
    // Connect to database to verify emails
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in local .env configuration");
    }
    await mongoose.connect(uri);
    console.log("🔌 Connected to database for test verification helpers.");

    // 0. Authenticate Admin
    console.log("🔑 Authenticating Admin...");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    adminToken = loginRes.data.accessToken;
    adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log("✅ Admin authenticated successfully.\n");

    // Fetch or create a test course and plan on production to ensure we have valid targets
    console.log("📚 Checking for active courses...");
    const coursesRes = await axios.get(`${BASE_URL}/api/courses`);
    let targetCourseId;
    if (coursesRes.data.length > 0) {
      const premium = coursesRes.data.find(c => c.isPremium);
      targetCourseId = premium ? premium._id : coursesRes.data[0]._id;
    } else {
      const newCourse = await axios.post(`${BASE_URL}/api/courses`, {
        title: "دورة لغة الإشارة الإنتاجية",
        description: "دورة مدفوعة ممتازة",
        stage: "basics",
        stageNumber: 1,
        level: "intermediate",
        isPremium: true
      }, adminHeaders);
      targetCourseId = newCourse.data.course._id;
    }
    console.log(`👉 Target Course ID: ${targetCourseId}`);

    console.log("💳 Checking for active subscription plans...");
    const plansRes = await axios.get(`${BASE_URL}/api/subscriptions/plans`);
    let targetPlanId;
    if (plansRes.data.length > 0) {
      targetPlanId = plansRes.data[0]._id;
    } else {
      const newPlan = await axios.post(`${BASE_URL}/api/subscriptions/plans`, {
        name: "monthly_prod",
        nameAr: "الاشتراك الشهري للإنتاج",
        price: 200,
        durationMonths: 1,
        features: ["كل الدروس"]
      }, adminHeaders);
      targetPlanId = newPlan.data.plan._id;
    }
    console.log(`👉 Target Plan ID: ${targetPlanId}\n`);

    // --- TEST RUN 1 ---
    await runTestRun1(targetCourseId);

    // --- TEST RUN 2 ---
    await runTestRun2(targetPlanId);

    // --- TEST RUN 3 ---
    await runTestRun3(targetCourseId);

    // --- TEST RUN 4 ---
    await runTestRun4(targetCourseId);

    // --- TEST RUN 5 ---
    await runTestRun5(targetCourseId);

    console.log("\n===============================================================================");
    console.log("🎉 ALL PRODUCTION END-TO-END PAYMENT TEST RUNS COMPLETED SUCCESSFULLY!");
    console.log("===============================================================================");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

// Setup a new user session
async function createNewUserSession() {
  const email = randomEmail();
  const password = "UserPassword123";

  // Register
  await axios.post(`${BASE_URL}/api/auth/register`, {
    name: "Prod Tester",
    email,
    password
  });

  // Verify email directly in DB
  await User.updateOne({ email }, { $set: { isEmailVerified: true } });

  // Login
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    email,
    password
  });

  const token = loginRes.data.accessToken;
  const headers = { headers: { Authorization: `Bearer ${token}` } };
  return { email, token, headers, userId: loginRes.data.user.id };
}

// Upload mock receipt
async function uploadMockReceipt(headers, filename = "receipt.jpg") {
  const form = new FormData();
  form.append("screenshot", Buffer.from("mock-image-receipt-binary-data"), {
    filename,
    contentType: "image/jpeg",
  });

  const uploadRes = await axios.post(`${BASE_URL}/api/payments/upload`, form, {
    headers: {
      ...headers.headers,
      ...form.getHeaders()
    }
  });

  return uploadRes.data.imageUrl;
}

// ================= TEST RUN 1: SUCCESSFUL COURSE PURCHASE =================
async function runTestRun1(courseId) {
  console.log("-------------------------------------------------------------------------------");
  console.log("🧪 TEST RUN 1: Successful Course Purchase Flow");
  console.log("-------------------------------------------------------------------------------");

  // 1. Create user
  const user = await createNewUserSession();
  console.log(` - Created and verified user: ${user.email}`);

  // 2. Retrieve instructions
  const inst = await axios.get(`${BASE_URL}/api/payments/instructions`, user.headers);
  console.log(` - Retrieved payment instructions. Cash number: ${inst.data.vodafoneCashNumber}`);

  // 3. Upload screenshot
  const imgUrl = await uploadMockReceipt(user.headers, "course_receipt.jpg");
  console.log(` - Screenshot uploaded successfully: ${imgUrl}`);

  // 4. Submit course payment request
  const reqRes = await axios.post(`${BASE_URL}/api/payments/request`, {
    courseId,
    paymentMethod: "Vodafone Cash",
    senderPhone: "01055556666",
    screenshot: imgUrl,
    note: "تفعيل الكورس اليدوي"
  }, user.headers);
  const paymentId = reqRes.data.payment._id;
  console.log(` - Payment request submitted (ID: ${paymentId}). Status: ${reqRes.data.payment.status}`);

  // 5. Verify user is gated (cannot view premium videoUrl/locked)
  const initialCourse = await axios.get(`${BASE_URL}/api/courses/${courseId}`, user.headers);
  const lessons = initialCourse.data.lessons || [];
  if (lessons.length > 0 && lessons[0].isPremium) {
    if (lessons[0].locked !== true) throw new Error("Lesson should be locked!");
    console.log(" - Verified: Premium lessons are locked for user before approval.");
  }

  // 6. Admin approves request
  const approveRes = await axios.post(`${BASE_URL}/api/payments/admin/requests/${paymentId}/approve`, {}, adminHeaders);
  if (approveRes.data.payment.status !== "Approved") throw new Error("Status should be Approved");
  console.log(` - Admin approved payment. Status updated to: ${approveRes.data.payment.status}`);

  // 7. Verify user has access
  const finalCourse = await axios.get(`${BASE_URL}/api/courses/${courseId}`, user.headers);
  const finalLessons = finalCourse.data.lessons || [];
  if (finalLessons.length > 0 && finalLessons[0].isPremium) {
    if (finalLessons[0].locked !== false || finalLessons[0].videoUrl === null) throw new Error("Lesson should be unlocked!");
    console.log(" - Verified: Premium lessons are unlocked for user after approval.");
  }

  console.log("✅ TEST RUN 1 PASSED.\n");
}

// ================= TEST RUN 2: SUCCESSFUL SUBSCRIPTION PURCHASE =================
async function runTestRun2(planId) {
  console.log("-------------------------------------------------------------------------------");
  console.log("🧪 TEST RUN 2: Successful Subscription Purchase Flow");
  console.log("-------------------------------------------------------------------------------");

  const user = await createNewUserSession();
  console.log(` - Created and verified user: ${user.email}`);

  // 1. Upload receipt
  const imgUrl = await uploadMockReceipt(user.headers, "sub_receipt.jpg");
  console.log(` - Screenshot uploaded: ${imgUrl}`);

  // 2. Submit plan request
  const reqRes = await axios.post(`${BASE_URL}/api/payments/request`, {
    planId,
    paymentMethod: "InstaPay",
    screenshot: imgUrl,
    note: "تفعيل اشتراك مميز"
  }, user.headers);
  const paymentId = reqRes.data.payment._id;
  console.log(` - Payment request submitted (ID: ${paymentId}). Status: ${reqRes.data.payment.status}`);

  // 3. Verify user not subscribed
  const initialSub = await axios.get(`${BASE_URL}/api/subscriptions/status`, user.headers);
  if (initialSub.data.isSubscribed !== false) throw new Error("Should not be active subscriber");
  console.log(" - Verified: User is not subscribed before approval.");

  // 4. Admin approves
  const approveRes = await axios.post(`${BASE_URL}/api/payments/admin/requests/${paymentId}/approve`, {}, adminHeaders);
  console.log(` - Admin approved payment. Status: ${approveRes.data.payment.status}`);

  // 5. Verify user subscribed
  const finalSub = await axios.get(`${BASE_URL}/api/subscriptions/status`, user.headers);
  if (finalSub.data.isSubscribed !== true) throw new Error("Should be active subscriber now");
  console.log(" - Verified: User subscription is successfully activated.");

  console.log("✅ TEST RUN 2 PASSED.\n");
}

// ================= TEST RUN 3: REJECTED COURSE PURCHASE =================
async function runTestRun3(courseId) {
  console.log("-------------------------------------------------------------------------------");
  console.log("🧪 TEST RUN 3: Rejected Course Purchase Flow");
  console.log("-------------------------------------------------------------------------------");

  const user = await createNewUserSession();
  console.log(` - Created and verified user: ${user.email}`);

  // 1. Upload receipt
  const imgUrl = await uploadMockReceipt(user.headers, "rejected_receipt.jpg");
  console.log(` - Screenshot uploaded: ${imgUrl}`);

  // 2. Submit payment request
  const reqRes = await axios.post(`${BASE_URL}/api/payments/request`, {
    courseId,
    paymentMethod: "Vodafone Cash",
    screenshot: imgUrl
  }, user.headers);
  const paymentId = reqRes.data.payment._id;
  console.log(` - Payment request submitted (ID: ${paymentId})`);

  // 3. Admin rejects
  const rejectRes = await axios.post(`${BASE_URL}/api/payments/admin/requests/${paymentId}/reject`, {}, adminHeaders);
  if (rejectRes.data.payment.status !== "Rejected") throw new Error("Expected status Rejected");
  console.log(` - Admin rejected payment. Status: ${rejectRes.data.payment.status}`);

  // 4. Verify user remains locked out
  const finalCourse = await axios.get(`${BASE_URL}/api/courses/${courseId}`, user.headers);
  const finalLessons = finalCourse.data.lessons || [];
  if (finalLessons.length > 0 && finalLessons[0].isPremium) {
    if (finalLessons[0].locked !== true) throw new Error("Lesson should remain locked!");
  }
  console.log(" - Verified: Rejected user does not receive access to premium content.");

  console.log("✅ TEST RUN 3 PASSED.\n");
}

// ================= TEST RUN 4: VALIDATION & ERROR HANDLING =================
async function runTestRun4(courseId) {
  console.log("-------------------------------------------------------------------------------");
  console.log("🧪 TEST RUN 4: Validation Errors & Edge Cases");
  console.log("-------------------------------------------------------------------------------");

  const user = await createNewUserSession();

  // Case A: Missing required paymentMethod & screenshot
  try {
    await axios.post(`${BASE_URL}/api/payments/request`, { courseId }, user.headers);
    throw new Error("Should fail for missing params");
  } catch (error) {
    if (error.response?.status !== 400) throw new Error(`Expected 400, got ${error.response?.status}`);
    console.log(" - Passed: Blocked request missing paymentMethod/screenshot (400)");
  }

  // Case B: Invalid payment method
  try {
    await axios.post(`${BASE_URL}/api/payments/request`, {
      courseId,
      paymentMethod: "Visa Card",
      screenshot: "http://temp.com/receipt.jpg"
    }, user.headers);
    throw new Error("Should fail for invalid method");
  } catch (error) {
    if (error.response?.status !== 400) throw new Error(`Expected 400, got ${error.response?.status}`);
    console.log(" - Passed: Blocked request with unsupported payment method (400)");
  }

  // Case C: Missing both courseId and planId
  try {
    await axios.post(`${BASE_URL}/api/payments/request`, {
      paymentMethod: "Vodafone Cash",
      screenshot: "http://temp.com/receipt.jpg"
    }, user.headers);
    throw new Error("Should fail for missing target product");
  } catch (error) {
    if (error.response?.status !== 400) throw new Error(`Expected 400, got ${error.response?.status}`);
    console.log(" - Passed: Blocked request missing target course or plan (400)");
  }

  // Case D: Uploading unsupported file formats
  const form = new FormData();
  form.append("screenshot", Buffer.from("mock-text-file-content"), {
    filename: "receipt.txt",
    contentType: "text/plain",
  });

  try {
    await axios.post(`${BASE_URL}/api/payments/upload`, form, {
      headers: { ...user.headers.headers, ...form.getHeaders() }
    });
    throw new Error("Should fail for invalid file format");
  } catch (error) {
    if (error.response?.status !== 400) throw new Error(`Expected 400, got ${error.response?.status}`);
    console.log(" - Passed: Blocked invalid file format upload (400)");
  }

  console.log("✅ TEST RUN 4 PASSED.\n");
}

// ================= TEST RUN 5: SECURITY & ROLE AUTHORIZATION =================
async function runTestRun5(courseId) {
  console.log("-------------------------------------------------------------------------------");
  console.log("🧪 TEST RUN 5: Security & Role Authorization Restrictions");
  console.log("-------------------------------------------------------------------------------");

  const user = await createNewUserSession();
  const imgUrl = "https://sign-language-platform.vercel.app/uploads/mock.png";

  // Create a request for testing
  const reqRes = await axios.post(`${BASE_URL}/api/payments/request`, {
    courseId,
    paymentMethod: "Vodafone Cash",
    screenshot: imgUrl
  }, user.headers);
  const paymentId = reqRes.data.payment._id;

  // Case A: Unauthenticated requests
  try {
    await axios.get(`${BASE_URL}/api/payments/history`);
    throw new Error("Should block unauthenticated");
  } catch (error) {
    if (error.response?.status !== 401) throw new Error(`Expected 401, got ${error.response?.status}`);
    console.log(" - Passed: Unauthenticated request blocked (401)");
  }

  // Case B: Regular user trying to fetch admin endpoints
  try {
    await axios.get(`${BASE_URL}/api/payments/admin/requests`, user.headers);
    throw new Error("Should block non-admin");
  } catch (error) {
    if (error.response?.status !== 403) throw new Error(`Expected 403, got ${error.response?.status}`);
    console.log(" - Passed: Regular user blocked from admin list endpoint (403)");
  }

  // Case C: Regular user trying to approve payment requests
  try {
    await axios.post(`${BASE_URL}/api/payments/admin/requests/${paymentId}/approve`, {}, user.headers);
    throw new Error("Should block non-admin");
  } catch (error) {
    if (error.response?.status !== 403) throw new Error(`Expected 403, got ${error.response?.status}`);
    console.log(" - Passed: Regular user blocked from admin approval endpoint (403)");
  }

  // Case D: Try to fetch status of someone else's request
  const secondUser = await createNewUserSession();
  try {
    await axios.get(`${BASE_URL}/api/payments/status/${paymentId}`, secondUser.headers);
    throw new Error("Should block cross-user status read");
  } catch (error) {
    if (error.response?.status !== 404) throw new Error(`Expected 404, got ${error.response?.status}`);
    console.log(" - Passed: Blocked cross-user status read (404/Not Found)");
  }

  console.log("✅ TEST RUN 5 PASSED.\n");
}

runProductionTests();
