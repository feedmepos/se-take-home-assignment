import { NextResponse } from "next/server";
import { Db } from 'mongodb';

import { connectToDatabase } from '@/lib/mongodb';
import { dispatch } from '@/lib/queue';

function formatDate(date: Date) {
    return date ? new Date(date).toLocaleString() : null;
}

export async function GET(request: Request) {
    const db: Db = await connectToDatabase();
    const orders = await db.collection('orders').find({}).sort({  completed_at: 1 }).toArray();

    const formattedOrders = orders.map(order => ({
        ...order,
        created_at: formatDate(order.created_at),
        processing_at: formatDate(order.processing_at),
        completed_at: formatDate(order.completed_at),
    }));

    return NextResponse.json({ message: "Order Successfully retrieved!", status: 200, data : formattedOrders });
}