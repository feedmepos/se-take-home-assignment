const axios = require("axios");
const { logFinalSummary, log } = require("./utils/logger");

const API_URL = "http://localhost:3000";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await axios.post(`${API_URL}/orders`, { type: "Normal" });
  await delay(1000);
  await axios.post(`${API_URL}/orders`, { type: "VIP" });
  await axios.post(`${API_URL}/orders`, { type: "Normal" });
  await delay(1000);
  await axios.post(`${API_URL}/bots`);
  await delay(1000);
  await axios.post(`${API_URL}/bots`);
  await delay(11000);
  await axios.post(`${API_URL}/orders`, { type: "VIP" });
  await delay(10000);
  await axios.delete(`${API_URL}/bots`);
  await axios.get(`${API_URL}/orders/summary`);
})();
