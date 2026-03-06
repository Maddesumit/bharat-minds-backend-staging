import { Client, Databases } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

export const databases = new Databases(client);

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;