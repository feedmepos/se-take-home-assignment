/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
