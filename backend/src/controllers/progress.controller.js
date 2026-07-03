const LessonProgress = require("../models/lessonProgress.model");
const Lesson = require("../models/lesson.model");
const Course = require("../models/course.model");
const { checkUserSubscription, checkUserCourseAccess } = require("../middlewares/subscription.middleware");

// ================= MARK LESSON COMPLETE =================
exports.completeLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.lessonId, isActive: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    // Gate premium lessons
    if (lesson.isPremium) {
      const isAdmin = req.user.role === "admin";
      const hasSub = await checkUserSubscription(req.user._id);
      const hasCourseAccess = await checkUserCourseAccess(req.user._id, lesson.courseId);
      if (!hasSub && !hasCourseAccess && !isAdmin) {
        return res.status(403).json({
          message: "هذا الدرس يتطلب اشتراكاً نشطاً أو شراء الدورة",
          error: "subscription_required",
        });
      }
    }

    // Upsert progress record
    const progress = await LessonProgress.findOneAndUpdate(
      { userId: req.user._id, lessonId: lesson._id },
      {
        $set: {
          courseId: lesson.courseId,
          isCompleted: true,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Lesson marked as completed", progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET PROGRESS FOR A COURSE =================
exports.getCourseProgress = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, isActive: true });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const totalLessons = await Lesson.countDocuments({ courseId: course._id, isActive: true });
    const completedLessons = await LessonProgress.countDocuments({
      userId: req.user._id,
      courseId: course._id,
      isCompleted: true,
    });

    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.json({
      courseId: course._id,
      title: course.title,
      totalLessons,
      completedLessons,
      percentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET ALL PROGRESS (User) =================
exports.getAllProgress = async (req, res) => {
  try {
    // Get all completed lessons for this user
    const completedRecords = await LessonProgress.find({
      userId: req.user._id,
      isCompleted: true,
    }).populate("lessonId", "title order courseId");

    // Group by courseId
    const grouped = {};
    for (const record of completedRecords) {
      const cId = record.courseId.toString();
      if (!grouped[cId]) grouped[cId] = { completedLessons: 0 };
      grouped[cId].completedLessons += 1;
    }

    // Attach course info and total lesson counts
    const courseIds = Object.keys(grouped);
    const results = await Promise.all(
      courseIds.map(async (courseId) => {
        const course = await Course.findById(courseId).select("title stageNumber stage");
        const totalLessons = await Lesson.countDocuments({ courseId, isActive: true });
        const completedLessons = grouped[courseId].completedLessons;
        const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        return { course, totalLessons, completedLessons, percentage };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
