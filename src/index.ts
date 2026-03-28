import { run as runCLI } from "./cli.js";
import { main as runSimulation } from "./simulation.js";

if (process.argv.includes("--interactive")) {
  runCLI();
} else {
  runSimulation().then(() => process.exit(0));
}
