// In-memory state singleton
const state = {
  orders: [],
  bots: [],
};

function getStateSnapshot() {
  return {
    pending: state.orders.filter(o => o.status === 'PENDING'),
    complete: state.orders.filter(o => o.status === 'COMPLETE'),
    bots: state.bots,
  };
}

module.exports = { state, getStateSnapshot };
