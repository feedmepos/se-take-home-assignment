<template>
    <CSidebar colorScheme="dark" class="sidebar">
      <CSidebarHeader class="border-bottom">
        <CSidebarBrand>Mcdonalds</CSidebarBrand>
      </CSidebarHeader>
      <CSidebarNav>
        <CNavItem href="/">
          <CIcon customClassName="nav-icon" icon="cil-speedometer" /> Dashboard
        </CNavItem>
        <CNavItem href="/orders">
          <CIcon customClassName="nav-icon" icon="cil-speedometer" /> Orders
        </CNavItem>
        <CNavItem href="/bots">
          <CIcon customClassName="nav-icon" icon="cil-speedometer" /> Bots
        </CNavItem>
      </CSidebarNav>
    </CSidebar>
  </template>
  
  <script>
  import { CSidebar, CSidebarNav } from '@coreui/vue';
  import '@coreui/coreui/dist/css/coreui.min.css';
  export default {
    name: 'AppSidebar',
  };
  </script>
  
  <style scoped>
  .sidebar {
    height: 100vh; /* Set height to 100% of the viewport height */
    position: fixed; /* Fix the sidebar in place */
    top: 0; /* Align to the top */
    left: 0; /* Align to the left */
    z-index: 1000; /* Ensure the sidebar appears above other content */
  }
  </style>
  