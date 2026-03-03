export const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

export function normalizeRow(row) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase()] = row[key];
  }
  return normalized;
}