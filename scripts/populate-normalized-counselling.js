#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { Client, Databases, ID, Permission, Role } from "node-appwrite";

// ================== ENV VALIDATION ==================

const REQUIRED_ENV = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID"
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// ================== APPWRITE INIT ==================

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const BATCH_SIZE = 25;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// ================== SAFE HELPERS ==================

async function safeCreateCollection(id) {
  try {
    await databases.createCollection(
      DATABASE_ID,
      id,
      id,
      [Permission.read(Role.any())]
    );
    console.log(`✅ Created collection: ${id}`);
  } catch (err) {
    if (err.code !== 409) throw err; // 409 = already exists
    console.log(`ℹ️ Collection exists: ${id}`);
  }
}

async function safeCreateAttribute(fn) {
  try {
    await fn();
  } catch (err) {
    if (err.code !== 409) {
      console.error("Attribute creation failed:", err.message);
    }
  }
}

async function safeCreateIndex(collectionId, key, type, attributes) {
  try {
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      key,
      type,
      attributes
    );
  } catch (err) {
    if (err.code !== 409) {
      console.error(`Index ${key} failed:`, err.message);
    }
  }
}

// ================== SCHEMA ==================

async function ensureCutoffSchema(collectionId) {

  await safeCreateCollection(collectionId);

  await safeCreateAttribute(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "college_code", 50, true)
  );

  await safeCreateAttribute(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "course_code", 50, true)
  );

  await safeCreateAttribute(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "course_name", 500, false)
  );

  await safeCreateAttribute(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "category", 50, true)
  );

  await safeCreateAttribute(() =>
    databases.createIntegerAttribute(DATABASE_ID, collectionId, "year", true)
  );

  await safeCreateAttribute(() =>
    databases.createIntegerAttribute(DATABASE_ID, collectionId, "round", true)
  );

  await safeCreateAttribute(() =>
    databases.createFloatAttribute(DATABASE_ID, collectionId, "cutoff_rank", true)
  );

  // Small delay for attribute readiness
  await sleep(2000);

  await safeCreateIndex(collectionId, "by_category", "key", ["category"]);
  await safeCreateIndex(collectionId, "by_year", "key", ["year"]);
  await safeCreateIndex(collectionId, "by_round", "key", ["round"]);
  await safeCreateIndex(collectionId, "by_college", "key", ["college_code"]);
  await safeCreateIndex(collectionId, "by_cutoff", "key", ["cutoff_rank"]);

  console.log("✅ Schema ensured");
}

// ================== IMPORT ==================

async function importCutoffs(collectionId, filePath) {

  console.log(`\n📂 Importing into ${collectionId}`);

  await ensureCutoffSchema(collectionId);

  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  if (!rows.length) {
    console.log("⚠️ No rows found.");
    return;
  }

  // Dynamic category detection
  const exclude = ["College Code", "Course Code", "Course Name", "Year", "Round"];
  const categoryColumns = Object.keys(rows[0]).filter(
    col => !exclude.includes(col)
  );

  let count = 0;

  for (const row of rows) {

    for (const category of categoryColumns) {

      const value = row[category];
      if (!value || isNaN(Number(value))) continue;

      const doc = {
        college_code: row["collegeCode"],
        course_code: row["courseId"],
        course_name: row["courseName"],
        category,
        year: Number(row["year"]),
        round: Number(row["round"]),
        cutoff_rank: Number(value)
      };

      try {
        await databases.createDocument(
          DATABASE_ID,
          collectionId,
          ID.unique(),
          doc
        );
        count++;
      } catch (err) {
        console.error("Insert failed:", err.message);
      }

      if (count % BATCH_SIZE === 0) {
        process.stdout.write(`\r✓ Inserted ${count}`);
        await sleep(400);
      }
    }
  }

  console.log(`\n🎯 Completed: ${count} records inserted`);
}

// ================== MAIN ==================

async function run() {

  await importCutoffs("R1_Eng", "data/R1_Cutoffs.csv");
  await importCutoffs("R2_Eng", "data/R2_Cutoffs.csv");
  await importCutoffs("R1R2_HK", "data/R1R2_HK_Cutoffs.csv");

  console.log("\n🚀 All normalized imports complete");
}

run().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});