import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ID } from "node-appwrite";
import { databases, DATABASE_ID } from "../appwrite.js";
import { normalizeRow } from "../utils.js";

export async function importHKCutoffs(file, collection) {

  const content = fs.readFileSync(path.resolve(file), "utf8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true
  });

  let inserted = 0;

  for (const row of rows) {

    const normalized = normalizeRow(row);

    const doc = {
      college_code: normalized.collegecode,
      course_code: normalized.coursecode,
      course_name: normalized.coursename,
      category: normalized.category,
      seat_type: "HK",
      round: Number(normalized.round),
      year: Number(normalized.year),
      closing_rank: Number(normalized.closingrank)
    };

    try {

      await databases.createDocument(
        DATABASE_ID,
                  collection,        ID.unique(),
        doc
      );

      inserted++;

    } catch (err) {
      console.log(err.message);
    }
  }

  console.log(`HK inserted: ${inserted}`);
}