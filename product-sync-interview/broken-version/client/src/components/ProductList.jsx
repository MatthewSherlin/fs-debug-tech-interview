import React, { useState, useCallback } from 'react';
import SyncStatus from './SyncStatus';

const ProductList = ({ products, loading, onSync, onDelete }) => {
  const [syncingStates, setSyncingStates] = useState({});
  const [deletingStates, setDeletingStates] = useState({});

  const handleSync = useCallback((platform, productId) => {
    const key = `${productId}-${platform}`;

    setSyncingStates({ [key]: true });

    
    onSync(platform, productId).then(() => {
      setSyncingStates({ [key]: false });
    });

  }, [onSync]);

  const handleDelete = useCallback((productId) => {
    setDeletingStates({ [productId]: true });

    onDelete(productId);

    setDeletingStates({ [productId]: false });
  }, [onDelete]);

  if (loading) {
    return (
      <div className="product-list">
        <h2>Products</h2>
        <div className="empty-state">
          <div className="loading"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list">
      <h2>Products ({products.length})</h2>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>No products yet. Add your first product!</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-item">
              <div className="product-header">
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="product-meta">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <span className="product-category">{product.category}</span>
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(product.id)}
                  disabled={deletingStates[product.id]}
                  title="Delete product"
                >
                  {deletingStates[product.id] ? (
                    <span className="loading"></span>
                  ) : (
                    <svg className="delete-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  )}
                </button>
              </div>

              <p className="product-description">{product.description}</p>

              <div className="sync-section">
                <h4>Platform Sync Status</h4>
                <div className="sync-platforms">
                  {['shopify', 'tiktok', 'instagram'].map(platform => (
                    <SyncStatus
                      key={platform}
                      platform={platform}
                      status={product.syncStatus[platform]}
                      onSync={() => handleSync(platform, product.id)}
                      isSyncing={syncingStates[`${product.id}-${platform}`]}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;