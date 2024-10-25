<template>
    <CButton class="bot-tile" @click="clicked">
      <img src="@/assets/bot.png" alt="Bot Type Image" class="bot-image">
      <p class="bot-id">Bot {{ id }}</p>
    </CButton>
  </template>
  
  <script>
import Swal from 'sweetalert2';
import { mapActions } from 'vuex';

  export default {
    name: "BotTile",
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
  margin: 10px 0 0 0; 
    font-size: large;
    font-weight: 600;
    color: inherit; 
}

.bot-image {
    width: auto;
    height: auto;
    max-width: 100%;
    border-radius: 10px;
    object-fit: contain;
}

.bot-type {
    margin-top: 10px;
    font-size: large;
    font-weight: 600;
    color: inherit; 
}
</style>