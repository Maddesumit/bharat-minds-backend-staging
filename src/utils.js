export const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeRow(row) {
  const out = {};
  for (const key in row) {
    out[normalizeKey(key)] = row[key];
  }
  return out;
}