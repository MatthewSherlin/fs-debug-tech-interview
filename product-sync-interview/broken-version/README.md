# Product Sync — Interview Exercise

A simple full-stack product management app that syncs products to multiple e-commerce platforms (Shopify, TikTok Shop, Instagram Shop).

## Getting Started

### Prerequisites

- Node.js v14+
- npm

### 1. Start the backend

```bash
cd broken-version/server
npm install
npm run dev
```

The API will be available at **http://localhost:8000**.

### 2. Start the frontend

In a separate terminal:

```bash
cd broken-version/client
npm install
npm start
```

The app will open at **http://localhost:3000**.

## Features

- **Add products** — name, price, description, and category
- **View products** — listed with sync status per platform
- **Sync to platforms** — push individual products to Shopify, TikTok Shop, or Instagram Shop
- **Delete products** — remove products from the database
- **Status tracking** — see pending / success / failed per platform with error details

## Your Task

This application has bugs affecting its core features. Your job is to find and fix them.

Suggested testing approach:

1. Add a few products
2. Try syncing each product to the different platforms
3. Try syncing multiple products at the same time
4. Try deleting products and verify the correct ones are removed
5. Check error messages and loading states

Good luck!
