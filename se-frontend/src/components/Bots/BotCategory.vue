<template>
    <div class="bot-category">
      <div>{{ state }}</div>
      <div v-if="bots.length > 0" class="bot-scroll">
        <BotTile 
          v-for="bot in bots"
                :key="bot.id"
                :id="bot.id"
                :state="bot.state"
                />
      </div>
      
    </div>
  </template>
  
  <script>
  import BotTile from './BotTile.vue';
  
  export default {
    name: "BotCategory",
    components: {
      BotTile
    },
    props: {
        bots: {
            type: Array,
            default: () => []
        },
        state: {
            type: String,
            required: true
        }
    },
  }
  </script>
  
  <style scoped>
  .bot-category {
    display: flex; 
    flex-direction: column;
    align-items: center; 
    width: 400px; 
    height: 550px; 
    background-color: rgb(203, 203, 203); 
    padding: 15px; 
    text-align: center; 
    border-radius: 15px;
    
  }
  .bot-scroll {
    overflow-y: scroll;
    overflow-x: auto;
    scrollbar-width: none; 
    display: grid;
    padding: 10px;
  }
  </style>
  