<template>
    <div class="bot-tile">
      <p>Bot 1</p>
      <p>State: Idle</p>
    </div>
  </template>
  
  <script>
  export default {
    name: "BotTile",
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
  