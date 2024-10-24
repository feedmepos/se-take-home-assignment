import axios from 'axios';
import { socket } from '@/store';

const state = {
    bots: [],
    loading: false,
  };
  
  const getters = {
    allBots: (state) => state.bots,
    getLoading: (state) => state.loading,
  };
  
  const actions = {
    createBot({commit}) {
      commit('SET_LOADING', true);
        return new Promise((resolve, reject) => {
            axios
              .post(
                process.env.VUE_APP_CREATE_BOT
              )
              .then((res) => {
                commit('SET_LOADING', false);
                resolve(res);
              })
              .catch((err) => {
                reject(err);
              });
          });
    },
    getBotByStatus({ commit }, state) {
        commit('SET_LOADING', true);
        return axios
          .get(
            process.env.VUE_APP_GET_BOTS + "?state=" + state
          )
          .then((res) => {
            commit('SET_LOADING', false);
            console.log(res.data);
            return res.data;
          })
          .catch((error) => {
            console.log(error.response.data);
            commit('SET_LOADING', false);
            console.log('---Error---');
            console.log(error);
          });
      },
    getAllBots({ commit }) {
      commit('SET_LOADING', true);
      console.log(process.env.VUE_APP_GET_BOTS);
      axios
        .get(
          process.env.VUE_APP_GET_BOTS
        )
        .then((res) => {
          commit('SET_BOTS', res.data);
          commit('SET_LOADING', false);
        })
        .catch((error) => {
          console.log(error.response);
          commit('SET_LOADING', false);
          console.log('---Error---');
          console.log(error);
        });
    },
    removeBot({ commit }, id) {
        commit('SET_LOADING', true);
      axios
        .delete(
          process.env.VUE_APP_DELETE_BOT + id,
        )
        .then(() => {
          console.log("removed an bot from frontend side");
          commit('SET_LOADING', false);
        })
        .catch((error) => {
          console.log(error.response.data);
          console.log('---Error---');
          console.log(error);
        });
    },
    initializeWebSocket({ commit }) {
        socket.on('botListUpdated', (data) => {
            console.log('Bot updated:', data.bots);
            commit('SET_BOTS', data.bots); // Update Vuex state with the new bot
        });
        
        console.log('WebSocket connected');
    }
  };
  
  const mutations = {
    SET_LOADING: (state, value) => (state.loading = value),
    SET_BOTS: (state, data) => (state.bots = data),
    SET_DELETE_BOTS: (state, id) =>
      (state.bots = state.bots.filter((bot) => bot.id !== id)),
    ADD_OR_UPDATE_BOT: (state, bot) => {
        const index = state.bots.findIndex((c) => c.id === bot.bot.id);
        if (index !== -1) {
            console.log(bot.bot)
          state.bots.splice(index, 1, bot.bot); // Update bot
        } else {
          state.bots.push(bot.bot); // Add new bot
        }
    },
    REMOVE_BOT: (state, value) => {
        state.bots = state.bots.filter((bot) => bot.id !== value.botId)
        console.log("bot has been removed from list")
    }
  };
  
  export default {
    state,
    actions,
    getters,
    mutations,
  };
  