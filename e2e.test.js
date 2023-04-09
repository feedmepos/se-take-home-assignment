const { exec } = require('child_process');

describe('Order Processing System', () => {
  let childProcess;

  beforeAll(() => {
    childProcess = exec('node app.js');
  });

  afterAll(() => {
    childProcess.kill();
  });

  test('Welcome', (done) => {
    const expectedOutput = 'Please enter a command (n for normal order, v for VIP order, + to add bot, - to remove bot, show to display bots, p to show pending orders, exit to exit): \n';
    childProcess.stdout.once('data', (data) => {
      expect(data.toString()).toBe(expectedOutput);
    });
  });

  test('Adding Normal Order', (done) => {
    const expectedOutput = 'New Normal order added with order number 1 and status PENDING\n';
    childProcess.stdin.write('n\n');
    childProcess.stdout.once('data', (data) => {
      expect(data.toString()).toBe(expectedOutput);
      done();
    });
  });

  test('Adding VIP Order', (done) => {
    const expectedOutput = 'New VIP order added with order number 2 and status PENDING\n';
    childProcess.stdin.write('v\n');
    childProcess.stdout.once('data', (data) => {
      expect(data.toString()).toBe(expectedOutput);
      done();
    });
  });

  test('Adding Bot', (done) => {
    const expectedOutput = 'New bot added with number 1\n';
    childProcess.stdin.write('+\n');
    childProcess.stdout.once('data', (data) => {
      expect(data.toString()).toBe(expectedOutput);
      done();
    });
  }, 10000);

  // test('Removing Bot', (done) => {
  //   const expectedOutput = 'Bot 1 was removed while idle\n';
  //   childProcess.stdin.write('-\n');
  //   childProcess.stdout.once('data', (data) => {
  //     expect(data.toString()).toBe(expectedOutput);
  //     done();
  //   });
  // });

  // test('Showing Bots', (done) => {
  //   const expectedOutput = 'There are no bots\n';
  //   childProcess.stdin.write('show\n');
  //   childProcess.stdout.once('data', (data) => {
  //     expect(data.toString()).toBe(expectedOutput);
  //     done();
  //   });
  // });

  // test('Showing Pending Orders', (done) => {
  //   const expectedOutput = 'Order No : 2(VIP) \n';
  //   childProcess.stdin.write('p\n');
  //   childProcess.stdout.once('data', (data) => {
  //     expect(data.toString()).toBe(expectedOutput);
  //     done();
  //   });
  // });
});
