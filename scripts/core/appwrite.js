import { Client, Databases } from "node-appwrite";
import { CONFIG } from "./config.js";

const client = new Client()
  .setEndpoint(CONFIG.endpoint)
  .setProject(CONFIG.projectId)
  .setKey(CONFIG.apiKey);

export const databases = new Databases(client);
export const DATABASE_ID = CONFIG.databaseId;