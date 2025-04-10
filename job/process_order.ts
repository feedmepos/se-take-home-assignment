import { Channel } from 'amqplib';
import { Db, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function processOrder(channel: Channel): Promise<void> {
    //Code below is to ensure each consumer only fetch one message at time and process other message when current one is done
    channel.prefetch(1); // 
    
    const db: Db = await connectToDatabase();
    const consumerInfo = await channel.consume('PROCESS_NEW_ORDERS', async (message: any) => {
        if (message !== null) {
            const bodyparam = JSON.parse(message.content.toString());

            //const db: Db = await connectToDatabase();

            await db.collection('orders').updateOne(
                { _id: new ObjectId(bodyparam._id) },
                { $set: { status: "PROCESSING", processing_at: new Date() } }
            );

            await setTimeout(async () => {
                try {
                    const data = await db.collection('orders').updateOne(
                        { _id: new ObjectId(bodyparam._id) },
                        { $set: { status: "COMPLETED", completed_at: new Date() } }
                    );

                    console.log(`Order ${bodyparam._id} processed and completed.`);

                    channel.ack(message); 

                } catch (error) {
                    console.error('Error processing order:', error);

                    channel.nack(message);  
                }
            }, 10000); 
        }
    }, { noAck: false });

     await db.collection('consumers').insertOne(
        {
            type : 'PROCESS_NEW_ORDERS',
            tag : consumerInfo.consumerTag
        }
    );

    console.log('Waiting for tasks...');
}
