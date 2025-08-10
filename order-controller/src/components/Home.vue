<script setup lang="ts">
import { ref } from "vue";
import { OrderStatus, OrderType } from "@/enums";
import { Bot, BotManager, Order, OrderManager } from "@/models";
import OrderCard from "./OrderCard.vue";
import BotCard from "./BotCard.vue";

const orderManager = ref(new OrderManager());
const botManager = ref(new BotManager());

function onAddOrderButtonClicked() {
  orderManager.value.addOrder(OrderType.NORMAL);
  botManager.value.triggerAllBotToWork();
}

function onAddVIPOrderButtonClicked() {
  orderManager.value.addOrder(OrderType.VIP);
  botManager.value.triggerAllBotToWork();
}

function onAddBotButtonClicked() {
  botManager.value.addBot(orderManager.value as OrderManager);
}

function onRemoveBotButtonClicked() {
  botManager.value.removeNewestBot();
}

function removeBot(targetBot: Bot) {
  botManager.value.removeBot(targetBot);
}

function startWorking(targetBot: Bot) {
  botManager.value.startWorking(targetBot);
}

function stopWorking(targetBot: Bot) {
  botManager.value.stopWorking(targetBot);
}
</script>

<template>
  <n-flex vertical style="height: 100%">
    <n-flex horizontal style="justify-content: space-between">
      <n-flex class="button_container" horizontal>
        <n-button type="primary" @click="onAddOrderButtonClicked">New Normal Order</n-button>
        <n-button type="primary" @click="onAddVIPOrderButtonClicked">New VIP order</n-button>
      </n-flex>

      <n-flex class="button_container" horizontal>
        <n-button type="primary" @click="onAddBotButtonClicked">+ bot</n-button>
        <n-button type="primary" @click="onRemoveBotButtonClicked">- bot</n-button>
      </n-flex>
    </n-flex>

    <n-flex horizontal style="justify-content: space-between; width: 100%">
      <n-flex vertical style="justify-content: space-between; width: 49%">
        <n-card :title="`Pending (${orderManager.pendingOrdersLength})`" class="card_container">
        <!-- <n-card :title="`Pending (${orderManager.orders.length})`" class="card_container"> -->
          <n-scrollbar style="max-height: 35vh">
            <div v-for="order in orderManager.orders" style="margin: 10px">
              <OrderCard
                v-if="order instanceof Order && (order as Order).status == OrderStatus.PENDING"
                :order="order"
              />
              <!-- <OrderCard
                v-if="order instanceof Order && (order as Order).status !== OrderStatus.COMPLETED"
                :order="order"
              /> -->
            </div>
          </n-scrollbar>
        </n-card>

        <n-card :title="`Complete (${orderManager.completedOrders.length})`" class="card_container">
          <n-scrollbar style="max-height: 35vh">
            <div v-for="order in orderManager.completedOrders" style="margin: 10px">
              <OrderCard v-if="order instanceof Order && order" :order="order" />
            </div>
          </n-scrollbar>
        </n-card>
      </n-flex>

      <n-card :title="`Bots (${botManager.bots.length})`" class="bot_card_container">
        <n-scrollbar style="max-height: 82vh">
          <div v-for="bot in botManager.bots" style="margin: 10px">
            <div v-if="bot instanceof Bot && bot">
              <BotCard
                :bot="bot"
                @removeBot="removeBot(bot)"
                @startWorking="startWorking(bot)"
                @stopWorking="stopWorking(bot)"
              />
            </div>
          </div>
        </n-scrollbar>
      </n-card>
    </n-flex>
  </n-flex>
</template>

<style lang="css" scoped>
.button_container {
  width: 49%;
}

.card_container {
  width: 100%;
  height: 45vh;
  background-color: gray;
}

.bot_card_container {
  width: 49%;
  height: 92vh;
  background-color: gray;
}
</style>
