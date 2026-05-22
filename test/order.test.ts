import request from 'supertest';
import app from '../src/app';

describe('POST /order', () => {
  describe('Success Cases', () => {
    it('Should create a new order successfully', async () => {
      const orderInput = {
        input: {
          customer_id: 4,
          restaurant_id: 201,
          order_status: 'pending',
          total_price: 59.90,
          payment_method: 'card',
          payment_status: 'pending',
          member_type: 'vip'
        }
      };

      const response = await request(app)
        .post('/order')
        .send(orderInput)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      
      // Validate order data
      expect(response.body.data).toMatchObject({
        customer_id: 4,
        restaurant_id: 201,
        order_status: 'pending',
        total_price: 59.9,
        payment_method: 'card',
        payment_status: 'pending',
        member_type: 'vip'
      });

      // Validate generated fields
      expect(response.body.data).toHaveProperty('order_id');
      expect(response.body.data).toHaveProperty('queue_id');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');

      expect(response.body.data.order_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(new Date(response.body.data.created_at).toISOString())
        .toBe(response.body.data.created_at);
      expect(new Date(response.body.data.updated_at).toISOString())
        .toBe(response.body.data.updated_at);
      expect(typeof response.body.data.queue_id).toBe('number');
    });

    it('Should handle different member types', async () => {
      const orderInput = {
        input: {
          customer_id: 5,
          restaurant_id: 202,
          order_status: 'pending',
          total_price: 120.50,
          payment_method: 'card',
          payment_status: 'pending',
          member_type: 'normal'
        }
      };

      const response = await request(app)
        .post('/order')
        .send(orderInput)
        .expect(200);

      expect(response.body.data.member_type).toBe('normal');
      expect(response.body.data.customer_id).toBe(5);
    });
  });

  describe('Validation Error Cases', () => {
    it('should return 500 when input field is missing', async () => {
      const response = await request(app)
        .post('/order')
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty('errors');
    });

    // it('should return 400 when customer_id is missing', async () => {
    //   const invalidInput = {
    //     input: {
    //       restaurant_id: 201,
    //       order_status: 'pending',
    //       total_price: 59.90,
    //       payment_method: 'card',
    //       payment_status: 'pending',
    //       member_type: 'vip'
    //     }
    //   };

    //   const response = await request(app)
    //     .post('/order')
    //     .send(invalidInput)
    //     .expect(400);

    //   expect(response.body.error).toContain('customer_id');
    // });

    // it('should return 400 when total_price is negative', async () => {
    //   const invalidInput = {
    //     input: {
    //       customer_id: 4,
    //       restaurant_id: 201,
    //       order_status: 'pending',
    //       total_price: -10,
    //       payment_method: 'card',
    //       payment_status: 'pending',
    //       member_type: 'vip'
    //     }
    //   };

    //   const response = await request(app)
    //     .post('/order')
    //     .send(invalidInput)
    //     .expect(400);

    //   expect(response.body.error).toContain('total_price');
    // });

    // it('should return 400 when customer_id is not a number', async () => {
    //   const invalidInput = {
    //     input: {
    //       customer_id: '4',
    //       restaurant_id: 201,
    //       order_status: 'pending',
    //       total_price: 59.90,
    //       payment_method: 'card',
    //       payment_status: 'pending',
    //       member_type: 'vip'
    //     }
    //   };

    //   const response = await request(app)
    //     .post('/order')
    //     .send(invalidInput)
    //     .expect(400);

    //   expect(response.body.error).toContain('customer_id');
    // });

    // it('should return 400 for missing required fields', async () => {
    //   const requiredFields = [
    //     'customer_id',
    //     'restaurant_id',
    //     'order_status',
    //     'total_price',
    //     'payment_method',
    //     'payment_status',
    //     'member_type'
    //   ];

    //   for (const field of requiredFields) {
    //     const invalidInput = {
    //       input: {
    //         customer_id: 4,
    //         restaurant_id: 201,
    //         order_status: 'pending',
    //         total_price: 59.90,
    //         payment_method: 'card',
    //         payment_status: 'pending',
    //         member_type: 'vip'
    //       }
    //     };

    //     delete (invalidInput.input as any)[field];

    //     const response = await request(app)
    //       .post('/order')
    //       .send(invalidInput)
    //       .expect(400);

    //     expect(response.body.error).toContain(field);
    //   }
    // });
  });
});
