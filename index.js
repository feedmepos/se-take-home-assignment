// index.js
const { OrderController } = require("./order-controller");

function main() {
  // log ไป stdout แล้วค่อย redirect เป็น result.txt ใน run.sh
  const controller = new OrderController({
    processingTimeSeconds: 10,
    logFn: (msg) => {
      console.log(msg);
    },
  });

  console.log("McDonald's Order Management System - Simulation Results");

  controller.logWithTime("System initialized with 0 bots");

  // t = 0 : สร้าง 2 bots
  controller.addBot(); // #1
  controller.addBot(); // #2

  // t = 0 : สร้าง order หลายแบบ
  controller.createNormalOrder(); // #1
  controller.createNormalOrder(); // #2
  controller.createVipOrder(); // #3
  controller.createVipOrder(); // #4

  // รันเวลาไป 15 วินาที
  controller.runUntil(15);

  controller.logWithTime("Manager adds more orders at t=15");
  controller.createVipOrder(); // #5
  controller.createNormalOrder(); // #6

  // รันต่อไปถึงวินาทีที่ 25
  controller.runUntil(25);

  controller.logWithTime("Manager removes a bot at t=25");
  controller.removeBot(); // ถ้า busy -> ส่ง order กลับไป PENDING

  // รันต่อถึงวินาทีที่ 60
  controller.runUntil(60);

  const snapshot = controller.getSnapshot();
  controller.logWithTime(
    `Simulation finished. Completed=${snapshot.completedOrders.length}, PendingVIP=${snapshot.vipQueue.length}, PendingNormal=${snapshot.normalQueue.length}, Bots=${snapshot.bots.length}`
  );
}

if (require.main === module) {
  main();
}

module.exports = { main };
