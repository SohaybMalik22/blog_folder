import bcrypt from "bcryptjs";
import { connectToDatabase, AdminUserModel } from "@cricket-blog/db";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: pnpm seed-admin <email> <password>");
    process.exit(1);
  }

  await connectToDatabase();
  const passwordHash = await bcrypt.hash(password, 10);

  await AdminUserModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash, role: "admin" },
    { upsert: true }
  );

  console.log(`Admin user ready: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
