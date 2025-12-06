// Unit tests for helper.js

const { getTimestamp } = require('./helper');

describe('Helper functions', () => {
    test('getTimestamp should return HH:MM:SS format', () => {
        const timestamp = getTimestamp();
        expect(timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
});

