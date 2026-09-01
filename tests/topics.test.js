const request = require('supertest');
const app = require('../src/app');
const { getTopicQuestionModel } = require('../src/models/questionModel');

require('./setup');

describe('Topics and Patterns Metadata API Tests (Separate Collections)', () => {
  const sampleQuestion = {
    question: 'A manufacturing quality test had a failure probability of 5%. What is the relative percentage reduction?',
    answer: '60%',
    options: ['50%', '55%', '60%', '65%'],
    explanation: 'Relative percentage reduction = 60%.',
    pattern: 'Direct Percentage of a Number'
  };

  const PercentageModel = getTopicQuestionModel('percentage');

  beforeEach(async () => {
    await PercentageModel.create(sampleQuestion);
  });

  it('GET /api/v1/topics should list available topics with question counts from their collections', async () => {
    const res = await request(app).get('/api/v1/topics');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const percentageTopic = res.body.data.find((t) => t.slug === 'percentage');
    expect(percentageTopic).toBeDefined();
    expect(percentageTopic.questionCount).toBe(1);
    expect(percentageTopic.collectionName).toBe('percentage');
  });

  it('GET /api/v1/topics/:topic/patterns should return patterns for valid topic', async () => {
    const res = await request(app).get('/api/v1/topics/percentage/patterns');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('Direct Percentage of a Number');
  });

  it('GET /api/v1/topics/:topic/patterns should return 404 for invalid topic', async () => {
    const res = await request(app).get('/api/v1/topics/non-existent-topic/patterns');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/topics/:topic/count should return question count directly from topic collection', async () => {
    const res = await request(app).get('/api/v1/topics/percentage/count');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.collectionName).toBe('percentage');
  });

  it('GET /api/v1/topics/:topic/patterns/:pattern/count should return count for pattern', async () => {
    const res = await request(app).get(
      '/api/v1/topics/percentage/patterns/direct-percentage-of-a-number/count'
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.pattern).toBe('Direct Percentage of a Number');
  });

  it('GET /api/v1/topics/:topic/patterns/:pattern/count should return 404 for nonexistent pattern', async () => {
    const res = await request(app).get(
      '/api/v1/topics/percentage/patterns/unknown-pattern/count'
    );

    expect(res.status).toBe(404);
  });
});
