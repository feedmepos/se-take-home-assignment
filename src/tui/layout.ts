import blessed from "blessed";
import { BotController } from "../controllers";
import { formatBots, formatOrders, formatStats } from "./formatters";
import { DashboardLayout } from "../models";


export const createLayout = (botController: BotController): DashboardLayout => {
    const { orderController } = botController;

    const screen = blessed.screen({
        smartCSR: false,
        title: "McDonald's Order Management",
        terminal: "xterm",
    });

    const header = blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        width: "100%",
        height: 3,
        border: { type: "line" },
        label: " McDonald's Order Management — Interactive Mode ",
        content: formatStats(botController),
    });

    const ordersBox = blessed.box({
        parent: screen,
        top: 3,
        left: 0,
        width: "50%",
        height: "100%-14",
        border: { type: "line" },
        label: " Orders ",
        style: { border: { fg: "cyan" } },
        content: formatOrders(orderController.findAll()),
        scrollable: true,
        tags: false,
    });

    const botsBox = blessed.box({
        parent: screen,
        top: 3,
        left: "50%",
        width: "50%",
        height: "100%-14",
        border: { type: "line" },
        label: " Bots ",
        style: { border: { fg: "magenta" } },
        content: formatBots(botController.findAll()),
        scrollable: true,
    });

    const logBox = blessed.log({
        parent: screen,
        bottom: 1,
        left: 0,
        width: "100%",
        height: 10,
        border: { type: "line" },
        label: " Activity Log ",
        scrollback: 200,
    });

    blessed.box({
        parent: screen,
        bottom: 0,
        left: 0,
        width: "100%",
        height: 1,
        content: "[n] New Normal Order  [v] New VIP Order  [b] Add Bot  [r] Remove Newest Bot  [q] Quit",
        style: { fg: "grey" },
    });

    return { screen, header, ordersBox, botsBox, logBox };
};
