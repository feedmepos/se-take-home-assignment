import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerService } from 'src/customer/customer.service';
import { CreateOrderDto } from './dto/create-order-dto';
@Injectable()
export class OrderService {

    constructor(private readonly customerService: CustomerService) {}
    private orders = [];

    findAll(status?: 'PENDING' | 'PROCESSING' | 'COMPLETED') {
        if (status) {
            const orderArray = this.orders.filter(order => order.status === status)
            if (orderArray.length === 0) throw new NotFoundException('No orders with the requested status')
            return orderArray
        }

        return this.orders
    }

    findOne(id: number) {
        const order = this.orders.find(order => order.id === id)
        if (!order) throw new NotFoundException('order Not Found');
        return order
    }

    findByCustomerId(id: number) {
        const orders = this.orders.filter(order => order.customerId === id)
        if (!orders) throw new NotFoundException('Orders Not Found')
        return orders
    }

    async create(order: CreateOrderDto) {
        console.log('Searching for customer with ID:', order.customerId);
        const customer = await this.customerService.findOne(order.customerId);
        console.log('Customer found:', customer);

        if (!customer) {
            console.log(`Customer with ID ${order.customerId} not found`); // Debugging line
            throw new NotFoundException('Customer Not Found');
        }

        const isVip = customer && customer.role === 'VIP';
        const ordersByHighestId = [...this.orders].sort((a,b) => b.id - a.id)
        const newId = ordersByHighestId.length > 0 ? ordersByHighestId[0].id + 1 : 1;
        const newOrder = {
            id: newId,
            status: 'PENDING',
            ...order,
            type: isVip ? 'VIP' : 'NORMAL'
        };

        if (isVip) {
            const lastVipIndex = this.orders.findIndex(o => o.type === 'VIP');
            if (lastVipIndex !== -1) {
                this.orders.splice(lastVipIndex + 1, 0, newOrder);
            } else {
                this.orders.unshift(newOrder);
            }
        } else {
            this.orders.push(newOrder);
        }
        return newOrder
    }

    updateStatus(id:number) {
        console.log('ID to update:', id, 'Type of ID:', typeof id);
        console.log(this.orders)
        const order = this.orders.find(order => order.id === id)
        if (!order) {
            throw new NotFoundException('Order Not Found'); // Handle the case where order is not found
        }

        if (order.status === 'PENDING') {
            order.status = 'PROCESSING'
        } else if (order.status === 'PROCESSING') {
            order.status = 'COMPLETED'
        } else {
            order.status = 'PENDING'
        }
        return order
    }

    remove(id: number) {
        const index = this.orders.findIndex(order => order.id === id);
        if (index === -1) throw new NotFoundException('Order Not Found');
        this.orders.splice(index, 1);
        return { message: 'Order removed successfully' };
    }

    getFirstPendingOrder() {
        const pendingOrder = this.orders.find(order => order.status === 'PENDING');
        if (!pendingOrder) return null;
        return pendingOrder;
    }

}
