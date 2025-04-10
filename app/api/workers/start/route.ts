import { NextResponse } from "next/server";
import { connectQueue } from '@/lib/queue';
import { processOrder } from '@/job/process_order';
import { resetOrderWorker } from '@/job/reset_order_worker';
import { Db } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';


export async function GET(req: NextApiRequest, res: NextApiResponse) {
	try {

		// Set up the RabbitMQ connection and channel
		const { connection, channel } = await connectQueue();
		const db: Db = await connectToDatabase();
		const workerData = await db.collection('settings').findOne({ code: "PROCESS_NEW_ORDER_WORKERS" });

		for (let i = 0; i < parseInt(workerData.number_of_workers); i++) {
			await processOrder(channel);
		}

		await resetOrderWorker(channel);

		process.on('SIGINT', () => {
			console.log('Gracefully shutting down...');
			connection.close();
			process.exit(0);
		});

		return NextResponse.json({ message: 'Consumer started successfully' });
	} catch (error) {
		console.error('Error while starting the consumer:', error);
		return NextResponse.json({ message: 'Failed to start the consumer' });
	}
}
