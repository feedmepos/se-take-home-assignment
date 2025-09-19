import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * FeedMe - CLI prototype for FeedMe order controller (Java).
 *
 * Usage:
 *  javac FeedMe.java
 *  java FeedMe
 *
 * Commands inside program:
 *  n  -> New Normal Order
 *  v  -> New VIP Order
 *  +  -> Add Bot
 *  -  -> Remove newest Bot
 *  s  -> Show status (PENDING, COMPLETE, BOTS)
 *  q  -> Quit
 *
 * Notes:
 *  - Each order processing time is PROCESS_TIME_MS (default 10_000 ms = 10s).
 *  - When removing a bot, if it is processing an order, the bot is interrupted
 *    and the processing order is returned to the PENDING queue (front of its priority group).
 */
public class FeedMe {

    public static void main(String[] args) throws Exception {
        System.out.println("FeedMe CLI prototype (Java)");
        System.out.println("Commands: n (normal order), v (VIP order), + (add bot), - (remove bot), s (status), q (quit)");
        OrderController controller = new OrderController();

        Scanner scanner = new Scanner(System.in);
        while (true) {
            String line = scanner.nextLine().trim();
            if (line.isEmpty()) continue;
            char cmd = line.charAt(0);
            switch (cmd) {
                case 'n':
                case 'N':
                    controller.createOrder(OrderType.NORMAL);
                    break;
                case 'v':
                case 'V':
                    controller.createOrder(OrderType.VIP);
                    break;
                case '+':
                    controller.addBot();
                    break;
                case '-':
                    controller.removeBot();
                    break;
                case 's':
                case 'S':
                    controller.printStatus();
                    break;
                case 'q':
                case 'Q':
                    System.out.println("Shutting down: removing all bots and exiting...");
                    controller.shutdownAllBots();
                    System.exit(0);
                    break;
                default:
                    System.out.println("Unknown command.");
            }
        }
    }

    // Order types
    enum OrderType { NORMAL, VIP }

    // Order status
    enum OrderStatus { PENDING, PROCESSING, COMPLETE }

    // Order model
    static class Order {
        final int id;
        final OrderType type;
        volatile OrderStatus status;

        Order(int id, OrderType type) {
            this.id = id;
            this.type = type;
            this.status = OrderStatus.PENDING;
        }

        @Override
        public String toString() {
            return String.format("#%d[%s][%s]", id, type, status);
        }
    }

    // Bot worker thread
    static class Bot extends Thread {
        private final int botId;
        private final OrderController controller;
        private volatile boolean stopped = false;
        private volatile Order currentOrder = null;

        Bot(int botId, OrderController controller) {
            super("Bot-" + botId);
            this.botId = botId;
            this.controller = controller;
        }

        public int getBotId() { return botId; }

        public String getStatusString() {
            if (currentOrder == null) return "IDLE";
            return "PROCESSING " + currentOrder.toString();
        }

        // signal to stop this bot
        public void shutdown() {
            stopped = true;
            this.interrupt();
        }

        @Override
        public void run() {
            try {
                while (!stopped) {
                    // Fetch next order (blocks until available or interrupted)
                    Order order = controller.fetchNextOrderBlocking();
                    if (order == null) {
                        // returned null -> likely shutting down
                        break;
                    }
                    currentOrder = order;
                    order.status = OrderStatus.PROCESSING;
                    controller.log(String.format("Bot-%d picked %s", botId, order));

                    // Process: sleep for PROCESS_TIME_MS, but if interrupted -> stop processing and return order
                    long remaining = controller.PROCESS_TIME_MS;
                    long start = System.currentTimeMillis();
                    try {
                        Thread.sleep(remaining);
                        // finished normally
                        order.status = OrderStatus.COMPLETE;
                        controller.completeOrder(order);
                        controller.log(String.format("Bot-%d completed %s", botId, order));
                    } catch (InterruptedException ie) {
                        // Interrupted during processing: return order to pending and exit if stopped
                        controller.log(String.format("Bot-%d interrupted while processing %s", botId, order));
                        if (order.status == OrderStatus.PROCESSING) {
                            // return order to pending (front of its priority group)
                            controller.returnOrder(order);
                        }
                        currentOrder = null;
                        if (stopped) break;
                    } finally {
                        currentOrder = null;
                    }
                    // loop to pick next order
                }
            } catch (InterruptedException e) {
                // Interrupted while waiting for order -> exit
                controller.log(String.format("Bot-%d interrupted while waiting (exiting)", botId));
            } finally {
                controller.log(String.format("Bot-%d stopped", botId));
            }
        }
    }

    // Controller: maintains pending queue, complete list and bots
    static class OrderController {
        // 10s per requirement. Change for quicker testing if desired.
        final long PROCESS_TIME_MS = 10_000L;

        private final AtomicInteger orderCounter = new AtomicInteger(0);
        private final AtomicInteger botCounter = new AtomicInteger(0);

        // pending orders: VIPs should be ahead of normals.
        // We'll store as LinkedList; maintain invariant: VIPs are at the front segment.
        private final LinkedList<Order> pending = new LinkedList<>();

        // completed orders
        private final List<Order> complete = new ArrayList<>();

        // active bots (in creation order). newest bot is last.
        private final List<Bot> bots = new ArrayList<>();

        // used for synchronizing pending queue and notify bots
        private final Object pendingLock = new Object();

        // create order (common)
        public void createOrder(OrderType type) {
            Order o = new Order(orderCounter.incrementAndGet(), type);
            synchronized (pendingLock) {
                if (type == OrderType.NORMAL) {
                    pending.addLast(o);
                } else {
                    // insert VIP after existing VIPs (i.e., at end of VIP segment),
                    // so new VIPs queue behind existing VIPs.
                    int vipCount = 0;
                    for (Order p : pending) {
                        if (p.type == OrderType.VIP) vipCount++;
                        else break;
                    }
                    pending.add(vipCount, o);
                }
                log(String.format("Created %s", o));
                // notify bots that an order is available
                pendingLock.notifyAll();
            }
        }

        // convenience wrappers
        public void createOrder(String type) {
            createOrder("VIP".equalsIgnoreCase(type) ? OrderType.VIP : OrderType.NORMAL);
        }

        public void addBot() {
            Bot b;
            synchronized (this) {
                int id = botCounter.incrementAndGet();
                b = new Bot(id, this);
                bots.add(b);
            }
            b.start();
            log(String.format("Added Bot-%d", b.getBotId()));
            // wake up bots to process pending orders immediately
            synchronized (pendingLock) { pendingLock.notifyAll(); }
        }

        public void removeBot() {
            Bot toRemove = null;
            synchronized (this) {
                if (bots.isEmpty()) {
                    System.out.println("No bot to remove.");
                    return;
                }
                // newest bot is last
                toRemove = bots.remove(bots.size() - 1);
            }
            // shutdown newest bot
            log(String.format("Removing Bot-%d", toRemove.getBotId()));
            toRemove.shutdown();
            try {
                toRemove.join(2000); // wait briefly
            } catch (InterruptedException ignored) {}
        }

        public void shutdownAllBots() {
            List<Bot> snapshot;
            synchronized (this) {
                snapshot = new ArrayList<>(bots);
                bots.clear();
            }
            for (Bot b : snapshot) {
                b.shutdown();
            }
            for (Bot b : snapshot) {
                try {
                    b.join(2000);
                } catch (InterruptedException ignored) {}
            }
        }

        // Fetch next order: blocking until an order is available or thread interrupted
        public Order fetchNextOrderBlocking() throws InterruptedException {
            synchronized (pendingLock) {
                while (pending.isEmpty()) {
                    // go idle until new order or interrupted
                    pendingLock.wait();
                }
                // take first (VIPs at front)
                Order o = pending.removeFirst();
                o.status = OrderStatus.PROCESSING;
                return o;
            }
        }

        // Complete order (move to complete list) -- called by bot after processing
        public void completeOrder(Order o) {
            synchronized (pendingLock) {
                o.status = OrderStatus.COMPLETE;
                complete.add(o);
            }
        }

        // Return an order back to pending (e.g. when bot is removed while processing)
        // We insert it at the front of its priority group (so it will be next among its type)
        public void returnOrder(Order order) {
            synchronized (pendingLock) {
                order.status = OrderStatus.PENDING;
                if (order.type == OrderType.VIP) {
                    // place at the very front (before other VIPs) so it is processed first among VIPs
                    pending.addFirst(order);
                } else {
                    // for normal order, place right after VIP group (i.e., before other normals)
                    int vipCount = 0;
                    for (Order p : pending) {
                        if (p.type == OrderType.VIP) vipCount++;
                        else break;
                    }
                    pending.add(vipCount, order);
                }
                log(String.format("%s returned to PENDING", order));
                pendingLock.notifyAll();
            }
        }

        // Print current status
        public void printStatus() {
            synchronized (pendingLock) {
                System.out.println("=== PENDING (" + pending.size() + ") ===");
                for (Order o : pending) {
                    System.out.println("  " + o);
                }
                System.out.println("=== COMPLETE (" + complete.size() + ") ===");
                for (Order o : complete) {
                    System.out.println("  " + o);
                }
            }
            synchronized (this) {
                System.out.println("=== BOTS (" + bots.size() + ") ===");
                for (Bot b : bots) {
                    System.out.printf("  Bot-%d : %s%n", b.getBotId(), b.getStatusString());
                }
            }
        }

        // simple logging helper
        public void log(String msg) {
            System.out.println("[LOG] " + msg);
        }
    }
}

