import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let indonesianDictCache = null;
let dictionaryLoadPromise = null;

/**
 * Parse hunspell .dic file and extract base words
 * Format: first line = count, subsequent lines = word [flags]
 */
function parseDictionary(dicContent) {
  const lines = dicContent.split('\n').slice(1); // Skip count line
  const words = new Set();
  const groups = new Map();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    // Extract base word (before any space/tab)
    const baseWord = line.split(/[\s/]/)[0].toLowerCase();
    if (baseWord.length > 0) {
      words.add(baseWord);
      const firstChar = baseWord[0];
      if (firstChar) {
        if (!groups.has(firstChar)) {
          groups.set(firstChar, []);
        }
        groups.get(firstChar).push(baseWord);
      }
    }
  }
  
  words.groupedByFirstChar = groups;
  return words;
}

/**
 * Load Indonesian hunspell dictionary
 * Returns a Set of valid Indonesian words for spell checking
 */
export async function loadIndonesianDictionary() {
  // If already loaded, return cached version
  if (indonesianDictCache) {
    return indonesianDictCache;
  }

  // If loading is in progress, wait for it
  if (dictionaryLoadPromise) {
    return dictionaryLoadPromise;
  }

  dictionaryLoadPromise = (async () => {
    try {
      const dicPath = path.join(__dirname, '../../hunspell-id/id_ID.dic');
      
      if (!fs.existsSync(dicPath)) {
        console.warn(`Hunspell dictionary not found at ${dicPath}`);
        return new Set();
      }

      const dicContent = fs.readFileSync(dicPath, 'utf8');
      indonesianDictCache = parseDictionary(dicContent);
      
      console.log(`✅ Loaded Indonesian dictionary: ${indonesianDictCache.size} words`);
      return indonesianDictCache;
    } catch (error) {
      console.error('Error loading Indonesian dictionary:', error);
      return new Set();
    }
  })();

  return dictionaryLoadPromise;
}

/**
 * Check if a word exists in the Indonesian dictionary
 */
export async function isValidIndonesianWord(word) {
  const dict = await loadIndonesianDictionary();
  return dict.has(word.toLowerCase());
}

/**
 * Find potential corrections from dictionary for a misspelled word
 * Uses fuzzy matching with higher tolerance for severely distorted words
 */
export async function findCorrections(word, maxDistance = 2) {
  const dict = await loadIndonesianDictionary();
  if (dict.size === 0) return [];
  
  return findFuzzyMatches(word, dict, maxDistance);
}

/**
 * Calculate Levenshtein distance between two strings with transposition support
 */
function editDistance(s1, s2) {
  const a = s1.length;
  const b = s2.length;
  const dp = Array(a + 1)
    .fill(null)
    .map(() => Array(b + 1).fill(0));

  for (let i = 0; i <= a; i++) dp[i][0] = i;
  for (let j = 0; j <= b; j++) dp[0][j] = j;

  for (let i = 1; i <= a; i++) {
    for (let j = 1; j <= b; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }

      // Adjacent transposition: bnoeka -> boneka
      if (
        i > 1 &&
        j > 1 &&
        s1[i - 1] === s2[j - 2] &&
        s1[i - 2] === s2[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[a][b];
}

/**
 * Find fuzzy matches for words NOT in dictionary
 * Uses stricter criteria to avoid false positives
 */
function findFuzzyMatches(word, dict, maxDistance = 2) {
  const lowerWord = word.toLowerCase();
  const candidates = [];

  // Only attempt fuzzy matching for words that look like they have genuine typos
  // Criteria: word is 5+ characters, or very short words with common patterns
  if (lowerWord.length < 5 && lowerWord.length > 3) {
    // Short words (4-5 chars): only use distance 1
    maxDistance = 1;
  } else if (lowerWord.length <= 3) {
    // Don't fuzzy match very short words
    return [];
  }
  
  const firstChar = lowerWord[0];
  if (!firstChar) return [];

  // Look up words starting with the same first character
  // Also include the second character group to support transposition at the beginning (e.g. obneka -> boneka)
  const searchGroups = new Set();
  searchGroups.add(firstChar);
  if (lowerWord.length > 1) {
    searchGroups.add(lowerWord[1]);
  }

  const candidatesList = [];
  const groups = dict.groupedByFirstChar;

  if (groups) {
    for (const char of searchGroups) {
      const groupWords = groups.get(char);
      if (groupWords) {
        for (const w of groupWords) {
          candidatesList.push(w);
        }
      }
    }
  } else {
    // Fallback if groups are not built
    candidatesList.push(...dict);
  }
  
  for (const candidate of candidatesList) {
    if (candidate === lowerWord) continue;
    
    // Length must be similar (within 2 characters)
    const lenDiff = Math.abs(lowerWord.length - candidate.length);
    if (lenDiff > 2) continue;
    
    const distance = editDistance(lowerWord, candidate);
    
    // Apply different thresholds based on word length
    let threshold = maxDistance;
    if (lowerWord.length > 10) {
      threshold = 2; // Longer words can have up to 2 errors
    } else if (lowerWord.length > 6) {
      threshold = 1.5; // Medium words use 1.5 threshold
    } else {
      threshold = 1; // Short words must be closer
    }
    
    if (distance <= threshold) {
      const score = distance + lenDiff * 0.3;
      candidates.push({ word: candidate, distance, score });
    }
  }

  // Sort by score and return top candidate only if it's a clear match
  candidates.sort((a, b) => a.score - b.score);
  
  // Only return if the best match is significantly better than average
  if (candidates.length > 0 && candidates[0].score < 1.5) {
    return candidates.slice(0, 1).map(c => c.word);
  }
  
  return [];
}
