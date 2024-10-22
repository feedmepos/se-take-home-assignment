import { createStore } from 'vuex';

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
});

export default store;
