import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  try {
    // 1. Seed Categories if empty
    const { data: existingCategories } = await supabaseAdmin.from("categories").select("id");

    let categoryIds: Record<string, string> = {};

    if (!existingCategories || existingCategories.length === 0) {
      const { data: insertedCategories, error: catErr } = await supabaseAdmin
        .from("categories")
        .insert([
          { name: "Bakery & Pastries", slug: "bakery-pastries" },
          { name: "Fresh Produce", slug: "fresh-produce" },
          { name: "Coffee & Tea", slug: "coffee-tea" },
          { name: "Clothing & Textiles", slug: "clothing-textiles" },
          { name: "Handcrafted Goods", slug: "handcrafted-goods" },
          { name: "Flowers & Plants", slug: "flowers-plants" },
          { name: "Pantry & Deli", slug: "pantry-deli" },
        ])
        .select();

      if (catErr) throw catErr;

      (insertedCategories ?? []).forEach((c) => {
        categoryIds[c.slug] = c.id;
      });
    } else {
      const { data: allCats } = await supabaseAdmin.from("categories").select("id, slug");
      (allCats ?? []).forEach((c) => {
        categoryIds[c.slug] = c.id;
      });
    }

    // 2. Seed Traders if empty
    const { data: existingTraders } = await supabaseAdmin.from("traders").select("id");

    let traderIds: Record<string, string> = {};

    if (!existingTraders || existingTraders.length === 0) {
      // Use a fallback system user ID for sample seed traders
      const seedUserId = "00000000-0000-0000-0000-000000000001";

      const { data: insertedTraders, error: traderErr } = await supabaseAdmin
        .from("traders")
        .insert([
          {
            user_id: seedUserId,
            shop_name: "The Corner Bakery",
            description: "Artisanal sourdough, fresh croissants, and daily baked pastries using heritage grains.",
            address: "12 High Street, Neighborhood Central",
            status: "approved",
          },
          {
            user_id: seedUserId,
            shop_name: "Green Meadow Farm",
            description: "Locally grown organic vegetables, heritage fruit, and farm-fresh produce.",
            address: "45 Valley Road, Farm Market",
            status: "approved",
          },
          {
            user_id: seedUserId,
            shop_name: "Roast & Bean Craft Coffee",
            description: "Specialty single-origin coffee beans ethically sourced and freshly roasted in small batches.",
            address: "8 Artisan Lane, Old Town",
            status: "approved",
          },
          {
            user_id: seedUserId,
            shop_name: "Bloom & Petal Florist",
            description: "Fresh seasonal flower arrangements, potted houseplants, and floral gifts.",
            address: "22 Garden Parade",
            status: "approved",
          },
        ])
        .select();

      if (traderErr) throw traderErr;

      (insertedTraders ?? []).forEach((t) => {
        traderIds[t.shop_name] = t.id;
      });
    } else {
      const { data: allTraders } = await supabaseAdmin.from("traders").select("id, shop_name");
      (allTraders ?? []).forEach((t) => {
        traderIds[t.shop_name] = t.id;
      });
    }

    // 3. Seed Products if empty
    const { data: existingProducts } = await supabaseAdmin.from("products").select("id");

    if (!existingProducts || existingProducts.length === 0) {
      const bakeryId = traderIds["The Corner Bakery"] || Object.values(traderIds)[0];
      const farmId = traderIds["Green Meadow Farm"] || Object.values(traderIds)[0];
      const coffeeId = traderIds["Roast & Bean Craft Coffee"] || Object.values(traderIds)[0];
      const floristId = traderIds["Bloom & Petal Florist"] || Object.values(traderIds)[0];

      const bakeryCat = categoryIds["bakery-pastries"] || Object.values(categoryIds)[0];
      const produceCat = categoryIds["fresh-produce"] || Object.values(categoryIds)[0];
      const coffeeCat = categoryIds["coffee-tea"] || Object.values(categoryIds)[0];
      const flowerCat = categoryIds["flowers-plants"] || Object.values(categoryIds)[0];
      const craftCat = categoryIds["handcrafted-goods"] || Object.values(categoryIds)[0];

      const sampleProducts = [
        {
          trader_id: bakeryId,
          category_id: bakeryCat,
          name: "Organic Country Sourdough Loaf",
          description: "Naturally fermented for 24 hours using local stoneground flour. Crispy crust and chewy interior.",
          price: 4.50,
          stock: 25,
          image_url: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: bakeryId,
          category_id: bakeryCat,
          name: "French Butter Croissants (4-Pack)",
          description: "Flaky, buttery multi-layered croissants baked fresh every morning with Normandy butter.",
          price: 5.50,
          stock: 18,
          image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: farmId,
          category_id: produceCat,
          name: "Heritage Tomato Harvest Box (1kg)",
          description: "A colourful assortment of sweet heirloom tomatoes grown locally without synthetic pesticides.",
          price: 4.20,
          stock: 30,
          image_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: farmId,
          category_id: produceCat,
          name: "Organic Hass Avocados (Net of 4)",
          description: "Perfectly ripe Hass avocados rich in healthy fats, grown using sustainable farming practices.",
          price: 3.80,
          stock: 20,
          image_url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: coffeeId,
          category_id: coffeeCat,
          name: "Ethiopian Yirgacheffe Whole Beans (250g)",
          description: "Light roast with floral jasmine notes, bergamot citrus acidity, and a clean honey finish.",
          price: 9.50,
          stock: 40,
          image_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: coffeeId,
          category_id: coffeeCat,
          name: "Artisanal Earl Grey Loose Tea (100g)",
          description: "Black tea infused with natural Italian bergamot oil and cornflower petals.",
          price: 6.80,
          stock: 15,
          image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: floristId,
          category_id: flowerCat,
          name: "Wildflower Country Bouquet",
          description: "Hand-tied bouquet featuring seasonal sunflowers, eucalyptus, and wildflowers.",
          price: 18.00,
          stock: 12,
          image_url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
        {
          trader_id: floristId,
          category_id: craftCat,
          name: "Hand-Poured Soy Wax Candle (Lavender & Sage)",
          description: "Made with 100% natural soy wax, essential oils, and an eco cotton wick. 45-hour burn time.",
          price: 14.00,
          stock: 15,
          image_url: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80",
          is_active: true,
        },
      ];

      const { error: prodErr } = await supabaseAdmin.from("products").insert(sampleProducts);
      if (prodErr) throw prodErr;
    }

    return { success: true, message: "Demo data seeded successfully!" };
  } catch (err: any) {
    console.error("Error seeding demo data:", err);
    return { success: false, error: err?.message || "Failed to seed demo data" };
  }
});
