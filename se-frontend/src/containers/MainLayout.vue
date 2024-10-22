<template>
  <div class="main-layout">
    <AppSidebar /> <!-- Sidebar component -->
    <div class="router-view-container">
      <router-view /> <!-- Render child routes here -->
    </div>
  </div>
</template>

<script>
import AppSidebar from './AppSidebar'; // Adjust the path as necessary

export default {
  name: 'MainLayout',
  components: {
    AppSidebar, // Register the sidebar component
  },
};
</script>

<style scoped>
.main-layout {
  display: flex; /* Use flexbox to arrange items */
  height: 100vh; /* Set height to fill the viewport */
}

.router-view-container {
  flex: 1; /* Take the remaining space */
  padding: 20px; /* Optional padding for the content */
  overflow-y: auto; /* Allow scrolling if content exceeds the height */
}
</style>
