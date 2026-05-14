import { logger } from '../utils/logger.js';

export function testLogger(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  console.log('\n📝 Testing Logger...\n');

  // Test 1: Logger has required methods
  try {
    const methods = [
      'info',
      'error',
      'warn',
      'success',
      'logOrderCreated',
      'logOrderCompleted',
      'logBotCreated',
      'logBotRemoved',
      'logSystemReset',
      'saveToFile',
    ];
    const hasAllMethods = methods.every((method) => typeof logger[method as keyof typeof logger] === 'function');
    if (hasAllMethods) {
      console.log('✓ Test 1: Logger has required methods - PASSED');
      passed++;
    } else {
      console.log('✗ Test 1: Logger has required methods - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1: Logger has required methods - ERROR:', error);
    failed++;
  }

  // Test 2: Logger can log info
  try {
    logger.info('Test info message');
    console.log('✓ Test 2: Logger can log info - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 2: Logger can log info - ERROR:', error);
    failed++;
  }

  // Test 3: Logger can log error
  try {
    logger.error('Test error message');
    console.log('✓ Test 3: Logger can log error - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 3: Logger can log error - ERROR:', error);
    failed++;
  }

  // Test 4: Logger can log warning
  try {
    logger.warn('Test warning message');
    console.log('✓ Test 4: Logger can log warning - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 4: Logger can log warning - ERROR:', error);
    failed++;
  }

  // Test 5: Logger can log success
  try {
    logger.success('Test success message');
    console.log('✓ Test 5: Logger can log success - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 5: Logger can log success - ERROR:', error);
    failed++;
  }

  // Test 6: Logger can log order created
  try {
    logger.logOrderCreated(1, 'NORMAL');
    console.log('✓ Test 6: Logger can log order created - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 6: Logger can log order created - ERROR:', error);
    failed++;
  }

  // Test 7: Logger can log order completed
  try {
    logger.logOrderCompleted(1);
    console.log('✓ Test 7: Logger can log order completed - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 7: Logger can log order completed - ERROR:', error);
    failed++;
  }

  // Test 8: Logger can log bot created
  try {
    logger.logBotCreated(1);
    console.log('✓ Test 8: Logger can log bot created - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 8: Logger can log bot created - ERROR:', error);
    failed++;
  }

  // Test 9: Logger can log bot removed
  try {
    logger.logBotRemoved(1);
    console.log('✓ Test 9: Logger can log bot removed - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 9: Logger can log bot removed - ERROR:', error);
    failed++;
  }

  // Test 10: Logger can log system reset
  try {
    logger.logSystemReset();
    console.log('✓ Test 10: Logger can log system reset - PASSED');
    passed++;
  } catch (error) {
    console.log('✗ Test 10: Logger can log system reset - ERROR:', error);
    failed++;
  }

  return { passed, failed };
}
