# Product Sync Application - Interview Exercise

This is a very simple full-stack Product Syndication application that allows users to manage products and sync them to multiple e-commerce platforms (Shopify, TikTok Shop, Instagram Shop).

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd broken-version/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   The server will run on http://localhost:5000

### Frontend Setup
1. In a new terminal, navigate to the client directory:
   ```bash
   cd broken-version/client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React app:
   ```bash
   npm start
   ```

   The app will open in your browser at http://localhost:3000

## Application Features

- **Add Products**: Create new products with name, price, description, and category
- **View Products**: See all products in a list view
- **Sync to Platforms**: Sync individual products to Shopify, TikTok Shop, or Instagram Shop
- **Status Tracking**: View sync status (pending/success/failed) for each platform
- **Error Display**: See error messages when sync operations fail

## Your Task

This application contains several bugs that need to be identified and fixed. The application should work smoothly, handling all edge cases and error scenarios properly.

Test the application thoroughly by:
1. Adding multiple products
2. Syncing products to different platforms
3. Testing rapid/multiple sync operations
4. Observing behavior over time (10+ minutes)
5. Checking error handling and recovery

Good luck!