import { Channel } from 'amqplib';
import { Db, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function resetOrderWorker(channel: Channel): Promise<void> {
    channel.consume('RESET_ORDER_WORKERS', async (message: any) => {
        const db: Db = await connectToDatabase();

        const consumers = await db.collection('consumers').find({ type: "PROCESS_NEW_ORDERS" }).toArray();
       
        console.log(consumers);
        
        await Promise.all(
            consumers.map(consumer => channel.cancel(consumer.tag))
        );

        db.collection('consumers').deleteMany({});
        
        await db.collection('orders').updateOne(
            { status: 'PROCESSING' },
            { $set: { status: "PENDING", processing_at: null } }
        );

       await fetch(`${process.env.APP_URI}/api/workers/start`);

       channel.ack(message); 
    }, { noAck: false });

    console.log('Waiting for tasks...');
}