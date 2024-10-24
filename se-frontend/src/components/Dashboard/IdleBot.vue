<template>
    <div class="customer-category">
        <div style="display: flex;justify-content: space-between;">
            <h3>Idle Bots</h3>
        <CButton color="primary" style="width:200px" @click="createNewBot">+ New Bot</CButton>
        </div>
        
        <div style="display: flex; gap: 1rem; width: 750px;">
            <div v-if="idleBots.length > 0">
                <BotTile 
                  v-for="bot in idleBots"
                        :key="bot.id"
                        :id="bot.id"
                        :state="bot.state"
                        />
              </div>
              <p v-else>No bots</p>
        </div>
        
    </div>

</template>

<script>
import BotTile from '../Bots/BotTile.vue';
import { mapGetters, mapActions } from 'vuex';

export default {
    name: "IdleBots",
    components: {
        BotTile
    },
    computed: {
        ...mapGetters(['allBots']), 
        loading() {
            return this.$store.getters.isLoading;
        },
        idleBots() {
            return Array.isArray(this.allBots) 
            ? this.allBots.filter(bot => bot.state === 'IDLE') 
            : null;
        },
  },
    created() {
        this.initializeWebSocket();
        this.fetchBots();
    },
    methods: {
        ...mapActions(['initializeWebSocket', 'getAllBots', 'createBot']),

        
        fetchBots() {
            this.getAllBots();
        },
        async createNewBot() {
          await this.createBot();
        }
    },
}
</script>

<style>
.customer-category {
    gap: 1rem;
    padding: 20px;
    background-color: rgb(203, 203, 203);
    border-radius: 15px;
    max-width: fit-content;
}
</style>