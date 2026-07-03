const Payment = require("../models/payment.model");
const Course = require("../models/course.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");
const User = require("../models/user.model");
const UserSubscription = require("../models/userSubscription.model");

// ================= USER APIs =================

// Get manual payment instructions
exports.getPaymentInstructions = (req, res) => {
  try {
    const vodafoneCashNumber = process.env.VODAFONE_CASH_NUMBER || "01012345678";
    const instaPayAddress = process.env.INSTAPAY_ADDRESS || "username@instapay";

    res.json({
      vodafoneCashNumber,
      instaPayAddress,
      instructions: {
        vodafoneCash: `للدفع عبر فودافون كاش، قم بتحويل المبلغ إلى الرقم ${vodafoneCashNumber} ثم قم برفع لقطة شاشة للعملية هنا.`,
        instaPay: `للدفع عبر إنستا باي، قم بالتحويل إلى العنوان ${instaPayAddress} ثم قم برفع لقطة شاشة للعملية هنا.`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload payment screenshot
exports.uploadScreenshot = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or invalid file type" });
    }

    // Construct full public URL to serve static uploaded file
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.json({
      message: "File uploaded successfully",
      imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit manual payment request
exports.submitPaymentRequest = async (req, res) => {
  try {
    const { courseId, planId, paymentMethod, senderPhone, screenshot, note } = req.body;

    if (!paymentMethod || !screenshot) {
      return res.status(400).json({ message: "Payment method and screenshot are required" });
    }

    if (!["Vodafone Cash", "InstaPay"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method. Must be 'Vodafone Cash' or 'InstaPay'" });
    }

    if (!courseId && !planId) {
      return res.status(400).json({ message: "Must provide either courseId or planId" });
    }

    let targetCourse = null;
    let targetPlan = null;

    if (courseId) {
      targetCourse = await Course.findById(courseId);
      if (!targetCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
    }

    if (planId) {
      targetPlan = await SubscriptionPlan.findById(planId);
      if (!targetPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
    }

    const payment = await Payment.create({
      user: req.user._id,
      course: courseId || null,
      subscriptionPlan: planId || null,
      paymentMethod,
      senderPhone: senderPhone || "",
      screenshot,
      note: note || "",
      status: "Pending"
    });

    res.status(201).json({
      message: "تم إرسال طلب الدفع بنجاح وهو قيد المراجعة الآن",
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// View user's payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate("course", "title stage level")
      .populate("subscriptionPlan", "name nameAr price")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check user's current payment status by ID
exports.getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user._id })
      .populate("course", "title stage level")
      .populate("subscriptionPlan", "name nameAr price");

    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= ADMIN APIs =================

// Get pending or filtered payment requests
exports.adminGetPendingPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const payments = await Payment.find(filter)
      .populate("user", "name email")
      .populate("course", "title stage level")
      .populate("subscriptionPlan", "name nameAr price")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// View detailed payment request
exports.adminGetPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("user", "name email")
      .populate("course", "title stage level")
      .populate("subscriptionPlan", "name nameAr price");

    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve payment request
exports.adminApprovePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (payment.status !== "Pending") {
      return res.status(400).json({ message: `Payment is already ${payment.status}` });
    }

    // Grant access based on type
    if (payment.course) {
      const user = await User.findById(payment.user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add course to purchased courses list if not already there
      const courseIdStr = payment.course.toString();
      const hasCourse = user.purchasedCourses.some(id => id.toString() === courseIdStr);
      if (!hasCourse) {
        user.purchasedCourses.push(payment.course);
        await user.save();
      }
    } else if (payment.subscriptionPlan) {
      const plan = await SubscriptionPlan.findById(payment.subscriptionPlan);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Deactivate any current active subscriptions
      await UserSubscription.updateMany(
        { userId: payment.user, status: "active" },
        { status: "cancelled" }
      );

      // Create new active user subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      await UserSubscription.create({
        userId: payment.user,
        planId: plan._id,
        startDate,
        endDate,
        status: "active",
        paymentMethod: payment.paymentMethod,
        paymentReference: payment._id.toString()
      });
    }

    // Update payment request
    payment.status = "Approved";
    payment.reviewedBy = req.user._id;
    payment.reviewedAt = new Date();

    await payment.save();

    res.json({
      message: "Payment approved and access granted successfully",
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject payment request
exports.adminRejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (payment.status !== "Pending") {
      return res.status(400).json({ message: `Payment is already ${payment.status}` });
    }

    // Update payment request status (no access granted)
    payment.status = "Rejected";
    payment.reviewedBy = req.user._id;
    payment.reviewedAt = new Date();

    await payment.save();

    res.json({
      message: "Payment request rejected successfully",
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
