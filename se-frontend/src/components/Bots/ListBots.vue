<template>
    <div style="align-items:center"> <!-- Center children vertically -->
      <div style="display: flex; gap: 20px; justify-content: center;">
        <BotCategory />
        <BotCategory />
        <BotCategory />
      </div>
      <CButton color="primary" style="margin: 35px; width:200px">Add New Bot</CButton> <!-- Add margin for spacing -->
    </div>
  </template>
  
  <script>
  import { CButton } from '@coreui/vue';
  import BotCategory from './BotCategory.vue';
  
  export default {
    name: "ListBots",
    components: {
      BotCategory,
      CButton, // Register the button component
    },
  }
  </script>
  
  <style scoped>
  /* Optional: Add any additional styling here */
  </style>
  