<template>
    <div class="bot-tile">
      <p>Bot {{ id }}</p>
      <p>State: {{ state }}</p>
    </div>
  </template>
  
  <script>
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
    }
  };
  </script>
  
  <style scoped>
  .bot-tile {
    width: 100%; /* Full width of the container */
    text-align: center; /* Center text */
    background-color: white; /* Background color */
    border-radius: 15px; /* Increase for smoother rounded corners */
    border: 1px solid #ccc; /* Optional border color */
    padding: 20px; /* Padding inside the tile */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Optional shadow for depth */
    margin-bottom: 10px; /* Space between multiple tiles, if needed */
  }
  </style>
  