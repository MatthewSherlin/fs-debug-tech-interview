const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, 'products.json');

let tiktokRequestCount = 0;
let tiktokResetTime = Date.now();
const TIKTOK_RATE_LIMIT = 3;
const TIKTOK_RESET_INTERVAL = 60000;

let instagramTokens = new Map();
const INSTAGRAM_TOKEN_EXPIRY = 1 * 60 * 1000;

async function ensureDatabase() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ products: [] }, null, 2));
  }
}

async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { products: [] };
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

function generateInstagramToken() {
  const token = `instagram_token_${Date.now()}`;
  instagramTokens.set(token, Date.now());
  return token;
}

function isInstagramTokenValid(token) {
  if (!token || !instagramTokens.has(token)) {
    return false;
  }
  const tokenTime = instagramTokens.get(token);
  return (Date.now() - tokenTime) < INSTAGRAM_TOKEN_EXPIRY;
}

app.get('/api/products', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, description, category } = req.body;

    if (!name || price === undefined || !description || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const product = {
      id: uuidv4(),
      name,
      price: parseFloat(price),
      description,
      category,
      syncStatus: {
        shopify: { status: 'pending', error: null, lastSync: null },
        tiktok: { status: 'pending', error: null, lastSync: null },
        instagram: { status: 'pending', error: null, lastSync: null }
      },
      createdAt: new Date().toISOString()
    };

    const db = await readDatabase();
    db.products.push(product);
    await writeDatabase(db);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.post('/api/sync/:platform/:productId', async (req, res) => {
  try {
    const { platform, productId } = req.params;
    const db = await readDatabase();
    const product = db.products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let syncResult;
    switch (platform) {
      case 'shopify':
        syncResult = await syncToShopify(product);
        break;
      case 'tiktok':
        syncResult = await syncToTikTok(product);
        break;
      case 'instagram':
        syncResult = await syncToInstagram(product, req.body.token);
        break;
      default:
        return res.status(400).json({ error: 'Invalid platform' });
    }

    product.syncStatus[platform] = {
      status: syncResult.success ? 'success' : 'failed',
      error: syncResult.error || null,
      lastSync: syncResult.success ? new Date().toISOString() : product.syncStatus[platform].lastSync
    };

    await writeDatabase(db);
    res.json({
      success: syncResult.success,
      data: syncResult.data,
      error: syncResult.error
    });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

app.delete('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const db = await readDatabase();

    const productIndex = db.products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.products.splice(0, 1);

    await writeDatabase(db);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', message: error.message });
  }
});

async function syncToShopify(product) {
  await new Promise(resolve => setTimeout(resolve, 1200));

  const priceToSend = product.price.toString();

  const mockShopifyResponse = await mockShopifyAPI({
    ...product,
    price: priceToSend
  });

  if (!mockShopifyResponse.success) {
    return {
      success: false,
      error: mockShopifyResponse.error
    };
  }

  return {
    success: true,
    data: {
      shopifyId: `shopify_${product.id}`,
      message: 'Product synced to Shopify successfully'
    }
  };
}

async function mockShopifyAPI(productData) {
  if (typeof productData.price !== 'number') {
    return {
      success: false,
      error: 'Invalid data type: price must be a number'
    };
  }
  return { success: true };
}

async function syncToTikTok(product) {
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (Date.now() - tiktokResetTime > TIKTOK_RESET_INTERVAL) {
    tiktokRequestCount = 0;
    tiktokResetTime = Date.now();
  }

  if (tiktokRequestCount >= TIKTOK_RATE_LIMIT) {
    return {
      success: false,
      error: 'Rate limit exceeded'
    };
  }

  tiktokRequestCount++;
  return {
    success: true,
    data: {
      tiktokId: `tiktok_${product.id}`,
      message: 'Product synced to TikTok successfully'
    }
  };
}

async function syncToInstagram(product, token) {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!isInstagramTokenValid(token)) {
    return {
      success: false,
      error: 'Authentication failed: Token expired or invalid'
    };
  }

  return {
    success: true,
    data: {
      instagramId: `instagram_${product.id}`,
      message: 'Product synced to Instagram successfully'
    }
  };
}

app.post('/api/tiktok/reset', async (req, res) => {
  tiktokRequestCount = 0;
  tiktokResetTime = Date.now();
  res.json({ message: 'TikTok rate limit reset' });
});

app.post('/api/instagram/token', async (req, res) => {
  const token = generateInstagramToken();
  res.json({ token, expiresIn: INSTAGRAM_TOKEN_EXPIRY });
});

app.listen(PORT, async () => {
  await ensureDatabase();
  console.log(`Server running on port ${PORT}`);
});