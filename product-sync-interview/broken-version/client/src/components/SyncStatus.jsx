import React from 'react';

const SyncStatus = ({ platform, status, onSync, isSyncing }) => {
  const getPlatformDisplayName = () => {
    const names = {
      shopify: 'Shopify',
      tiktok: 'TikTok Shop',
      instagram: 'Instagram Shop'
    };
    return names[platform] || platform;
  };

  const getStatusClass = () => {
    if (isSyncing) return 'status-syncing';
    return `status-${status.status}`;
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    return status.status.charAt(0).toUpperCase() + status.status.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="platform-sync">
      <div className="platform-header">
        <span className="platform-name">{getPlatformDisplayName()}</span>
        <span className={`sync-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      {status.error && !isSyncing && (
        <div className="sync-error">{status.error}</div>
      )}

      {status.lastSync && (
        <div className="last-sync">
          Last sync: {formatDate(status.lastSync)}
        </div>
      )}

      <div className="platform-actions">
        <button
          className="btn btn-sync"
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <span className="loading" style={{ marginRight: '5px' }}></span>
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