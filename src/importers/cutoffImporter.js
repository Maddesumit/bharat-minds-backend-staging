import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ID } from "node-appwrite";
import { databases, DATABASE_ID } from "../appwrite.js";
import { normalizeRow, sleep } from "../utils.js";

export async function importEngineeringCutoffs(file, round, collection) {

  const content = fs.readFileSync(path.resolve(file), "utf8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const sample = normalizeRow(rows[0]);

  const exclude = [
    "collegecode",
    "coursecode",
    "coursename",
    "year",
    "round"
  ];

  const categories = Object.keys(sample).filter(
    (c) => !exclude.includes(c)
  );

  let inserted = 0;

  for (const row of rows) {

    const normalized = normalizeRow(row);

    for (const category of categories) {

      const value = normalized[category];

      if (!value || isNaN(Number(value))) continue;

      const doc = {
        college_code: normalized.collegecode,
        course_code: normalized.coursecode,
        course_name: normalized.coursename,
        category,
        seat_type: "ENG",
        round: Number(round),
        year: Number(normalized.year),
        closing_rank: Number(value)
      };

      try {

        await databases.createDocument(
          DATABASE_ID,
          collection,
          ID.unique(),
          doc
        );

        inserted++;

      } catch (err) {
        console.log("Insert failed:", err.message);
      }

      if (inserted % 50 === 0) {
        process.stdout.write(`\rInserted ${inserted}`);
        await sleep(200);
      }
    }
  }

  console.log(`\nFinished: ${inserted} ENG cutoffs`);
}