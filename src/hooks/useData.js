// Custom hooks for data management
import { useState, useEffect, useCallback } from "react";
import dataService from "../services/dataService.js";

/**
 * Custom hook for products data
 * @param {Object} params - Query parameters
 * @param {boolean} autoFetch - Whether to fetch automatically
 * @returns {Object} Products state and methods
 */
export function useProducts(params = {}, autoFetch = true) {
  const [state, setState] = useState({
    data: dataService.getCachedData("products"),
    loading: dataService.isLoading("products"),
    error: dataService.getError("products"),
  });

  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const products = await dataService.fetchProducts(params, forceRefresh);
        setState((prev) => ({ ...prev, data: products, loading: false }));
        return products;
      } catch (error) {
        setState((prev) => ({ ...prev, error: error.message, loading: false }));
        throw error;
      }
    },
    [params]
  );

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = dataService.subscribe("products", (newData) => {
      setState((prev) => ({
        ...prev,
        data: newData.data,
        loading: newData.loading,
        error: newData.error,
      }));
    });

    // Auto-fetch if enabled
    if (autoFetch && !state.data && !state.loading) {
      fetchProducts();
    }

    return unsubscribe;
  }, [autoFetch, fetchProducts, state.data, state.loading]);

  return {
    ...state,
    fetchProducts,
    refetch: () => fetchProducts(true),
  };
}

/**
 * Custom hook for stores data
 * @param {boolean} autoFetch - Whether to fetch automatically
 * @returns {Object} Stores state and methods
 */
export function useStores(autoFetch = true) {
  const [state, setState] = useState({
    data: dataService.getCachedData("stores"),
    loading: dataService.isLoading("stores"),
    error: dataService.getError("stores"),
  });

  const fetchStores = useCallback(async (forceRefresh = false) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const stores = await dataService.fetchStores(forceRefresh);
      setState((prev) => ({ ...prev, data: stores, loading: false }));
      return stores;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = dataService.subscribe("stores", (newData) => {
      setState((prev) => ({
        ...prev,
        data: newData.data,
        loading: newData.loading,
        error: newData.error,
      }));
    });

    // Auto-fetch if enabled
    if (autoFetch && !state.data && !state.loading) {
      fetchStores();
    }

    return unsubscribe;
  }, [autoFetch, fetchStores, state.data, state.loading]);

  return {
    ...state,
    fetchStores,
    refetch: () => fetchStores(true),
  };
}

/**
 * Custom hook for user info data
 * @param {boolean} autoFetch - Whether to fetch automatically
 * @returns {Object} User info state and methods
 */
export function useUserInfo(autoFetch = true) {
  const [state, setState] = useState({
    data: dataService.getCachedData("userInfo"),
    loading: dataService.isLoading("userInfo"),
    error: dataService.getError("userInfo"),
  });

  const fetchUserInfo = useCallback(async (forceRefresh = false) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const userInfo = await dataService.fetchUserInfo(forceRefresh);
      setState((prev) => ({ ...prev, data: userInfo, loading: false }));
      return userInfo;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = dataService.subscribe("userInfo", (newData) => {
      setState((prev) => ({
        ...prev,
        data: newData.data,
        loading: newData.loading,
        error: newData.error,
      }));
    });

    // Auto-fetch if enabled
    if (autoFetch && !state.data && !state.loading) {
      fetchUserInfo();
    }

    return unsubscribe;
  }, [autoFetch, fetchUserInfo, state.data, state.loading]);

  return {
    ...state,
    fetchUserInfo,
    refetch: () => fetchUserInfo(true),
  };
}

/**
 * Custom hook for orders data
 * @param {Object} params - Query parameters
 * @returns {Object} Orders state and methods
 */
export function useOrders(params = {}) {
  const [state, setState] = useState({
    data: [],
    loading: false,
    error: null,
  });

  const fetchOrders = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const orders = await dataService.fetchOrders(params);
      setState((prev) => ({ ...prev, data: orders, loading: false }));
      return orders;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, [params]);

  const createOrder = useCallback(async (orderData) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const order = await dataService.createOrder(orderData);
      setState((prev) => ({
        ...prev,
        data: [...prev.data, order],
        loading: false,
      }));
      return order;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const updatedOrder = await dataService.updateOrderStatus(orderId, status);
      setState((prev) => ({
        ...prev,
        data: prev.data.map((order) =>
          order.id === orderId ? updatedOrder : order
        ),
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    fetchOrders,
    createOrder,
    updateOrderStatus,
  };
}

export default {
  useProducts,
  useStores,
  useUserInfo,
  useOrders,
};

