import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ID } from "node-appwrite";
import { databases, DATABASE_ID } from "./appwrite.js";
import { ensureCutoffSchema } from "./schema.js";
import { normalizeRow, sleep } from "./utils.js";

const BATCH_SIZE = 25;

export async function importCutoffs(collectionId, filePath) {

  await ensureCutoffSchema(collectionId);

  const fullPath = path.resolve(filePath);

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
    console.log("No data found.");
    return;
  }

  const exclude = ["college code", "course code", "course name", "year", "round"];

  const sample = normalizeRow(rows[0]);

  const categoryColumns = Object.keys(sample)
    .filter(col => !exclude.includes(col));

  let count = 0;

  for (const row of rows) {

    const normalized = normalizeRow(row);

    for (const category of categoryColumns) {

      const value = normalized[category];
      if (!value || isNaN(Number(value))) continue;

      const doc = {
        college_code: normalized["collegecode"],
        course_code: normalized["courseid"],
        course_name: normalized["coursename"],
        category,
        year: Number(normalized["year"]),
        round: Number(normalized["round"]),
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
        process.stdout.write(`\rInserted: ${count}`);
        await sleep(300);
      }
    }
  }

  console.log(`\nCompleted. Inserted ${count} rows.`);
}