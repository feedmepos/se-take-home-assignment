<script setup lang="ts">
import { OrderStatus, OrderType } from "@/enums";
import { Order } from "@/models";

const props = defineProps<{
  order: Order;
}>();
</script>

<template>
  <n-card>
    <n-flex horizontal style="align-items: center">
      Order Number:
      <n-tag class="highlight">{{ props.order.id }}</n-tag>
      Type:
      <n-tag v-if="props.order.type === OrderType.NORMAL" type="info" class="highlight">
        Normal
      </n-tag>
      <n-tag v-else type="error" class="highlight">VIP</n-tag>
      <!-- Status:
      <n-tag v-if="props.order.status === OrderStatus.PENDING" class="highlight" type="info">
        Pending
      </n-tag>
      <n-tag
        v-else-if="props.order.status === OrderStatus.PROCESSING"
        class="highlight"
        type="warning"
      >
        Processing
      </n-tag>
      <n-tag v-else class="highlight" type="success">Complete</n-tag> -->
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
