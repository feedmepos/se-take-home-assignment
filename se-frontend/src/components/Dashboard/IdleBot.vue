<template>
    <div class="bot-category">
        <div style="display: flex;justify-content: space-between;">
            <h3>Idle Bots</h3>
            <CButton class="button" @click="createNewBot">+ New Bot</CButton>
        </div>
        <div class="bot-scroll-container">
            <div v-if="idleBots.length > 0" class="bot-scroll">
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
.bot-category {
    gap: 1rem;
    padding: 20px;
    border-radius: 15px;
    max-width: fit-content;
    background-color: #DA291C;
    color: white;
    max-width: fit-content;
}

.bot-scroll-container {
    position: relative; 
    padding: 10px; 
    overflow-x: auto; 
    overflow-y: hidden; 
    scrollbar-width: none; 
    width: 750px;
}

.bot-scroll {
    display: flex; 
    gap: 1rem; 
}

.button {
    width: 200px;
    margin: -4px 0 -4px 0;
    background-color: #ffcb3b;
    text-align: center; 
    color: #333; 
    padding: 8px;
    font-weight: bold;
    font-size: 16px;
    border-radius: 30px;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
}

.button:hover {
    background-color: #ffc72c; 
    color: white; 
    box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3); 
    transform: translateY(-4px) scale(1.05); 
}

.button:active {
    transform: scale(0.98);
    box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.2); 
}

</style>