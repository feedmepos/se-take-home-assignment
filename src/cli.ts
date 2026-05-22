import { runSimulation } from "./simulation/runSimulation";

function main(): void {
  const output = runSimulation();
  process.stdout.write(`${output}\n`);
}

if (require.main === module) {
  main();
}
