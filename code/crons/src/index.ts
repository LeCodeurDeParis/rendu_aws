import { backup } from "./backup.js";

export const handler = async () => {
  console.log("Starting database backup...");
  try {
    const result = await backup();
    console.log(`Backup completed: ${result.fileName} (${result.size} bytes)`);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error("Backup failed:", err);
    throw err;
  }
};

// Dev: run directly
if (typeof Bun !== "undefined" && process.argv[1]?.endsWith("index.ts")) {
  handler().then(console.log).catch(console.error);
}
