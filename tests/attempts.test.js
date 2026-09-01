const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');
const Attempt = require('../src/models/attemptModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Attempt.deleteMany({});
});

describe('Student Test Attempts & Teacher Progress Tracking API', () => {
  const sampleAttemptData = {
    studentId: 'student_001',
    studentName: 'Aarav Sharma',
    testType: 'TOPIC',
    topic: 'age',
    pattern: 'Sum + Ratio Combined',
    timeSpentSeconds: 120,
    answers: [
      {
        questionId: '507f1f77bcf86cd799439011',
        question: 'The sum of the present ages of A and B is 30 years...',
        selectedOption: '18 years',
        correctAnswer: '18 years',
        topic: 'age',
        pattern: 'Sum + Ratio Combined',
        explanation: 'Step 1 calculation...',
        timeSpentSeconds: 45
      },
      {
        questionId: '507f1f77bcf86cd799439012',
        question: 'Father is 4 times as old as his son...',
        selectedOption: '35 years',
        correctAnswer: '40 years',
        topic: 'age',
        pattern: 'Father-Son Multipliers',
        explanation: 'Step 1 calculation...',
        timeSpentSeconds: 75
      }
    ]
  };

  describe('POST /api/v1/attempts (Submit Test Attempt)', () => {
    it('should successfully record a test attempt and calculate score & accuracy', async () => {
      const res = await request(app)
        .post('/api/v1/attempts')
        .send(sampleAttemptData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe('student_001');
      expect(res.body.data.totalQuestions).toBe(2);
      expect(res.body.data.correctAnswers).toBe(1);
      expect(res.body.data.incorrectAnswers).toBe(1);
      expect(res.body.data.unanswered).toBe(0);
      expect(res.body.data.score).toBe(50);
      expect(res.body.data.accuracy).toBe(50);
      expect(res.body.data.answers).toHaveLength(2);
      expect(res.body.data.answers[0].isCorrect).toBe(true);
      expect(res.body.data.answers[1].isCorrect).toBe(false);
    });

    it('should reject an attempt with missing answers or studentId', async () => {
      const res = await request(app)
        .post('/api/v1/attempts')
        .send({ studentName: 'Incomplete Attempt' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/attempts/progress/student/:studentId (Student Progress Report)', () => {
    it('should return a detailed progress report with topic and pattern analytics', async () => {
      // 1. Submit 2 attempts for student_001
      await request(app).post('/api/v1/attempts').send(sampleAttemptData);
      await request(app).post('/api/v1/attempts').send({
        studentId: 'student_001',
        studentName: 'Aarav Sharma',
        testType: 'TOPIC',
        topic: 'percentage',
        timeSpentSeconds: 60,
        answers: [
          {
            questionId: '507f1f77bcf86cd799439013',
            question: 'What is 20% of 150?',
            selectedOption: '30',
            correctAnswer: '30',
            topic: 'percentage',
            pattern: 'Direct Percentage',
            timeSpentSeconds: 30
          }
        ]
      });

      const res = await request(app).get('/api/v1/attempts/progress/student/student_001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe('student_001');
      expect(res.body.data.totalTestsTaken).toBe(2);
      expect(res.body.data.totalQuestionsAttempted).toBe(3);
      expect(res.body.data.totalCorrect).toBe(2);
      expect(res.body.data.overallAccuracy).toBe(66.67);
      expect(res.body.data.topicBreakdown).toHaveLength(2);
      expect(res.body.data.patternBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.recentAttempts).toHaveLength(2);
    });

    it('should handle student with zero attempts gracefully', async () => {
      const res = await request(app).get('/api/v1/attempts/progress/student/non_existent_student');

      expect(res.status).toBe(200);
      expect(res.body.data.totalTestsTaken).toBe(0);
      expect(res.body.data.overallAccuracy).toBe(0);
    });
  });

  describe('GET /api/v1/attempts/teacher/overview (Teacher Dashboard)', () => {
    it('should return class-wide performance metrics, top students, and struggling topics', async () => {
      await request(app).post('/api/v1/attempts').send(sampleAttemptData); // student_001 (50%)
      await request(app).post('/api/v1/attempts').send({
        studentId: 'student_002',
        studentName: 'Priya Patel',
        testType: 'TOPIC',
        topic: 'percentage',
        timeSpentSeconds: 90,
        answers: [
          {
            questionId: '507f1f77bcf86cd799439014',
            question: 'Find 50% of 200',
            selectedOption: '100',
            correctAnswer: '100',
            topic: 'percentage',
            pattern: 'Direct Percentage',
            timeSpentSeconds: 40
          }
        ]
      }); // student_002 (100%)

      const res = await request(app).get('/api/v1/attempts/teacher/overview');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudents).toBe(2);
      expect(res.body.data.totalAttempts).toBe(2);
      expect(res.body.data.classAverageScore).toBe(75); // (50 + 100) / 2
      expect(res.body.data.topStudents).toHaveLength(2);
      expect(res.body.data.topStudents[0].studentId).toBe('student_002'); // 100% top
      expect(res.body.data.topicPerformance.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/attempts/student/:studentId (Student Attempts List)', () => {
    it('should return a paginated list of attempts for a student', async () => {
      await request(app).post('/api/v1/attempts').send(sampleAttemptData);

      const res = await request(app).get('/api/v1/attempts/student/student_001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/v1/attempts/:id (Single Attempt Review)', () => {
    it('should retrieve full attempt details with question-by-question review', async () => {
      const created = await request(app).post('/api/v1/attempts').send(sampleAttemptData);
      const attemptId = created.body.data._id;

      const res = await request(app).get(`/api/v1/attempts/${attemptId}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(attemptId);
      expect(res.body.data.answers).toHaveLength(2);
    });

    it('should return 404 for non-existent attempt ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/attempts/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
