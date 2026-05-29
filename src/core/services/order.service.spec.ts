import { TestBed } from '@angular/core/testing';
import { OrderStatus, OrderTier } from '../constants/order.constants';
import { OrderService } from './order.service';

describe('OrderService', () => {
    let service: OrderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(OrderService);
    });

    it('should create unique increasing order numbers across normal and VIP orders', () => {
        service.addOrder(OrderTier.Normal);
        service.addOrder(OrderTier.Vip);
        service.addOrder(OrderTier.Normal);

        expect(service.allOrders().map((order) => order.id)).toEqual([1, 2, 3]);
    });

    it('should place VIP orders before normal orders and behind existing VIP orders', () => {
        service.addOrder(OrderTier.Normal);
        service.addOrder(OrderTier.Vip);
        service.addOrder(OrderTier.Normal);
        service.addOrder(OrderTier.Vip);

        expect(service.getPendingOrders().map((order) => order.name)).toEqual([
            'VIP Order #2',
            'VIP Order #4',
            'Normal Order #1',
            'Normal Order #3',
        ]);
    });

    it('should move picked orders from pending to complete', () => {
        service.addOrder(OrderTier.Normal);

        const order = service.pickPendingOrder(1);

        expect(order?.status).toBe(OrderStatus.InProgress);
        expect(
            service
                .allOrders()
                .filter((existingOrder) => existingOrder.status === OrderStatus.Pending),
        ).toHaveSize(0);

        service.completeProcessingOrder(order?.id ?? 0);

        expect(service.allOrders()[0].status).toBe(OrderStatus.Complete);
    });

    it('should return interrupted orders to the correct pending priority', () => {
        service.addOrder(OrderTier.Normal);
        const processingOrder = service.pickPendingOrder(1);
        service.addOrder(OrderTier.Normal);
        service.addOrder(OrderTier.Vip);

        service.returnProcessingOrder(processingOrder?.id ?? 0);

        expect(service.getPendingOrders().map((order) => order.name)).toEqual([
            'VIP Order #3',
            'Normal Order #1',
            'Normal Order #2',
        ]);
    });
});
