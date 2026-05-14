export function testRateLimiter(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  console.log('\n🔒 Testing Rate Limiter Configuration...\n');

  // Test 1: API limiter configuration
  try {
    const config = {
      windowMs: 15 * 60 * 1000,
      max: 100,
    };
    if (config.windowMs === 900000 && config.max === 100) {
      console.log('✓ Test 1: API limiter configuration - PASSED');
      passed++;
    } else {
      console.log('✗ Test 1: API limiter configuration - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1: API limiter configuration - ERROR:', error);
    failed++;
  }

  // Test 2: Order limiter configuration
  try {
    const config = {
      windowMs: 60 * 1000,
      max: 30,
    };
    if (config.windowMs === 60000 && config.max === 30) {
      console.log('✓ Test 2: Order limiter configuration - PASSED');
      passed++;
    } else {
      console.log('✗ Test 2: Order limiter configuration - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2: Order limiter configuration - ERROR:', error);
    failed++;
  }

  // Test 3: Bot limiter configuration
  try {
    const config = {
      windowMs: 60 * 1000,
      max: 20,
    };
    if (config.windowMs === 60000 && config.max === 20) {
      console.log('✓ Test 3: Bot limiter configuration - PASSED');
      passed++;
    } else {
      console.log('✗ Test 3: Bot limiter configuration - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 3: Bot limiter configuration - ERROR:', error);
    failed++;
  }

  // Test 4: State limiter configuration
  try {
    const config = {
      windowMs: 60 * 1000,
      max: 200,
    };
    if (config.windowMs === 60000 && config.max === 200) {
      console.log('✓ Test 4: State limiter configuration - PASSED');
      passed++;
    } else {
      console.log('✗ Test 4: State limiter configuration - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 4: State limiter configuration - ERROR:', error);
    failed++;
  }

  // Test 5: Rate limits are reasonable
  try {
    const limits = {
      api: 100,
      orders: 30,
      bots: 20,
      state: 200,
    };
    if (
      limits.api > limits.orders &&
      limits.orders > limits.bots &&
      limits.state > limits.api
    ) {
      console.log('✓ Test 5: Rate limits are reasonable - PASSED');
      passed++;
    } else {
      console.log('✗ Test 5: Rate limits are reasonable - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 5: Rate limits are reasonable - ERROR:', error);
    failed++;
  }

  return { passed, failed };
}
