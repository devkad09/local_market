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

const url = process.env.SUPABASE_URL || "https://xgfjnabssmoeenunpgef.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function run() {
  const sqlPath = path.join(process.cwd(), "supabase/migrations/20260731000000_fix_orders_rls_recursion.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("Applying SQL migration to Supabase URL:", url);

  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (response.ok) {
    console.log("Successfully applied migration via REST API!");
  } else {
    console.log("REST status:", response.status, await response.text());
  }
}

run().catch(console.error);
