<template>
    <div class="bot-tile-container">
      <CButton class="bot-tile" @click="clicked">
        <img src="@/assets/bot.png" alt="Bot Type Image" class="bot-image">
        <p>Bot {{ botId }}</p>
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
  width: 200px; /* Full width of the container */
  height: 225px;
  text-align: center; /* Center text */
  background-color: white; /* Background color */
  border-radius: 15px; /* Increase for smoother rounded corners */
  border: 1px solid #ccc; /* Optional border color */
  padding: 20px; /* Padding inside the tile */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Optional shadow for depth */
  margin-bottom: 10px; /* Space between multiple tiles, if needed */
}

.bot-image {
  width: auto; /* Set a fixed width for the image */
  height: auto; /* Maintain aspect ratio */
  max-width: 100%; /* Ensure the image does not exceed the tile's width */
  border-radius: 10px; /* Optional: round the image corners */
  object-fit: contain; /* Ensures the image is contained within its box */
}

.burger-image {
  width: 100px; /* Set a fixed width for the image */
  height: auto; /* Maintain aspect ratio */
  margin-bottom: 10px; /* Add some space below the burger image */
}
</style>
  