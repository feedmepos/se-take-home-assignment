import { testOrderManager } from './orderManager.test.js';
import { testRateLimiter } from './rateLimiter.test.js';
import { testLogger } from './logger.test.js';

export async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  McDonald\'s Order Management System - Test Suite           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let totalPassed = 0;
  let totalFailed = 0;

  // Run OrderManager tests
  const orderManagerResults = testOrderManager();
  totalPassed += orderManagerResults.passed;
  totalFailed += orderManagerResults.failed;

  // Run Rate Limiter tests
  const rateLimiterResults = testRateLimiter();
  totalPassed += rateLimiterResults.passed;
  totalFailed += rateLimiterResults.failed;

  // Run Logger tests
  const loggerResults = testLogger();
  totalPassed += loggerResults.passed;
  totalFailed += loggerResults.failed;

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total Tests: ${totalPassed + totalFailed}`);
  console.log(`  ✓ Passed: ${totalPassed}`);
  console.log(`  ✗ Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n  🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n  ❌ ${totalFailed} test(s) failed\n`);
    process.exit(1);
  }
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
