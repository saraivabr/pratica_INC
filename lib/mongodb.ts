import "server-only";
import { MongoClient, Db } from "mongodb";

declare global {
  var __mongoClient: MongoClient | undefined;
}

function getClient(): MongoClient {
  if (!global.__mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is required");
    }

    global.__mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
  }
  return global.__mongoClient;
}

export function getMongoDb(): Db {
  return getClient().db();
}

export function getMongoClient(): MongoClient {
  return getClient();
}

export default getMongoDb;
