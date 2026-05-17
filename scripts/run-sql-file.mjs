import fs from "fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql-file.mjs <path.sql>");
  process.exit(1);
}

const envPath = new URL("../.env.local", import.meta.url);
const envText = fs.readFileSync(envPath, "utf8");
const dbUrl = envText
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.startsWith("DATABASE_URL_POOLER="))
  ?.slice("DATABASE_URL_POOLER=".length)
  ?? envText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("DATABASE_URL=") && !l.includes("POOLER"))
    ?.slice("DATABASE_URL=".length);

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("OK:", file);
} finally {
  await client.end();
}
