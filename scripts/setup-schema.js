import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Client, Databases, ID } from "node-appwrite";

dotenv.config();

/* ---------------- CONFIG ---------------- */

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = "r1r2_hk";

const CSV_FILE = "./data/r1r2_hk.csv";

const BATCH_SIZE = 25;

/* ---------------- APPWRITE ---------------- */

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

/* ---------------- UTIL ---------------- */

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function normalizeRow(row) {

  const obj = {};

  for (const key of Object.keys(row)) {
    obj[key.trim()] = row[key]?.trim();
  }

  return obj;
}

/* ---------------- VALIDATION ---------------- */

function validateRow(row) {

  const round = Number(row.round);
  const year = Number(row.year);
  const rank = Number(row.closingRank);

  if (!row.collegeId) return false;
  if (!row.collegeCode) return false;
  if (!row.courseId) return false;
  if (!row.category) return false;

  if (round < 1 || round > 2) return false;
  if (year < 2020 || year > 2026) return false;
  if (rank < 1 || rank > 1000000) return false;

  return true;
}

/* ---------------- SEEDER ---------------- */

async function seed() {

  const filePath = path.resolve(CSV_FILE);

  if (!fs.existsSync(filePath)) {
    console.error("CSV file not found:", CSV_FILE);
    process.exit(1);
  }

  console.log("Reading CSV...");

  const csv = fs.readFileSync(filePath, "utf-8");

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log(`Found ${rows.length} rows\n`);

  let inserted = 0;

  for (const rawRow of rows) {

    const row = normalizeRow(rawRow);

    if (!validateRow(row)) {
      console.warn("Skipping invalid row:", row);
      continue;
    }

    const doc = {

      collegeId: row.collegeId,
      collegeCode: row.collegeCode,

      courseId: row.courseId,
      courseName: row.courseName,

      category: row.category,
      seatType: row.seatType,

      round: Number(row.round),
      year: Number(row.year),

      closingRank: Number(row.closingRank)
    };

    try {

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        doc
      );

      inserted++;

    } catch (err) {

      console.error("Insert failed:", err.message);
    }

    if (inserted % BATCH_SIZE === 0) {

      process.stdout.write(`Inserted ${inserted}\r`);

      await sleep(400);
    }
  }

  console.log(`\n\nSeeding complete. Inserted ${inserted} rows.`);
}

/* ---------------- RUN ---------------- */

seed().catch(err => {
  console.error("Seeder crashed:", err);
});