# Bambi E-commerce System

Bambi is a multi-vendor e-commerce platform built with TypeScript, Express, Prisma, and PostgreSQL. The project includes a customer storefront, seller features, an admin dashboard, and the backend API that serves them.

## Live Demo

- Customer storefront: `https://bambi.io.vn/`
- Admin dashboard: `https://bambi.io.vn/ui/admin/`

Demo account:

- Email: `test@example.com`
- Password: `abc@123`

Notes:

- This account is available for recruiters and reviewers who want to explore the admin area.
- If the session looks outdated or permissions do not refresh correctly, sign out and sign in again.

## Key Features

- User registration, login, JWT refresh, and profile management
- Product catalog, categories, search, filtering, and product detail pages
- Cart, checkout, order management, and shipment tracking
- Product reviews with media support
- Shop onboarding and seller-side workflows
- Admin dashboard for overview, users, shops, products, vouchers, returns, and recent orders
- Background jobs for operational automation such as auto-receive and seller payout processing

## Tech Stack

- Node.js
- TypeScript
- Express 5
- Prisma ORM
- PostgreSQL
- JWT authentication
- HTML, CSS, and JavaScript for the static UI
- PM2 and Nginx for production deployment

## Project Structure

```text
.
|-- prisma/           Prisma schema and migrations
|-- public/           Storefront, seller, account, and admin UI
|-- src/
|   |-- jobs/         Scheduler jobs
|   |-- libs/         Shared libraries
|   |-- middleware/   Authentication and error middleware
|   `-- modules/      Domain-based feature modules
`-- dist/             Production build output
```

## API Route Groups

- `/auth`
- `/users`
- `/products`
- `/cart`
- `/checkout`
- `/orders`
- `/shipments`
- `/reviews`
- `/shops`
- `/admin`
- `/search`
- `/payments`
- `/returns`
- `/categories`
- `/notifications`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Minimum required variables:

- `DATABASE_URL`
- `JWT_SECRET`

### 3. Generate the Prisma client and run migrations

```bash
npm run prisma:generate
npx prisma migrate deploy
```

### 4. Start the development server

```bash
npm run dev
```

The app runs locally at `http://localhost:3000`.

## Production Notes

- Static frontend assets are served by the same Express app under `/ui`
- Production runs through PM2 with `dist/index.js` as the entry point
- Nginx is used as the reverse proxy in front of the Node app
- After updating production code, the app must be rebuilt and the PM2 process must be reloaded

## Notes For Recruiters

- The customer site and admin dashboard are connected to the same production backend
- The demo account can be used to review the admin workflow
- A common deployment issue after code updates is forgetting to rebuild or reload the PM2 process
