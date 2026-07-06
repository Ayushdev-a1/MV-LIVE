import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Log the URI (redact credentials for safety)
console.log('[MongoDB] Connecting to:', uri.replace(/:\/\/.*@/, '://<redacted>@'));

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to avoid multiple connections during hot reloads
  const globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

let dbInstance: Db | null = null;
let indexesInitialized = false;

async function ensureIndexes(db: Db) {
  if (indexesInitialized) return;
  try {
    console.log('[MongoDB] Creating indexes...');
    
    // Users collection indexes
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
    
    // Rooms collection indexes
    const rooms = db.collection('rooms');
    await rooms.createIndex({ roomCode: 1 }, { unique: true });
    await rooms.createIndex({ isActive: 1 });
    await rooms.createIndex({ hostId: 1 });
    await rooms.createIndex({ 'participants.userId': 1 });

    // Upload sessions indexes
    const uploadSessions = db.collection('upload_sessions');
    await uploadSessions.createIndex({ sessionId: 1 }, { unique: true });
    await uploadSessions.createIndex({ expiresAt: 1 });

    indexesInitialized = true;
    console.log('[MongoDB] Indexes created successfully');
  } catch (error) {
    console.error('[MongoDB] Error creating indexes:', error);
  }
}

export async function getDatabase(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || 'cinesync';
  dbInstance = client.db(dbName);
  
  // Initialize indexes asynchronously so we do not block connection retrieval
  ensureIndexes(dbInstance);
  
  return dbInstance;
}