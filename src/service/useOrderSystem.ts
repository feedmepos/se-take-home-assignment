import request from '../utils/request';
import { Order, Bot } from '../types';
interface ApiResponse<T> {
    success: boolean;
    order?: T;  // 包含实际订单数据
    [x: string]: any;
}
// 创建订单
export const createOrder = async (order: Order): Promise<Order | null> => {
    try {
        const result = await request<ApiResponse<Order>>('/createOrder', {
            method: 'POST',
            body: order
        });

        if (!result?.success) {
            // 可选：弹框提示用户
            return null;
        }

        return result.order || null;
    } catch (error) {
        console.error('Failed to create order:', error);
        return null;
    }
};

// 更新订单
export const updateOrder = async (orderId: number, updates: Partial<Order>): Promise<Order> => {
    return request<Order>(`/updateOrder/${orderId}`, {
        method: 'PUT',
        body: updates
    });
};

// 创建机器人
export const createBot = async (bot: Omit<Bot, 'id'>): Promise<Bot> => {
    return request<Bot>('/createBot', {
        method: 'POST',
        body: bot
    });
};

// 删除机器人
export const deleteBot = async (botId: number): Promise<void> => {
    return request<void>(`/deleteBot/${botId}`, {
        method: 'DELETE'
    });
};