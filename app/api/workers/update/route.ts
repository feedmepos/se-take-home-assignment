import { NextResponse } from "next/server";
import { Db } from 'mongodb';

import { connectToDatabase } from '@/lib/mongodb';
import { dispatch } from '@/lib/queue';
export async function POST(request : Request){
    const param = await request.json();

    const db: Db = await connectToDatabase();
    const workerData =  await db.collection('settings').findOne({code : "PROCESS_NEW_ORDER_WORKERS"});

    let currentSize = workerData.number_of_workers;
    const previousNumberOfWorkers = workerData.number_of_workers;

    currentSize = (param.type == 'ADD') ? parseInt(currentSize) + parseInt(param.number_of_workers) :  currentSize = parseInt(currentSize) - parseInt(param.number_of_workers);

    console.log({
        current_size: currentSize,
        previous_size: previousNumberOfWorkers
    });

    if(currentSize >= 1){
        db.collection('settings').updateOne({code : "PROCESS_NEW_ORDER_WORKERS"},{
            $set : {
                'number_of_workers' : currentSize,
                previous_number_of_workers : previousNumberOfWorkers
            }
        })

        await dispatch('RESET_ORDER_WORKERS');

        return NextResponse.json({message : "Workers number successfully updated", status :200});
    }
   
    return NextResponse.json({message : "Workers number cannot less than 1", status :422});
}