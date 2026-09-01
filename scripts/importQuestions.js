require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/config/db');
const { getTopicQuestionModel } = require('../src/models/questionModel');
const { topicRegistry, toSlug, toCollectionName } = require('../src/config/topicRegistry');
const logger = require('../src/utils/logger');

/**
 * Derives topic metadata (name, slug, collectionName) from a filename
 */
const deriveTopicMeta = (filename) => {
  const base = path.basename(filename, path.extname(filename)).toLowerCase();

  const specialCases = {
    'age': { name: 'Problems on Ages', slug: 'age', collectionName: 'age' },
    'ages': { name: 'Problems on Ages', slug: 'age', collectionName: 'age' },
    'trains': { name: 'Problems on Trains', slug: 'trains', collectionName: 'trains' },
    'ci': { name: 'Compound Interest', slug: 'compound-interest', collectionName: 'compound_interest' },
    'si': { name: 'Simple Interest', slug: 'simple-interest', collectionName: 'simple_interest' },
    'pnc': { name: 'Permutation and Combination', slug: 'permutation-and-combination', collectionName: 'permutation_and_combination' },
    'tsd': { name: 'Time, Speed and Distance', slug: 'time-speed-and-distance', collectionName: 'time_speed_and_distance' }
  };

  if (specialCases[base]) {
    return specialCases[base];
  }

  const cleaned = base
    .replace(/_questions$/, '')
    .replace(/-questions$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const topicNameMap = {
    'algebra': 'Algebra',
    'average': 'Average',
    'averages': 'Average',
    'boats and streams': 'Boats and Streams',
    'boats': 'Boats and Streams',
    'calendar': 'Calendar',
    'clock': 'Clock',
    'compound interest': 'Compound Interest',
    'mixture and alligation': 'Mixture and Alligation',
    'number system': 'Number System',
    'numbers': 'Number System',
    'partnership': 'Partnership',
    'percentage': 'Percentage',
    'pipes and cisterns': 'Pipes and Cisterns',
    'pipes cisterns': 'Pipes and Cisterns',
    'permutation and combination': 'Permutation and Combination',
    'probability': 'Probability',
    'profit and loss': 'Profit and Loss',
    'ratio and proportion': 'Ratio and Proportion',
    'ratio proportion': 'Ratio and Proportion',
    'simple interest': 'Simple Interest',
    'stocks and shares': 'Stocks and Shares',
    'surds and indices': 'Surds and Indices',
    'time and work': 'Time and Work',
    'time work': 'Time and Work',
    'time speed and distance': 'Time, Speed and Distance',
    'trigonometry': 'Trigonometry',
    'volume and surface area': 'Volume and Surface Area'
  };

  const name = topicNameMap[cleaned] || cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const slug = toSlug(cleaned);
  const collectionName = toCollectionName(slug);

  return { name, slug, collectionName };
};

/**
 * Backwards compatibility helper
 */
const deriveTopicName = (filename) => deriveTopicMeta(filename).name;

/**
 * Validate a question record
 */
const validateQuestion = (q) => {
  if (!q || typeof q !== 'object') {
    return { valid: false, error: 'Record is not an object' };
  }

  if (typeof q.question !== 'string' || q.question.trim().length === 0) {
    return { valid: false, error: 'Field "question" must be a non-empty string' };
  }

  if (typeof q.answer !== 'string' || q.answer.trim().length === 0) {
    return { valid: false, error: 'Field "answer" must be a non-empty string' };
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return { valid: false, error: 'Field "options" must be an array of exactly 4 strings' };
  }

  const trimmedOptions = q.options.map((opt) => String(opt || '').trim());
  if (trimmedOptions.some((opt) => opt.length === 0)) {
    return { valid: false, error: 'All 4 options must be non-empty strings' };
  }

  const trimmedAnswer = q.answer.trim();
  if (!trimmedOptions.includes(trimmedAnswer)) {
    return { valid: false, error: `Answer "${trimmedAnswer}" is not present in options` };
  }

  if (typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
    return { valid: false, error: 'Field "explanation" must be a non-empty string' };
  }

  if (typeof q.pattern !== 'string' || q.pattern.trim().length === 0) {
    return { valid: false, error: 'Field "pattern" must be a non-empty string' };
  }

  return {
    valid: true,
    sanitized: {
      question: q.question.trim(),
      answer: trimmedAnswer,
      options: trimmedOptions,
      explanation: q.explanation.trim(),
      pattern: q.pattern.trim()
    }
  };
};

/**
 * Find all JSON files in the data directory
 */
const findJsonFiles = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJsonFiles(filePath));
    } else if (file.endsWith('.json') && !file.endsWith('package.json') && !file.endsWith('topicRegistry.json')) {
      results.push(filePath);
    }
  }
  return results;
};

/**
 * Main import runner
 */
const runImport = async () => {
  const dataDir = path.resolve(__dirname, '../data');
  const files = findJsonFiles(dataDir);

  if (files.length === 0) {
    console.log(`No JSON files found in ${dataDir}.`);
    return;
  }

  console.log(`Found ${files.length} JSON files to import into separate topic collections...`);

  await connectDB();

  let totalFilesProcessed = 0;
  let totalQuestionsFound = 0;
  let totalQuestionsInserted = 0;
  let totalDuplicatesSkipped = 0;
  let totalInvalidQuestions = 0;

  const topicPatternMap = new Map();

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const { name: topicName, slug: topicSlug, collectionName } = deriveTopicMeta(filename);

    const Model = getTopicQuestionModel(collectionName);
    await Model.createIndexes();

    if (!topicPatternMap.has(topicSlug)) {
      topicPatternMap.set(topicSlug, {
        name: topicName,
        collectionName,
        patterns: new Set()
      });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let records;
      try {
        records = JSON.parse(content);
      } catch (parseErr) {
        console.warn(`[WARN] Could not parse JSON from ${filename}: ${parseErr.message}`);
        continue;
      }

      if (!Array.isArray(records)) {
        if (records && typeof records === 'object' && Array.isArray(records.questions)) {
          records = records.questions;
        } else {
          console.warn(`[WARN] Expected an array in ${filename}, skipped.`);
          continue;
        }
      }

      totalFilesProcessed++;
      totalQuestionsFound += records.length;

      // Pre-load existing questions in THIS collection to detect duplicates
      const existingInCollection = await Model.find({}, { question: 1 }).lean();
      const seenInCollection = new Set();
      existingInCollection.forEach((q) => {
        if (q.question) seenInCollection.add(q.question.toLowerCase());
      });

      const batchToInsert = [];

      for (let i = 0; i < records.length; i++) {
        const rawQ = records[i];
        const validation = validateQuestion(rawQ);

        if (!validation.valid) {
          totalInvalidQuestions++;
          continue;
        }

        const sanitized = validation.sanitized;
        const normalizedText = sanitized.question.toLowerCase();

        if (seenInCollection.has(normalizedText)) {
          totalDuplicatesSkipped++;
          continue;
        }

        seenInCollection.add(normalizedText);
        topicPatternMap.get(topicSlug).patterns.add(sanitized.pattern);

        batchToInsert.push({
          insertOne: {
            document: sanitized
          }
        });
      }

      // Bulk write to this topic's collection
      if (batchToInsert.length > 0) {
        const chunkSize = 1000;
        for (let j = 0; j < batchToInsert.length; j += chunkSize) {
          const chunk = batchToInsert.slice(j, j + chunkSize);
          try {
            const bulkResult = await Model.bulkWrite(chunk, { ordered: false });
            totalQuestionsInserted += bulkResult.insertedCount;
          } catch (bulkErr) {
            if (bulkErr.insertedCount) {
              totalQuestionsInserted += bulkErr.insertedCount;
            }
            if (bulkErr.writeErrors) {
              totalDuplicatesSkipped += bulkErr.writeErrors.length;
            }
          }
        }
      }

      console.log(`  -> Imported ${batchToInsert.length} questions into collection: '${collectionName}'`);
    } catch (fileErr) {
      console.error(`[ERROR] Processing file ${filename} failed:`, fileErr.message);
    }
  }

  // Update Topic Registry with collection names and patterns
  for (const [slug, data] of topicPatternMap.entries()) {
    const patternArr = Array.from(data.patterns);
    topicRegistry.registerTopic(data.name, patternArr, slug, data.collectionName);
  }
  topicRegistry.save();

  console.log('\n========================================');
  console.log('Import completed.');
  console.log('========================================');
  console.log(`Files processed:     ${totalFilesProcessed}`);
  console.log(`Questions found:     ${totalQuestionsFound}`);
  console.log(`Questions inserted:  ${totalQuestionsInserted}`);
  console.log(`Duplicates skipped:  ${totalDuplicatesSkipped}`);
  console.log(`Invalid questions:   ${totalInvalidQuestions}`);
  console.log('========================================\n');

  await disconnectDB();
};

if (require.main === module) {
  runImport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal import error:', err);
      process.exit(1);
    });
}

module.exports = { runImport, validateQuestion, deriveTopicName, deriveTopicMeta };
