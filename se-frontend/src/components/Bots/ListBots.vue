<template>
    <div style="align-items:center"> <!-- Center children vertically -->
      <div style="display: flex; gap: 20px; justify-content: center;">
        <BotCategory :bots="idleBots" state="IDLE"/>
        <BotCategory :bots="workingBots" state="WORKING"/>
      </div>
      <CButton color="primary" style="margin: 35px; width:200px" @click="createNewBot">Add New Bot</CButton> <!-- Add margin for spacing -->
    </div>
  </template>
  
  <script>
  import { CButton } from '@coreui/vue';
  import BotCategory from './BotCategory.vue';
  import { mapGetters, mapActions } from 'vuex';
  
  export default {
    name: "ListBots",
    components: {
      BotCategory,
      CButton, // Register the button component
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
        workingBots() {
            return Array.isArray(this.allBots) 
            ? this.allBots.filter(bot => bot.state === 'WORKING') 
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
  
  <style scoped>
  /* Optional: Add any additional styling here */
  </style>
  