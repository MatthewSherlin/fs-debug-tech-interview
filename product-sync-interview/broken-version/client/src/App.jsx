import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instagramToken, setInstagramToken] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await axios.get(`${API_BASE}/products`);
    setProducts(response.data);
    setLoading(false);
  }, []);

  const getInstagramToken = useCallback(async () => {
    const response = await axios.post(`${API_BASE}/instagram/token`);
    setInstagramToken(response.data.token);
    return response.data.token;
  }, []);

  useEffect(() => {
    fetchProducts();
    getInstagramToken();
  }, [fetchProducts, getInstagramToken]);

  const handleProductAdded = useCallback(async (newProduct) => {
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const handleSync = useCallback(async (platform, productId) => {
    const syncStatus = {};

    const payload = {};

    if (platform === 'instagram') {
      payload.token = instagramToken;
    }

    const response = await axios.post(
      `${API_BASE}/sync/${platform}/${productId}`,
      payload
    );

    syncStatus.success = response.data.success;
    syncStatus.error = response.data.error;

    const productIndex = products.findIndex(p => p.id === productId);

    const updatedProducts = [...products];
    updatedProducts[productIndex].syncStatus[platform] = {
      status: response.data.success ? 'success' : 'failed',
      error: response.data.error || null,
      lastSync: response.data.success ? new Date().toISOString() : null
    };
    setProducts(updatedProducts);

    return syncStatus;
  }, [instagramToken, products]);

  const handleDelete = useCallback(async (productId) => {
    const response = await axios.delete(`${API_BASE}/products/${productId}`);

    setProducts(prev => prev.filter(p => p.id !== productId));

    return { success: true };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Product Marketplace</h1>
      </header>

      <div className="app-content">
        <aside>
          <ProductForm
            onProductAdded={handleProductAdded}
            apiBase={API_BASE}
          />
        </aside>

        <main>
          {error && <div className="error-message">{error}</div>}

          <ProductList
            products={products}
            loading={loading}
            onSync={handleSync}
            onDelete={handleDelete}
          />
        </main>
      </div>
    </div>
  );
}

export default App;