const Course = require("../models/course.model");
const Lesson = require("../models/lesson.model");

// ================= GET ALL COURSES =================
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ stageNumber: 1, order: 1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET SINGLE COURSE (with lessons) =================
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, isActive: true });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Fetch lessons ordered by their position
    const rawLessons = await Lesson.find({ courseId: course._id, isActive: true }).sort({ order: 1 });

    // Determine if the requesting user has a subscription or course access
    const { checkUserSubscription, checkUserCourseAccess } = require("../middlewares/subscription.middleware");
    const userId = req.user ? req.user._id : null;
    const hasSubscription = userId ? await checkUserSubscription(userId) : false;
    const hasCourseAccess = userId ? await checkUserCourseAccess(userId, course._id) : false;
    const isAdmin = req.user && req.user.role === "admin";

    // Gate premium lesson video URLs for non-subscribers
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

    res.json({ ...course.toObject(), lessons });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE COURSE (Admin) =================
exports.createCourse = async (req, res) => {
  try {
    const { title, description, stage, stageNumber, level, thumbnail, isPremium, whatYouWillLearn, order } = req.body;
    const course = await Course.create({
      title, description, stage, stageNumber, level,
      thumbnail, isPremium, whatYouWillLearn, order,
    });
    res.status(201).json({ message: "Course created successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= UPDATE COURSE (Admin) =================
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course updated successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= DELETE COURSE (Admin) - Soft Delete =================
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
