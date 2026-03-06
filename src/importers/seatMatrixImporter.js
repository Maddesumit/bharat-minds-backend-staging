import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ID } from "node-appwrite";
import { databases, DATABASE_ID } from "../appwrite.js";

export async function importSeatMatrix(file) {

  const content = fs.readFileSync(path.resolve(file), "utf8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true
  });

  let count = 0;

  for (const row of rows) {

    try {

      await databases.createDocument(
        DATABASE_ID,
        "seat_matrix",
        ID.unique(),
        row
      );

      count++;

    } catch (err) {
      console.log(err.message);
    }
  }

  console.log(`Seat matrix inserted: ${count}`);
}