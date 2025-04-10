import { NextResponse } from "next/server";
import { Db } from 'mongodb';

import { connectToDatabase } from '@/lib/mongodb';
import { dispatch } from '@/lib/queue';

export async function POST(request: Request) {
    let param = await request.json();

    param = {
        ...param,
        created_at: new Date()
    };

    const db: Db = await connectToDatabase();
    const data = await db.collection('orders').insertOne(param);

    const queueParam = {
        _id: data.insertedId.toString()
    };

    const optionParam = {
        priority: (param.type == 'VIP_ORDER') ? 2 : 1
    };

    dispatch('PROCESS_NEW_ORDERS', queueParam, optionParam);

    return NextResponse.json({ message: "Order Successfully Added!", status: 200, data });
}