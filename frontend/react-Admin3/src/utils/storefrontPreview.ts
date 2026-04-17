// Storefront preview mode (tab-scoped).
// When an admin opens the storefront from the admin top bar with ?preview=1,
// we remember it in sessionStorage so the flag survives navigation (e.g., /products)
// without needing to propagate ?preview=1 through every link.

const STORAGE_KEY = 'storefrontPreview';

// Call once on app mount. If URL has ?preview=1, activate preview mode for this tab.
export const initStorefrontPreview = (): void => {
	if (typeof window === 'undefined') return;
	const params = new URLSearchParams(window.location.search);
	if (params.get('preview') === '1') {
		sessionStorage.setItem(STORAGE_KEY, '1');
	}
};

export const isStorefrontPreview = (): boolean => {
	if (typeof window === 'undefined') return false;
	return sessionStorage.getItem(STORAGE_KEY) === '1';
};
