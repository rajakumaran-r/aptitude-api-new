/**
 * Topic & Collection Name Normalization Helper
 * Pure in-memory dictionary for display names and slug resolution.
 * All actual data, patterns, and question counts are queried directly from MongoDB.
 */

const toCanonical = (str) => {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const toSlug = (str) => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const toCollectionName = (str) => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

// Map of canonical collection names to display titles
const DISPLAY_NAMES = {
  'age': 'Problems on Ages',
  'ages': 'Problems on Ages',
  'problems_on_ages': 'Problems on Ages',
  'percentage': 'Percentage',
  'profit_and_loss': 'Profit and Loss',
  'time_and_work': 'Time and Work',
  'time_speed_and_distance': 'Time, Speed and Distance',
  'trains': 'Problems on Trains',
  'problems_on_trains': 'Problems on Trains',
  'boats_and_streams': 'Boats and Streams',
  'ratio_and_proportion': 'Ratio and Proportion',
  'probability': 'Probability',
  'permutation_and_combination': 'Permutation and Combination',
  'simple_interest': 'Simple Interest',
  'compound_interest': 'Compound Interest',
  'number_system': 'Number System',
  'hcf_and_lcm': 'HCF and LCM',
  'mixture_and_alligation': 'Mixture and Alligation',
  'pipes_and_cisterns': 'Pipes and Cisterns',
  'average': 'Average',
  'partnership': 'Partnership',
  'calendar': 'Calendar',
  'clock': 'Clock',
  'algebra': 'Algebra',
  'surds_and_indices': 'Surds and Indices',
  'trigonometry': 'Trigonometry',
  'volume_and_surface_area': 'Volume and Surface Area',
  'stocks_and_shares': 'Stocks and Shares',
  'data_interpretation': 'Data Interpretation'
};

const DEFAULT_TOPIC_LIST = [
  'age',
  'percentage',
  'profit_and_loss',
  'time_and_work',
  'time_speed_and_distance',
  'trains',
  'boats_and_streams',
  'ratio_and_proportion',
  'probability',
  'permutation_and_combination',
  'simple_interest',
  'compound_interest',
  'number_system',
  'hcf_and_lcm',
  'mixture_and_alligation',
  'pipes_and_cisterns',
  'average',
  'partnership',
  'calendar',
  'clock',
  'algebra',
  'surds_and_indices',
  'trigonometry',
  'volume_and_surface_area',
  'stocks_and_shares',
  'data_interpretation'
];

class TopicRegistry {
  /**
   * Resolves a slug, collection name, or query string into topic metadata
   * @param {string} slugOrName
   * @returns {{ slug: string, collectionName: string, name: string }}
   */
  getTopic(slugOrName) {
    if (!slugOrName) return null;

    const raw = String(slugOrName).trim();
    const canonical = toCanonical(raw);
    const collectionName = toCollectionName(raw);
    const slug = toSlug(raw);

    // Aliases
    if (canonical === 'age' || canonical === 'ages' || canonical === 'problemsonages') {
      return {
        slug: 'age',
        collectionName: 'age',
        name: 'Problems on Ages'
      };
    }

    if (canonical === 'trains' || canonical === 'problemsontrains') {
      return {
        slug: 'trains',
        collectionName: 'trains',
        name: 'Problems on Trains'
      };
    }

    if (canonical === 'tsd') {
      return {
        slug: 'time-speed-and-distance',
        collectionName: 'time_speed_and_distance',
        name: 'Time, Speed and Distance'
      };
    }

    if (canonical === 'ci') {
      return {
        slug: 'compound-interest',
        collectionName: 'compound_interest',
        name: 'Compound Interest'
      };
    }

    if (canonical === 'si') {
      return {
        slug: 'simple-interest',
        collectionName: 'simple_interest',
        name: 'Simple Interest'
      };
    }

    if (canonical === 'pnc') {
      return {
        slug: 'permutation-and-combination',
        collectionName: 'permutation_and_combination',
        name: 'Permutation and Combination'
      };
    }

    // Direct match against known display names
    if (DISPLAY_NAMES[collectionName]) {
      return {
        slug: toSlug(collectionName),
        collectionName,
        name: DISPLAY_NAMES[collectionName]
      };
    }

    // Check if canonical matches any known topic
    for (const [key, displayName] of Object.entries(DISPLAY_NAMES)) {
      if (toCanonical(key) === canonical || toCanonical(displayName) === canonical) {
        return {
          slug: toSlug(key),
          collectionName: key,
          name: displayName
        };
      }
    }

    return null;
  }

  /**
   * Get all baseline collection names
   */
  getAllCollectionNames() {
    return [...DEFAULT_TOPIC_LIST];
  }

  /**
   * Get baseline topics metadata
   */
  getAllTopics() {
    return DEFAULT_TOPIC_LIST.map((collName) => ({
      slug: toSlug(collName),
      collectionName: collName,
      name: DISPLAY_NAMES[collName] || collName.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }));
  }
}

const topicRegistry = new TopicRegistry();

module.exports = {
  topicRegistry,
  toSlug,
  toCollectionName,
  toCanonical,
  DISPLAY_NAMES
};
