const Lesson = require("../models/lesson.model");
const Course = require("../models/course.model");
const { checkUserSubscription, checkUserCourseAccess } = require("../middlewares/subscription.middleware");

// ================= GET LESSONS FOR A COURSE =================
exports.getLessonsByCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, isActive: true });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const rawLessons = await Lesson.find({ courseId: req.params.courseId, isActive: true }).sort({ order: 1 });

    const userId = req.user ? req.user._id : null;
    const hasSubscription = userId ? await checkUserSubscription(userId) : false;
    const hasCourseAccess = userId ? await checkUserCourseAccess(userId, req.params.courseId) : false;
    const isAdmin = req.user && req.user.role === "admin";

    const lessons = rawLessons.map((lesson) => {
      const obj = lesson.toObject();
      if (obj.isPremium && !hasSubscription && !hasCourseAccess && !isAdmin) {
        obj.videoUrl = null;
        obj.locked = true;
      } else {
        obj.locked = false;
      }
      return obj;
    });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET SINGLE LESSON =================
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, isActive: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const userId = req.user ? req.user._id : null;
    const hasSubscription = userId ? await checkUserSubscription(userId) : false;
    const hasCourseAccess = userId ? await checkUserCourseAccess(userId, lesson.courseId) : false;
    const isAdmin = req.user && req.user.role === "admin";

    const obj = lesson.toObject();
    if (obj.isPremium && !hasSubscription && !hasCourseAccess && !isAdmin) {
      obj.videoUrl = null;
      obj.locked = true;
      return res.status(403).json({
        ...obj,
        message: "هذا الدرس يتطلب اشتراكاً نشطاً أو شراء الدورة",
        error: "subscription_required",
      });
    }

    obj.locked = false;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE LESSON (Admin) =================
exports.createLesson = async (req, res) => {
  try {
    const { courseId, title, description, videoUrl, duration, order, isPremium } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = await Lesson.create({ courseId, title, description, videoUrl, duration, order, isPremium });
    res.status(201).json({ message: "Lesson created successfully", lesson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= UPDATE LESSON (Admin) =================
exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json({ message: "Lesson updated successfully", lesson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= DELETE LESSON (Admin) - Soft Delete =================
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
