<script setup lang="ts">
import { OrderList } from '@/components/order'
import { BotPanel } from '@/components/bot'
import { Button, Card } from '@/components/ui'
import { useOrderStore } from '@/domains/order'
import { User, Crown, ChefHat } from 'lucide-vue-next'

const store = useOrderStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-6xl mx-auto">
      <header class="mb-8 text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <ChefHat class="w-10 h-10 text-amber-500" />
          <h1 class="text-4xl font-bold text-gray-800">Mekdi POS</h1>
        </div>
        <p class="text-gray-600">Automated Cooking Bot Order Management System</p>
      </header>

      <div class="grid gap-6 mb-6">
        <BotPanel
          :bots="store.bots"
          :idle-count="store.idleBotsCount"
          :busy-count="store.busyBotsCount"
          @add-bot="store.addBot"
          @remove-bot="store.removeBot"
        />
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <Card class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <h2 class="text-xl font-bold text-gray-800">
                PENDING ({{ store.pendingOrders.length }})
              </h2>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" @click="store.createNormalOrder">
                <User class="w-4 h-4 mr-2" />
                New Normal Order
              </Button>
              <Button variant="default" class="bg-amber-500 hover:bg-amber-600" @click="store.createVipOrder">
                <Crown class="w-4 h-4 mr-2" />
                New VIP Order
              </Button>
            </div>
          </div>
          <OrderList
            :orders="store.pendingOrders"
            title=""
            empty-message="No pending orders. Add orders to start processing."
          />
        </Card>

        <Card class="p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <h2 class="text-xl font-bold text-gray-800">
              COMPLETE ({{ store.completeOrders.length }})
            </h2>
          </div>
          <OrderList
            :orders="store.completeOrders"
            title=""
            empty-message="No completed orders yet."
          />
        </Card>
      </div>
    </div>
  </div>
</template>
