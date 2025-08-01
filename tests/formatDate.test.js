const formatDate = require('../assets/js/formatDate');
const assert = require('assert');
const test = require('node:test');

test('formatDate returns a non-empty string containing 2025', () => {
  const result = formatDate('2025-07-15');
  assert.strictEqual(typeof result, 'string');
  assert.notStrictEqual(result.length, 0);
  assert.ok(result.includes('2025'));
});
