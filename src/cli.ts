import { runDemoScenario } from './scenarios/demo-scenario';
import { runInteractiveCli } from './interactive-cli';

declare const process: {
  argv: string[];
};

export function main(): void {
  if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
    runInteractiveCli();
    return;
  }

  const lines = runDemoScenario();
  console.log(lines.join('\n'));
}

main();
