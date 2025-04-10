import { NextResponse } from "next/server";

import { Db } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  const db: Db = await connectToDatabase();
  const data =  await db.collection('settings').findOne({code : "PROCESS_NEW_ORDER_WORKERS"});

	if(data == null){
		await db.collection('settings').insertOne({
			code : "PROCESS_NEW_ORDER_WORKERS",
			number_of_workers : 1,
			previous_number_of_workers : 1
		});
	}
	else{
		db.collection('settings').updateOne({code : "PROCESS_NEW_ORDER_WORKERS"},{
			$set : {
				number_of_workers : 1,
				previous_number_of_workers : 1
			}
		})
	}

	db.collection('consumers').deleteMany({});

 	await fetch(`${process.env.APP_URI}/api/workers/start`);

  	return NextResponse.json({ message: "Worker Running"});
}
