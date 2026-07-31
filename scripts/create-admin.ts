import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  } catch (e) {
    console.error("Error reading .env:", e);
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xgfjnabssmoeenunpgef.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  const email = "deve.kad.tech@gmail.com";
  const password = "Kelvin200@";

  console.log(`Creating user ${email}...`);

  const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Kelvin Admin" },
  });

  let userId: string | undefined;

  if (userErr) {
    console.log("User creation note:", userErr.message);
    console.log("Finding user ID from Supabase auth...");
    const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const foundUser = usersList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!foundUser) throw new Error(`Could not find user with email ${email}`);
    userId = foundUser.id;
  } else {
    userId = userRes.user.id;
    console.log(`User created successfully with ID: ${userId}`);
  }

  console.log(`Assigning admin role to user ${userId}...`);
  const { error: roleErr } = await supabase.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  }, { onConflict: "user_id,role" });

  if (roleErr) {
    console.log("Role update note:", roleErr.message);
  } else {
    console.log("Admin role assigned successfully!");
  }
}

createAdmin().catch((err) => {
  console.error("Error:", err.message || err);
});
