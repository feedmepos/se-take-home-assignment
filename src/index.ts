const isHeadless = process.argv.includes('--headless') || process.argv.includes('-h');

(async () => {
  if (isHeadless) {
    await import('./cli/headless.js');
  } else {
    await import('./cli/interactive/index.js');
  }
})();
