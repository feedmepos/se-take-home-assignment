<script setup lang="ts">
import { Bot } from "@/models";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  bot: Bot;
}>();

watch(
  () => props.bot,
  (value) => {
    isWorking.value = value.isWorking;
  },
  { deep: true },
);

onMounted(() => {
  isWorking.value = props.bot.isWorking;
});

const emit = defineEmits(["removeBot", "startWorking", "stopWorking"]);

const isWorking = ref(false);

function onRemoveBotButtonClicked() {
  emit("removeBot");
}

function onStartWorkingButtonClicked() {
  emit("startWorking");
}

function onStopWorkingButtonClicked() {
  emit("stopWorking");
}
</script>

<template>
  <n-card>
    <n-flex horizontal style="align-items: center">
      Bot ID:
      <n-tag class="highlight">{{ props.bot.id }}</n-tag>
      Working status:
      <n-tag v-if="isWorking" class="highlight" type="success">Working</n-tag>
      <n-tag v-else class="highlight" type="warning">Idle</n-tag>

      <div v-if="isWorking">Order number:</div>
      <n-tag v-if="isWorking" type="info">{{ props.bot.orderNumber }}</n-tag>
      <!-- <n-button type="error" @click="onRemoveBotButtonClicked">Remove</n-button> -->
      <!-- <n-button v-if="!isWorking" type="info" @click="onStartWorkingButtonClicked">
        Start Working
      </n-button>
      <n-button v-else type="warning" @click="onStopWorkingButtonClicked">Stop Working</n-button> -->
    </n-flex>
  </n-card>
</template>

<style scoped>
.n-card {
  width: 100%;
}

.highlight {
  margin-right: 20px;
}
</style>
