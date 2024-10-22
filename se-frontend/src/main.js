import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router'; // Ensure this path is correct
import store from './store'; // Your Vuex store
import CoreUI from '@coreui/vue'; // CoreUI library

const app = createApp(App);
app.use(router); // Use the router
app.use(store); // Use the Vuex store
app.use(CoreUI); // Use CoreUI components
app.mount('#app'); // Mount the app
