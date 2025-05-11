import type { Order } from '../types';

interface ApiResponse<T = unknown> {
    status: number, // 状态码（200表示成功）
    errorCode?: number; // 业务错误码
    message: string;  // 消息提示
    data: any;          // 实际业务数据
    success: boolean; // 请求本身成功
}

export const mockCreateOrder = (body: any): ApiResponse<Order> => {
    const { id, type, status } = body;
    const newOrder: Order = {
        id,
        type,
        status,
        createdAt: new Date(),
    };

    return {
        errorCode: 0,
        status: 200,
        message: '订单创建成功',
        data: {
            success: true,
            order: newOrder,
        },
        success: true,
    };
};

// 错误响应示例
export const mockCreateOrderError = (): ApiResponse => ({
  errorCode: 4001,
  status: 200,
  message: '库存不足，无法创建订单',
  data: {
    success: false
  },
  success: true
});