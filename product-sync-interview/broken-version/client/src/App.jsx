import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instagramToken, setInstagramToken] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products. Is the server running?');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshInstagramToken = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE}/instagram/token`);
      setInstagramToken(response.data.token);
      return response.data.token;
    } catch (err) {
      console.error('Failed to refresh Instagram token:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    refreshInstagramToken();
    const interval = setInterval(refreshInstagramToken, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshInstagramToken]);

  const handleProductAdded = useCallback((newProduct) => {
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const handleSync = useCallback(async (platform, productId) => {
    const payload = {};
    if (platform === 'instagram') {
      payload.token = instagramToken;
    }

    const response = await axios.post(
      `${API_BASE}/sync/${platform}/${productId}`,
      payload
    );

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              syncStatus: {
                ...p.syncStatus,
                [platform]: {
                  status: response.data.success ? 'success' : 'failed',
                  error: response.data.error || null,
                  lastSync: response.data.success
                    ? new Date().toISOString()
                    : p.syncStatus[platform].lastSync,
                },
              },
            }
          : p
      )
    );

    return { success: response.data.success, error: response.data.error };
  }, [instagramToken]);

  const handleDelete = useCallback(async (productId) => {
    await axios.delete(`${API_BASE}/products/${productId}`);
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Product Sync</h1>
        <p className="app-subtitle">Manage and sync products across platforms</p>
      </header>

      <div className="app-content">
        <aside>
          <ProductForm onProductAdded={handleProductAdded} apiBase={API_BASE} />
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
