# Expandable Product Rows with Inline PPV Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expandable rows to the Products admin table that let superusers view, add, edit, and remove ProductProductVariation (PPV) assignments inline.

**Architecture:** Backend gets a detail serializer for PPV reads (nesting variation name/code/type) and a `?product=` filter. Frontend ProductTable gains expand/collapse rows rendering a new ProductVariationsPanel component that manages PPV CRUD via Autocomplete.

**Tech Stack:** Django REST Framework (serializers, viewsets), React 19.2, Material-UI v7 (Table, Collapse, Autocomplete, IconButton), Axios via httpService

**Design doc:** `docs/plans/2026-02-17-ppv-inline-management-design.md`

---

## Task 1: Backend — PPV Detail Serializer

**Files:**
- Modify: `backend/django_Admin3/catalog/serializers/product_serializers.py:44-51`
- Modify: `backend/django_Admin3/catalog/serializers/__init__.py:19,42`
- Test: `backend/django_Admin3/catalog/tests/test_admin_views.py:252-300`

**Step 1: Write the failing test**

Add to `TestProductProductVariationAdminViewSet` in `backend/django_Admin3/catalog/tests/test_admin_views.py` (after line 263):

```python
def test_list_response_includes_variation_details(self):
    """GET list should include nested variation name, code, and type."""
    response = self.client.get('/api/catalog/product-product-variations/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    results = data if isinstance(data, list) else data.get('results', data)
    self.assertTrue(len(results) > 0)
    first = results[0]
    self.assertIn('variation_name', first)
    self.assertIn('variation_code', first)
    self.assertIn('variation_type', first)

def test_list_filter_by_product(self):
    """GET ?product={id} returns only PPVs for that product."""
    response = self.client.get(
        f'/api/catalog/product-product-variations/?product={self.product_core.id}'
    )
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    results = data if isinstance(data, list) else data.get('results', data)
    for item in results:
        self.assertEqual(item['product'], self.product_core.id)

def test_list_filter_by_product_excludes_others(self):
    """GET ?product={id} must NOT include PPVs from other products."""
    # product_marking has ppv_marking_hub; product_core has ppv_core_ebook, ppv_core_printed, ppv_core_hub
    response = self.client.get(
        f'/api/catalog/product-product-variations/?product={self.product_marking.id}'
    )
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    results = data if isinstance(data, list) else data.get('results', data)
    product_ids = {item['product'] for item in results}
    self.assertNotIn(self.product_core.id, product_ids)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestProductProductVariationAdminViewSet -v 2`
Expected: 3 new tests FAIL (variation_name/variation_code/variation_type not in response; no filter behavior)

**Step 3: Write the detail serializer**

In `backend/django_Admin3/catalog/serializers/product_serializers.py`, add after line 51 (after `ProductProductVariationAdminSerializer`):

```python
class ProductProductVariationDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for PPV with nested variation details."""
    variation_name = serializers.CharField(source='product_variation.name', read_only=True)
    variation_code = serializers.CharField(source='product_variation.code', read_only=True)
    variation_type = serializers.CharField(source='product_variation.variation_type', read_only=True)

    class Meta:
        model = ProductProductVariation
        fields = ['id', 'product', 'product_variation', 'variation_name', 'variation_code', 'variation_type']
        read_only_fields = ['id']
```

Export it in `backend/django_Admin3/catalog/serializers/__init__.py`:
- Add `ProductProductVariationDetailSerializer` to the import from `.product_serializers`
- Add `'ProductProductVariationDetailSerializer'` to `__all__`

**Step 4: Update the viewset with filter + dual serializer**

In `backend/django_Admin3/catalog/views/product_variation_views.py`, update `ProductProductVariationViewSet` (lines 45-73):

```python
class ProductProductVariationViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductProductVariation.

    Read operations: AllowAny
    Write operations: IsSuperUser

    Query params:
        product (int): Filter by product ID
    """
    pagination_class = None

    def get_queryset(self):
        qs = ProductProductVariation.objects.select_related(
            'product', 'product_variation'
        ).all()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by('id')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ProductProductVariationDetailSerializer
        return ProductProductVariationAdminSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            return Response(
                {"error": "Cannot delete: record has dependent records",
                 "dependents": [str(obj) for obj in e.protected_objects]},
                status=status.HTTP_400_BAD_REQUEST
            )
```

Update the import at top of the views file:
```python
from catalog.serializers import (
    ProductVariationSerializer,
    ProductProductVariationAdminSerializer,
    ProductProductVariationDetailSerializer,
)
```

**Step 5: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestProductProductVariationAdminViewSet -v 2`
Expected: All tests PASS (including existing ones — create/update still use admin serializer)

**Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/serializers/product_serializers.py \
        backend/django_Admin3/catalog/serializers/__init__.py \
        backend/django_Admin3/catalog/views/product_variation_views.py \
        backend/django_Admin3/catalog/tests/test_admin_views.py
git commit -m "feat(catalog): add PPV detail serializer with product filter"
```

---

## Task 2: Frontend — PPV Service `getByProduct` Method

**Files:**
- Modify: `frontend/react-Admin3/src/services/productProductVariationService.js`

**Step 1: Add `getByProduct` method**

In `frontend/react-Admin3/src/services/productProductVariationService.js`, add after the `getAll` method (after line 17):

```javascript
getByProduct: async (productId) => {
    const response = await httpService.get(`${API_URL}/`, {
        params: { product: productId }
    });
    if (!response.data) return [];
    return Array.isArray(response.data) ? response.data :
        response.data.results || [];
},
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/services/productProductVariationService.js
git commit -m "feat(services): add getByProduct to PPV service"
```

---

## Task 3: Frontend — ProductVariationsPanel Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/products/ProductVariationsPanel.js`
- Test: `frontend/react-Admin3/src/components/admin/products/__tests__/ProductVariationsPanel.test.js`

**Step 1: Write the failing tests**

Create `frontend/react-Admin3/src/components/admin/products/__tests__/ProductVariationsPanel.test.js`:

```javascript
// src/components/admin/products/__tests__/ProductVariationsPanel.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProductVariationsPanel from '../ProductVariationsPanel';

// Mock services
jest.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getByProduct: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../../services/productVariationService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

import productProductVariationService from '../../../../services/productProductVariationService';
import productVariationService from '../../../../services/productVariationService';

const theme = createTheme();

const mockPPVs = [
  { id: 10, product: 1, product_variation: 1, variation_name: 'eBook', variation_code: 'EB', variation_type: 'eBook' },
  { id: 11, product: 1, product_variation: 2, variation_name: 'Printed', variation_code: 'PC', variation_type: 'Printed' },
];

const mockAllVariations = [
  { id: 1, name: 'eBook', code: 'EB', variation_type: 'eBook' },
  { id: 2, name: 'Printed', code: 'PC', variation_type: 'Printed' },
  { id: 3, name: 'Hub', code: 'HB', variation_type: 'Hub' },
  { id: 4, name: 'Marking', code: 'MK', variation_type: 'Marking' },
];

const renderComponent = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <ProductVariationsPanel productId={1} {...props} />
    </ThemeProvider>
  );
};

describe('ProductVariationsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productProductVariationService.getByProduct.mockResolvedValue(mockPPVs);
    productVariationService.getAll.mockResolvedValue(mockAllVariations);
  });

  describe('loading and display', () => {
    test('shows loading spinner initially', () => {
      productProductVariationService.getByProduct.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('fetches PPVs for the given product on mount', async () => {
      renderComponent();
      await waitFor(() => {
        expect(productProductVariationService.getByProduct).toHaveBeenCalledWith(1);
      });
    });

    test('displays assigned variations in a table', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('eBook')).toBeInTheDocument();
        expect(screen.getByText('Printed')).toBeInTheDocument();
        expect(screen.getByText('EB')).toBeInTheDocument();
        expect(screen.getByText('PC')).toBeInTheDocument();
      });
    });

    test('displays empty message when no variations assigned', async () => {
      productProductVariationService.getByProduct.mockResolvedValue([]);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no variations assigned/i)).toBeInTheDocument();
      });
    });
  });

  describe('remove variation', () => {
    test('calls delete and refreshes on remove', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      productProductVariationService.delete.mockResolvedValue({});

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('eBook')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(productProductVariationService.delete).toHaveBeenCalledWith(10);
        expect(productProductVariationService.getByProduct).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when confirm cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('eBook')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      expect(productProductVariationService.delete).not.toHaveBeenCalled();
    });
  });

  describe('add variation', () => {
    test('calls create with correct data when variation added', async () => {
      productProductVariationService.create.mockResolvedValue({ id: 12, product: 1, product_variation: 3 });

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('eBook')).toBeInTheDocument();
      });

      // The autocomplete should exist for adding
      const autocomplete = screen.getByRole('combobox');
      expect(autocomplete).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      productProductVariationService.getByProduct.mockRejectedValue(new Error('Network error'));

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/failed to load variations/i)).toBeInTheDocument();
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend/react-Admin3 && npx jest --testPathPattern="ProductVariationsPanel" --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the ProductVariationsPanel component**

Create `frontend/react-Admin3/src/components/admin/products/ProductVariationsPanel.js`:

```javascript
// src/components/admin/products/ProductVariationsPanel.js
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
import productProductVariationService from "../../../services/productProductVariationService";
import productVariationService from "../../../services/productVariationService";

const ProductVariationsPanel = ({ productId }) => {
    const [variations, setVariations] = useState([]);
    const [allVariations, setAllVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState(null);
    const [addValue, setAddValue] = useState(null);

    const fetchVariations = useCallback(async () => {
        try {
            const data = await productProductVariationService.getByProduct(productId);
            setVariations(data);
            setError(null);
        } catch (err) {
            setError("Failed to load variations");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    const fetchAllVariations = useCallback(async () => {
        try {
            const data = await productVariationService.getAll();
            setAllVariations(data);
        } catch (err) {
            console.error("Failed to load variation options:", err);
        }
    }, []);

    useEffect(() => {
        fetchVariations();
        fetchAllVariations();
    }, [fetchVariations, fetchAllVariations]);

    const assignedVariationIds = variations.map(v => v.product_variation);

    const getUnassignedVariations = (excludeVariationId = null) => {
        return allVariations.filter(v =>
            !assignedVariationIds.includes(v.id) || v.id === excludeVariationId
        );
    };

    const handleRemove = async (ppvId) => {
        if (!window.confirm("Remove this variation from the product?")) return;
        try {
            await productProductVariationService.delete(ppvId);
            fetchVariations();
        } catch (err) {
            setError("Failed to remove variation");
            console.error(err);
        }
    };

    const handleAdd = async () => {
        if (!addValue) return;
        try {
            await productProductVariationService.create({
                product: productId,
                product_variation: addValue.id,
            });
            setAddValue(null);
            fetchVariations();
        } catch (err) {
            setError("Failed to add variation");
            console.error(err);
        }
    };

    const handleEditSave = async (ppvId) => {
        if (!editValue) return;
        try {
            await productProductVariationService.update(ppvId, {
                product: productId,
                product_variation: editValue.id,
            });
            setEditingId(null);
            setEditValue(null);
            fetchVariations();
        } catch (err) {
            setError("Failed to update variation");
            console.error(err);
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditValue(null);
    };

    const startEdit = (ppv) => {
        setEditingId(ppv.id);
        const currentVariation = allVariations.find(v => v.id === ppv.product_variation);
        setEditValue(currentVariation || null);
    };

    if (loading) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Variations
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

            {variations.length === 0 && !error ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No variations assigned
                </Typography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {variations.map((ppv) => (
                            <TableRow key={ppv.id}>
                                {editingId === ppv.id ? (
                                    <>
                                        <TableCell colSpan={3}>
                                            <Autocomplete
                                                size="small"
                                                options={getUnassignedVariations(ppv.product_variation)}
                                                getOptionLabel={(option) => `${option.name} (${option.code})`}
                                                value={editValue}
                                                onChange={(_, newValue) => setEditValue(newValue)}
                                                renderInput={(params) => (
                                                    <TextField {...params} placeholder="Select variation" />
                                                )}
                                                isOptionEqualToValue={(option, value) => option.id === value?.id}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditSave(ppv.id)}
                                                aria-label="save"
                                                color="success"
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={handleEditCancel}
                                                aria-label="cancel"
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{ppv.variation_name}</TableCell>
                                        <TableCell>{ppv.variation_code}</TableCell>
                                        <TableCell>{ppv.variation_type}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => startEdit(ppv)}
                                                aria-label="edit"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemove(ppv.id)}
                                                aria-label="remove"
                                                color="error"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Add variation row */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Autocomplete
                    size="small"
                    sx={{ minWidth: 250 }}
                    options={getUnassignedVariations()}
                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                    value={addValue}
                    onChange={(_, newValue) => setAddValue(newValue)}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Add variation..." />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                />
                <IconButton
                    size="small"
                    onClick={handleAdd}
                    disabled={!addValue}
                    color="primary"
                    aria-label="add variation"
                >
                    <AddIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default ProductVariationsPanel;
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend/react-Admin3 && npx jest --testPathPattern="ProductVariationsPanel" --no-coverage`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/products/ProductVariationsPanel.js \
        frontend/react-Admin3/src/components/admin/products/__tests__/ProductVariationsPanel.test.js
git commit -m "feat(admin): add ProductVariationsPanel for inline PPV management"
```

---

## Task 4: Frontend — Expandable ProductTable Rows

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductTable.js`
- Test: `frontend/react-Admin3/src/components/admin/products/__tests__/ProductTable.test.js`

**Step 1: Write the failing tests**

Add to the bottom of `ProductTable.test.js` (before the closing `});`):

```javascript
describe('expandable rows', () => {
    test('renders expand button for each product', () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);
      expect(expandButtons).toHaveLength(2);
    });

    test('expand button toggles row expansion', async () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);

      // Click to expand first product
      fireEvent.click(expandButtons[0]);

      // The Collapse should now be open — ProductVariationsPanel renders inside
      // We check that the expand icon changed direction
      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();
    });

    test('clicking expand on another row collapses the first', () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);

      fireEvent.click(expandButtons[0]); // expand row 1
      fireEvent.click(expandButtons[1]); // expand row 2

      // Row 2 should be expanded, row 1 collapsed
      expect(screen.getByTestId('expand-row-2')).toBeInTheDocument();
      expect(screen.queryByTestId('expand-row-1')).not.toBeInTheDocument();
    });
  });
```

Also add the mock for ProductVariationsPanel at the top of `ProductTable.test.js` (after imports):

```javascript
// Mock ProductVariationsPanel to avoid testing its internals here
jest.mock('../ProductVariationsPanel', () => {
  return function MockProductVariationsPanel({ productId }) {
    return <div data-testid={`expand-row-${productId}`}>Variations for {productId}</div>;
  };
});
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend/react-Admin3 && npx jest --testPathPattern="ProductTable.test" --no-coverage`
Expected: FAIL — no expand buttons found

**Step 3: Update ProductTable with expandable rows**

Replace `frontend/react-Admin3/src/components/admin/products/ProductTable.js`:

```javascript
// src/components/admin/products/ProductTable.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Paper, Box, IconButton, Collapse,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ProductVariationsPanel from "./ProductVariationsPanel";

const AdminProductTable = ({ products, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null);

    const handleToggleExpand = (productId) => {
        setExpandedId(prev => prev === productId ? null : productId);
    };

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 50 }} />
                        <TableCell>Code</TableCell>
                        <TableCell>Full Name</TableCell>
                        <TableCell>Short Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>Buy Both</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product) => (
                        <React.Fragment key={product.id}>
                            <TableRow hover>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleToggleExpand(product.id)}
                                        aria-label={expandedId === product.id ? "collapse" : "expand"}
                                    >
                                        {expandedId === product.id
                                            ? <KeyboardArrowUpIcon />
                                            : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </TableCell>
                                <TableCell>{product.code}</TableCell>
                                <TableCell>{product.fullname}</TableCell>
                                <TableCell>{product.shortname}</TableCell>
                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {product.description || '-'}
                                </TableCell>
                                <TableCell>{product.is_active ? "Active" : "Inactive"}</TableCell>
                                <TableCell>{product.buy_both ? "Yes" : "No"}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            component={Link}
                                            to={`/admin/products/${product.id}`}
                                            variant="contained"
                                            color="info"
                                            size="small"
                                        >
                                            View
                                        </Button>
                                        <Button
                                            component={Link}
                                            to={`/admin/products/${product.id}/edit`}
                                            variant="contained"
                                            color="warning"
                                            size="small"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            onClick={() => onDelete(product.id)}
                                        >
                                            Delete
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ py: 0 }} colSpan={8}>
                                    <Collapse in={expandedId === product.id} timeout="auto" unmountOnExit>
                                        <ProductVariationsPanel productId={product.id} />
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AdminProductTable;
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend/react-Admin3 && npx jest --testPathPattern="ProductTable.test" --no-coverage`
Expected: All tests PASS (existing tests still pass — they don't depend on column count)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/products/ProductTable.js \
        frontend/react-Admin3/src/components/admin/products/__tests__/ProductTable.test.js
git commit -m "feat(admin): add expandable rows to ProductTable for PPV management"
```

---

## Task 5: Run Full Test Suite

**Step 1: Run backend tests**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views -v 2`
Expected: All PASS

**Step 2: Run frontend tests**

Run: `cd frontend/react-Admin3 && npx jest --testPathPattern="products/" --no-coverage`
Expected: All product-related tests PASS (ProductTable, ProductVariationsPanel, ProductList, ProductForm, ProductDetail, ProductImport)

**Step 3: Run full frontend suite**

Run: `cd frontend/react-Admin3 && npx jest --no-coverage`
Expected: All tests PASS, no regressions

**Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: address test failures from PPV inline management"
```

---

## Summary of All Files

| # | File | Action |
|---|------|--------|
| 1 | `backend/django_Admin3/catalog/serializers/product_serializers.py` | Add `ProductProductVariationDetailSerializer` |
| 2 | `backend/django_Admin3/catalog/serializers/__init__.py` | Export new serializer |
| 3 | `backend/django_Admin3/catalog/views/product_variation_views.py` | Add product filter + dual serializer + no pagination |
| 4 | `backend/django_Admin3/catalog/tests/test_admin_views.py` | Add 3 new tests |
| 5 | `frontend/react-Admin3/src/services/productProductVariationService.js` | Add `getByProduct()` |
| 6 | `frontend/react-Admin3/src/components/admin/products/ProductVariationsPanel.js` | **Create** |
| 7 | `frontend/react-Admin3/src/components/admin/products/__tests__/ProductVariationsPanel.test.js` | **Create** |
| 8 | `frontend/react-Admin3/src/components/admin/products/ProductTable.js` | Add expandable rows |
| 9 | `frontend/react-Admin3/src/components/admin/products/__tests__/ProductTable.test.js` | Add expand tests + mock |
