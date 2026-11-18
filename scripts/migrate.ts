import { ensureMigrated } from "../src/lib/db";
import { seedAdmin } from "./seed-admin";

export async function runMigrations(): Promise<void> {
  await ensureMigrated();
  await seedAdmin();
  console.log("Database migrations and admin seed completed.");
}

if (require.main === module || process.argv.some((a) => a.endsWith("migrate.ts"))) {
  runMigrations().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}
