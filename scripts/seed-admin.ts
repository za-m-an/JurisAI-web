import bcrypt from "bcryptjs";
import { ensureMigrated, query } from "../src/lib/db";

export async function seedAdmin(): Promise<void> {
  await ensureMigrated();

  const existingAdmins = await query<{ id: string }>(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if (existingAdmins.rows.length > 0) {
    return;
  }

  let email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    if (process.env.NODE_ENV === "production") {
      console.log("No ADMIN_EMAIL/ADMIN_PASSWORD set in production; skipping initial admin seed.");
      return;
    }
    email = "admin@juris.local";
    password = "ChangeMe12345";
    console.warn(
      "WARNING: ADMIN_EMAIL/ADMIN_PASSWORD unset in dev. Seeding default admin: admin@juris.local / ChangeMe12345"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active, token_version, must_change_password, must_enroll_totp)
     VALUES ($1, $2, $3, 'admin', TRUE, 0, TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = TRUE`,
    [email, passwordHash, "System Administrator"]
  );
  console.log(`Seeded admin account: ${email}`);
}

if (require.main === module || process.argv.some((a) => a.endsWith("seed-admin.ts"))) {
  seedAdmin().catch((err) => {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  });
}
