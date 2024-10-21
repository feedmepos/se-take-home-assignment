import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create_customer_dto';
import { NotFoundException } from '@nestjs/common';
import { Gateway } from 'src/gateway/gateway';

@Injectable()
export class CustomerService {

    constructor(private readonly gateway:Gateway) {}
    private customers = []


    findAll(role?: 'NORMAL' | 'VIP') {
        if (role) {
            const customerArray = this.customers.filter(customer => customer.role === role)

            if (customerArray.length === 0) throw new NotFoundException('No users with the requested role')

            return customerArray
        }

        return this.customers
    }

    findOne(id: number) {
        const customer = this.customers.find(customer => customer.id === id)

        if (!customer) {
            console.log(`Customer with ID ${id} not found in customer class`); // Debugging line
            throw new NotFoundException('Customer Not Found');
        }

        return customer
    }


    create(customer: CreateCustomerDto) {
        const customersByHighestId = [...this.customers].sort((a,b) => b.id - a.id)
        const newId = customersByHighestId.length > 0 ? customersByHighestId[0].id + 1 : 1;
        const newCustomer = {
            id: newId,
            ...customer
        };

        this.customers.push(newCustomer)
        this.gateway.emitCustomerCreated(newCustomer)
        return newCustomer
    }
}
