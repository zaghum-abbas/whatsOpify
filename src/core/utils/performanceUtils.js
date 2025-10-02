// Performance optimization utilities
import { CACHE_CONFIG } from "../constants/index.js";

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization utility for expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Function} getKey - Function to generate cache key
 * @returns {Function} Memoized function
 */
export function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function memoizedFunction(...args) {
    const key = getKey(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);

    // Clean up cache if it gets too large
    if (cache.size > CACHE_CONFIG.MAX_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  };
}

/**
 * Lazy loading utility for components
 * @param {Function} importFunc - Function that returns a promise
 * @returns {Object} Lazy component
 */
export function lazyLoad(importFunc) {
  let component = null;
  let promise = null;

  return function LazyComponent(props) {
    if (!component) {
      if (!promise) {
        promise = importFunc().then((module) => {
          component = module.default || module;
          return component;
        });
      }

      throw promise;
    }

    return React.createElement(component, props);
  };
}

/**
 * Virtual scrolling utility
 * @param {Array} items - Array of items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Height of container
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} Visible items and offsets
 */
export function getVisibleItems(items, itemHeight, containerHeight, scrollTop) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
  };
}

/**
 * Intersection Observer utility for lazy loading
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when element is visible
 * @param {Object} options - Intersection Observer options
 * @returns {Function} Cleanup function
 */
export function observeIntersection(element, callback, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: "50px",
    threshold: 0.1,
    ...options,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);

  observer.observe(element);

  return () => observer.unobserve(element);
}

/**
 * Performance monitoring utility
 * @param {string} name - Performance mark name
 * @returns {Function} End function
 */
export function performanceMark(name) {
  const startTime = performance.now();

  return function endMark() {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[PERFORMANCE] ${name}: ${duration.toFixed(2)}ms`);

    // Store performance data
    if (window.performanceData) {
      window.performanceData.push({ name, duration, timestamp: Date.now() });
    } else {
      window.performanceData = [{ name, duration, timestamp: Date.now() }];
    }
  };
}

/**
 * Batch DOM updates utility
 * @param {Function} updateFunction - Function containing DOM updates
 */
export function batchDOMUpdates(updateFunction) {
  // Use requestAnimationFrame to batch updates
  requestAnimationFrame(() => {
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Temporarily append to fragment to batch updates
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
      if (fragment.contains(child)) {
        return originalAppendChild.call(this, child);
      }
      return child;
    };

    try {
      updateFunction();
    } finally {
      // Restore original appendChild
      Node.prototype.appendChild = originalAppendChild;
    }
  });
}

/**
 * Memory usage monitoring
 * @returns {Object} Memory usage information
 */
export function getMemoryUsage() {
  if (performance.memory) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
    };
  }

  return null;
}

/**
 * Cleanup utility for event listeners and observers
 * @param {Array} cleanupFunctions - Array of cleanup functions
 */
export function cleanup(cleanupFunctions) {
  cleanupFunctions.forEach((cleanup) => {
    if (typeof cleanup === "function") {
      try {
        cleanup();
      } catch (error) {
        console.warn("[PERFORMANCE] Error during cleanup:", error);
      }
    }
  });
}

/**
 * Image lazy loading utility
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source
 * @param {string} placeholder - Placeholder image
 */
export function lazyLoadImage(img, src, placeholder = "") {
  if (placeholder) {
    img.src = placeholder;
  }

  const observer = observeIntersection(img, () => {
    img.src = src;
    observer(); // Cleanup
  });

  return observer;
}

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource URLs
 * @returns {Promise} Promise that resolves when all resources are loaded
 */
export function preloadResources(resources) {
  const promises = resources.map((resource) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = resource.url;
      link.as = resource.type || "script";

      link.onload = resolve;
      link.onerror = reject;

      document.head.appendChild(link);
    });
  });

  return Promise.all(promises);
}

export default {
  debounce,
  throttle,
  memoize,
  lazyLoad,
  getVisibleItems,
  observeIntersection,
  performanceMark,
  batchDOMUpdates,
  getMemoryUsage,
  cleanup,
  lazyLoadImage,
  preloadResources,
};

