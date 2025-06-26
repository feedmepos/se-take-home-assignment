import { NextRequest } from 'next/server';

import { POST } from '@/app/api/orders/route'

describe('Orders API', () => {

    describe('POST /api/orders', () => {
        it('should create a normal order', async ()=> {
            const req = new NextRequest('http://localhost/api/orders',{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'NORMAL'
                }),
              });
              const res = await POST(req);
          
              expect(res.status).toBe(201);
              expect(await res.json()).toEqual(
                expect.objectContaining({
                  id: expect.stringMatching(/^\d{14}$/),
                  createdAt: expect.any(Number),
                  status: 'PENDING',
                  type: 'NORMAL',
                })
              );
        })
        it('should create a VIP order', async ()=> {
            const req = new NextRequest('http://localhost/api/orders',{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'VIP'
                }),
              });
              const res = await POST(req);
          
              expect(res.status).toBe(201);
              expect(await res.json()).toEqual(
                expect.objectContaining({
                    id: expect.stringMatching(/^\d{14}$/),
                    createdAt: expect.any(Number),
                  status: 'PENDING',
                  type: 'VIP',
                })
              );
        })
    });

    
})