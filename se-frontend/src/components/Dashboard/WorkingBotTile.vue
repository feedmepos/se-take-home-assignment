<template>
    
      <CButton class="bot-tile" @click="clicked">
        <img src="@/assets/bot.png" alt="Bot Type Image" class="bot-image">
        <img src="@/assets/burger.png" alt="Burger Image" class="burger-image">
        <p class="bot-id">Bot {{ botId }} Order {{ orderId }}</p>
      </CButton>
    
  </template>
  
  <script>
import { CButton } from '@coreui/vue';
import Swal from 'sweetalert2';
import { mapActions } from 'vuex';

  export default {
    name: "WorkingBotTile",
    components: {
      CButton
    },
    props: {
        botId: {
            type: Number,
            required: true
        },
        orderId: {
            type: Number,
            required: true
        },
        orderType: {
            type: String,
            required: true
        }
    },
    methods: {
      ...mapActions(['removeBot']),

      async clicked() {
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: `Do you want to remove Bot ${this.botId}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, remove it!',
          cancelButtonText: 'No, cancel!'
        });
        
        if (result.isConfirmed) {
          await this.removeBot(this.botId);
          // Logic to remove the bot goes here
          Swal.fire('Removed!', `Bot ${this.botId} has been removed.`, 'success');
        }
      }
    }
  };
  </script>

<style scoped>

.bot-tile {
  min-width: 200px;
    width: 200px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: white;
    border-radius: 15px;
    padding: 1rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
    transition: all 0.3s ease;
    cursor: pointer;
    margin: 20px 0 2px 0;
}

.bot-tile:hover {
  background-color: #FFC72C;
  color: white; 
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3); 
  transform: translateY(-2px) scale(1.05); 
}

.bot-id {
  margin-top: 10px;
  font-weight: bold;
}

.bot-image {
  width: auto;
  height: auto;
  max-width: 100%;
  border-radius: 10px;
  object-fit: contain;
}

.burger-image {
  width: 100px;
  height: auto;
  margin-bottom: 5px;
}

</style>
  