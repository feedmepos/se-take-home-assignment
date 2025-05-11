import { renderHook, act } from '@testing-library/react';
import useOrderSystem from '../../src/hooks/useOrderSystem';
import { OrderStatus, OrderType, BotStatus } from '../../src/constants';

// 模拟定时器
jest.useFakeTimers();

describe('useOrderSystem Hook', () => {
  test('应该初始化空的订单和机器人列表', () => {
    const { result } = renderHook(() => useOrderSystem());
    
    expect(result.current.orders).toEqual([]);
    expect(result.current.bots).toEqual([]);
  });
  
  // 订单创建测试
  describe('订单创建', () => {
    test('应该创建普通订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      act(() => {
        result.current.createNormalOrder();
      });
      
      expect(result.current.orders.length).toBe(1);
      expect(result.current.orders[0].type).toBe(OrderType.NORMAL);
      expect(result.current.orders[0].status).toBe(OrderStatus.PENDING);
      expect(result.current.orders[0].id).toBe(1);
    });
    
    test('应该创建多个普通订单并分配递增的ID', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      act(() => {
        result.current.createNormalOrder();
        result.current.createNormalOrder();
        result.current.createNormalOrder();
      });
      // console.log(result.current.orders)
      expect(result.current.orders.length).toBe(3);
      expect(result.current.orders[0].id).toBe(1);
      expect(result.current.orders[1].id).toBe(2);
      expect(result.current.orders[2].id).toBe(3);
    });
    
    test('应该创建VIP订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      act(() => {
        result.current.createVipOrder();
      });
      
      expect(result.current.orders.length).toBe(1);
      expect(result.current.orders[0].type).toBe(OrderType.VIP);
      expect(result.current.orders[0].status).toBe(OrderStatus.PENDING);
      expect(result.current.orders[0].id).toBe(1);
    });
  });
  
  // 订单优先级测试
  describe('订单优先级', () => {
    test('应该创建VIP订单并放在普通订单前面', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建普通订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 创建VIP订单
      act(() => {
        result.current.createVipOrder();
      });
      
      expect(result.current.orders.length).toBe(2);
      expect(result.current.getPendingOrders()[0].type).toBe(OrderType.VIP);
      expect(result.current.getPendingOrders()[1].type).toBe(OrderType.NORMAL);
    });
    
    test('应该创建VIP订单并放在已有VIP订单后面', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建第一个VIP订单
      act(() => {
        result.current.createVipOrder();
      });
      // 创建普通订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 创建第二个VIP订单
      act(() => {
        result.current.createVipOrder();
      });
      
      const pendingOrders = result.current.getPendingOrders();
      expect(pendingOrders.length).toBe(3);
      expect(pendingOrders[0].type).toBe(OrderType.VIP);
      expect(pendingOrders[0].id).toBe(1);
      expect(pendingOrders[1].type).toBe(OrderType.VIP);
      expect(pendingOrders[1].id).toBe(3);
      expect(pendingOrders[2].type).toBe(OrderType.NORMAL);
    });
    
    test('应该处理复杂的订单优先级场景', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建多个不同类型的订单
      act(() => {
        result.current.createNormalOrder(); // ID: 1
        result.current.createVipOrder();    // ID: 2
        result.current.createNormalOrder(); // ID: 3
        result.current.createVipOrder();    // ID: 4
        result.current.createVipOrder();    // ID: 5
        result.current.createNormalOrder(); // ID: 6
      });
      
      const pendingOrders = result.current.getPendingOrders();
      expect(pendingOrders.length).toBe(6);
      
      // 验证VIP订单排在前面，普通订单排在后面
      expect(pendingOrders[0].type).toBe(OrderType.VIP);
      expect(pendingOrders[1].type).toBe(OrderType.VIP);
      expect(pendingOrders[2].type).toBe(OrderType.VIP);
      expect(pendingOrders[3].type).toBe(OrderType.NORMAL);
      expect(pendingOrders[4].type).toBe(OrderType.NORMAL);
      expect(pendingOrders[5].type).toBe(OrderType.NORMAL);
      
      // 验证同类型订单按创建顺序排列
      expect(pendingOrders[0].id).toBe(2);
      expect(pendingOrders[1].id).toBe(4);
      expect(pendingOrders[2].id).toBe(5);
      expect(pendingOrders[3].id).toBe(1);
      expect(pendingOrders[4].id).toBe(3);
      expect(pendingOrders[5].id).toBe(6);
    });
  });
  
  // 机器人管理测试
  describe('机器人管理', () => {
    test('应该添加机器人', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      act(() => {
        result.current.addBot();
      });
      
      expect(result.current.bots.length).toBe(1);
      expect(result.current.bots[0].status).toBe(BotStatus.IDLE);
      expect(result.current.bots[0].id).toBe(1);
    });
    
    test('应该添加多个机器人并分配递增的ID', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      act(() => {
        result.current.addBot();
        result.current.addBot();
        result.current.addBot();
      });
      
      expect(result.current.bots.length).toBe(3);
      expect(result.current.bots[0].id).toBe(1);
      expect(result.current.bots[1].id).toBe(2);
      expect(result.current.bots[2].id).toBe(3);
    });
    
    test('应该移除机器人', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 添加两个机器人
      act(() => {
        result.current.addBot();
        result.current.addBot();
      });
      
      expect(result.current.bots.length).toBe(2);
      
      // 移除最后一个机器人
      act(() => {
        result.current.removeBot();
      });
      
      expect(result.current.bots.length).toBe(1);
      expect(result.current.bots[0].id).toBe(1);
    });
    
    test('移除所有机器人后应该返回空数组', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 添加两个机器人
      act(() => {
        result.current.addBot();
        result.current.addBot();
      });
      
      // 移除所有机器人
      act(() => {
        result.current.removeBot();
        result.current.removeBot();
      });
      
      expect(result.current.bots.length).toBe(0);
      
      // 再次尝试移除机器人不应该报错
      act(() => {
        result.current.removeBot();
      });
      
      expect(result.current.bots.length).toBe(0);
    });
  });
  
  // 订单处理测试
  describe('订单处理', () => {
    test('机器人应该处理订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证订单状态变为处理中
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getPendingOrders().length).toBe(0);
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证订单状态变为已完成
      expect(result.current.getCompletedOrders().length).toBe(1);
      expect(result.current.getProcessingOrders().length).toBe(0);
    });
    
    test('移除处理中的机器人应该将订单状态改回待处理', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证订单状态变为处理中
      expect(result.current.getProcessingOrders().length).toBe(1);
      
      // 移除机器人
      act(() => {
        result.current.removeBot();
      });
      
      // 验证订单状态变回待处理
      expect(result.current.getPendingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders().length).toBe(0);
    });
    
    test('VIP订单应该优先处理', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建普通订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 创建VIP订单
      act(() => {
        result.current.createVipOrder();
      });
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证VIP订单被处理
      expect(result.current.getProcessingOrders()[0].type).toBe(OrderType.VIP);
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证VIP订单完成，普通订单开始处理
      expect(result.current.getCompletedOrders()[0].type).toBe(OrderType.VIP);
      expect(result.current.getProcessingOrders()[0].type).toBe(OrderType.NORMAL);
    });
    
    test('多个机器人应该并行处理多个订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建多个订单
      act(() => {
        result.current.createNormalOrder(); // ID: 1
        result.current.createVipOrder();    // ID: 2
        result.current.createNormalOrder(); // ID: 3
      });
      
      // 添加两个机器人
      act(() => {
        result.current.addBot(); // ID: 1
        result.current.addBot(); // ID: 2
      });
      
      // 验证两个订单被处理（VIP订单和第一个普通订单）
      expect(result.current.getProcessingOrders().length).toBe(2);
      expect(result.current.getPendingOrders().length).toBe(1);
      
      // 验证处理中的订单类型
      const processingOrders = result.current.getProcessingOrders();
      expect(processingOrders.some(order => order.id === 2 && order.type === OrderType.VIP)).toBe(true);
      expect(processingOrders.some(order => order.id === 1 && order.type === OrderType.NORMAL)).toBe(true);
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证两个订单完成，第三个订单开始处理
      expect(result.current.getCompletedOrders().length).toBe(2);
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders()[0].id).toBe(3);
    });
    
    test('机器人应该在完成订单后自动处理下一个订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建多个订单
      act(() => {
        result.current.createNormalOrder(); // ID: 1
        result.current.createNormalOrder(); // ID: 2
        result.current.createNormalOrder(); // ID: 3
      });
      
      // 添加一个机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证第一个订单被处理
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders()[0].id).toBe(1);
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证第一个订单完成，第二个订单开始处理
      expect(result.current.getCompletedOrders().length).toBe(1);
      expect(result.current.getCompletedOrders()[0].id).toBe(1);
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders()[0].id).toBe(2);
      
      // 再前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证第二个订单完成，第三个订单开始处理
      expect(result.current.getCompletedOrders().length).toBe(2);
      expect(result.current.getCompletedOrders()[0].id).toBe(1);
      expect(result.current.getCompletedOrders()[1].id).toBe(2);
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders()[0].id).toBe(3);
      
      // 再前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证所有订单都完成
      expect(result.current.getCompletedOrders().length).toBe(3);
      expect(result.current.getProcessingOrders().length).toBe(0);
      expect(result.current.getPendingOrders().length).toBe(0);
    });
    
    test('机器人应该在没有订单时变为空闲状态', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证机器人初始为空闲状态
      expect(result.current.bots[0].status).toBe(BotStatus.IDLE);
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 验证机器人开始处理订单
      expect(result.current.bots[0].status).toBe(BotStatus.PROCESSING);
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证订单完成后机器人变回空闲状态
      expect(result.current.bots[0].status).toBe(BotStatus.IDLE);
    });
  });
  
  // 查询方法测试
  describe('查询方法', () => {
    test('getPendingOrders 应该返回所有待处理订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
        result.current.createVipOrder();
      });
      
      // 验证待处理订单
      expect(result.current.getPendingOrders().length).toBe(2);
      expect(result.current.getPendingOrders()[0].type).toBe(OrderType.VIP);
      expect(result.current.getPendingOrders()[1].type).toBe(OrderType.NORMAL);
    });
    
    test('getProcessingOrders 应该返回所有处理中订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 验证处理中订单
      expect(result.current.getProcessingOrders().length).toBe(1);
      expect(result.current.getProcessingOrders()[0].status).toBe(OrderStatus.PROCESSING);
    });
    
    test('getCompletedOrders 应该返回所有已完成订单', () => {
      const { result } = renderHook(() => useOrderSystem());
      
      // 创建订单
      act(() => {
        result.current.createNormalOrder();
      });
      
      // 添加机器人
      act(() => {
        result.current.addBot();
      });
      
      // 前进10秒
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // 验证已完成订单
      expect(result.current.getCompletedOrders().length).toBe(1);
      expect(result.current.getCompletedOrders()[0].status).toBe(OrderStatus.COMPLETED);
    });
  });
});