# Local Market — Neighbourhood Trader Marketplace

A modern, type-safe, multi-vendor e-commerce platform that connects local artisans, neighbourhood shops, and market vendors with customers in their community. Customers can shop across multiple vendors using a unified shopping cart, while traders can manage inventory and orders from a dedicated dashboard.

---

## 🚀 Key Features

* **Unified Multi-Vendor Cart**: Customers can purchase products from different traders and check out using a single, secure payment.
* **Role-Based Workflows**:
  * 👤 **Customer**: Browse products/shops, filter by category, manage cart, place orders, and track order fulfillment.
  * 🏪 **Trader**: Apply for a vendor account, configure shop profiles, manage product inventory (create, read, update, delete, toggle active status), and update fulfillment status for shop-specific order items.
  * 🛡️ **Admin**: Review/approve pending trader applications, manage platform categories, view system-wide transaction metrics, and manage user roles.
* **State & Data Synced in Real-Time**: Optimistic UI updates powered by **TanStack Query** coupled with a robust PostgreSQL backend via **Supabase**.
* **Type-Safe File-Based Routing**: Clean, type-safe URL layouts using **TanStack Router**.
* **Beautiful, Responsive Design**: A modern, sleek UI built using **Tailwind CSS v4** and **Radix UI (shadcn)** components.

---

## 🛠️ Technology Stack

* **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
* **Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (SSR/SPA hybrid framework)
* **Routing**: [TanStack Router](https://tanstack.com/router/v1/docs/guide/routing) (file-based, type-safe)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security (RLS), triggers, and auth functions)
* **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/v1)
* **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) (validation)
* **Payments**: [Stripe](https://stripe.com/)
* **Icons & Notifications**: [Lucide React](https://lucide.dev/) & [Sonner](https://github.com/emilkowalski/sonner)

---

## 📁 Repository Structure

```
├── .tanstack/           # TanStack Router configuration/cache
├── public/              # Static assets (favicons, logos)
├── src/
│   ├── assets/          # App assets (e.g., market-hero.jpg)
│   ├── components/      # Shared components & UI primitives (shadcn-based)
│   │   ├── ui/          # Radix & primitive visual layout components
│   │   └── site-header.tsx  # Global header navigation
│   ├── hooks/           # Custom React hooks (e.g. cart context hooks)
│   ├── integrations/
│   │   └── supabase/    # Supabase Client setup, types, and auth middlewares
│   ├── lib/             # Utility functions, sample data, and seeding helpers
│   ├── routes/          # File-based routes (TanStack Start app routes)
│   │   ├── __root.tsx   # Global layout shell & providers
│   │   ├── admin.tsx    # Admin Dashboard interface
│   │   ├── trader.tsx   # Trader Shop & Order management
│   │   └── shop.tsx     # Product directory search and filter
│   ├── router.tsx       # Router registration
│   ├── server.ts        # Server entry-point
│   ├── start.ts         # Client entry-point
│   └── styles.css       # Global styles & Tailwind CSS imports
├── supabase/
│   ├── config.toml      # Supabase local environment config
│   └── migrations/      # DB migrations containing tables, RLS, and triggers
├── bun.lock             # Bun dependency lockfile
├── package.json         # Scripts, configurations, and dependencies
└── tsconfig.json        # TypeScript setup
```

---

## 🗄️ Database Architecture

The PostgreSQL schema is managed in the [supabase/migrations/](file:///Users/kad/Downloads/project/supabase/migrations/) directory. It leverages Postgres triggers, enums, and Row Level Security (RLS) to enforce data privacy and security.

### Key Tables
1. **`profiles`**: Stores customer and vendor details, automatically generated when a user signs up.
2. **`user_roles`**: Maps users to roles: `customer`, `trader`, or `admin`.
3. **`traders`**: Details of vendor shops (`shop_name`, `address`, `status: pending | approved | suspended`).
4. **`products`**: Multi-vendor product items including pricing, stock quantities, and associations to a category and trader.
5. **`orders` / `order_items`**: Manages orders placed by customers, mapping products from multiple vendors.
6. **`payments`**: Records payment statuses and Stripe session identifiers.

---

## ⚡ Getting Started

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh/) (or Node.js + npm) installed.

### 2. Environment Setup
Create a `.env` file in the root of the project:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
# Server-side variables if executing server functions:
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 3. Installation
Install project dependencies:
```bash
bun install
# or
npm install
```

### 4. Running the Development Server
Run the local dev environment:
```bash
bun dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port specified by Vite) in your browser.

### 5. Seeding Demo Data
To quickly populate the local database with sample categories, vendors, and products:
1. Access the homepage `/`.
2. If the database is empty, click the **"Load Sample Shops & Products"** button in the hero section.
3. This seeds authentic local product listings (like Bonwire Kente Stoles, Organic Shea Butter, Bolgatanga Straw Baskets, and local fresh produce) to make development and previewing immediate.

---

## 🛡️ Security & Row Level Security (RLS)

All tables inside the database enforce **Row Level Security (RLS)**. Security policies guarantee that:
* Customers can only read and write their own profile, orders, and payment records.
* Traders can edit/manage products belonging to their shop, but cannot alter other traders' inventory.
* Admins hold permissions to approve pending traders, create categories, and view all orders.
* Custom database triggers automatically assign the `customer` role to any newly registered auth user.
