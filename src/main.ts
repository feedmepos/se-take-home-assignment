import { runSimulation } from './cli/simulation';
import { startServer } from './server';

async function main() {
  // Check if running in CLI mode
  const args = process.argv.slice(2);
  const isCliMode = args.includes('--cli');

  if (isCliMode) {
    console.log('Running in CLI mode...\n');
    await runSimulation();
    process.exit(0);
  } else {
    // Start API server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    startServer(port);
  }
}

// Run the application
main().catch((error) => {
  console.error('Application error:', error);
  process.exit(1);
});
