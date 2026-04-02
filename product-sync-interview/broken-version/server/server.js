const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Database (flat JSON file)
// ---------------------------------------------------------------------------

const DB_PATH = path.join(__dirname, 'products.json');

async function ensureDatabase() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ products: [] }, null, 2));
  }
}

async function readDatabase() {
  const data = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(data);
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Instagram token management
// ---------------------------------------------------------------------------

const instagramTokens = new Map();
const INSTAGRAM_TOKEN_EXPIRY = 5 * 60 * 1000; // 5 minutes

function generateInstagramToken() {
  const token = `ig_${uuidv4()}`;
  instagramTokens.set(token, Date.now());
  return token;
}

function isInstagramTokenValid(token) {
  if (!token || !instagramTokens.has(token)) return false;
  const issued = instagramTokens.get(token);
  return (Date.now() - issued) < INSTAGRAM_TOKEN_EXPIRY;
}

// ---------------------------------------------------------------------------
// TikTok rate limiting
// ---------------------------------------------------------------------------

let tiktokRequestCount = 0;
let tiktokWindowStart = Date.now();
const TIKTOK_RATE_LIMIT = 10;
const TIKTOK_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// List all products
app.get('/api/products', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create a product
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
        instagram: { status: 'pending', error: null, lastSync: null },
      },
      createdAt: new Date().toISOString(),
    };

    const db = await readDatabase();
    db.products.push(product);
    await writeDatabase(db);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Sync a product to a platform
app.post('/api/sync/:platform/:productId', async (req, res) => {
  try {
    const { platform, productId } = req.params;
    const db = await readDatabase();
    const product = db.products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let result;
    switch (platform) {
      case 'shopify':
        result = await syncToShopify(product);
        break;
      case 'tiktok':
        result = await syncToTikTok(product);
        break;
      case 'instagram':
        result = await syncToInstagram(product, req.body.token);
        break;
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    product.syncStatus[platform] = {
      status: result.success ? 'success' : 'failed',
      error: result.error || null,
      lastSync: result.success
        ? new Date().toISOString()
        : product.syncStatus[platform].lastSync,
    };

    await writeDatabase(db);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

// Delete a product
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

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Generate an Instagram auth token
app.post('/api/instagram/token', (_req, res) => {
  const token = generateInstagramToken();
  res.json({ token, expiresIn: INSTAGRAM_TOKEN_EXPIRY });
});

// Reset product database (for between interviews)
app.post('/api/products/reset', async (_req, res) => {
  await writeDatabase({ products: [] });
  res.json({ message: 'All products cleared' });
});

// ---------------------------------------------------------------------------
// Platform sync functions
// ---------------------------------------------------------------------------

async function syncToShopify(product) {
  await new Promise(resolve => setTimeout(resolve, 800));

  const payload = {
    title: product.name,
    price: product.price.toString(),
    description: product.description,
    category: product.category,
  };

  const response = await mockShopifyAPI(payload);

  if (!response.success) {
    return { success: false, error: response.error };
  }

  return {
    success: true,
    data: { shopifyId: `shp_${product.id}`, message: 'Synced to Shopify' },
  };
}

async function mockShopifyAPI(data) {
  if (typeof data.price !== 'number') {
    return { success: false, error: 'Invalid data type: price must be a number' };
  }
  return { success: true };
}

async function syncToTikTok(product) {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (Date.now() - tiktokWindowStart > TIKTOK_WINDOW_MS) {
    tiktokRequestCount = 0;
    tiktokWindowStart = Date.now();
  }

  if (tiktokRequestCount >= TIKTOK_RATE_LIMIT) {
    const retryIn = Math.ceil(
      (TIKTOK_WINDOW_MS - (Date.now() - tiktokWindowStart)) / 1000
    );
    return { success: false, error: `Rate limit exceeded. Retry in ${retryIn}s` };
  }

  tiktokRequestCount++;
  return {
    success: true,
    data: { tiktokId: `tt_${product.id}`, message: 'Synced to TikTok Shop' },
  };
}

async function syncToInstagram(product, token) {
  await new Promise(resolve => setTimeout(resolve, 600));

  if (!isInstagramTokenValid(token)) {
    return {
      success: false,
      error: 'Authentication failed: token expired or invalid',
    };
  }

  return {
    success: true,
    data: { instagramId: `ig_${product.id}`, message: 'Synced to Instagram Shop' },
  };
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, async () => {
  await ensureDatabase();
  console.log(`Server running on http://localhost:${PORT}`);
});
