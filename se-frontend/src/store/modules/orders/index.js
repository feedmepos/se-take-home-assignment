import axios from 'axios';
import { socket } from '@/store';

const state = {
    orders: [],
    loading: false,
  };
  
  const getters = {
    allOrders: (state) => state.orders,
    getLoading: (state) => state.loading,
  };
  
  const actions = {
    createOrder({commit}, order) {
      commit('SET_LOADING', true);
        return new Promise((resolve, reject) => {
            axios
              .post(
                process.env.VUE_APP_CREATE_ORDER,
                order
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
    getOrderByStatus({ commit }, status) {
        commit('SET_LOADING', true);
        return axios
          .get(
            process.env.VUE_APP_GET_ORDERS + "?status=" + status
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
    getAllOrders({ commit }) {
      commit('SET_LOADING', true);
      console.log(process.env.VUE_APP_GET_ORDERS);
      axios
        .get(
          process.env.VUE_APP_GET_ORDERS
        )
        .then((res) => {
          commit('SET_ORDERS', res.data);
          commit('SET_LOADING', false);
        })
        .catch((error) => {
          console.log(error.response);
          commit('SET_LOADING', false);
          console.log('---Error---');
          console.log(error);
        });
    },
    removeOrder({ commit }, id) {
        commit('SET_LOADING', true);
      axios
        .delete(
          process.env.VUE_APP_DELETE_ORDER + id,
        )
        .then(() => {
          console.log("removed an order from frontend side");
          commit('SET_LOADING', false);
        })
        .catch((error) => {
          console.log(error.response.data);
          console.log('---Error---');
          console.log(error);
        });
    },
    initializeWebSocket({ commit }) {
        // socket.on('orderCreated', (data) => {
        //     console.log('Order created:', data);
        //     commit('ADD_OR_UPDATE_ORDER', data); // Update Vuex state with the new order
        // });
        // socket.on('orderRemoved', (data) => {
        //     console.log('Order Removed:', data);
        //     commit('REMOVE_ORDER', data); // Update Vuex state with the new order
        // });
        socket.on('orderListUpdated', (data) => {
            console.log('Order updated:', data.orders);
            commit('SET_ORDERS', data.orders); // Update Vuex state with the new order
        });
        
        console.log('WebSocket connected');
    }
  };
  
  const mutations = {
    SET_LOADING: (state, value) => (state.loordering = value),
    SET_ORDERS: (state, data) => (state.orders = data),
    SET_DELETE_ORDERS: (state, id) =>
      (state.orders = state.orders.filter((order) => order.id !== id)),
    ADD_OR_UPDATE_ORDER: (state, order) => {
        const index = state.orders.findIndex((c) => c.id === order.order.id);
        if (index !== -1) {
            console.log(order.order)
          state.orders.splice(index, 1, order.order); // Update order
        } else {
            console.log("herhere")
          state.orders.push(order.order); // Add new order
        }
    },
    REMOVE_ORDER: (state, value) => {
        state.orders = state.orders.filter((order) => order.id !== value.orderId)
        console.log("order has been removed from list")
    }
  };
  
  export default {
    state,
    actions,
    getters,
    mutations,
  };
  