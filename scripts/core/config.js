import dotenv from "dotenv";
dotenv.config();

const REQUIRED = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID"
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing env variable: ${key}`);
    process.exit(1);
  }
}

export const CONFIG = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID
};