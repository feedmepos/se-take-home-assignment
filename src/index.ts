import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runDemo } from "./run-demo";
import { runTui } from "./tui/dashboard";

yargs(hideBin(process.argv))
    .command(
        "*",
        "Run the McDonald's order controller CLI",
        (cli) => cli
            .option("demo", {
                type: "boolean",
                description: "Run a scripted demo of order/bot processing",
                default: false,
            })
            .option("tui", {
                type: "boolean",
                description: "Launch the interactive terminal dashboard",
                default: false,
            }),
        (argv) => {
            if (argv.tui) {
                runTui();
            } else if (argv.demo) {
                runDemo();
            } else {
                console.log("No mode specified. Use --demo to run the demo scenario or --tui to launch the interactive dashboard.");
            }
        }
    )
    .help()
    .parse();
