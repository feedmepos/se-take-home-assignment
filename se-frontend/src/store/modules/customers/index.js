import axios from 'axios';
import { socket } from '@/store';
import { createHeaders } from '@/helpers/headers';

const state = {
    customers: [],
    loading: false,
  };
  
  const getters = {
    allCustomers: (state) => state.customers,
    getLoading: (state) => state.loading,
  };
  
  const actions = {
    createCustomer({commit}, customer) {
      commit('SET_LOADING', true);
        return new Promise((resolve, reject) => {
            axios
              .post(
                process.env.VUE_APP_CREATE_CUSTOMER,
                customer
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
    getAllCustomers({ commit }, id) {
      commit('SET_LOADING', true);
      axios
        .get(
          process.env.VUE_APP_GET_CUSTOMER_BY_ADVERTISER + id
        )
        .then((res) => {
          commit('SET_CUSTOMERS', res.data);
          commit('SET_LOADING', false);
        })
        .catch((error) => {
          console.log(error.response.data);
          commit('SET_LOADING', false);
          console.log('---Error---');
          console.log(error);
        });
    },
    removeCustomer({ commit, rootState }, id) {
      axios
        .delete(
          process.env.VUE_APP_DELETE_CUSTOMER_ENDPOINT + id,
          createHeaders(rootState.user.token)
        )
        .then(() => {
          commit('SET_DELETE_CUSTOMERS', id);
          commit('SET_DELETE_UNLINK_CUSTOMER', id, { root: true });
        })
        .catch((error) => {
          console.log(error.response.data);
          console.log('---Error---');
          console.log(error);
        });
    },
    initializeWebSocket({ commit }) {
        socket.on('customerCreated', (data) => {
            console.log('Customer created:', data);
            commit('ADD_OR_UPDATE_CUSTOMER', data); // Update Vuex state with the new customer
        });
        console.log('WebSocket connected');
    }
  };
  
  const mutations = {
    SET_LOADING: (state, value) => (state.locustomering = value),
    SET_CUSTOMERS: (state, customers) => (state.customers = customers),
    SET_DELETE_CUSTOMERS: (state, id) =>
      (state.customers = state.customers.filter((customer) => customer.id !== id)),
    ADD_OR_UPDATE_CUSTOMER: (state, customer) => {
        const index = state.customers.findIndex((c) => c.id === customer.customer.id);
        if (index !== -1) {
            console.log(customer.customer)
          state.customers.splice(index, 1, customer.customer); // Update customer
        } else {
            console.log("herhere")
          state.customers.push(customer.customer); // Add new customer
        }
    },
  };
  
  export default {
    state,
    actions,
    getters,
    mutations,
  };
  