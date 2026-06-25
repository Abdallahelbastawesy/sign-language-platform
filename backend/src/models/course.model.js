const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    stage: {
      type: String,
      required: true,
      enum: ["basics", "letters", "words", "sentences"],
    },
    stageNumber: { type: Number, required: true }, // 1=basics, 2=letters, 3=words, 4=sentences
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    thumbnail: { type: String, default: "" }, // URL to cover image
    isPremium: { type: Boolean, default: false },
    whatYouWillLearn: [{ type: String }], // bullet points shown on course page
    order: { type: Number, default: 0 },   // display order
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
