# Interview Guide - Product Sync Debugging Exercise

## Overview
This is a senior-level debugging exercise designed to evaluate a candidate's ability to identify and fix real-world issues in a full-stack application. The exercise tests debugging skills, problem-solving approach, and understanding of common web application issues.

**Time Allocation**: 60-90 minutes

## The 5 Bugs

### Bug 1: TikTok Rate Limiting (Backend)
**Location**: `broken-version/server/server.js` - `syncToTikTok` function

**Issue**: After 3 requests to TikTok API, the sync fails but shows "pending" forever. No retry information is provided to the client. The lower limit makes this bug more apparent during testing.

**Broken Code**:
```javascript
if (tiktokRequestCount >= TIKTOK_RATE_LIMIT) {
  return {
    success: false,
    error: 'Rate limit exceeded'  // Missing retry information
  };
}
```

**Fixed Code**:
```javascript
if (tiktokRequestCount >= TIKTOK_RATE_LIMIT) {
  const retryAfter = Math.ceil((TIKTOK_RESET_INTERVAL - (Date.now() - tiktokResetTime)) / 1000);
  return {
    success: false,
    error: `Rate limit exceeded. Try again in ${retryAfter} seconds`,
    retryAfter
  };
}
```

**How to Test**:
- Add a product and sync to TikTok 4 times rapidly
- The 4th request should fail with rate limit error

### Bug 2: Instagram Token Expiry (Backend)
**Location**: `broken-version/server/server.js` - `syncToInstagram` function

**Issue**: Instagram tokens expire after just 1 minute but there's no automatic refresh mechanism. Syncs fail silently after token expiry. The short expiry time makes this bug very easy to encounter during testing.

**Broken Code**:
```javascript
async function syncToInstagram(product, token) {
  if (!isInstagramTokenValid(token)) {
    return {
      success: false,
      error: 'Authentication failed: Token expired or invalid'
    };
  }
  // ... sync logic
}
```

**Fixed Code**:
```javascript
async function syncToInstagram(product, token) {
  let validToken = token;
  let newToken = null;

  if (!isInstagramTokenValid(token)) {
    newToken = refreshInstagramToken(token);  // Auto-refresh
    validToken = newToken;
  }

  return {
    success: true,
    data: { /* ... */ },
    newToken  // Return new token to client
  };
}
```

**How to Test**:
- Add a product and sync to Instagram
- Wait just 1+ minute (grab a coffee)
- Try syncing again - should fail in broken version

### Bug 3: Shopify Data Type Error (Backend)
**Location**: `broken-version/server/server.js` - `syncToShopify` function

**Issue**: Price is sent as a string to Shopify API which expects a number, causing sync failures.

**Broken Code**:
```javascript
async function syncToShopify(product) {
  const priceToSend = product.price.toString();  // Converting to string!

  const mockShopifyResponse = await mockShopifyAPI({
    ...product,
    price: priceToSend
  });
  // ...
}
```

**Fixed Code**:
```javascript
async function syncToShopify(product) {
  if (typeof product.price !== 'number') {
    return {
      success: false,
      error: 'Price must be a number for Shopify API'
    };
  }
  // Send price as number
}
```

**How to Test**:
- Add a product
- Try syncing to Shopify
- Should fail with type error in broken version

### Bug 4: Race Condition (Frontend)
**Location**: `broken-version/client/src/components/ProductList.jsx` - `handleSync` function

**Issue**: Multiple simultaneous sync operations overwrite the syncing state, causing incorrect UI display. Sync operations have longer delays (1-1.5 seconds) to make the race condition more apparent.

**Broken Code**:
```javascript
const handleSync = useCallback((platform, productId) => {
  const key = `${productId}-${platform}`;

  setSyncingStates({ [key]: true });  // Overwrites entire state!

  onSync(platform, productId).then(() => {
    setSyncingStates({ [key]: false });  // Overwrites entire state!
  });
}, [onSync]);
```

**Fixed Code**:
```javascript
const handleSync = useCallback(async (platform, productId) => {
  const key = `${productId}-${platform}`;

  setSyncingStates(prev => ({ ...prev, [key]: true }));  // Merge state

  try {
    await onSync(platform, productId);
  } finally {
    setSyncingStates(prev => ({ ...prev, [key]: false }));  // Merge state
  }
}, [onSync]);
```

**How to Test**:
- Add multiple products
- Click sync buttons for different platforms quickly
- Observe if all loading states display correctly

### Bug 5: Broken Delete Functionality
**Location**: Multiple critical issues in delete feature implementation

#### Backend Issues (`broken-version/server/server.js`):

**Issue**: The delete endpoint ALWAYS deletes the first product (index 0) regardless of which product you're trying to delete! Classic hardcoded index bug.

**Broken Code**:
```javascript
app.delete('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const db = await readDatabase();

    const productIndex = db.products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // BUG: Always deletes index 0 instead of productIndex!
    // This will ALWAYS delete the first product regardless of which one was selected
    db.products.splice(0, 1);

    await writeDatabase(db);

    // Returns success but deleted the wrong product
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});
```

**The Main Bug**: Uses `splice(0, 1)` instead of `splice(productIndex, 1)`. This means:
- Finds the correct product index
- But ignores it and deletes position 0 (first product)
- Combined with frontend optimistic updates, creates total confusion
- UI shows one product deleted, database shows different product deleted!

#### Frontend Issues:

**Issue A - App.jsx**: No error handling, optimistic updates that can desync UI from server state

```javascript
const handleDelete = useCallback(async (productId) => {
  // Bug: Not handling errors properly, will crash if server is down
  const response = await axios.delete(`${API_BASE}/products/${productId}`);

  // Bug: Optimistically updating state before confirming success
  setProducts(prev => prev.filter(p => p.id !== productId));

  return { success: true };
}, []);
```

**Issue B - ProductList.jsx**: Race condition with loading states, fire-and-forget pattern

```javascript
const handleDelete = useCallback((productId) => {
  // Bug: Not properly managing async state
  setDeletingStates({ [productId]: true });  // Overwrites all states!

  // Bug: Fire and forget - not handling response or errors
  onDelete(productId);

  // Bug: Immediately setting to false, not waiting for completion
  setDeletingStates({ [productId]: false });
}, [onDelete]);
```

**Fixed Implementation**:

```javascript
// Backend - proper validation:
app.delete('/api/products/:productId', async (req, res) => {
  const productIndex = db.products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const deletedProduct = db.products[productIndex];
  db.products.splice(productIndex, 1);
  await writeDatabase(db);

  res.json({ success: true, deletedProduct });
});

// Frontend - proper async handling:
const handleDelete = useCallback(async (productId) => {
  setDeletingStates(prev => ({ ...prev, [productId]: true }));

  try {
    const result = await onDelete(productId);
    if (!result.success) {
      console.error('Delete failed:', result.error);
    }
  } finally {
    setDeletingStates(prev => ({ ...prev, [productId]: false }));
  }
}, [onDelete]);
```

**How to Test**:
1. Add 3 products: "Product A", "Product B", "Product C"
2. Click delete on "Product B" (middle one)
3. UI shows Product B disappears ✓
4. **Refresh the page - Product A is gone instead!** 🤯
5. The wrong product was deleted!
6. Try again: Delete "Product C" → Product B disappears from database
7. Pattern: ALWAYS deletes the first product regardless of selection

**Why This is a Perfect Senior-Level Bug**:
- Tests systematic debugging (not just "something's wrong")
- Requires checking WHAT was deleted, not just IF something was deleted
- The UI/database mismatch is confusing until you identify the pattern
- Common real-world bug from copy-paste or refactoring
- Senior engineers should quickly identify: "It's always deleting index 0!"

**The Full Picture**:
- Backend: Always deletes first product (hardcoded index 0)
- Frontend: Optimistically removes the correct product from UI
- Result: Complete mismatch between what user sees and what actually happened
- Combines with race conditions and loading state bugs for extra complexity

## Evaluation Criteria

### Technical Skills (40%)
- **Debugging Approach**: Systematic vs random
- **Tool Usage**: Browser DevTools, console logs, network tab
- **Code Understanding**: Can they trace through the codebase?
- **Problem Identification**: How quickly do they spot issues?

### Problem-Solving (30%)
- **Root Cause Analysis**: Do they understand why the bug exists?
- **Solution Quality**: Are fixes correct and complete?
- **Edge Case Consideration**: Do they think about other scenarios?
- **Testing Approach**: How do they verify their fixes?

### Communication (20%)
- **Clear Explanation**: Can they articulate what's wrong?
- **Thought Process**: Do they think out loud effectively?
- **Questions**: Do they ask clarifying questions?
- **Documentation**: Would they document the fixes?

### Best Practices (10%)
- **Code Quality**: Are fixes clean and maintainable?
- **Error Handling**: Do they add proper error handling?
- **Performance**: Do they consider performance implications?
- **Security**: Any security considerations?

## Interview Flow

### Setup (5 minutes)
1. Provide broken-version code
2. Ensure they can run both frontend and backend
3. Verify application loads in browser

### Discovery Phase (20-30 minutes)
- Let candidate explore the application
- Encourage them to test different features
- Have them document issues they find

### Debugging Phase (30-45 minutes)
- Ask them to prioritize bugs
- Watch their debugging approach
- Have them fix at least 2-3 bugs
- Ask them to test their fixes

### Discussion (10-15 minutes)
- How would they prevent these bugs?
- What additional testing would they add?
- How would they monitor these issues in production?
- What refactoring would improve the codebase?

## Scoring Rubric

### Excellent (90-100%)
- Finds all 5 bugs (rate limit at 3 requests, token expiry at 1 min, data type error, race condition, broken delete)
- Fixes correctly with proper error handling
- Suggests improvements beyond the fixes
- Demonstrates deep understanding

### Good (70-89%)
- Finds 3-4 bugs
- Fixes most issues correctly
- Shows systematic debugging approach
- Communicates clearly

### Satisfactory (50-69%)
- Finds 2-3 bugs
- Fixes some issues
- Basic debugging skills
- Needs some hints

### Below Expectations (<50%)
- Finds fewer than 2 bugs
- Struggles with fixes
- Random debugging approach
- Poor communication

## Additional Notes

### Hints (if needed)
1. "Try syncing to TikTok just 3-4 times in a row"
2. "What happens after just 1 minute? Try Instagram sync again"
3. "Check the network tab for API responses and delays"
4. "Try clicking multiple sync buttons quickly - notice the loading states"
5. "What happens when the server is down or returns unexpected data?"

### Advanced Questions
- How would you implement retry logic for rate-limited requests?
- How would you handle token refresh in a production environment?
- What caching strategy would you implement?
- How would you add optimistic updates?
- What monitoring would you add?

### Red Flags
- Doesn't test their fixes
- Makes changes without understanding the problem
- Doesn't use debugging tools effectively
- Can't explain their thought process
- Introduces new bugs while fixing

### Green Flags
- Methodical debugging approach
- Tests edge cases
- Thinks about user experience
- Considers performance implications
- Suggests preventive measures

## Post-Interview

Provide the working-version code for comparison and discuss:
- Their approach vs the reference implementation
- Alternative solutions they considered
- What they learned from the exercise
- How they would improve the application architecture