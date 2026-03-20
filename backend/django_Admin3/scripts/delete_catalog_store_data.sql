-- =============================================================================
-- Script: delete_catalog_store_data.sql
-- Purpose: Delete ALL records from catalog_*, store (products, prices, bundles),
--          cart*, marking (paper, vouchers), and order* tables.
-- Database: PostgreSQL (acted schema)
--
-- WARNING: This is a destructive operation. It will delete ALL data from the
--          listed tables. Make sure you have a backup before running this.
--
-- Usage:
--   \i delete_catalog_store_data.sql
--
-- Tables affected (in deletion order):
--   1. Order children    → order_user_acknowledgments, order_user_preferences,
--                          order_user_contact, order_delivery_detail,
--                          order_payments, order_items
--   2. Orders            → orders
--   3. Cart children     → cart_fees, cart_items
--   4. Carts             → carts
--   5. Store children    → bundle_products, prices
--   6. Store parents     → bundles, products
--   7. Marking           → marking_paper, marking_vouchers
--   8. Catalog children  → exam_session_subject_products,
--                          catalog_product_bundle_products,
--                          product_productvariation_recommendations,
--                          filter_product_product_groups,
--                          catalog_product_product_variations,
--                          catalog_exam_session_subjects
--   9. Catalog parents   → catalog_product_bundles, catalog_products,
--                          catalog_product_variations, catalog_exam_sessions,
--                          catalog_subjects
-- =============================================================================

\set ON_ERROR_STOP on
\timing on

BEGIN;

DO $$
DECLARE
    v_count INTEGER;
    v_total INTEGER := 0;
BEGIN
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'Starting bulk deletion of catalog, store, cart, order, and marking data';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '=========================================================================';

    -- =========================================================================
    -- PHASE 1: Order-related records (deepest children first)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 1: Order-related records ---';

    -- Order acknowledgments
    DELETE FROM "acted"."order_user_acknowledgments";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_user_acknowledgments', v_count;

    -- Order preferences
    DELETE FROM "acted"."order_user_preferences";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_user_preferences', v_count;

    -- Order contacts
    DELETE FROM "acted"."order_user_contact";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_user_contact', v_count;

    -- Order delivery details
    DELETE FROM "acted"."order_delivery_detail";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_delivery_detail', v_count;

    -- Order payments
    DELETE FROM "acted"."order_payments";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_payments', v_count;

    -- Order items
    DELETE FROM "acted"."order_items";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.order_items', v_count;

    -- Orders
    DELETE FROM "acted"."orders";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.orders', v_count;

    -- =========================================================================
    -- PHASE 2: Cart-related records
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 2: Cart-related records ---';

    -- Cart fees
    DELETE FROM "acted"."cart_fees";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.cart_fees', v_count;

    -- Cart items
    DELETE FROM "acted"."cart_items";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.cart_items', v_count;

    -- Carts
    DELETE FROM "acted"."carts";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.carts', v_count;

    -- =========================================================================
    -- PHASE 3: Store-related records (children before parents)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 3: Store-related records ---';

    -- Bundle products (child of bundles + products)
    DELETE FROM "acted"."bundle_products";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.bundle_products', v_count;

    -- Prices (child of products)
    DELETE FROM "acted"."prices";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.prices', v_count;

    -- Bundles
    DELETE FROM "acted"."bundles";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.bundles', v_count;

    -- Store products
    DELETE FROM "acted"."products";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.products', v_count;

    -- =========================================================================
    -- PHASE 4: Marking records
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 4: Marking records ---';

    -- Marking papers (has FK to store.Product, but store.Product already deleted)
    DELETE FROM "acted"."marking_paper";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.marking_paper', v_count;

    -- Marking vouchers (referenced by cart_items and order_items, already deleted)
    DELETE FROM "acted"."marking_vouchers";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.marking_vouchers', v_count;

    -- =========================================================================
    -- PHASE 5: Catalog child records
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 5: Catalog child records ---';

    -- Exam session subject products (junction table)
    DELETE FROM acted_exam_session_subject_products;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted_exam_session_subject_products', v_count;

    -- Catalog product bundle products (junction table)
    DELETE FROM "acted"."catalog_product_bundle_products";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_product_bundle_products', v_count;

    -- Product variation recommendations
    DELETE FROM "acted"."product_productvariation_recommendations";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.product_productvariation_recommendations', v_count;

    -- Filter product-product groups (junction table)
    DELETE FROM "acted"."filter_product_product_groups";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.filter_product_product_groups', v_count;

    -- Catalog product-product variations (junction table)
    DELETE FROM "acted"."catalog_product_product_variations";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_product_product_variations', v_count;

    -- Catalog exam session subjects (junction table)
    DELETE FROM "acted"."catalog_exam_session_subjects";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_exam_session_subjects', v_count;

    -- =========================================================================
    -- PHASE 6: Catalog parent records
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 6: Catalog parent records ---';

    -- Catalog product bundles
    DELETE FROM "acted"."catalog_product_bundles";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_product_bundles', v_count;

    -- Catalog products
    DELETE FROM "acted"."catalog_products";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_products', v_count;

    -- Catalog product variations
    DELETE FROM "acted"."catalog_product_variations";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_product_variations', v_count;

    -- Catalog exam sessions
    DELETE FROM "acted"."catalog_exam_sessions";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_exam_sessions', v_count;

    -- Catalog subjects
    DELETE FROM "acted"."catalog_subjects";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE '  Deleted % rows from acted.catalog_subjects', v_count;

    -- =========================================================================
    -- Summary
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '  Total rows deleted: %', v_total;
    RAISE NOTICE '  Timestamp: %', NOW();
    RAISE NOTICE '=========================================================================';

END $$;

COMMIT;

-- =============================================================================
-- Verification: Check all tables are empty
-- =============================================================================
\echo ''
\echo '--- Verification: Row counts (should all be 0) ---'

SELECT 'acted.order_user_acknowledgments' AS table_name, COUNT(*) AS row_count FROM "acted"."order_user_acknowledgments"
UNION ALL SELECT 'acted.order_user_preferences', COUNT(*) FROM "acted"."order_user_preferences"
UNION ALL SELECT 'acted.order_user_contact', COUNT(*) FROM "acted"."order_user_contact"
UNION ALL SELECT 'acted.order_delivery_detail', COUNT(*) FROM "acted"."order_delivery_detail"
UNION ALL SELECT 'acted.order_payments', COUNT(*) FROM "acted"."order_payments"
UNION ALL SELECT 'acted.order_items', COUNT(*) FROM "acted"."order_items"
UNION ALL SELECT 'acted.orders', COUNT(*) FROM "acted"."orders"
UNION ALL SELECT 'acted.cart_fees', COUNT(*) FROM "acted"."cart_fees"
UNION ALL SELECT 'acted.cart_items', COUNT(*) FROM "acted"."cart_items"
UNION ALL SELECT 'acted.carts', COUNT(*) FROM "acted"."carts"
UNION ALL SELECT 'acted.bundle_products', COUNT(*) FROM "acted"."bundle_products"
UNION ALL SELECT 'acted.prices', COUNT(*) FROM "acted"."prices"
UNION ALL SELECT 'acted.bundles', COUNT(*) FROM "acted"."bundles"
UNION ALL SELECT 'acted.products', COUNT(*) FROM "acted"."products"
UNION ALL SELECT 'acted.marking_paper', COUNT(*) FROM "acted"."marking_paper"
UNION ALL SELECT 'acted.marking_vouchers', COUNT(*) FROM "acted"."marking_vouchers"
UNION ALL SELECT 'acted_exam_session_subject_products', COUNT(*) FROM acted_exam_session_subject_products
UNION ALL SELECT 'acted.catalog_product_bundle_products', COUNT(*) FROM "acted"."catalog_product_bundle_products"
UNION ALL SELECT 'acted.product_productvariation_recommendations', COUNT(*) FROM "acted"."product_productvariation_recommendations"
UNION ALL SELECT 'acted.filter_product_product_groups', COUNT(*) FROM "acted"."filter_product_product_groups"
UNION ALL SELECT 'acted.catalog_product_product_variations', COUNT(*) FROM "acted"."catalog_product_product_variations"
UNION ALL SELECT 'acted.catalog_exam_session_subjects', COUNT(*) FROM "acted"."catalog_exam_session_subjects"
UNION ALL SELECT 'acted.catalog_product_bundles', COUNT(*) FROM "acted"."catalog_product_bundles"
UNION ALL SELECT 'acted.catalog_products', COUNT(*) FROM "acted"."catalog_products"
UNION ALL SELECT 'acted.catalog_product_variations', COUNT(*) FROM "acted"."catalog_product_variations"
UNION ALL SELECT 'acted.catalog_exam_sessions', COUNT(*) FROM "acted"."catalog_exam_sessions"
UNION ALL SELECT 'acted.catalog_subjects', COUNT(*) FROM "acted"."catalog_subjects"
ORDER BY table_name;
