const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },   // e.g. "annual"
    nameAr: { type: String, required: true, trim: true }, // e.g. "الخطة السنوية"
    price: { type: Number, required: true },              // e.g. 300
    currency: { type: String, default: "EGP" },
    durationMonths: { type: Number, required: true },     // e.g. 12
    features: [{ type: String }],                         // ["كل الكورسات", "تقييم AI", "اختر مستوى"]
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
