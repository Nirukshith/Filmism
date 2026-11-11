const { jsonrepair } = require('jsonrepair');

/**
 * Extracts and cleans raw JSON text from an LLM response.
 * Strips markdown code fences (```json ... ```) and extracts
 * the substring bounded by outermost { ... } or [ ... ].
 *
 * @param {string} raw
 * @returns {string}
 */
function cleanAndExtractJson(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Strip leading and trailing markdown code fences (e.g. ```json \n ... \n ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Find outermost opening brace or bracket
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let isObject = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex === -1) {
    return cleaned;
  }

  const closingChar = isObject ? '}' : ']';
  const lastIndex = cleaned.lastIndexOf(closingChar);

  // If matching closing token exists and is after startIndex, slice the range
  if (lastIndex !== -1 && lastIndex > startIndex) {
    return cleaned.slice(startIndex, lastIndex + 1);
  }

  // If truncated without closing token, return from startIndex to end so jsonrepair can complete it
  return cleaned.slice(startIndex);
}

/**
 * Parse an LLM response with resilient repair fallback.
 * Attempts native JSON.parse first; if that fails (e.g. truncated mid-request,
 * missing closing quotes/brackets, trailing commas), passes through jsonrepair.
 *
 * @param {string} raw
 * @returns {any} parsed JavaScript object or array
 * @throws {SyntaxError} if completely unrepairable
 */
function parseLLMJson(raw) {
  const extracted = cleanAndExtractJson(raw);
  if (!extracted) {
    throw new SyntaxError('Empty or invalid LLM response string');
  }

  let parsed;

  // 1. Fast path: native JSON.parse
  try {
    parsed = JSON.parse(extracted);
  } catch (initialErr) {
    // 2. Repair path: jsonrepair for mid-stream truncation & malformed syntax
    try {
      const repaired = jsonrepair(extracted);
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      const err = new SyntaxError(`Malformed and unrepairable LLM JSON: ${repairErr.message}`);
      err.originalText = raw;
      throw err;
    }
  }

  // Structured LLM responses must resolve to an object or array, not a primitive string or number
  if (parsed === null || typeof parsed !== 'object') {
    throw new SyntaxError('Expected JSON object or array from LLM response');
  }

  return parsed;
}

module.exports = {
  cleanAndExtractJson,
  parseLLMJson,
};
