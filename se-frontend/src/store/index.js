import { createStore } from 'vuex';
import customers from './modules/customers';
import orders from './modules/orders';
import { io } from 'socket.io-client';

const socket = io(process.env.VUE_APP_WS_URL);

const store = createStore({
    state: {
        sidebarVisible: true, // Controls visibility of the sidebar
        loading: false, // General loading state
    },
    getters: {
        isLoading: (state) => state.loading,
        isSidebarVisible: (state) => state.sidebarVisible,
    },
    actions: {
        toggleSidebar({ commit }) {
            commit('TOGGLE_SIDEBAR');
        },
        setLoading({ commit }, status) {
            commit('SET_LOADING', status);
        },
    },
    mutations: {
        TOGGLE_SIDEBAR(state) {
            state.sidebarVisible = !state.sidebarVisible; // Toggles sidebar visibility
        },
        SET_LOADING(state, status) {
            state.loading = status; // Sets loading state
        },
    },
    modules: {
        customers,
        orders
    }
});

export { store, socket };
export default store;
