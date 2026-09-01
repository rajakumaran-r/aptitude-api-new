const { validateQuestion, deriveTopicName } = require('../scripts/importQuestions');

describe('Import Script Unit Tests', () => {
  const validRecord = {
    question: 'A test question with valid options?',
    answer: 'A',
    options: ['A', 'B', 'C', 'D'],
    explanation: 'Explanation for test question.',
    pattern: 'Test Pattern'
  };

  it('should validate a correct question record', () => {
    const res = validateQuestion(validRecord);
    expect(res.valid).toBe(true);
    expect(res.sanitized.question).toBe(validRecord.question);
    expect(res.sanitized.options).toHaveLength(4);
  });

  it('should reject non-object records', () => {
    expect(validateQuestion(null).valid).toBe(false);
    expect(validateQuestion('string').valid).toBe(false);
  });

  it('should reject when question text is missing or empty', () => {
    expect(validateQuestion({ ...validRecord, question: '' }).valid).toBe(false);
    expect(validateQuestion({ ...validRecord, question: '   ' }).valid).toBe(false);
  });

  it('should reject when options array does not have exactly 4 items', () => {
    expect(validateQuestion({ ...validRecord, options: ['A', 'B', 'C'] }).valid).toBe(false);
    expect(validateQuestion({ ...validRecord, options: ['A', 'B', 'C', 'D', 'E'] }).valid).toBe(false);
  });

  it('should reject when an option is an empty string', () => {
    expect(validateQuestion({ ...validRecord, options: ['A', 'B', 'C', ''] }).valid).toBe(false);
  });

  it('should reject when answer does not match any option', () => {
    expect(validateQuestion({ ...validRecord, answer: 'Z' }).valid).toBe(false);
  });

  it('should properly derive human-readable topic names from filenames', () => {
    expect(deriveTopicName('profit-and-loss.json')).toBe('Profit and Loss');
    expect(deriveTopicName('percentage_questions.json')).toBe('Percentage');
    expect(deriveTopicName('time_speed_and_distance.json')).toBe('Time, Speed and Distance');
    expect(deriveTopicName('compound_interest.json')).toBe('Compound Interest');
    expect(deriveTopicName('boats-and-streams.json')).toBe('Boats and Streams');
  });
});
