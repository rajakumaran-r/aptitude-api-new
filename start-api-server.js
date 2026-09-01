require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const { getTopicQuestionModel } = require('./src/models/questionModel');
const Attempt = require('./src/models/attemptModel');
const { topicRegistry } = require('./src/config/topicRegistry');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 5001;

async function bootstrapServer() {
  console.log('🚀 Initializing Aptitude Backend API server...');
  
  let mongoServer;
  let mongoUri = process.env.MONGODB_URI;

  try {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log(`📦 In-memory MongoDB instance ready at: ${mongoUri}`);
  } catch (err) {
    console.warn('⚠️ Could not start MongoMemoryServer, falling back to MONGODB_URI:', err.message);
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true
  });
  console.log('✅ Connected to MongoDB database.');

  // Populate questions from scratch directory folders
  const baseDir = path.resolve(__dirname, '..');
  const dirs = fs.readdirSync(baseDir).filter((d) => d.endsWith('_questions'));
  
  console.log(`📂 Found ${dirs.length} question directories to seed...`);

  let totalQuestions = 0;
  for (const dir of dirs) {
    const jsonPath = path.join(baseDir, dir, 'questions.json');
    if (!fs.existsSync(jsonPath)) continue;

    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const questions = JSON.parse(raw);
      if (!Array.isArray(questions) || questions.length === 0) continue;

      let collName = dir.replace(/_questions$/, '');
      if (collName === 'averages') collName = 'average';
      if (collName === 'tsd') collName = 'time_speed_and_distance';
      if (collName === 'ci') collName = 'compound_interest';
      if (collName === 'si') collName = 'simple_interest';
      if (collName === 'pnc') collName = 'permutation_and_combination';
      if (collName === 'numbers') collName = 'number_system';
      if (collName === 'boats') collName = 'boats_and_streams';
      if (collName === 'ratio_proportion') collName = 'ratio_and_proportion';
      if (collName === 'pipes_cisterns') collName = 'pipes_and_cisterns';
      if (collName === 'time_work') collName = 'time_and_work';
      if (collName === 'mixture_alligation') collName = 'mixture_and_alligation';
      if (collName === 'stocks_shares') collName = 'stocks_shares';
      if (collName === 'surds_indices') collName = 'surds_indices';

      const Model = getTopicQuestionModel(collName);
      await Model.insertMany(questions, { ordered: false });
      totalQuestions += questions.length;
    } catch (importErr) {
      console.warn(`[WARN] Issue seeding ${dir}: ${importErr.message}`);
    }
  }

  // Also check if 'age' topic is present, if not create/seed age questions
  const ageCount = await getTopicQuestionModel('age').countDocuments();
  if (ageCount === 0) {
    const ageSampleQuestions = [
      {
        question: "The sum of the present ages of Leela and Kamala is 13 years. After 13 years, the ratio of their ages will be 8:5. Find Leela's present age.",
        answer: "11 years",
        options: ["11 years", "12 years", "10 years", "9 years"],
        explanation: "Let present ages be L and K. L + K = 13. In 13 years: (L+13)/(K+13) = 8/5 => 5L + 65 = 8K + 104 => 5L - 8K = 39. Since K = 13 - L: 5L - 8(13 - L) = 39 => 13L - 104 = 39 => 13L = 143 => L = 11 years.",
        pattern: "Sum + Ratio Combined"
      },
      {
        question: "Father is 4 times as old as his son. In 20 years, he will be twice as old as his son. What is the father's current age?",
        answer: "40 years",
        options: ["36 years", "40 years", "44 years", "48 years"],
        explanation: "Let son's age = x, father's age = 4x. In 20 years: 4x + 20 = 2(x + 20) => 4x + 20 = 2x + 40 => 2x = 20 => x = 10. Father's age = 4x = 40 years.",
        pattern: "Father–Son / Mother–Daughter Type"
      },
      {
        question: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio will be 5:6. What is the present age of A?",
        answer: "20 years",
        options: ["16 years", "20 years", "24 years", "25 years"],
        explanation: "Let ages be 4x and 5x. After 5 years: (4x + 5)/(5x + 5) = 5/6 => 24x + 30 = 25x + 25 => x = 5. A's age = 4(5) = 20 years.",
        pattern: "Age Ratios and Shifts"
      },
      {
        question: "Ten years ago, the ratio of the ages of P and Q was 3:4. Ten years hence, the ratio will be 5:6. Find their present ages.",
        answer: "40 years and 50 years",
        options: ["30 years and 40 years", "35 years and 45 years", "40 years and 50 years", "25 years and 35 years"],
        explanation: "Let ages 10 years ago be 3x and 4x. Present ages: 3x+10 and 4x+10. In 10 years: (3x+20)/(4x+20) = 5/6 => 18x + 120 = 20x + 100 => 2x = 20 => x = 10. Present ages = 3(10)+10 = 40, and 4(10)+10 = 50.",
        pattern: "Past-Future Ratio Transition"
      },
      {
        question: "A man was 26 years old when his son was born. His wife was 24 years old when their daughter was born, who is 3 years younger than the son. What is the difference between the ages of the man and his wife?",
        answer: "5 years",
        options: ["3 years", "4 years", "5 years", "6 years"],
        explanation: "When daughter was born, son was 3 years old. So father was 26 + 3 = 29 years old. Mother was 24 years old. Difference = 29 - 24 = 5 years.",
        pattern: "Family Age Differences"
      },
      {
        question: "The average age of a husband and wife at the time of their marriage 4 years ago was 25 years. Today, the average age of husband, wife, and their child is 20 years. What is the age of the child?",
        answer: "2 years",
        options: ["1 year", "2 years", "3 years", "4 years"],
        explanation: "Sum of ages 4 years ago = 50. Present sum of husband and wife = 50 + 4 + 4 = 58. Present sum of family (3 members) = 3 * 20 = 60. Child's age = 60 - 58 = 2 years.",
        pattern: "Average Age of Family"
      },
      {
        question: "6 years ago, the ratio of ages of Kunal and Sagar was 6:5. 4 years hence, the ratio will be 11:10. What is Sagar's present age?",
        answer: "16 years",
        options: ["14 years", "16 years", "18 years", "20 years"],
        explanation: "Let ages 6 yrs ago be 6x and 5x. After (6 + 4) = 10 years: (6x+10)/(5x+10) = 11/10 => 60x + 100 = 55x + 110 => 5x = 10 => x = 2. Sagar present age = 5x + 6 = 5(2) + 6 = 16 years.",
        pattern: "Past-Future Ratio Transition"
      },
      {
        question: "The present age of a father is 3 years more than three times the age of his son. Three years hence, father's age will be 10 years more than twice the age of the son. What is the father's present age?",
        answer: "33 years",
        options: ["30 years", "33 years", "36 years", "39 years"],
        explanation: "Let son's age = x. Father's age = 3x + 3. In 3 years: (3x + 3) + 3 = 2(x + 3) + 10 => 3x + 6 = 2x + 16 => x = 10. Father's present age = 3(10) + 3 = 33 years.",
        pattern: "Father–Son / Mother–Daughter Type"
      },
      {
        question: "The sum of the ages of 5 children born at intervals of 3 years each is 50 years. What is the age of the youngest child?",
        answer: "4 years",
        options: ["2 years", "3 years", "4 years", "5 years"],
        explanation: "Let ages be x, x+3, x+6, x+9, x+12. Sum = 5x + 30 = 50 => 5x = 20 => x = 4 years.",
        pattern: "Arithmetic Sequence of Ages"
      },
      {
        question: "A person's present age is two-ninth of the age of his mother. After 10 years, he will be four-eleventh of the age of his mother. How old is the mother at present?",
        answer: "45 years",
        options: ["36 years", "45 years", "54 years", "63 years"],
        explanation: "Let mother's age = 9x, person's age = 2x. In 10 years: (2x+10)/(9x+10) = 4/11 => 22x + 110 = 36x + 40 => 14x = 70 => x = 5. Mother's age = 9(5) = 45 years.",
        pattern: "Fractional Age Relationships"
      }
    ];

    await getTopicQuestionModel('age').insertMany(ageSampleQuestions);
    totalQuestions += ageSampleQuestions.length;
  }

  // Seed sample student attempts if empty
  const attemptCount = await Attempt.countDocuments();
  if (attemptCount === 0) {
    console.log('🌱 Seeding initial sample test attempts for student & teacher analytics...');
    const sampleAttempts = [
      {
        studentId: 'student_101',
        studentName: 'Aarav Sharma',
        testType: 'TOPIC',
        topic: 'percentage',
        pattern: 'Direct Percentage of a Number',
        totalQuestions: 10,
        correctAnswers: 9,
        incorrectAnswers: 1,
        unanswered: 0,
        score: 90,
        accuracy: 90,
        timeSpentSeconds: 260,
        answers: [
          {
            questionId: 'q1',
            question: 'A monthly household electricity bill of ₹2,400 has a prompt payment rebate of 5%. What is the discount amount?',
            selectedOption: '₹120',
            correctAnswer: '₹120',
            isCorrect: true,
            topic: 'percentage',
            pattern: 'Direct Percentage of a Number',
            explanation: 'Rebate amount = 5% of ₹2,400 = ₹120.',
            timeSpentSeconds: 22
          },
          {
            questionId: 'q2',
            question: 'In a school of 1,200 students, 35% are enrolled in sports clubs. How many students are enrolled in sports clubs?',
            selectedOption: '420',
            correctAnswer: '420',
            isCorrect: true,
            topic: 'percentage',
            pattern: 'Direct Percentage of a Number',
            explanation: 'Number of students = 35% of 1,200 = 420 students.',
            timeSpentSeconds: 18
          }
        ],
        createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2)
      },
      {
        studentId: 'student_101',
        studentName: 'Aarav Sharma',
        testType: 'TOPIC',
        topic: 'profit-and-loss',
        pattern: 'Dishonest Dealer & Faulty Weights/Measures',
        totalQuestions: 10,
        correctAnswers: 5,
        incorrectAnswers: 5,
        unanswered: 0,
        score: 50,
        accuracy: 50,
        timeSpentSeconds: 420,
        answers: [
          {
            questionId: 'q3',
            question: 'A dishonest dealer professes to sell his goods at cost price but uses a weight of 900 gm for a kg weight. Find his gain percentage.',
            selectedOption: '10%',
            correctAnswer: '11.11%',
            isCorrect: false,
            topic: 'profit-and-loss',
            pattern: 'Dishonest Dealer & Faulty Weights/Measures',
            explanation: 'Gain% = [Error / (True Value - Error)] * 100 = [100 / 900] * 100 = 11.11%.',
            timeSpentSeconds: 65
          }
        ],
        createdAt: new Date(Date.now() - 3600 * 1000 * 12)
      },
      {
        studentId: 'student_105',
        studentName: 'Priya Patel',
        testType: 'FULL_MOCK',
        topic: null,
        pattern: null,
        totalQuestions: 20,
        correctAnswers: 19,
        incorrectAnswers: 1,
        unanswered: 0,
        score: 95,
        accuracy: 95,
        timeSpentSeconds: 680,
        createdAt: new Date(Date.now() - 3600 * 1000 * 5)
      },
      {
        studentId: 'student_102',
        studentName: 'Rohan Verma',
        testType: 'TOPIC',
        topic: 'time-and-work',
        pattern: 'Alternate Day Work',
        totalQuestions: 10,
        correctAnswers: 7,
        incorrectAnswers: 3,
        unanswered: 0,
        score: 70,
        accuracy: 70,
        timeSpentSeconds: 390,
        createdAt: new Date(Date.now() - 3600 * 1000 * 18)
      }
    ];

    await Attempt.insertMany(sampleAttempts);
    console.log('✅ Sample attempts seeded.');
  }

  console.log(`✨ Total questions loaded across all collections: ${totalQuestions}`);

  // Start HTTP Server
  const server = app.listen(PORT, () => {
    logger.info(`🎉 Aptitude REST API is running on http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
    logger.info(`Topics list: http://localhost:${PORT}/api/v1/topics`);
  });

  return server;
}

bootstrapServer().catch((err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});
