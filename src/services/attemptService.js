const Attempt = require('../models/attemptModel');
const ApiError = require('../utils/apiError');
const { topicRegistry } = require('../config/topicRegistry');

class AttemptService {
  /**
   * Submit and record a student's test attempt
   */
  async recordAttempt(data) {
    const {
      studentId,
      studentName = 'Anonymous Student',
      testType = 'TOPIC',
      topic = null,
      pattern = null,
      timeSpentSeconds = 0,
      answers = []
    } = data;

    const totalQuestions = answers.length;
    let correctAnswers = 0;
    let unanswered = 0;

    const processedAnswers = answers.map((ans) => {
      const selected = ans.selectedOption !== undefined && ans.selectedOption !== null
        ? String(ans.selectedOption).trim()
        : null;
      const correct = String(ans.correctAnswer).trim();

      let isCorrect = false;
      if (!selected || selected === '') {
        unanswered++;
      } else {
        isCorrect = (selected.toLowerCase() === correct.toLowerCase());
        if (isCorrect) correctAnswers++;
      }

      return {
        questionId: String(ans.questionId).trim(),
        question: String(ans.question).trim(),
        selectedOption: selected,
        correctAnswer: correct,
        isCorrect,
        topic: String(ans.topic || topic || 'general').trim(),
        pattern: String(ans.pattern || pattern || 'General').trim(),
        explanation: String(ans.explanation || '').trim(),
        timeSpentSeconds: Number(ans.timeSpentSeconds) || 0
      };
    });

    const incorrectAnswers = totalQuestions - correctAnswers - unanswered;
    const score = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100
      : 0;
    const attemptedCount = totalQuestions - unanswered;
    const accuracy = attemptedCount > 0
      ? Math.round((correctAnswers / attemptedCount) * 100 * 100) / 100
      : 0;

    const attempt = new Attempt({
      studentId: String(studentId).trim(),
      studentName: String(studentName).trim(),
      testType,
      topic: topic ? topicRegistry.getTopic(topic)?.slug || topic : null,
      pattern: pattern ? String(pattern).trim() : null,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      score,
      accuracy,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      answers: processedAnswers
    });

    await attempt.save();
    return attempt;
  }

  /**
   * Get paginated list of test attempts with filters
   */
  async getAttempts({ studentId, topic, testType, page = 1, limit = 20, startDate, endDate }) {
    const filter = {};

    if (studentId) {
      filter.studentId = String(studentId).trim();
    }

    if (topic) {
      const resolved = topicRegistry.getTopic(topic);
      filter.topic = resolved ? resolved.slug : topic;
    }

    if (testType) {
      filter.testType = testType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Attempt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-answers') // Exclude heavy question arrays in list views for fast performance
        .lean(),
      Attempt.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get single test attempt details by ID (includes question-by-question review)
   */
  async getAttemptById(id) {
    const attempt = await Attempt.findById(id).lean();
    if (!attempt) {
      throw ApiError.notFound(`Test attempt with ID '${id}' not found`);
    }
    return attempt;
  }

  /**
   * Comprehensive Student Progress Report & Analytics
   */
  async getStudentProgress(studentId) {
    const trimmedId = String(studentId).trim();
    const attempts = await Attempt.find({ studentId: trimmedId })
      .sort({ createdAt: -1 })
      .lean();

    if (attempts.length === 0) {
      return {
        studentId: trimmedId,
        studentName: 'Not Found / No Attempts',
        totalTestsTaken: 0,
        overallAccuracy: 0,
        averageScore: 0,
        totalTimeSpentMinutes: 0,
        totalQuestionsAttempted: 0,
        totalCorrect: 0,
        topicBreakdown: [],
        patternBreakdown: [],
        recentAttempts: []
      };
    }

    const studentName = attempts[0].studentName || 'Student';
    const totalTestsTaken = attempts.length;

    let totalScore = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTimeSpent = 0;

    const topicStats = new Map();
    const patternStats = new Map();

    attempts.forEach((att) => {
      totalScore += att.score;
      totalQuestions += att.totalQuestions;
      totalCorrect += att.correctAnswers;
      totalTimeSpent += att.timeSpentSeconds || 0;

      // Aggregate topic stats
      if (att.topic) {
        const topKey = att.topic;
        if (!topicStats.has(topKey)) {
          topicStats.set(topKey, {
            topic: topKey,
            topicName: topicRegistry.getTopic(topKey)?.name || topKey,
            testsTaken: 0,
            totalQuestions: 0,
            correct: 0,
            timeSpentSeconds: 0
          });
        }
        const tStat = topicStats.get(topKey);
        tStat.testsTaken += 1;
        tStat.totalQuestions += att.totalQuestions;
        tStat.correct += att.correctAnswers;
        tStat.timeSpentSeconds += att.timeSpentSeconds || 0;
      }

      // Aggregate pattern-level performance from answers
      if (Array.isArray(att.answers)) {
        att.answers.forEach((ans) => {
          if (ans.pattern && ans.topic) {
            const patKey = `${ans.topic}:::${ans.pattern}`;
            if (!patternStats.has(patKey)) {
              patternStats.set(patKey, {
                pattern: ans.pattern,
                topic: ans.topic,
                topicName: topicRegistry.getTopic(ans.topic)?.name || ans.topic,
                total: 0,
                correct: 0
              });
            }
            const pStat = patternStats.get(patKey);
            pStat.total += 1;
            if (ans.isCorrect) pStat.correct += 1;
          }
        });
      }
    });

    const averageScore = Math.round((totalScore / totalTestsTaken) * 100) / 100;
    const overallAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
      : 0;

    // Format Topic Breakdown
    const topicBreakdown = Array.from(topicStats.values()).map((t) => {
      const accuracy = t.totalQuestions > 0
        ? Math.round((t.correct / t.totalQuestions) * 100 * 100) / 100
        : 0;
      let status = 'Needs Practice';
      if (accuracy >= 80) status = 'Mastered';
      else if (accuracy >= 65) status = 'Proficient';

      return {
        ...t,
        accuracy,
        status
      };
    });

    // Format Pattern Breakdown
    const patternBreakdown = Array.from(patternStats.values()).map((p) => {
      const accuracy = p.total > 0
        ? Math.round((p.correct / p.total) * 100 * 100) / 100
        : 0;
      return {
        ...p,
        accuracy,
        isWeakArea: accuracy < 60
      };
    });

    // Recent 10 test attempts
    const recentAttempts = attempts.slice(0, 10).map((att) => ({
      _id: att._id,
      testType: att.testType,
      topic: att.topic,
      topicName: att.topic ? topicRegistry.getTopic(att.topic)?.name || att.topic : 'Full Mock Test',
      pattern: att.pattern,
      totalQuestions: att.totalQuestions,
      correctAnswers: att.correctAnswers,
      score: att.score,
      accuracy: att.accuracy,
      timeSpentSeconds: att.timeSpentSeconds,
      createdAt: att.createdAt
    }));

    return {
      studentId: trimmedId,
      studentName,
      totalTestsTaken,
      overallAccuracy,
      averageScore,
      totalTimeSpentMinutes: Math.round((totalTimeSpent / 60) * 10) / 10,
      totalQuestionsAttempted: totalQuestions,
      totalCorrect,
      topicBreakdown,
      patternBreakdown,
      recentAttempts
    };
  }

  /**
   * Teacher Overview Dashboard: Class-Wide Analytics
   */
  async getTeacherOverview() {
    const attempts = await Attempt.find({}).sort({ createdAt: -1 }).lean();

    if (attempts.length === 0) {
      return {
        totalStudents: 0,
        totalAttempts: 0,
        classAverageScore: 0,
        classAverageAccuracy: 0,
        totalStudyHours: 0,
        topicPerformance: [],
        topStudents: [],
        recentSubmissions: []
      };
    }

    const studentMap = new Map();
    const topicMap = new Map();
    let totalScore = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTimeSpent = 0;

    attempts.forEach((att) => {
      totalScore += att.score;
      totalQuestions += att.totalQuestions;
      totalCorrect += att.correctAnswers;
      totalTimeSpent += att.timeSpentSeconds || 0;

      // Student aggregation
      if (!studentMap.has(att.studentId)) {
        studentMap.set(att.studentId, {
          studentId: att.studentId,
          studentName: att.studentName || 'Student',
          testsTaken: 0,
          totalScore: 0,
          totalQuestions: 0,
          totalCorrect: 0
        });
      }
      const s = studentMap.get(att.studentId);
      s.testsTaken += 1;
      s.totalScore += att.score;
      s.totalQuestions += att.totalQuestions;
      s.totalCorrect += att.correctAnswers;

      // Topic aggregation
      if (att.topic) {
        if (!topicMap.has(att.topic)) {
          topicMap.set(att.topic, {
            topic: att.topic,
            name: topicRegistry.getTopic(att.topic)?.name || att.topic,
            attemptsCount: 0,
            totalQuestions: 0,
            correct: 0
          });
        }
        const t = topicMap.get(att.topic);
        t.attemptsCount += 1;
        t.totalQuestions += att.totalQuestions;
        t.correct += att.correctAnswers;
      }
    });

    const classAverageScore = Math.round((totalScore / attempts.length) * 100) / 100;
    const classAverageAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
      : 0;

    // Top students ranked by average score
    const topStudents = Array.from(studentMap.values())
      .map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        testsTaken: s.testsTaken,
        averageScore: Math.round((s.totalScore / s.testsTaken) * 100) / 100,
        accuracy: s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100 * 100) / 100 : 0
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // Topic performance across the class
    const topicPerformance = Array.from(topicMap.values())
      .map((t) => ({
        topic: t.topic,
        name: t.name,
        attemptsCount: t.attemptsCount,
        accuracy: t.totalQuestions > 0 ? Math.round((t.correct / t.totalQuestions) * 100 * 100) / 100 : 0
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Lowest accuracy first to highlight weak areas for teachers

    // Recent 10 test submissions
    const recentSubmissions = attempts.slice(0, 10).map((att) => ({
      _id: att._id,
      studentId: att.studentId,
      studentName: att.studentName,
      topic: att.topic,
      topicName: att.topic ? topicRegistry.getTopic(att.topic)?.name || att.topic : 'Full Mock Test',
      score: att.score,
      accuracy: att.accuracy,
      totalQuestions: att.totalQuestions,
      createdAt: att.createdAt
    }));

    return {
      totalStudents: studentMap.size,
      totalAttempts: attempts.length,
      classAverageScore,
      classAverageAccuracy,
      totalStudyHours: Math.round((totalTimeSpent / 3600) * 10) / 10,
      topicPerformance,
      topStudents,
      recentSubmissions
    };
  }

  /**
   * Delete an attempt by ID
   */
  async deleteAttempt(id) {
    const deleted = await Attempt.findByIdAndDelete(id);
    if (!deleted) {
      throw ApiError.notFound(`Attempt with ID '${id}' not found`);
    }
    return deleted;
  }
}

module.exports = new AttemptService();
