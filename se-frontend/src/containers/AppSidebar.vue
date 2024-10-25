<template>
  <CSidebar colorScheme="dark" class="sidebar">
    <CSidebarHeader class="border-bottom">
      <CSidebarBrand class="macd"> <img src="@/assets/mcdonalds.png" alt="McDonald's Icon" class="macd-icon" />
        McDonald's</CSidebarBrand>
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
import '@coreui/coreui/dist/css/coreui.min.css';
export default {
  name: 'AppSidebar',
};
</script>

<style scoped>
.sidebar {
  height: 100vh; 
  position: fixed; 
  top: 0; 
  left: 0; 
  z-index: 1000;
}

.macd {
  font-size: 3vh;
  margin: 2vh 0 2vh 0;
}

.macd-icon {
height: 9vh;
margin-right: 1vw;
vertical-align: middle; 
}

</style>
