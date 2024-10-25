<template>
    <div class="bot-tile-container">
      <CButton class="bot-tile" @click="clicked">
        <img src="@/assets/bot.png" alt="Bot Type Image" class="bot-image">
        <p class="bot-id">Bot {{ botId }}</p>
      </CButton>
      <img src="@/assets/burger.png" alt="Burger Image" class="burger-image">
      <p>Order {{ orderId }}</p>
    </div>
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
          text: `Do you want to remove Bot ${this.id}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, remove it!',
          cancelButtonText: 'No, cancel!'
        });
        
        if (result.isConfirmed) {
          await this.removeBot(this.id);
          // Logic to remove the bot goes here
          Swal.fire('Removed!', `Bot ${this.id} has been removed.`, 'success');
        }
      }
    }
  };
  </script>

<style scoped>
.bot-tile-container {
  display: flex;
  flex-direction: column; /* Stack elements vertically */
  align-items: center; /* Center elements horizontally */
}

.bot-tile {
  min-width: 200px;
  width: 200px;
  height: 225px;
  text-align: center;
  background-color: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
  transition: all 0.3s ease; /* Smooth transition for hover */
  cursor: pointer;
  
}

.bot-tile:hover {
  background-color: #ffc72c; /* Darker shade on hover */
    color: white; /* Change text color on hover */
    box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3); /* Add shadow effect */
    transform: translateY(-4px) scale(1.05); 
}

.bot-id {
  margin-top: 60px;
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
  margin-bottom: 10px;
}

</style>
  