import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MOCK_CATEGORIES, MOCK_TRADERS, MOCK_PRODUCTS } from "./mock-data";

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  try {
    // 1. Seed Categories if empty
    const { data: existingCategories } = await supabaseAdmin.from("categories").select("id, slug");

    let categoryIds: Record<string, string> = {};

    const categoriesToInsert = MOCK_CATEGORIES.filter(
      (mc) => !existingCategories?.some((ec) => ec.slug === mc.slug)
    ).map((mc) => ({
      name: mc.name,
      slug: mc.slug,
    }));

    if (categoriesToInsert.length > 0) {
      const { data: inserted, error: catErr } = await supabaseAdmin
        .from("categories")
        .insert(categoriesToInsert)
        .select();

      if (catErr) throw catErr;

      (inserted ?? []).forEach((c) => {
        categoryIds[c.slug] = c.id;
      });
    }

    (existingCategories ?? []).forEach((c) => {
      categoryIds[c.slug] = c.id;
    });

    // 2. Seed Traders if empty
    const { data: existingTraders } = await supabaseAdmin.from("traders").select("id, shop_name");

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
        const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: mt.shop_name },
        });

        if (userErr) {
          if (userErr.message.includes("already registered") || userErr.message.includes("conflict")) {
            const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
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
      } catch (err) {
        console.error(`Failed to create user for ${mt.shop_name}:`, err);
        continue;
      }

      // Ensure they have the 'trader' role in user_roles
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "trader",
      });
      if (roleErr && !roleErr.message.includes("duplicate")) {
        console.warn(`Warning setting trader role: ${roleErr.message}`);
      }

      // Insert trader record
      const { data: insertedTrader, error: traderErr } = await supabaseAdmin
        .from("traders")
        .insert({
          user_id: userId,
          shop_name: mt.shop_name,
          description: mt.description,
          address: mt.address,
          status: "approved",
        })
        .select()
        .single();

      if (traderErr) {
        console.error(`Error inserting trader ${mt.shop_name}:`, traderErr.message);
        continue;
      }

      traderIds[mt.shop_name] = insertedTrader.id;
    }

    // Refresh existing traders in map
    const { data: finalTraders } = await supabaseAdmin.from("traders").select("id, shop_name");
    (finalTraders ?? []).forEach((t) => {
      traderIds[t.shop_name] = t.id;
    });

    // 3. Seed Products if empty
    const { data: existingProducts } = await supabaseAdmin.from("products").select("id, name");

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
      const { error: prodErr } = await supabaseAdmin.from("products").insert(productsToInsert);
      if (prodErr) throw prodErr;
    }

    return { success: true, message: "Demo data seeded successfully!" };
  } catch (err: any) {
    console.error("Error seeding demo data:", err);
    return { success: false, error: err?.message || "Failed to seed demo data" };
  }
});

