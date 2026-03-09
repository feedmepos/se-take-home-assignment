const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface Order {
  id: number;
  customer_name: string;
  order_type: "normal" | "vip";
  status: "pending" | "complete" | "processing";
  created_at: string;
  completed_at?: string;
}

export interface Bot {
  id: number;
  status: "idle" | "processing";
  current_order_id?: number;
}

export interface SystemStatus {
  active_bots: number;
  in_process: number;
  in_queue: number;
  completed: number;
  last_actions: string[];
}

export const apiService = {
  // Orders
  async createOrder(customerName: string, orderType: "normal" | "vip") {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_name: customerName, order_type: orderType }),
    });
    return response.json();
  },

  async getOrders() {
    const response = await fetch(`${API_BASE_URL}/orders`);
    return response.json();
  },

  async getQueue() {
    const response = await fetch(`${API_BASE_URL}/orders/queue`);
    return response.json();
  },

  // Bots
  async getBots() {
    const response = await fetch(`${API_BASE_URL}/bots`);
    return response.json();
  },

  async scaleBots(count: number) {
    const response = await fetch(`${API_BASE_URL}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    return response.json();
  },

  // System
  async getSystemStatus() {
    const response = await fetch(`${API_BASE_URL}/system/status`);
    return response.json();
  },
};
