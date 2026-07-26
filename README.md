# CRACKED

A mobile-first product discovery application for ready-to-drink coolers, seltzers, and ciders sold through Ontario's LCBO ecosystem. The product is designed around discovery, ratings, personal tracking, and barcode-assisted lookup.

## Product idea

Alcohol retail catalogues are useful for inventory lookup but weak at personalized discovery. CRACKED explores a community-driven experience for finding products, recording preferences, and navigating the cooler aisle.

## Technology

- Next.js 16 and React 19
- TypeScript
- Supabase client and SSR helpers
- TanStack Query
- Zustand
- Tailwind CSS
- Framer Motion
- ZXing browser barcode support

## Run locally

```bash
git clone https://github.com/karthikmk007/Coolers_Project-.git
cd Coolers_Project-
npm install
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/home`.

## Available scripts

```bash
npm run dev
npm run build
npm run start
```

## Configuration

The application includes Supabase packages and may require public Supabase environment variables for data-backed features. Before public deployment, add a committed `.env.example` containing variable names only—never real credentials.

## Product and engineering notes

- This is an independent portfolio project and is not affiliated with or endorsed by the LCBO.
- Verify all product data rights and terms before production use.
- Alcohol-related discovery features should include responsible-use messaging and age-appropriate access controls.
- Add automated tests, CI, screenshots, a hosted demo, and documented database setup before presenting this as production-ready.
