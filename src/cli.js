const readline = require('readline');

const {
  printTitle,
  newNormalOrder,
  newVIPOrder,
  addBot,
  removeBot,
  printFinalSummary,
  showOrderStatus
} = require('./index');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log(`
=== Menu ===
1. New Normal Order
2. New VIP Order
3. + Bot
4. - Bot
5. View Orders Status
6. Exit

Please select an option (1–6):
`);
}

function handleInput(choice) {
  switch (choice.trim()) {
    case '1':
      newNormalOrder();
      break;
    case '2':
      newVIPOrder();
      break;
    case '3':
      addBot();
      break;
    case '4':
      removeBot();
      break;
    case '5':
      showOrderStatus();
      break;
    case '6':
      printFinalSummary();
      console.log('Exiting system...');
      rl.close();
      process.exit(0);
    default:
      console.log('Invalid option. Please choose again.');
  }

  showMenu();
}

function startCLI() {
  printTitle();
  showMenu();
  rl.on('line', handleInput);
}

startCLI();
