import { REFRESH_TUI_MS } from "../constants";
import { BotController } from "../controllers";
import { Logger, tailFile } from "../libs";
import { formatBots, formatOrders, formatStats } from "./formatters";
import { createLayout } from "./layout";

export const runTui = () => {
    const logger = new Logger(true);
    const botController = new BotController(logger);
    const { orderController } = botController;

    botController.addBot();
    botController.addBot();

    const { screen, header, ordersBox, botsBox, logBox } = createLayout(botController);

    const refresh = () => {
        header.setContent(formatStats(botController));
        ordersBox.setContent(formatOrders(orderController.findAll()));
        botsBox.setContent(formatBots(botController.findAll()));

        screen.render();
    };

    const timer = setInterval(refresh, REFRESH_TUI_MS);
    const stopTail = tailFile(logger.filePath, (line) => {
        logBox.log(line);
        screen.render();
    });

    const shutdown = () => {
        clearInterval(timer);
        stopTail();
        screen.destroy();
        process.exit(0);
    };

    screen.key(["q", "C-c"], shutdown);
    screen.key("n", () => orderController.create("Normal"));
    screen.key("v", () => orderController.create("VIP"));
    screen.key("b", () => botController.addBot());
    screen.key("r", () => botController.removeNewestBot());

    screen.render();
};
