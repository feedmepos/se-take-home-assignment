import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BotStatus } from '../models/bot.model';
import { OrderStatus, OrderTier } from '../constants/order.constants';
import { BotService } from './bot.service';
import { OrderService } from './order.service';

describe('BotService', () => {
    let botService: BotService;
    let orderService: OrderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        botService = TestBed.inject(BotService);
        orderService = TestBed.inject(OrderService);
    });

    it('should process one order at a time and complete it after 10 seconds', fakeAsync(() => {
        orderService.addOrder(OrderTier.Normal);

        botService.addBot();

        expect(botService.bots()[0].status).toBe(BotStatus.Processing);
        expect(orderService.allOrders()[0].status).toBe(OrderStatus.InProgress);

        tick(10000);

        expect(botService.bots()[0].status).toBe(BotStatus.Idle);
        expect(orderService.allOrders()[0].status).toBe(OrderStatus.Complete);
    }));

    it('should keep an idle bot ready for new pending orders', fakeAsync(() => {
        botService.addBot();

        orderService.addOrder(OrderTier.Vip);
        botService.processPendingOrders();

        expect(botService.bots()[0].orderId).toBe(1);

        tick(10000);

        expect(orderService.allOrders()[0].status).toBe(OrderStatus.Complete);
    }));

    it('should return a stopped bot order to pending priority', fakeAsync(() => {
        orderService.addOrder(OrderTier.Normal);
        orderService.addOrder(OrderTier.Normal);
        botService.addBot();
        orderService.addOrder(OrderTier.Vip);

        botService.removeBot();
        tick(10000);

        expect(botService.bots()).toHaveSize(0);
        expect(orderService.getPendingOrders().map((order) => order.name)).toEqual([
            'VIP Order #3',
            'Normal Order #1',
            'Normal Order #2',
        ]);
    }));

    it('should let an idle bot pick up the returned order after another bot is removed', fakeAsync(() => {
        orderService.addOrder(OrderTier.Normal);
        botService.addBot();
        botService.addBot();

        botService.removeBot();

        expect(botService.bots()).toHaveSize(1);
        expect(botService.bots()[0].status).toBe(BotStatus.Processing);
        expect(botService.bots()[0].orderId).toBe(1);

        tick(10000);

        expect(orderService.allOrders()[0].status).toBe(OrderStatus.Complete);
    }));
});
