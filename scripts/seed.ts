import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fznmcmtlrlgcpseiclpz.supabase.co";
const SUPABASE_KEY = "sb_publishable_ROfVI4jH6sT42Uo-4FSq2A_xDncr7Ik";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeed() {
  console.log("Seeding Marketplace database...");

  // 0. Authenticate
  const seedEmail = "seedadmin@example.com";
  const seedPass = "Password123!";

  let { data: authRes } = await supabase.auth.signInWithPassword({
    email: seedEmail,
    password: seedPass,
  });

  if (!authRes.session) {
    const { data: signUpRes } = await supabase.auth.signUp({
      email: seedEmail,
      password: seedPass,
      options: { data: { name: "Seed Admin" } },
    });
    authRes = signUpRes;
  }

  const userId = authRes.user?.id || "00000000-0000-0000-0000-000000000001";
  console.log(`Authenticated user ID: ${userId}`);

  // 1. Seed Categories
  const categoriesData = [
    { name: "Baked Goods", slug: "baked-goods" },
    { name: "Fresh Produce", slug: "fresh-produce" },
    { name: "Coffee & Tea", slug: "coffee-tea" },
    { name: "Handmade Crafts", slug: "handmade-crafts" },
    { name: "Flowers & Plants", slug: "flowers-plants" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
  ];

  for (const cat of categoriesData) {
    const { error } = await supabase.from("categories").upsert(cat, { onConflict: "slug" });
    if (error) console.warn(`Category ${cat.name} note:`, error.message);
  }

  const { data: allCats } = await supabase.from("categories").select("*");
  console.log(`Categories total: ${allCats?.length ?? 0}`);
  const catMap: Record<string, string> = {};
  (allCats ?? []).forEach((c) => {
    catMap[c.slug] = c.id;
  });

  // 2. Seed Traders
  const tradersData = [
    {
      user_id: userId,
      shop_name: "The Corner Bakery",
      description: "Artisanal sourdough, fresh croissants, and daily baked pastries using heritage grains.",
      address: "12 High Street, Neighborhood Central",
      status: "approved",
    },
    {
      user_id: userId,
      shop_name: "Green Meadow Farm",
      description: "Locally grown organic vegetables, heritage fruit, and farm-fresh produce.",
      address: "45 Valley Road, Farm Market",
      status: "approved",
    },
    {
      user_id: userId,
      shop_name: "Roast & Bean Craft Coffee",
      description: "Specialty single-origin coffee beans ethically sourced and freshly roasted in small batches.",
      address: "8 Artisan Lane, Old Town",
      status: "approved",
    },
    {
      user_id: userId,
      shop_name: "Bloom & Petal Florist",
      description: "Fresh seasonal flower arrangements, potted houseplants, and floral gifts.",
      address: "22 Garden Parade",
      status: "approved",
    },
  ];

  for (const t of tradersData) {
    const { error } = await supabase.from("traders").insert(t);
    if (error) console.warn(`Trader ${t.shop_name} note:`, error.message);
  }

  const { data: allTraders } = await supabase.from("traders").select("*");
  console.log(`Traders total: ${allTraders?.length ?? 0}`);
  const traderMap: Record<string, string> = {};
  (allTraders ?? []).forEach((t) => {
    traderMap[t.shop_name] = t.id;
  });

  // 3. Seed Products
  const bakeryId = traderMap["The Corner Bakery"] || Object.values(traderMap)[0];
  const farmId = traderMap["Green Meadow Farm"] || Object.values(traderMap)[0];
  const coffeeId = traderMap["Roast & Bean Craft Coffee"] || Object.values(traderMap)[0];
  const floristId = traderMap["Bloom & Petal Florist"] || Object.values(traderMap)[0];

  const bakeryCat = catMap["baked-goods"] || Object.values(catMap)[0];
  const produceCat = catMap["fresh-produce"] || Object.values(catMap)[0];
  const coffeeCat = catMap["coffee-tea"] || Object.values(catMap)[0];
  const craftCat = catMap["handmade-crafts"] || Object.values(catMap)[0];
  const flowerCat = catMap["flowers-plants"] || Object.values(catMap)[0];

  if (bakeryId) {
    const productsData = [
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
        trader_id: farmId || bakeryId,
        category_id: produceCat,
        name: "Heritage Tomato Harvest Box (1kg)",
        description: "A colourful assortment of sweet heirloom tomatoes grown locally without synthetic pesticides.",
        price: 4.20,
        stock: 30,
        image_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
      {
        trader_id: farmId || bakeryId,
        category_id: produceCat,
        name: "Organic Hass Avocados (Net of 4)",
        description: "Perfectly ripe Hass avocados rich in healthy fats, grown using sustainable farming practices.",
        price: 3.80,
        stock: 20,
        image_url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
      {
        trader_id: coffeeId || bakeryId,
        category_id: coffeeCat,
        name: "Ethiopian Yirgacheffe Whole Beans (250g)",
        description: "Light roast with floral jasmine notes, bergamot citrus acidity, and a clean honey finish.",
        price: 9.50,
        stock: 40,
        image_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
      {
        trader_id: coffeeId || bakeryId,
        category_id: coffeeCat,
        name: "Artisanal Earl Grey Loose Tea (100g)",
        description: "Black tea infused with natural Italian bergamot oil and cornflower petals.",
        price: 6.80,
        stock: 15,
        image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
      {
        trader_id: floristId || bakeryId,
        category_id: flowerCat,
        name: "Wildflower Country Bouquet",
        description: "Hand-tied bouquet featuring seasonal sunflowers, eucalyptus, and wildflowers.",
        price: 18.00,
        stock: 12,
        image_url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
      {
        trader_id: floristId || bakeryId,
        category_id: craftCat,
        name: "Hand-Poured Soy Wax Candle (Lavender & Sage)",
        description: "Made with 100% natural soy wax, essential oils, and an eco cotton wick. 45-hour burn time.",
        price: 14.00,
        stock: 15,
        image_url: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80",
        is_active: true,
      },
    ];

    for (const p of productsData) {
      const { error } = await supabase.from("products").insert(p);
      if (error) console.warn(`Product ${p.name} note:`, error.message);
    }
  }

  const { data: allProds } = await supabase.from("products").select("id");
  console.log(`Products total in database: ${allProds?.length ?? 0}`);
  console.log("Database seeding finished!");
}

runSeed();
