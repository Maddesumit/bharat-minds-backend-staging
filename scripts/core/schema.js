import { databases, DATABASE_ID } from "./appwrite.js";
import { Permission, Role } from "node-appwrite";

async function safe(fn) {
  try {
    await fn();
  } catch (err) {
    if (err.code !== 409) {
      console.error(err.message);
    }
  }
}

export async function ensureCutoffSchema(collectionId) {

  await safe(() =>
    databases.createCollection(
      DATABASE_ID,
      collectionId,
      collectionId,
      [Permission.read(Role.any())]
    )
  );

  await safe(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "college_code", 50, true)
  );

  await safe(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "course_code", 50, true)
  );

  await safe(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "course_name", 500, false)
  );

  await safe(() =>
    databases.createStringAttribute(DATABASE_ID, collectionId, "category", 50, true)
  );

  await safe(() =>
    databases.createIntegerAttribute(DATABASE_ID, collectionId, "year", true)
  );

  await safe(() =>
    databases.createIntegerAttribute(DATABASE_ID, collectionId, "round", true)
  );

  await safe(() =>
    databases.createFloatAttribute(DATABASE_ID, collectionId, "cutoff_rank", true)
  );

  await safe(() =>
    databases.createIndex(DATABASE_ID, collectionId, "by_category", "key", ["category"])
  );

  await safe(() =>
    databases.createIndex(DATABASE_ID, collectionId, "by_year", "key", ["year"])
  );

  await safe(() =>
    databases.createIndex(DATABASE_ID, collectionId, "by_college", "key", ["college_code"])
  );

  console.log("Schema ensured.");
}