import React from 'react';

const PLATFORM_NAMES = {
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  instagram: 'Instagram Shop',
};

const SyncStatus = ({ platform, status, onSync, isSyncing }) => {
  const statusLabel = isSyncing
    ? 'Syncing...'
    : status.status.charAt(0).toUpperCase() + status.status.slice(1);

  const statusClass = isSyncing ? 'status-syncing' : `status-${status.status}`;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  return (
    <div className="platform-sync">
      <div className="platform-header">
        <span className="platform-name">{PLATFORM_NAMES[platform] || platform}</span>
        <span className={`sync-status ${statusClass}`}>{statusLabel}</span>
      </div>

      {status.error && !isSyncing && (
        <div className="sync-error">{status.error}</div>
      )}

      {status.lastSync && (
        <div className="last-sync">Last sync: {formatDate(status.lastSync)}</div>
      )}

      <div className="platform-actions">
        <button className="btn btn-sync" onClick={onSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <span className="loading" style={{ marginRight: 5 }}></span>
              Syncing
            </>
          ) : (
            'Sync Now'
          )}
        </button>
      </div>
    </div>
  );
};

export default SyncStatus;
