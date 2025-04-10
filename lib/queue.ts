import amqp, { Connection, Channel } from 'amqplib';

let channel: Channel | null = null;
let connection: Connection | null = null;

const queueNames = ['PROCESS_NEW_ORDERS', 'RESET_ORDER_WORKERS'];

async function connectQueue(): Promise<{ connection: Connection | null, channel: Channel | null }> {
	try {

		const rabbitmqUri = process.env.RABBITMQ_URI ?? null;

		if (!rabbitmqUri) {
			throw new Error('RABBITMQ_URI not found');
		}

		if (!(global as any).connection) {
			(global as any).connection = await amqp.connect(rabbitmqUri);
		}

		connection = (global as any).connection;

		//create single connection pool for rabbitMQ
		if (!(global as any).channel) {
			(global as any).channel = await connection.createChannel();
		}

		channel = (global as any).channel;

		//initalize queue name at rabbitMQ management website
		for (const queueName of queueNames) {
			await channel.assertQueue(queueName, {
				durable: true,
				arguments: { 'x-max-priority': 10 }
			});

			console.log(`Queue '${queueName}' declared successfully.`);
		}

		console.log('Connected to RabbitMQ');
	} catch (err) {
		console.error('Error connecting to RabbitMQ:', err);
	}

	return { connection, channel };
}

async function dispatch(queueName: string, param: any = {}, options: any = {}): Promise<void> {
	try {
		const queueOptions = {
			persistent: true,
			...options
		};

		if (!channel)
			({ connection, channel } = await connectQueue());

		channel.sendToQueue(queueName, Buffer.from(JSON.stringify(param)), queueOptions);
		console.log('Queue dispatched : ' + queueName);
	}
	catch (err) {
		console.error('Error dispatching job to RabbitMQ:', err);
	}
}

export { connectQueue, dispatch };