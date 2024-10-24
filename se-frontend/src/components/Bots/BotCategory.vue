<template>
    <div class="bot-category">
      <div>{{ state }}</div>
      <div v-if="bots.length > 0">
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
    display: flex; /* Use flexbox to arrange items */
    flex-direction: column; /* Arrange items in a column */
    align-items: center; 
    width: 400px; /* Set width */
    height: 550px; /* Set height */
    background-color: rgb(203, 203, 203); /* Background color */
    padding: 15px; /* Padding around the content */
    text-align: center; /* Center text */
    border-radius: 15px;
  }
  </style>
  