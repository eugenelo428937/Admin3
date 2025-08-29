/**
 * Cookie Persistence Middleware for Redux
 * 
 * Automatically saves and restores filter state to/from cookies
 * to maintain user filter preferences across page reloads.
 */

import Cookies from 'js-cookie';

// Configuration
const COOKIE_NAME = 'admin3_filters';
const COOKIE_EXPIRY_DAYS = 30; // 30 days
const COOKIE_OPTIONS = {
  expires: COOKIE_EXPIRY_DAYS,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
};

// Actions that should trigger cookie save
const ACTIONS_TO_PERSIST = [
  'filters/setSubjects',
  'filters/setCategories',
  'filters/setProductTypes',
  'filters/setProducts',
  'filters/setModesOfDelivery',
  'filters/setSearchQuery',
  'filters/setMultipleFilters',
  'filters/navSelectSubject',
  'filters/navViewAllProducts',
  'filters/navSelectProductGroup',
  'filters/navSelectProduct',
  'filters/resetFilters',
  'filters/applyFilters',
];

// State properties to persist
const STATE_TO_PERSIST = [
  'subjects',
  'categories',
  'product_types',
  'products',
  'modes_of_delivery',
  'searchQuery',
  'currentPage',
  'pageSize',
];

/**
 * Save filter state to cookies
 */
const saveStateToCookies = (state) => {
  try {
    const filtersState = state.filters;
    if (!filtersState) return;
    
    // Extract only the state we want to persist
    const stateToSave = {};
    STATE_TO_PERSIST.forEach(key => {
      if (filtersState[key] !== undefined) {
        stateToSave[key] = filtersState[key];
      }
    });
    
    // Add timestamp for cache management
    stateToSave.savedAt = Date.now();
    
    // Save to cookie
    const cookieValue = JSON.stringify(stateToSave);
    Cookies.set(COOKIE_NAME, cookieValue, COOKIE_OPTIONS);
    
    console.debug('🍪 [PERSISTENCE] State saved to cookies:', stateToSave);
    
  } catch (error) {
    console.error('🍪 [PERSISTENCE] Error saving state to cookies:', error);
  }
};

/**
 * Load filter state from cookies
 */
export const loadStateFromCookies = () => {
  try {
    const cookieValue = Cookies.get(COOKIE_NAME);
    if (!cookieValue) return null;
    
    const savedState = JSON.parse(cookieValue);
    
    // Check if saved state is not too old (max 30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if (savedState.savedAt && (Date.now() - savedState.savedAt > maxAge)) {
      console.debug('🍪 [PERSISTENCE] Saved state is too old, ignoring');
      clearCookies();
      return null;
    }
    
    // Remove timestamp from state
    delete savedState.savedAt;
    
    console.debug('🍪 [PERSISTENCE] State loaded from cookies:', savedState);
    return savedState;
    
  } catch (error) {
    console.error('🍪 [PERSISTENCE] Error loading state from cookies:', error);
    return null;
  }
};

/**
 * Clear filter cookies
 */
export const clearCookies = () => {
  try {
    Cookies.remove(COOKIE_NAME);
    console.debug('🍪 [PERSISTENCE] Cookies cleared');
  } catch (error) {
    console.error('🍪 [PERSISTENCE] Error clearing cookies:', error);
  }
};

/**
 * Cookie persistence middleware
 */
const cookiePersistenceMiddleware = (store) => (next) => (action) => {
  // Execute the action first
  const result = next(action);
  
  // Check if this action should trigger persistence
  if (ACTIONS_TO_PERSIST.includes(action.type)) {
    // Get updated state and save to cookies
    const state = store.getState();
    saveStateToCookies(state);
  }
  
  return result;
};

export default cookiePersistenceMiddleware;