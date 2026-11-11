const { cleanAndExtractJson, parseLLMJson } = require('../../utils/llmJsonParser');

describe('LLM JSON Parser & Repair Unit Tests', () => {
  describe('cleanAndExtractJson', () => {
    it('should strip markdown code fences with json language identifier', () => {
      const raw = '```json\n{"title": "Arrival", "mood": ["contemplative"]}\n```';
      const cleaned = cleanAndExtractJson(raw);
      expect(cleaned).toBe('{"title": "Arrival", "mood": ["contemplative"]}');
    });

    it('should strip markdown code fences without language tag', () => {
      const raw = '```\n{"title": "Arrival"}\n```';
      const cleaned = cleanAndExtractJson(raw);
      expect(cleaned).toBe('{"title": "Arrival"}');
    });

    it('should extract JSON block when surrounded by conversational text', () => {
      const raw = 'Here is the analysis:\n{"themes": ["existentialism"]}\nHope this helps!';
      const cleaned = cleanAndExtractJson(raw);
      expect(cleaned).toBe('{"themes": ["existentialism"]}');
    });

    it('should handle unclosed truncated strings by returning from first open bracket', () => {
      const raw = 'Here is the JSON:\n{"themes": ["dystopian", "cyberpunk';
      const cleaned = cleanAndExtractJson(raw);
      expect(cleaned).toBe('{"themes": ["dystopian", "cyberpunk');
    });

    it('should return empty string on null or non-string input', () => {
      expect(cleanAndExtractJson(null)).toBe('');
      expect(cleanAndExtractJson(undefined)).toBe('');
      expect(cleanAndExtractJson(123)).toBe('');
    });
  });

  describe('parseLLMJson', () => {
    it('should parse standard clean JSON without errors', () => {
      const input = '{"themes": ["noir", "crime"], "pacing": "slow-burn"}';
      const result = parseLLMJson(input);
      expect(result).toEqual({
        themes: ['noir', 'crime'],
        pacing: 'slow-burn',
      });
    });

    it('should strip markdown fences and parse clean JSON', () => {
      const input = '```json\n{"name": "Neo-Noir", "movieIds": [101, 202]}\n```';
      const result = parseLLMJson(input);
      expect(result).toEqual({
        name: 'Neo-Noir',
        movieIds: [101, 202],
      });
    });

    it('should salvage truncated JSON cut off mid-array', () => {
      const truncated = '{"themes": ["existential", "alienation';
      const result = parseLLMJson(truncated);
      expect(result).toEqual({
        themes: ['existential', 'alienation'],
      });
    });

    it('should salvage truncated JSON cut off mid-object in an array of clusters', () => {
      const truncated = '{"clusters": [{"clusterId": "c1", "name": "Sci-Fi", "movieIds": [42, 99';
      const result = parseLLMJson(truncated);
      expect(result).toEqual({
        clusters: [
          { clusterId: 'c1', name: 'Sci-Fi', movieIds: [42, 99] },
        ],
      });
    });

    it('should fix trailing commas and minor syntax flaws', () => {
      const flawed = '{"themes": ["dark", "psychological",], "pacing": "fast-paced",}';
      const result = parseLLMJson(flawed);
      expect(result).toEqual({
        themes: ['dark', 'psychological'],
        pacing: 'fast-paced',
      });
    });

    it('should throw SyntaxError when string is completely unrepairable', () => {
      expect(() => parseLLMJson('Total nonsense without any braces')).toThrow(SyntaxError);
      expect(() => parseLLMJson('')).toThrow(SyntaxError);
    });
  });
});
