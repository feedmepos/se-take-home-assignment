import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runDemo } from "./run-demo";

yargs(hideBin(process.argv))
    .command(
        "*",
        "Run the McDonald's order controller CLI",
        (cli) => cli.option("demo", {
            type: "boolean",
            description: "Run a scripted demo of order/bot processing",
            default: false,
        }),
        (argv) => {
            if (argv.demo) {
                runDemo();
            } else {
                console.log("No mode specified. Use --demo to run the demo scenario.");
            }
        }
    )
    .help()
    .parse();
