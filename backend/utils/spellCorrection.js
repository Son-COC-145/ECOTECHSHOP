/**
 * Spell Correction Utility với Levenshtein Distance
 * Tự động gợi ý từ khóa đúng khi user gõ sai
 */

// Levenshtein Distance Algorithm
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Dictionary - Các từ khóa phổ biến trong hệ thống
const COMMON_KEYWORDS = [
  // Brands
  'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'huawei', 'nokia',
  'apple', 'macbook', 'asus', 'dell', 'hp', 'lenovo', 'acer', 'msi',
  
  // Product types
  'điện thoại', 'laptop', 'máy tính', 'tai nghe', 'đồng hồ', 'tablet', 
  'ipad', 'smartwatch', 'airpods', 'earbud', 'headphone',
  'chuột', 'bàn phím', 'màn hình', 'sạc', 'cáp',
  
  // Common attributes
  'pro', 'max', 'plus', 'mini', 'ultra', 'lite', 'standard',
  'gaming', 'wireless', 'bluetooth', 'chống nước', 'chống bụi',
  
  // Colors
  'đen', 'trắng', 'xám', 'vàng', 'xanh', 'đỏ', 'hồng', 'tím',
  'black', 'white', 'gray', 'gold', 'blue', 'red', 'pink', 'purple',
  
  // Storage
  '64gb', '128gb', '256gb', '512gb', '1tb', '2tb',
  
  // Common typos mapping
  'fone', 'phon', 'aiphone', 'aifon', 'ifone', 'samsumg', 'samsug',
  'xiaomii', 'xiami', 'macbok', 'macook', 'ipad',
];

// Thêm variations và normalize
const KEYWORD_DICTIONARY = new Set();
COMMON_KEYWORDS.forEach(word => {
  KEYWORD_DICTIONARY.add(word.toLowerCase());
  KEYWORD_DICTIONARY.add(word.toUpperCase());
  KEYWORD_DICTIONARY.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
});

/**
 * Tìm từ gần nhất trong dictionary
 */
function findClosestMatch(word, maxDistance = 2) {
  const wordLower = word.toLowerCase();
  let closestMatch = null;
  let minDistance = Infinity;

  for (const dictWord of KEYWORD_DICTIONARY) {
    const distance = levenshteinDistance(wordLower, dictWord.toLowerCase());
    
    // Chỉ suggest nếu:
    // 1. Distance <= maxDistance
    // 2. Độ dài từ tương đương (+-2 chars)
    const lengthDiff = Math.abs(word.length - dictWord.length);
    
    if (distance <= maxDistance && lengthDiff <= 2 && distance < minDistance) {
      minDistance = distance;
      closestMatch = dictWord;
    }
  }

  return { suggestion: closestMatch, distance: minDistance };
}

/**
 * Correct entire query
 */
function correctQuery(query) {
  const words = query.trim().split(/\s+/);
  const corrections = [];
  let hasCorrected = false;

  for (const word of words) {
    // Skip very short words
    if (word.length < 3) {
      corrections.push(word);
      continue;
    }

    // Check if word needs correction
    if (!KEYWORD_DICTIONARY.has(word.toLowerCase())) {
      const { suggestion, distance } = findClosestMatch(word);
      
      if (suggestion && distance > 0) {
        corrections.push(suggestion);
        hasCorrected = true;
      } else {
        corrections.push(word);
      }
    } else {
      corrections.push(word);
    }
  }

  return {
    original: query,
    corrected: corrections.join(' '),
    hasCorrected,
    similarity: hasCorrected ? 
      1 - (corrections.filter((w, i) => w !== words[i]).length / words.length) : 
      1.0
  };
}

/**
 * Get suggestions for autocomplete
 */
function getSuggestions(partial, maxSuggestions = 5) {
  const partialLower = partial.toLowerCase();
  const suggestions = [];

  for (const word of KEYWORD_DICTIONARY) {
    if (word.toLowerCase().startsWith(partialLower)) {
      suggestions.push(word);
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  return suggestions;
}

module.exports = {
  levenshteinDistance,
  findClosestMatch,
  correctQuery,
  getSuggestions,
  KEYWORD_DICTIONARY
};
