import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fznmcmtlrlgcpseiclpz.supabase.co";
const SUPABASE_KEY = "sb_publishable_ROfVI4jH6sT42Uo-4FSq2A_xDncr7Ik";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testGrant() {
  console.log("Testing SQL / RPC call...");
  const { data, error } = await supabase.rpc("has_role" as any, {
    _user_id: "00000000-0000-0000-0000-000000000000",
    _role: "admin",
  });
  console.log("RPC result:", { data, error });
}

testGrant();
