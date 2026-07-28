import { createClient } from "@supabase/supabase-js";

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

  let userId: string;

  if (userErr) {
    if (userErr.message.includes("already registered") || userErr.message.includes("conflict")) {
      console.log("User already exists. Finding user ID...");
      const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const foundUser = usersList?.users.find((u) => u.email === email);
      if (!foundUser) throw new Error("Could not find existing user");
      userId = foundUser.id;
    } else {
      throw userErr;
    }
  } else {
    userId = userRes.user.id;
    console.log(`User created successfully with ID: ${userId}`);
  }

  console.log(`Assigning admin role to user ${userId}...`);
  const { error: roleErr } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "admin",
  });

  if (roleErr && !roleErr.message.includes("duplicate")) {
    throw roleErr;
  }

  console.log("Admin role assigned successfully!");
}

createAdmin().catch((err) => {
  console.error("Error:", err.message || err);
});
