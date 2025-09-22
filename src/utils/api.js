// src/utils/api.js
export const fetchProducts = async () => {
  try {
    // Get token from localStorage
    const tokenData = JSON.parse(localStorage.getItem('whatsopify_token'));
    const token = tokenData?.data?.token;
    
    if (!token) throw new Error('No auth token found');

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'FETCH_PRODUCTS',
      token: token
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch products');
    }

    return response.products;
    
  } catch (error) {
    console.error('Product fetch failed:', error);
    throw error; // Re-throw for components to handle
  }
};