# Expandable Bundle Rows with Inline Bundle Product Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expandable rows to the Product Bundles admin table that let superusers view, add, edit, and remove BundleProduct assignments inline — each row showing the product name, product code, variation name, and variation code.

**Architecture:** Backend gets a detail serializer for BundleProduct reads (nesting product and variation info from the PPV chain) and disables pagination. Frontend ProductBundleList gains expand/collapse rows rendering a new BundleProductsPanel component that manages BundleProduct CRUD via two linked Autocompletes (Product → Variation).

**Tech Stack:** Django REST Framework (serializers, viewsets), React 19.2, Material-UI v7 (Table, Collapse, Autocomplete, IconButton), Axios via httpService

**Design doc:** `docs/plans/2026-02-17-ppv-inline-management-design.md` (same pattern)

---

## Task 1: Backend — BundleProduct Detail Serializer

**Files:**
- Modify: `backend/django_Admin3/catalog/serializers/product_serializers.py:78-88`
- Modify: `backend/django_Admin3/catalog/serializers/__init__.py`
- Modify: `backend/django_Admin3/catalog/views/product_bundle_views.py:44-67`
- Test: `backend/django_Admin3/catalog/tests/test_admin_views.py`

**Step 1: Write the failing tests**

Add to `TestProductBundleProductAdminViewSet` in `backend/django_Admin3/catalog/tests/test_admin_views.py` (after `test_delete_as_superuser_returns_204`, before `class TestRecommendationAdminViewSet`):

```python
def test_list_response_includes_product_details(self):
    """GET list should include nested product name, code, variation name, and code."""
    response = self.client.get('/api/catalog/bundle-products/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    results = data if isinstance(data, list) else data.get('results', data)
    self.assertTrue(len(results) > 0)
    first = results[0]
    self.assertIn('product_name', first)
    self.assertIn('product_code', first)
    self.assertIn('variation_name', first)
    self.assertIn('variation_code', first)

def test_list_filter_by_bundle_excludes_others(self):
    """GET ?bundle={id} must NOT include products from other bundles."""
    # bundle_sa1 has no bundle products; bundle_cm2 has bundle_product_1 & 2
    response = self.client.get(
        f'/api/catalog/bundle-products/?bundle={self.bundle_sa1.id}'
    )
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    results = data if isinstance(data, list) else data.get('results', data)
    bundle_ids = {item['bundle'] for item in results}
    self.assertNotIn(self.bundle_cm2.id, bundle_ids)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestProductBundleProductAdminViewSet -v 2`
Expected: 2 new tests FAIL (product_name/product_code/variation_name/variation_code not in response)

**Step 3: Write the detail serializer**

In `backend/django_Admin3/catalog/serializers/product_serializers.py`, add after `ProductBundleProductAdminSerializer` (after line 88):

```python
class ProductBundleProductDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for BundleProduct with nested product and variation details."""
    product_name = serializers.CharField(
        source='product_product_variation.product.shortname', read_only=True
    )
    product_code = serializers.CharField(
        source='product_product_variation.product.code', read_only=True
    )
    variation_name = serializers.CharField(
        source='product_product_variation.product_variation.name', read_only=True
    )
    variation_code = serializers.CharField(
        source='product_product_variation.product_variation.code', read_only=True
    )

    class Meta:
        model = ProductBundleProduct
        fields = [
            'id', 'bundle', 'product_product_variation',
            'product_name', 'product_code', 'variation_name', 'variation_code',
            'default_price_type', 'quantity', 'sort_order', 'is_active',
        ]
        read_only_fields = ['id']
```

Export it in `backend/django_Admin3/catalog/serializers/__init__.py`:
- Add `ProductBundleProductDetailSerializer` to the import from `.product_serializers`
- Add `'ProductBundleProductDetailSerializer'` to `__all__`

**Step 4: Update the viewset with dual serializer + deep select_related**

In `backend/django_Admin3/catalog/views/product_bundle_views.py`, update `ProductBundleProductViewSet`:

```python
class ProductBundleProductViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductBundleProduct.

    Read operations: AllowAny
    Write operations: IsSuperUser

    Query params:
        bundle (int): Filter by bundle ID
    """
    pagination_class = None

    def get_queryset(self):
        qs = ProductBundleProduct.objects.select_related(
            'bundle',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).all()
        bundle_id = self.request.query_params.get('bundle')
        if bundle_id:
            qs = qs.filter(bundle_id=bundle_id)
        return qs.order_by('sort_order', 'id')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ProductBundleProductDetailSerializer
        return ProductBundleProductAdminSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]
```

Update the import at top of the views file:
```python
from catalog.serializers import (
    ProductBundleAdminSerializer,
    ProductBundleProductAdminSerializer,
    ProductBundleProductDetailSerializer,
)
```

**Step 5: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestProductBundleProductAdminViewSet -v 2`
Expected: All tests PASS (including existing ones — create/update still use admin serializer)

**Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/serializers/product_serializers.py \
        backend/django_Admin3/catalog/serializers/__init__.py \
        backend/django_Admin3/catalog/views/product_bundle_views.py \
        backend/django_Admin3/catalog/tests/test_admin_views.py
git commit -m "feat(catalog): add BundleProduct detail serializer with nested product/variation fields"
```

---

## Task 2: Frontend — BundleProductsPanel Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/product-bundles/BundleProductsPanel.js`
- Create: `frontend/react-Admin3/src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js`

**Step 1: Write the failing tests**

Create `frontend/react-Admin3/src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js`:

```javascript
// src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BundleProductsPanel from '../BundleProductsPanel';

// Mock services
jest.mock('../../../../services/catalogBundleProductService', () => ({
  __esModule: true,
  default: {
    getByBundleId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../../services/catalogProductService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

jest.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getByProduct: jest.fn(),
  },
}));

import catalogBundleProductService from '../../../../services/catalogBundleProductService';
import catalogProductService from '../../../../services/catalogProductService';
import productProductVariationService from '../../../../services/productProductVariationService';

const theme = createTheme();

const mockBundleProducts = [
  {
    id: 10,
    bundle: 1,
    product_product_variation: 100,
    product_name: 'CM2 Core',
    product_code: 'CM2-CSM',
    variation_name: 'Standard eBook',
    variation_code: 'VAR-EBOOK',
    default_price_type: 'standard',
    quantity: 1,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 11,
    bundle: 1,
    product_product_variation: 101,
    product_name: 'CM2 Marking',
    product_code: 'CM2-MARK',
    variation_name: 'Online Hub',
    variation_code: 'VAR-HUB',
    default_price_type: 'standard',
    quantity: 1,
    sort_order: 2,
    is_active: true,
  },
];

const mockProducts = [
  { id: 1, shortname: 'CM2 Core', code: 'CM2-CSM' },
  { id: 2, shortname: 'CM2 Marking', code: 'CM2-MARK' },
  { id: 3, shortname: 'CM2 Tutorial', code: 'CM2-TUT' },
];

const mockPPVsForProduct = [
  { id: 200, product: 3, product_variation: 5, variation_name: 'Printed Book', variation_code: 'VAR-PRINTED' },
  { id: 201, product: 3, product_variation: 6, variation_name: 'Online Hub', variation_code: 'VAR-HUB' },
];

const renderComponent = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <BundleProductsPanel bundleId={1} {...props} />
    </ThemeProvider>
  );
};

describe('BundleProductsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    catalogBundleProductService.getByBundleId.mockResolvedValue(mockBundleProducts);
    catalogProductService.getAll.mockResolvedValue(mockProducts);
    productProductVariationService.getByProduct.mockResolvedValue(mockPPVsForProduct);
  });

  describe('loading and display', () => {
    test('shows loading spinner initially', () => {
      catalogBundleProductService.getByBundleId.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('fetches bundle products for the given bundle on mount', async () => {
      renderComponent();
      await waitFor(() => {
        expect(catalogBundleProductService.getByBundleId).toHaveBeenCalledWith(1);
      });
    });

    test('displays bundle products in a table', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
        expect(screen.getByText('CM2-CSM')).toBeInTheDocument();
        expect(screen.getByText('Standard eBook')).toBeInTheDocument();
        expect(screen.getByText('VAR-EBOOK')).toBeInTheDocument();
        expect(screen.getByText('CM2 Marking')).toBeInTheDocument();
        expect(screen.getByText('CM2-MARK')).toBeInTheDocument();
      });
    });

    test('displays empty message when no products in bundle', async () => {
      catalogBundleProductService.getByBundleId.mockResolvedValue([]);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no products in this bundle/i)).toBeInTheDocument();
      });
    });
  });

  describe('remove product', () => {
    test('calls delete and refreshes on remove', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      catalogBundleProductService.delete.mockResolvedValue({});

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(catalogBundleProductService.delete).toHaveBeenCalledWith(10);
        expect(catalogBundleProductService.getByBundleId).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when confirm cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      expect(catalogBundleProductService.delete).not.toHaveBeenCalled();
    });
  });

  describe('add product', () => {
    test('renders product autocomplete for adding', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      // There should be an autocomplete for selecting a product
      const productAutocomplete = screen.getByLabelText(/select product/i);
      expect(productAutocomplete).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      catalogBundleProductService.getByBundleId.mockRejectedValue(new Error('Network error'));

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/failed to load bundle products/i)).toBeInTheDocument();
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testMatch="**/product-bundles/__tests__/BundleProductsPanel*"`
Expected: FAIL — module not found

**Step 3: Write the BundleProductsPanel component**

Create `frontend/react-Admin3/src/components/admin/product-bundles/BundleProductsPanel.js`:

```javascript
// src/components/admin/product-bundles/BundleProductsPanel.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Autocomplete, TextField, Box, Typography,
  CircularProgress, Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import catalogBundleProductService from "../../../services/catalogBundleProductService";
import catalogProductService from "../../../services/catalogProductService";
import productProductVariationService from "../../../services/productProductVariationService";

const BundleProductsPanel = ({ bundleId }) => {
  const [bundleProducts, setBundleProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editVariation, setEditVariation] = useState(null);
  const [editVariationOptions, setEditVariationOptions] = useState([]);

  // Add state
  const [addProduct, setAddProduct] = useState(null);
  const [addVariation, setAddVariation] = useState(null);
  const [addVariationOptions, setAddVariationOptions] = useState([]);

  const fetchBundleProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catalogBundleProductService.getByBundleId(bundleId);
      setBundleProducts(data);
    } catch (err) {
      setError("Failed to load bundle products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  const fetchAllProducts = useCallback(async () => {
    try {
      const data = await catalogProductService.getAll();
      setAllProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }, []);

  useEffect(() => {
    fetchBundleProducts();
    fetchAllProducts();
  }, [fetchBundleProducts, fetchAllProducts]);

  // When add product selection changes, fetch its variations (PPVs)
  useEffect(() => {
    if (addProduct) {
      productProductVariationService.getByProduct(addProduct.id)
        .then(ppvs => {
          // Filter out PPVs already in the bundle
          const assignedPPVIds = bundleProducts.map(bp => bp.product_product_variation);
          const available = ppvs.filter(ppv => !assignedPPVIds.includes(ppv.id));
          setAddVariationOptions(available);
        })
        .catch(err => console.error("Failed to load variations:", err));
    } else {
      setAddVariationOptions([]);
    }
    setAddVariation(null);
  }, [addProduct, bundleProducts]);

  // When edit product selection changes, fetch its variations
  useEffect(() => {
    if (editProduct) {
      productProductVariationService.getByProduct(editProduct.id)
        .then(ppvs => {
          const assignedPPVIds = bundleProducts
            .filter(bp => bp.id !== editingId)
            .map(bp => bp.product_product_variation);
          const available = ppvs.filter(ppv => !assignedPPVIds.includes(ppv.id));
          setEditVariationOptions(available);
        })
        .catch(err => console.error("Failed to load variations:", err));
    } else {
      setEditVariationOptions([]);
    }
    setEditVariation(null);
  }, [editProduct, bundleProducts, editingId]);

  const handleRemove = async (bpId) => {
    if (!window.confirm("Remove this product from the bundle?")) return;
    try {
      await catalogBundleProductService.delete(bpId);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to remove product");
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!addVariation) return;
    try {
      await catalogBundleProductService.create({
        bundle: bundleId,
        product_product_variation: addVariation.id,
        default_price_type: 'standard',
        quantity: 1,
        sort_order: bundleProducts.length + 1,
      });
      setAddProduct(null);
      setAddVariation(null);
      setAddVariationOptions([]);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to add product");
      console.error(err);
    }
  };

  const handleEditStart = (bp) => {
    setEditingId(bp.id);
    // Find the product from allProducts that matches this bundle product
    const matchedProduct = allProducts.find(p => p.code === bp.product_code);
    setEditProduct(matchedProduct || null);
  };

  const handleEditSave = async (bpId) => {
    if (!editVariation) return;
    try {
      await catalogBundleProductService.update(bpId, {
        bundle: bundleId,
        product_product_variation: editVariation.id,
      });
      setEditingId(null);
      setEditProduct(null);
      setEditVariation(null);
      setEditVariationOptions([]);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to update product");
      console.error(err);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditProduct(null);
    setEditVariation(null);
    setEditVariationOptions([]);
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
        Bundle Products
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bundleProducts.length === 0 && !error ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No products in this bundle
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Product Code</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Variation Code</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bundleProducts.map((bp) => (
              <TableRow key={bp.id}>
                {editingId === bp.id ? (
                  <>
                    <TableCell colSpan={2}>
                      <Autocomplete
                        size="small"
                        options={allProducts}
                        getOptionLabel={(option) =>
                          `${option.shortname} (${option.code})`
                        }
                        value={editProduct}
                        onChange={(_, newValue) => setEditProduct(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select product"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                      />
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Autocomplete
                        size="small"
                        options={editVariationOptions}
                        getOptionLabel={(option) =>
                          `${option.variation_name} (${option.variation_code})`
                        }
                        value={editVariation}
                        onChange={(_, newValue) => setEditVariation(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select variation"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value?.id
                        }
                        disabled={!editProduct}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleEditSave(bp.id)}
                          aria-label="save edit"
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          aria-label="cancel edit"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{bp.product_name}</TableCell>
                    <TableCell>{bp.product_code}</TableCell>
                    <TableCell>{bp.variation_name}</TableCell>
                    <TableCell>{bp.variation_code}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStart(bp)}
                          aria-label="edit product"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(bp.id)}
                          aria-label="remove product"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add new product row — two linked Autocompletes */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Autocomplete
          size="small"
          options={allProducts}
          getOptionLabel={(option) => `${option.shortname} (${option.code})`}
          value={addProduct}
          onChange={(_, newValue) => setAddProduct(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select product"
              variant="outlined"
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          size="small"
          options={addVariationOptions}
          getOptionLabel={(option) =>
            `${option.variation_name} (${option.variation_code})`
          }
          value={addVariation}
          onChange={(_, newValue) => setAddVariation(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select variation"
              variant="outlined"
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          disabled={!addProduct}
          sx={{ minWidth: 220 }}
        />
        <IconButton
          size="small"
          color="primary"
          onClick={handleAdd}
          disabled={!addVariation}
          aria-label="add product to bundle"
        >
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default BundleProductsPanel;
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testMatch="**/product-bundles/__tests__/BundleProductsPanel*"`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/product-bundles/BundleProductsPanel.js \
        frontend/react-Admin3/src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js
git commit -m "feat(admin): add BundleProductsPanel for inline bundle product management"
```

---

## Task 3: Frontend — Expandable ProductBundleList Rows

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.js`
- Modify: `frontend/react-Admin3/src/components/admin/product-bundles/__tests__/ProductBundleList.test.js`

**Step 1: Write the failing tests**

Add mock at top of `ProductBundleList.test.js` (after existing mocks):

```javascript
// Mock BundleProductsPanel to avoid testing its internals here
jest.mock('../BundleProductsPanel', () => {
  return function MockBundleProductsPanel({ bundleId }) {
    return <div data-testid={`expand-row-${bundleId}`}>Products for {bundleId}</div>;
  };
});
```

Add `waitFor` to imports if not already present. Add new describe block before the closing `});`:

```javascript
describe('expandable rows', () => {
    test('renders expand button for each bundle', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByLabelText(/expand products for/i);
      expect(expandButtons).toHaveLength(2);
    });

    test('expand button toggles row expansion', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText(/expand products for CM2 Bundle/i);
      fireEvent.click(expandButton);

      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();
      expect(screen.getByLabelText(/collapse products for CM2 Bundle/i)).toBeInTheDocument();
    });

    test('clicking expand on another row collapses the first', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      // Expand row 1
      fireEvent.click(screen.getByLabelText(/expand products for CM2 Bundle/i));
      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();

      // Expand row 2
      fireEvent.click(screen.getByLabelText(/expand products for SA1 Bundle/i));
      expect(screen.getByTestId('expand-row-2')).toBeInTheDocument();

      // Row 1 should be collapsed
      await waitFor(() => {
        expect(screen.queryByTestId('expand-row-1')).not.toBeInTheDocument();
      });
    });
  });
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testMatch="**/product-bundles/__tests__/ProductBundleList*"`
Expected: FAIL — no expand buttons found

**Step 3: Update ProductBundleList with expandable rows**

In `frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.js`:

1. Add imports at top:
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress,
  TablePagination, IconButton, Collapse,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import catalogBundleService from '../../../services/catalogBundleService';
import BundleProductsPanel from './BundleProductsPanel';
```

2. Add `expandedId` state inside the component:
```javascript
const [expandedId, setExpandedId] = useState(null);

const handleToggleExpand = (bundleId) => {
    setExpandedId(prev => prev === bundleId ? null : bundleId);
};
```

3. Add expand column header (empty cell before ID):
```javascript
<TableCell sx={{ width: 50 }} />
```

4. Wrap each `<TableRow>` in `<React.Fragment>` with expand button cell and collapse row:
- Add expand IconButton cell as first cell in each row
- Add collapse TableRow after each data row with BundleProductsPanel inside Collapse
- colSpan should be 7 (expand + ID + Bundle Name + Subject + Is Featured + Is Active + Actions)

**Step 4: Run tests to verify they pass**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testMatch="**/product-bundles/__tests__/ProductBundleList*"`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.js \
        frontend/react-Admin3/src/components/admin/product-bundles/__tests__/ProductBundleList.test.js
git commit -m "feat(admin): add expandable rows to ProductBundleList for bundle product management"
```

---

## Task 4: Run Full Test Suite

**Step 1: Run backend tests**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views -v 2`
Expected: All PASS

**Step 2: Run frontend bundle tests**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testMatch="**/product-bundles/**"`
Expected: All product-bundle related tests PASS

**Step 3: Run full frontend suite**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false`
Expected: All tests PASS, no regressions

**Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: address test failures from bundle products inline management"
```

---

## Summary of All Files

| # | File | Action |
|---|------|--------|
| 1 | `backend/django_Admin3/catalog/serializers/product_serializers.py` | Add `ProductBundleProductDetailSerializer` |
| 2 | `backend/django_Admin3/catalog/serializers/__init__.py` | Export new serializer |
| 3 | `backend/django_Admin3/catalog/views/product_bundle_views.py` | Add deep select_related + dual serializer + no pagination |
| 4 | `backend/django_Admin3/catalog/tests/test_admin_views.py` | Add 2 new tests |
| 5 | `frontend/react-Admin3/src/components/admin/product-bundles/BundleProductsPanel.js` | **Create** |
| 6 | `frontend/react-Admin3/src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js` | **Create** |
| 7 | `frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.js` | Add expandable rows |
| 8 | `frontend/react-Admin3/src/components/admin/product-bundles/__tests__/ProductBundleList.test.js` | Add expand tests + mock |
