<template>
  <HomeView msg="Welcome to Your Vue.js App"/>
</template>

<script>
import HomeView from './components/HomeView.vue'

export default {
  name: 'App',
  components: {
    HomeView
  }
}
</script>

<style src="@/assets/styles/main.css"></style>
<style>
body {
    font-family: 'Poppins', sans-serif;
  }
#app {
    font-family: 'Poppins', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
