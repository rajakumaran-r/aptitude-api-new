const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { getTopicQuestionModel } = require('../src/models/questionModel');

require('./setup');

describe('Questions API Tests (Separate Collections Architecture)', () => {
  const sampleQuestion = {
    question: 'A manufacturing quality test had a failure probability of 5%. After process redesign, the failure probability dropped to 2%. What is the relative percentage reduction in failure probability?',
    answer: '60%',
    options: ['50%', '55%', '60%', '65%'],
    explanation: 'Relative percentage reduction = (5% - 2%) / 5% × 100 = 3 / 5 × 100 = 60%.',
    pattern: 'Direct Percentage of a Number'
  };

  const sampleQuestion2 = {
    question: 'In a school of 1,200 students, 35% are enrolled in sports clubs. How many students are enrolled in sports clubs?',
    answer: '420',
    options: ['350', '400', '420', '450'],
    explanation: 'Number of students = 35% of 1,200 = (35 / 100) × 1200 = 420 students.',
    pattern: 'Direct Percentage of a Number'
  };

  const sampleQuestionProfit = {
    question: 'A trader buys a watch for ₹800 and sells it for ₹1,000. What is the profit percentage?',
    answer: '25%',
    options: ['20%', '25%', '30%', '35%'],
    explanation: 'Profit % = (200 / 800) * 100 = 25%.',
    pattern: 'Basic Profit and Loss'
  };

  const PercentageModel = getTopicQuestionModel('percentage');
  const ProfitModel = getTopicQuestionModel('profit_and_loss');

  // 1. POST /api/v1/questions
  describe('POST /api/v1/questions', () => {
    it('should create a question in the appropriate topic collection', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .send(sampleQuestion);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.question).toBe(sampleQuestion.question);
      expect(res.body.data.options).toHaveLength(4);
      expect(res.body.data.answer).toBe('60%');

      // Verify it was saved directly in the 'percentage' collection
      const savedInColl = await PercentageModel.findById(res.body.data._id);
      expect(savedInColl).not.toBeNull();
      expect(savedInColl.question).toBe(sampleQuestion.question);
    });

    it('should reject duplicate question creation with 409 Conflict', async () => {
      await request(app).post('/api/v1/questions').send(sampleQuestion);

      const duplicateRes = await request(app)
        .post('/api/v1/questions')
        .send(sampleQuestion);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe('CONFLICT');
    });

    it('should reject question when missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .send({ question: 'Incomplete question?' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject question with fewer than 4 options', async () => {
      const invalid = {
        ...sampleQuestion,
        options: ['50%', '55%', '60%']
      };

      const res = await request(app)
        .post('/api/v1/questions')
        .send(invalid);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject question with more than 4 options', async () => {
      const invalid = {
        ...sampleQuestion,
        options: ['50%', '55%', '60%', '65%', '70%']
      };

      const res = await request(app)
        .post('/api/v1/questions')
        .send(invalid);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject question when answer is not in options', async () => {
      const invalid = {
        ...sampleQuestion,
        answer: '99%',
        options: ['50%', '55%', '60%', '65%']
      };

      const res = await request(app)
        .post('/api/v1/questions')
        .send(invalid);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unexpected extra fields (e.g. difficulty, isActive)', async () => {
      const invalid = {
        ...sampleQuestion,
        difficulty: 'Hard',
        isActive: true
      };

      const res = await request(app)
        .post('/api/v1/questions')
        .send(invalid);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // 2. GET /api/v1/questions (Global multi-collection pagination)
  describe('GET /api/v1/questions', () => {
    beforeEach(async () => {
      await PercentageModel.create(sampleQuestion);
      await PercentageModel.create(sampleQuestion2);
      await ProfitModel.create(sampleQuestionProfit);
    });

    it('should retrieve all questions across collections with default pagination', async () => {
      const res = await request(app).get('/api/v1/questions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);
    });

    it('should handle custom page and limit pagination across collections', async () => {
      const res = await request(app).get('/api/v1/questions?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should reject invalid page or limit', async () => {
      const res1 = await request(app).get('/api/v1/questions?limit=-5');
      expect(res1.status).toBe(400);

      const res2 = await request(app).get('/api/v1/questions?limit=999999');
      expect(res2.status).toBe(400);
    });
  });

  // 3. Topic & Pattern Filtering on Dedicated Collections
  describe('Topic and Pattern Filtering on Specific Collections', () => {
    beforeEach(async () => {
      await PercentageModel.create(sampleQuestion);
      await PercentageModel.create(sampleQuestion2);
      await ProfitModel.create(sampleQuestionProfit);
    });

    it('should retrieve questions directly from the percentage collection', async () => {
      const res = await request(app).get('/api/v1/questions/topic/percentage');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.collection).toBe('percentage');
    });

    it('should retrieve questions directly from the profit_and_loss collection', async () => {
      const res = await request(app).get('/api/v1/questions/topic/profit-and-loss');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.collection).toBe('profit_and_loss');
    });

    it('should support limit=1 on topic endpoint', async () => {
      const res = await request(app).get('/api/v1/questions/topic/percentage?limit=1');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 404 for an unknown topic', async () => {
      const res = await request(app).get('/api/v1/questions/topic/unknown-topic-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve questions by pattern within a topic collection', async () => {
      const res = await request(app).get(
        '/api/v1/questions/topic/percentage/pattern/direct-percentage-of-a-number'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pattern).toBe('Direct Percentage of a Number');
    });

    it('should return 404 for an unknown pattern under a valid topic', async () => {
      const res = await request(app).get(
        '/api/v1/questions/topic/percentage/pattern/non-existent-pattern-abc'
      );

      expect(res.status).toBe(404);
    });
  });

  // 4. Random Questions
  describe('Random Questions API', () => {
    beforeEach(async () => {
      await PercentageModel.create(sampleQuestion);
      await PercentageModel.create(sampleQuestion2);
      await ProfitModel.create(sampleQuestionProfit);
    });

    it('should retrieve global random questions across collections', async () => {
      const res = await request(app).get('/api/v1/questions/random?limit=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should retrieve random questions topic-wise from specific collection', async () => {
      const res = await request(app).get('/api/v1/questions/topic/percentage/random?limit=1');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].pattern).toBe('Direct Percentage of a Number');
    });
  });

  // 5. Search API
  describe('Search API across collections', () => {
    beforeEach(async () => {
      await PercentageModel.create(sampleQuestion);
      await ProfitModel.create(sampleQuestionProfit);
    });

    it('should search questions by text query across collections', async () => {
      const res = await request(app).get('/api/v1/questions/search?q=manufacturing');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].question).toContain('manufacturing');
    });

    it('should search questions by pattern query across collections', async () => {
      const res = await request(app).get('/api/v1/questions/search?q=Profit');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].pattern).toContain('Profit');
    });
  });

  // 6. Single Question CRUD (GET, PUT, DELETE)
  describe('Single Question CRUD across collections', () => {
    let createdId;

    beforeEach(async () => {
      const created = await PercentageModel.create(sampleQuestion);
      createdId = created._id.toString();
    });

    it('should get question by valid ID', async () => {
      const res = await request(app).get(`/api/v1/questions/${createdId}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(createdId);
      expect(res.body.data.question).toBe(sampleQuestion.question);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/v1/questions/invalid-id-123');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent ObjectId', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/questions/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should update question with valid data', async () => {
      const updated = {
        ...sampleQuestion,
        answer: '65%',
        explanation: 'Updated explanation for question.'
      };

      const res = await request(app)
        .put(`/api/v1/questions/${createdId}`)
        .send(updated);

      expect(res.status).toBe(200);
      expect(res.body.data.answer).toBe('65%');
      expect(res.body.data.explanation).toBe('Updated explanation for question.');
    });

    it('should delete question by ID', async () => {
      const res = await request(app).delete(`/api/v1/questions/${createdId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdId);

      const fetchRes = await request(app).get(`/api/v1/questions/${createdId}`);
      expect(fetchRes.status).toBe(404);
    });
  });
});
