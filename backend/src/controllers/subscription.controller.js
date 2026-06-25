const SubscriptionPlan = require("../models/subscriptionPlan.model");
const UserSubscription = require("../models/userSubscription.model");

// ================= GET ALL PLANS =================
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE PLAN (Admin) =================
exports.createPlan = async (req, res) => {
  try {
    const { name, nameAr, price, currency, durationMonths, features } = req.body;
    const plan = await SubscriptionPlan.create({ name, nameAr, price, currency, durationMonths, features });
    res.status(201).json({ message: "Plan created successfully", plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= UPDATE PLAN (Admin) =================
exports.updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan updated successfully", plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= DELETE PLAN (Admin) =================
exports.deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan deactivated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= SUBSCRIBE (User) =================
exports.subscribe = async (req, res) => {
  try {
    const { planId, paymentMethod, paymentReference } = req.body;

    const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
    if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

    // Check if user already has an active subscription — cancel it first
    await UserSubscription.updateMany(
      { userId: req.user._id, status: "active" },
      { status: "cancelled" }
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    const subscription = await UserSubscription.create({
      userId: req.user._id,
      planId: plan._id,
      startDate,
      endDate,
      status: "active",
      paymentMethod: paymentMethod || "",
      paymentReference: paymentReference || "",
    });

    res.status(201).json({
      message: "تم الاشتراك بنجاح",
      subscription: {
        ...subscription.toObject(),
        plan,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET SUBSCRIPTION STATUS (User) =================
exports.getStatus = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: "active",
      endDate: { $gt: new Date() },
    }).populate("planId");

    if (!subscription) {
      return res.json({ isSubscribed: false, subscription: null });
    }

    res.json({ isSubscribed: true, subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CANCEL SUBSCRIPTION (User) =================
exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOneAndUpdate(
      { userId: req.user._id, status: "active" },
      { status: "cancelled" },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    res.json({ message: "Subscription cancelled successfully", subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
