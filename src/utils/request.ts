import { mockCreateOrder } from '../mock/createOrder';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
    method: RequestMethod;
    headers?: Record<string, string>;
    body?: any;
}

interface ApiResponse<T = unknown> {
    [x: string]: any;
    status: number, // 状态码（200表示成功）
    errorCode?: number; // 业务错误码
    message: string;  // 消息提示
    data: T;          // 实际业务数据
    success: boolean; // 请求本身成功
}

const BASE_URL = process.env.NODE_ENV === 'development' ? '@mock' : '/api';

const request = async <T>(url: string, options: RequestOptions): Promise<T> => {
    const { method, headers = {}, body } = options;

    let apiResponse: ApiResponse<T>;
    // 本地开发环境下使用mock数据
    if (process.env.NODE_ENV === 'development') {
        apiResponse = mockCreateOrder(body);
    } else {
        const response = await fetch(`${BASE_URL}${url}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json() as ApiResponse<T>;
        // Validate required fields
        if (!('success' in data && 'status' in data)) {
            throw new Error(`Invalid API response format`);
        }

        apiResponse = data;
    }
    if (!apiResponse.success) {
        throw new Error(`HTTP error! status: ${apiResponse.status}, message: ${apiResponse.message}`);
    }
    console.log('apiResponse-------->',apiResponse);
    return apiResponse.data;
};

export default request;