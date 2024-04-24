<template>
  <div class="w-full h-full">
    <div class="text-center text-3xl font-semibold mb-4 ">
      <span class="text-[#A17A69]">FeedMe</span> - <span class="font-medium">Active Bot</span> ( <span class="text-[#A17A69]">{{botCount}}</span> )
    </div>
    <div class="max-w-full mx-8 bg-[#E8DBD5] rounded-lg shadow-md p-4">
      <div class="max-w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Pending Orders Section -->
        <div class="bg-[#A17A69] rounded-lg shadow-md h-fit">
          <h2 class="text-lg font-semibold my-2 text-white">Pending Orders</h2>
          <div class="bg-white rounded-b-lg">
            <div v-for="order in filteredPendingOrders" :key="order.orderNumber" class="py-2 px-4 border-b flex justify-between bg-white rounded-b-lg">
              <span class="content-center">Order {{ order.orderNumber }} ({{ order.type }})</span>
              <button @click="cancelOrder(order)" class="bg-[#6989A1] text-white px-2 py-1 rounded-md">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Processing Orders Section -->
        <div class="bg-[#A17A69] rounded-lg shadow-md h-fit">
          <h2 class="text-lg font-semibold my-2 text-white">Processing Orders</h2>
          <div class="bg-white rounded-b-lg">
            <div v-for="order in processingOrders" :key="order.orderNumber" class="py-3 px-4 border-b flex justify-between bg-white rounded-b-lg">
              <span class="content-center">Order {{ order.orderNumber }} ({{ order.type }})</span>
            </div>
          </div>
        </div>

        <!-- Completed Orders Section -->
        <div class="bg-[#A17A69] rounded-lg shadow-md h-fit">
          <h2 class="text-lg font-semibold my-2 text-white">Completed Orders</h2>
          <div class="bg-white rounded-b-lg">
            <div v-for="order in completeOrders" :key="order.orderNumber" class="py-3 px-4 border-b flex justify-between bg-white rounded-b-lg">
              <span class="content-center">Order {{ order.orderNumber }} ({{ order.type }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons Section -->
      <div class="mt-4 flex justify-center absolute bottom-4 right-4">
        <button @click="newNormalOrder" class="bg-[#A17A69] text-white px-4 py-2 rounded-md mr-2 ml-4">New Normal Order</button>
        <button @click="newVIPOrder" class="bg-[#C5A48D] text-white px-4 py-2 rounded-md mr-2">New VIP Order</button>
        <button @click="addBot" class="bg-[#7B554B] text-white px-4 py-2 rounded-md mr-2">+ Bot</button>
        <button @click="removeBot" class="bg-[#6989A1] text-white px-4 py-2 rounded-md">- Bot</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const pendingOrders = ref([]);
const completeOrders = ref([]);
const processingOrders = computed(() => pendingOrders.value.filter(order => order.status === 'PROCESSING'));
const filteredPendingOrders = computed(() => pendingOrders.value.filter(order => order.status === 'PENDING'));

let botCount = ref(0);
let processedOrdersCount = ref(0);
let nextOrderNumber = ref(1);
let botTimeouts = [];

const newNormalOrder = () => {
  const order = { orderNumber: nextOrderNumber.value++, status: 'PENDING', type: 'Normal' };
  pendingOrders.value.push(order);
  processOrders();
};

const newVIPOrder = () => {
  const order = { orderNumber: nextOrderNumber.value++, status: 'PENDING', type: 'VIP' };
  const normalIndex = pendingOrders.value.findIndex(order => order.type === 'Normal');
  const vipIndex = pendingOrders.value.map(order => order.type).lastIndexOf('VIP');
  const insertIndex = vipIndex !== -1 ? vipIndex + 1 : normalIndex !== -1 ? normalIndex == 0 ? normalIndex : normalIndex + 1 : pendingOrders.value.length;
  pendingOrders.value.splice(insertIndex, 0, order);
  processOrders();
};

const addBot = () => {
  botCount.value++;
  processOrders();
};

const removeBot = () => {
  if (botCount.value > 0) {
    botCount.value--;
    processedOrdersCount.value--;

    // Remove the latest bot's timeout if it's processing an order
    const latestBotTimeout = botTimeouts.pop();
    if (latestBotTimeout) {
      clearTimeout(latestBotTimeout);
      // If the latest bot was processing an order, return it to PENDING
      const orderIndex = pendingOrders.value.map(order => order.status).lastIndexOf('PROCESSING');
      if (orderIndex !== -1) {
        pendingOrders.value[orderIndex].status = 'PENDING';
      }
    }
  }
};

const processOrders = () => {
  if (botCount.value === 0) return;

  const pendingOrder = pendingOrders.value.find(order => order.status === 'PENDING');
  if (!pendingOrder) return;

  for (const order of pendingOrders.value) {
    if (order.status === 'PENDING') {
      if (processedOrdersCount.value >= botCount.value) break;
      order.status = 'PROCESSING';
      const botTimeout = setTimeout(() => {
        order.status = 'COMPLETE';
        processedOrdersCount.value--;
        completeOrders.value.push(order);
        pendingOrders.value.splice(pendingOrders.value.indexOf(order), 1);
        processOrders();
      }, 10000);
      botTimeouts.push(botTimeout);
      processedOrdersCount.value++;
    }
  }
};

const cancelOrder = (order) => {
  const index = pendingOrders.value.findIndex(o => o.orderNumber === order.orderNumber);
  if (index !== -1) {
    pendingOrders.value.splice(index, 1);
  }
};
</script>