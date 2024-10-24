<template>
    <CButton class="bot-tile" @click="clicked">
      <img src="@/assets/bot.png" alt="Bot Type Image" class="bot-image">
      <p>Bot {{ id }}</p>
    </CButton>
  </template>
  
  <script>
import { CButton } from '@coreui/vue';
import Swal from 'sweetalert2';
import { mapActions } from 'vuex';

  export default {
    name: "BotTile",
    components: {
      CButton
    },
    props: {
        id: {
            type: Number,
            required: true
        },
        state: {
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
  .bot-tile {
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
  </style>
  