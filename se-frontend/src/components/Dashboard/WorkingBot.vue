<template>
    <div class="order-category" style="margin-bottom: 4rem;">
        <h2>Working Bots</h2>
        <p v-if="loading">Loading working bots...</p>
        <div v-else-if="workingBots.length > 0" style="display: flex; gap: 1rem;">
            <WorkingBotTile v-for="bot in workingBots"
                :key="bot.id"
                :botId="bot.id"
                :orderId="bot.currentOrder"
                :orderType="bot.currentOrderType"
            />
        </div>
        <div v-else>No working bots</div>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import WorkingBotTile from './WorkingBotTile.vue';
export default {
    name: "ListOrders",
    components: {
        WorkingBotTile
    },
    computed: {
        ...mapGetters(['allBots']), 
        loading() {
            return this.$store.getters.isLoading;
        },
        workingBots() {
            return Array.isArray(this.allBots) 
            ? this.allBots.filter(bot => bot.state === 'WORKING') 
            : [];
        },
    },
    created() {
        this.initializeWebSocket();
        this.fetchBots();
    },
    methods: {
        ...mapActions(['initializeWebSocket', 'getAllBots']),
        fetchBots() {
            this.getAllBots();
        },
    },
}
</script>

<style>
.order-category {
    gap: 1rem;
    padding: 20px;
    background-color: rgb(203, 203, 203);
    border-radius: 15px;
    width: 100%;
}
</style>