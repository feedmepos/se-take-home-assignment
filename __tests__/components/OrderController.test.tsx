import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import OrderController from '../../src/components/OrderController';
// 新增全局类型声明
declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
}

// 模拟定时器
jest.useFakeTimers();

describe('OrderController 组件', () => {
  beforeEach(() => {
    render(<OrderController />);
  });

  test('应该渲染订单控制器', () => {
    expect(screen.getByTestId('order-controller')).toBeInTheDocument();
  });

  test('点击普通订单按钮应该创建普通订单', async () => {
    const button = screen.getByTestId('add-normal-order-btn');
    fireEvent.click(button);
  
    // 等待订单项和标签加载
    const normalTag = await screen.findByTestId('normal-tag-1');
    
    expect(normalTag).toBeInTheDocument();
    expect(normalTag).toHaveTextContent('普通');
  });

  test('点击VIP订单按钮应该创建VIP订单', () => {
    const button = screen.getByTestId('add-vip-order-btn'); // 修改后的testid
    fireEvent.click(button);

    expect(screen.getByText(/订单 #1/)).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  test('点击添加机器人按钮应该创建机器人', () => {
    const button = screen.getByTestId('add-bot-btn'); // 修改后的testid
    fireEvent.click(button);

    expect(screen.getByText(/机器人 #1/)).toBeInTheDocument();
  });

  test('点击移除机器人按钮应该移除机器人', () => {
    // 先添加机器人
    const addButton = screen.getByTestId('add-bot-btn');
    fireEvent.click(addButton);

    // 移除机器人
    const removeButton = screen.getByTestId('remove-bot-btn');
    fireEvent.click(removeButton);

    expect(screen.queryByText(/机器人 #1/)).not.toBeInTheDocument();
  });

  test('机器人应该处理订单', () => {
    // 创建订单 - 使用新的testid
    const orderButton = screen.getByTestId('add-normal-order-btn');
    fireEvent.click(orderButton);

    // 添加机器人 - 使用新的testid
    const botButton = screen.getByTestId('add-bot-btn');
    fireEvent.click(botButton);

    // 检查订单是否在处理中
    expect(screen.getByText('处理中')).toBeInTheDocument();

    // 前进10秒
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // 检查订单是否完成
    expect(screen.getByText('空闲')).toBeInTheDocument();
  });

  test('VIP订单应该优先于普通订单处理', () => {
    // 创建普通订单
    const normalButton = screen.getByTestId('add-normal-order-btn');
    fireEvent.click(normalButton);

    // 创建VIP订单
    const vipButton = screen.getByTestId('add-vip-order-btn');
    fireEvent.click(vipButton);

    // 添加机器人
    const botButton = screen.getByTestId('add-bot-btn');
    fireEvent.click(botButton);

    // 检查VIP订单是否被优先处理
    expect(screen.getByText(/处理订单 #2/)).toBeInTheDocument();
  });
});