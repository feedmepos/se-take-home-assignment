import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI; 
const MONGODB_DB = process.env.MONGODB_DB;   

// Check for required environment variables
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!MONGODB_DB) {
  throw new Error('Please define the MONGODB_DB environment variable');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
//let cachedDb: Db;

if (process.env.APP_ENV === 'development') { //if in development env, we cache the connection to prevent connection pooling each time it called which has overhead cost
	if (!(global as any)._mongoClient) {
		(global as any)._mongoClient = MongoClient.connect(MONGODB_URI);
	}
	clientPromise = (global as any)._mongoClient;
} else { // at production we dont need to cache it at let it reconnect to the mongdb server  as at server usually the mongodb driver has it own connection pooling manager. 
	clientPromise = MongoClient.connect(MONGODB_URI);
}

// Export a function to connect to the database
export async function connectToDatabase(): Promise<Db> {
    client = await clientPromise;

    return client.db(MONGODB_DB);
}