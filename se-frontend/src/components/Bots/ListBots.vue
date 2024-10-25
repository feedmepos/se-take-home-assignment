<template>
    <div class="bots-class"> 
      <div style="display: flex; gap: 20px;">
        <BotCategory :bots="idleBots" state="IDLE" class="bots-div"/>
        <BotCategory :bots="workingBots" state="WORKING" class="bots-div"/>
      </div>
    </div>
    <div class="button-class">
        <CButton class="button" color="primary" @click="createNewBot">Add New Bot</CButton> <!-- Add margin for spacing -->
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
      CButton, 
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

    .bots-class {
      justify-content: center;
      align-items: center;
      display: flex;
      
    }

    .bots-div {
      background-color: #DA291C; 
      color: white;
      font-size: 20px;
      font-weight: bold;
    }

    .button-class {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      
    }

    .button {
      width: 200px;
      margin-top: 20px;
      background-color: #ffc72c;
      text-align: center; 
      color: #333; 
      padding: 12px;
      font-weight: bold;
      font-size: 16px;
      border: none;
      border-radius: 30px;
      transition: all 0.3s ease; 
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
    }

     .button:hover {
      background-color: #ffc72c; 
      color: white; 
      box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px) scale(1.05); 
     }

  </style>
  