import { RealClock } from "./engine/clock";
import { runDemo } from "./scenarios/demoScenario";

async function main() {
  await runDemo(new RealClock());
}

void main();
