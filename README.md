# Product Sync Technical Interview

A simple full-stack application for managing product listings and syncing them across multiple e-commerce platforms.

## Overview

This project is a Product Marketplace application that allows users to:
- Add and manage product listings
- Sync products to multiple e-commerce platforms (Shopify, TikTok Shop, Instagram Shop)
- Track sync status for each platform
- Handle platform-specific requirements and limitations

**Note:** This is a simplified application designed for technical assessment purposes. It uses mock API endpoints and simulated platform responses to demonstrate handling of common real-world scenarios such as rate limiting, authentication token management, data type validation, and asynchronous operations. The application intentionally includes various edge cases and potential issues that might be encountered when working with third-party e-commerce APIs.

## Tech Stack

**Frontend:**
- React
- Axios for API calls
- CSS for styling

**Backend:**
- Node.js
- Express.js
- File-based data storage (JSON)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd technical_interview
```

2. Install backend dependencies:
```bash
cd product-sync-interview/broken-version/server
npm install
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

### Running the Application

1. Start the backend server (from the server directory):
```bash
npm start
```
The server will run on http://localhost:5000

2. In a new terminal, start the frontend (from the client directory):
```bash
npm start
```
The application will open in your browser at http://localhost:3000

## Project Structure

```
technical_interview/
├── product-sync-interview/
│   └── broken-version/
│       ├── client/          # React frontend
│       │   ├── src/
│       │   │   ├── components/
│       │   │   ├── App.jsx
│       │   │   └── index.js
│       │   └── package.json
│       └── server/          # Express backend
│           ├── server.js
│           ├── products.json
│           └── package.json
└── README.md
```

## Features

- **Product Management**: Create, view, and delete products
- **Multi-Platform Sync**: Integration with Shopify, TikTok Shop, and Instagram Shop
- **Real-time Status Updates**: Track sync status for each platform
- **Error Handling**: Comprehensive error handling and user feedback

## API Endpoints

- `GET /api/products` - Fetch all products
- `POST /api/products` - Create a new product
- `DELETE /api/products/:id` - Delete a product
- `POST /api/sync/:platform/:productId` - Sync product to platform
- `POST /api/instagram/token` - Generate Instagram token

## Authored by

Matthew Michael Sherlin

## License

MIT