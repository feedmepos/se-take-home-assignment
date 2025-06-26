import { NextResponse } from 'next/server';

import { createOrder,getOrders } from './order.service';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newOrder = await createOrder(data);
    return NextResponse.json(newOrder, {status: 201})
  } catch (err){
    console.error('#Order API POST error', err);
    return NextResponse.json({error: 'Failed to create order.'}, {status: 500})
  }
}

export async function GET() {
  try {
    const orders = await getOrders();
    console.log('GET orders', orders);
    return NextResponse.json(orders, {status: 200})
  } catch (err){
    console.error('#Order API GET error', err);
    return NextResponse.json({error: 'Failed to get orders.'}, {status: 500})
  }
}