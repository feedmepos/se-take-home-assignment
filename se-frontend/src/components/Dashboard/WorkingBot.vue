<template>
    <div class="bot-category" style="margin-bottom: 4rem;">
        <h2>Working Bots</h2>
        <p v-if="loading">Loading working bots...</p>
        <div v-else-if="workingBots.length > 0" class="working-bot-scroll">
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
.bot-category {
    gap: 1rem;
    padding: 20px;
    background-color: #DA291C;
    color: white; 
    border-radius: 15px;
    max-width: 100%;
}

.working-bot-scroll {
    display: flex; 
    gap: 1rem; 
    overflow-y: scroll;
    overflow-x: auto;
    scrollbar-width: none; 
}

</style>