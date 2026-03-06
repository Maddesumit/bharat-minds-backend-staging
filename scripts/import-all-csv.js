import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { ID } from "node-appwrite";
import { databases, DATABASE_ID } from "../config/appwriteClient.js";

const DATA_DIR = "./data";

async function importFile(filePath, collectionId) {

  const rows = [];

  return new Promise((resolve, reject) => {

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {

        console.log(`\nImporting ${rows.length} rows → ${collectionId}`);

        let success = 0;
        let failed = 0;

        for (const row of rows) {

          try {

            const formatted = formatRow(row);

            await databases.createDocument(
              DATABASE_ID,
              collectionId,
              ID.unique(),
              formatted
            );

            success++;

          } catch (err) {

            failed++;
            console.log("Insert failed:", err.message);

          }
        }

        console.log(
          `Completed ${collectionId}: ${success} inserted, ${failed} failed`
        );

        resolve();

      })
      .on("error", reject);
  });
}

function formatRow(row) {

  const formatted = {};

  for (const key in row) {

    let value = row[key];

    if (value === "") continue;

    if (!isNaN(value)) {
      value = Number(value);
    }

    if (value === "true" || value === "false") {
      value = value === "true";
    }

    formatted[key] = value;
  }

  return formatted;
}

async function run() {

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".csv"));

  if (files.length === 0) {
    console.log("No CSV files found");
    return;
  }

  console.log(`Found ${files.length} CSV files`);

  for (const file of files) {

    const collectionId = path.basename(file, ".csv");
    const filePath = path.join(DATA_DIR, file);

    await importFile(filePath, collectionId);

  }

  console.log("\nAll imports completed");

}

run().catch(console.error);