const { sanitizeProfile } = require('../../services/aiService');
const { parseLLMJson } = require('../../utils/llmJsonParser');
const { tasteClustersLLMSchema } = require('../../validators/llmValidators');

describe('LLM Resilience & Mid-Request Cutoff Handling', () => {
  it('should salvage a film analysis payload cut off mid-stream at 95% completion', () => {
    // Simulated LLM output that abruptly terminates right before closing braces
    const truncatedLLMStream = `\`\`\`json
{
  "themes": ["cyberpunk", "existential dread", "corporate hegemony"],
  "mood": ["dystopian", "gritty", "neon-lit"],
  "narrativeStyle": ["elliptical", "slow-burn"],
  "visualAesthetic": ["high-contrast anamorphic", "rain-soaked neon"],
  "pacing": "slow-burn",
  "emotionalTone": ["melancholic", "haunting"],
  "aiSummary": "A contemplative neo-noir diving into synthetic identity`;

    // 1. Parser repairs the JSON
    const parsed = parseLLMJson(truncatedLLMStream);
    expect(parsed).toBeDefined();
    expect(parsed.themes).toHaveLength(3);
    expect(parsed.aiSummary).toBe('A contemplative neo-noir diving into synthetic identity');

    // 2. Zod validates and applies sensible defaults for missing fields
    const sanitized = sanitizeProfile(parsed, { originCountries: ['US'] });
    expect(sanitized.themes).toContain('cyberpunk');
    expect(sanitized.culturalTradition).toBe('US');
    expect(sanitized.pacing).toBe('slow-burn');
  });

  it('should salvage taste cluster payload truncated mid-cluster', () => {
    // Simulated LLM cluster output truncated while writing movie IDs
    const truncatedClustersStream = `{
      "clusters": [
        {
          "clusterId": "c_1",
          "name": "Slow-Burn Psychological Tension",
          "description": "Explores paranoia and dread.",
          "movieIds": [42, 108
    `;

    const parsed = parseLLMJson(truncatedClustersStream);
    const validated = tasteClustersLLMSchema.parse(parsed);

    expect(validated.clusters).toHaveLength(1);
    expect(validated.clusters[0].movieIds).toEqual([42, 108]);
    expect(validated.clusters[0].name).toBe('Slow-Burn Psychological Tension');
    expect(validated.overallTasteSynthesis).toBeDefined();
  });
});
