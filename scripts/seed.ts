import { createClient } from "@supabase/supabase-js";
import { MOCK_CATEGORIES, MOCK_TRADERS, MOCK_PRODUCTS } from "../src/lib/mock-data";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fznmcmtlrlgcpseiclpz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_ROfVI4jH6sT42Uo-4FSq2A_xDncr7Ik";

console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Using key: ${SUPABASE_KEY.slice(0, 15)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeed() {
  console.log("Seeding Marketplace database...");

  // 1. Seed Categories if empty
  const { data: existingCategories } = await supabase.from("categories").select("id, slug");
  let categoryIds: Record<string, string> = {};

  const categoriesToInsert = MOCK_CATEGORIES.filter(
    (mc) => !existingCategories?.some((ec) => ec.slug === mc.slug)
  ).map((mc) => ({
    name: mc.name,
    slug: mc.slug,
  }));

  if (categoriesToInsert.length > 0) {
    const { data: inserted, error: catErr } = await supabase
      .from("categories")
      .insert(categoriesToInsert)
      .select();

    if (catErr) {
      console.warn("Category seed error:", catErr.message);
    } else {
      (inserted ?? []).forEach((c) => {
        categoryIds[c.slug] = c.id;
      });
    }
  }

  (existingCategories ?? []).forEach((c) => {
    categoryIds[c.slug] = c.id;
  });

  // 2. Seed Traders if empty
  const { data: existingTraders } = await supabase.from("traders").select("id, shop_name");
  let traderIds: Record<string, string> = {};

  for (let i = 0; i < MOCK_TRADERS.length; i++) {
    const mt = MOCK_TRADERS[i];
    const existing = existingTraders?.find((t) => t.shop_name === mt.shop_name);

    if (existing) {
      traderIds[mt.shop_name] = existing.id;
      continue;
    }

    // Create a unique user for this trader
    const email = `trader_${mt.id}@localmarket.com`;
    const password = "TraderPassword123!";

    let userId: string;
    try {
      const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: mt.shop_name },
      });

      if (userErr) {
        if (userErr.message.includes("already registered") || userErr.message.includes("conflict")) {
          const { data: usersList } = await supabase.auth.admin.listUsers();
          const foundUser = usersList?.users.find((u) => u.email === email);
          if (foundUser) {
            userId = foundUser.id;
          } else {
            throw userErr;
          }
        } else {
          throw userErr;
        }
      } else {
        userId = userRes.user.id;
      }
    } catch (err: any) {
      console.warn(`Could not create/retrieve user for ${mt.shop_name}:`, err.message);
      // Fallback: try to insert using a random UUID (might fail on foreign key if active in DB)
      userId = "00000000-0000-0000-0000-000000000001";
    }

    // Ensure they have the 'trader' role in user_roles
    try {
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "trader",
      });
    } catch (err: any) {
      // Ignore conflict
    }

    // Insert trader record
    const { data: insertedTrader, error: traderErr } = await supabase
      .from("traders")
      .insert({
        user_id: userId,
        shop_name: mt.shop_name,
        description: mt.description,
        address: mt.address,
        status: "approved",
      })
      .select()
      .maybeSingle();

    if (traderErr) {
      console.warn(`Trader ${mt.shop_name} seed note:`, traderErr.message);
      continue;
    }

    if (insertedTrader) {
      traderIds[mt.shop_name] = insertedTrader.id;
    }
  }

  // Refresh existing traders in map
  const { data: finalTraders } = await supabase.from("traders").select("id, shop_name");
  (finalTraders ?? []).forEach((t) => {
    traderIds[t.shop_name] = t.id;
  });

  // 3. Seed Products if empty
  const { data: existingProducts } = await supabase.from("products").select("id, name");

  const productsToInsert = [];
  for (const mp of MOCK_PRODUCTS) {
    if (existingProducts?.some((p) => p.name === mp.name)) {
      continue;
    }

    const mockCat = MOCK_CATEGORIES.find((c) => c.id === mp.category_id);
    const catId = mockCat ? categoryIds[mockCat.slug] : Object.values(categoryIds)[0];

    const mockTrader = MOCK_TRADERS.find((t) => t.id === mp.trader_id);
    const traderId = mockTrader ? traderIds[mockTrader.shop_name] : Object.values(traderIds)[0];

    if (!traderId) {
      console.warn(`Skipping product ${mp.name} because no trader was found.`);
      continue;
    }

    productsToInsert.push({
      trader_id: traderId,
      category_id: catId || null,
      name: mp.name,
      description: mp.description,
      price: mp.price,
      stock: mp.stock,
      image_url: mp.image_url,
      is_active: true,
    });
  }

  if (productsToInsert.length > 0) {
    const { error: prodErr } = await supabase.from("products").insert(productsToInsert);
    if (prodErr) {
      console.warn("Product seed error:", prodErr.message);
    } else {
      console.log(`Seeded ${productsToInsert.length} products successfully.`);
    }
  }

  const { data: allProds } = await supabase.from("products").select("id");
  console.log(`Products total in database: ${allProds?.length ?? 0}`);
  console.log("Database seeding finished!");
}

runSeed();

