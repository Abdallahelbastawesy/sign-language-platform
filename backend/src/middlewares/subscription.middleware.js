const UserSubscription = require("../models/userSubscription.model");
const User = require("../models/user.model");

/**
 * Middleware: requireSubscription
 * Blocks access if the authenticated user does not have an active subscription.
 * Must be used AFTER the `protect` middleware (req.user must be populated).
 */
exports.requireSubscription = async (req, res, next) => {
  try {
    // Admins always have full access
    if (req.user && req.user.role === "admin") return next();

    const sub = await UserSubscription.findOne({
      userId: req.user._id,
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (!sub) {
      return res.status(403).json({
        message: "هذا المحتوى يتطلب اشتراكاً نشطاً",
        error: "subscription_required",
      });
    }

    req.subscription = sub;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: checkUserSubscription
 * Returns true if the user (by id) has an active subscription.
 * Use inside controllers to conditionally gate content.
 */
exports.checkUserSubscription = async (userId) => {
  if (!userId) return false;
  const sub = await UserSubscription.findOne({
    userId,
    status: "active",
    endDate: { $gt: new Date() },
  });
  return !!sub;
};

/**
 * Helper: checkUserCourseAccess
 * Returns true if the user (by id) has directly purchased the course (by id).
 */
exports.checkUserCourseAccess = async (userId, courseId) => {
  if (!userId || !courseId) return false;
  const user = await User.findById(userId);
  if (!user) return false;
  return user.purchasedCourses.some((id) => id.toString() === courseId.toString());
};
