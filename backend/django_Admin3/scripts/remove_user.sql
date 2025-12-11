-- =============================================================================
-- Script: remove_user.sql
-- Purpose: Remove a user and all related data from the Admin3 database
-- Database: PostgreSQL
--
-- Usage:
--   Option 1 - By User ID:
--     \set user_id 123
--     \i remove_user.sql
--
--   Option 2 - By Email:
--     \set user_email 'user@example.com'
--     \i remove_user.sql
--
--   Option 3 - Direct execution (edit the variables below):
--     Uncomment and set ONE of the following:
--     - p_user_id
--     - p_user_email
-- =============================================================================

-- Enable output
\set ON_ERROR_STOP on
\timing on

DO $$
DECLARE
    -- =========================================================================
    -- CONFIGURATION: Set ONE of these values
    -- =========================================================================
    p_user_id INTEGER := NULL;          -- Set user ID here, e.g., 123
    p_user_email TEXT := NULL;          -- OR set email here, e.g., 'user@example.com'

    -- =========================================================================
    -- Internal variables (do not modify)
    -- =========================================================================
    v_user_id INTEGER;
    v_user_email TEXT;
    v_user_profile_id INTEGER;
    v_username TEXT;
    v_deleted_count INTEGER;
    v_total_deleted INTEGER := 0;

BEGIN
    -- =========================================================================
    -- Step 1: Resolve user ID from either ID or email parameter
    -- =========================================================================

    IF p_user_id IS NOT NULL THEN
        -- Lookup by ID
        SELECT id, email, username INTO v_user_id, v_user_email, v_username
        FROM auth_user
        WHERE id = p_user_id;

        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'User with ID % not found', p_user_id;
        END IF;

    ELSIF p_user_email IS NOT NULL THEN
        -- Lookup by email
        SELECT id, email, username INTO v_user_id, v_user_email, v_username
        FROM auth_user
        WHERE LOWER(email) = LOWER(p_user_email);

        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'User with email % not found', p_user_email;
        END IF;

    ELSE
        RAISE EXCEPTION 'Please set either p_user_id or p_user_email at the top of this script';
    END IF;

    -- Get user profile ID
    SELECT id INTO v_user_profile_id
    FROM acted_user_profile
    WHERE user_id = v_user_id;

    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'Starting deletion for user:';
    RAISE NOTICE '  User ID: %', v_user_id;
    RAISE NOTICE '  Username: %', v_username;
    RAISE NOTICE '  Email: %', v_user_email;
    RAISE NOTICE '  Profile ID: %', COALESCE(v_user_profile_id::TEXT, 'N/A');
    RAISE NOTICE '=========================================================================';

    -- =========================================================================
    -- Step 2: Delete Order-related records (children first)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting ORDER-related records ---';

    -- Delete order user acknowledgments
    DELETE FROM acted_order_user_acknowledgments
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_order_user_acknowledgments', v_deleted_count;

    -- Delete order user preferences
    DELETE FROM acted_order_user_preferences
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_order_user_preferences', v_deleted_count;

    -- Delete order user contact
    DELETE FROM acted_order_user_contact
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_order_user_contact', v_deleted_count;

    -- Delete order items
    DELETE FROM acted_order_items
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_order_items', v_deleted_count;

    -- Delete order payments
    DELETE FROM acted_order_payments
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_order_payments', v_deleted_count;

    -- Delete orders
    DELETE FROM acted_orders WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_orders', v_deleted_count;

    -- =========================================================================
    -- Step 3: Delete Cart-related records (children first)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting CART-related records ---';

    -- Delete cart fees
    DELETE FROM acted_cart_fees
    WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_cart_fees', v_deleted_count;

    -- Delete cart items
    DELETE FROM acted_cart_items
    WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_cart_items', v_deleted_count;

    -- Delete carts
    DELETE FROM acted_carts WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_carts', v_deleted_count;

    -- =========================================================================
    -- Step 4: Delete User Profile-related records (children first)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting USER PROFILE-related records ---';

    IF v_user_profile_id IS NOT NULL THEN
        -- Delete user profile addresses
        DELETE FROM acted_user_profile_address WHERE user_profile_id = v_user_profile_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_deleted_count;
        RAISE NOTICE 'Deleted % records from acted_user_profile_address', v_deleted_count;

        -- Delete user profile contact numbers
        DELETE FROM acted_user_profile_contact_number WHERE user_profile_id = v_user_profile_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_deleted_count;
        RAISE NOTICE 'Deleted % records from acted_user_profile_contact_number', v_deleted_count;

        -- Delete user profile emails
        DELETE FROM acted_user_profile_email WHERE user_profile_id = v_user_profile_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_deleted_count;
        RAISE NOTICE 'Deleted % records from acted_user_profile_email', v_deleted_count;

        -- Delete user profile
        DELETE FROM acted_user_profile WHERE id = v_user_profile_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_deleted_count;
        RAISE NOTICE 'Deleted % records from acted_user_profile', v_deleted_count;
    ELSE
        RAISE NOTICE 'No user profile found for this user';
    END IF;

    -- =========================================================================
    -- Step 5: Delete Email-related records (logs have FK to queue, delete logs first)
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting EMAIL-related records ---';

    -- Delete email logs FIRST (has FK to utils_email_queue.queue_item_id)
    -- Delete logs that are sent to user's email OR belong to queue items for this user
    DELETE FROM utils_email_log
    WHERE LOWER(to_email) = LOWER(v_user_email)
       OR queue_item_id IN (
           SELECT id FROM utils_email_queue
           WHERE created_by_id = v_user_id
              OR to_emails::text ILIKE '%' || v_user_email || '%'
       );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from utils_email_log', v_deleted_count;

    -- Delete email queue items AFTER logs (by user ID or email in to_emails JSON)
    DELETE FROM utils_email_queue
    WHERE created_by_id = v_user_id
       OR to_emails::text ILIKE '%' || v_user_email || '%';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from utils_email_queue', v_deleted_count;

    -- =========================================================================
    -- Step 6: Delete Student record
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting STUDENT record ---';

    DELETE FROM acted_students WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from acted_students', v_deleted_count;

    -- =========================================================================
    -- Step 7: Delete the user from auth_user
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- Deleting AUTH_USER record ---';

    DELETE FROM auth_user WHERE id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    RAISE NOTICE 'Deleted % records from auth_user', v_deleted_count;

    -- =========================================================================
    -- Summary
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '  Total records deleted: %', v_total_deleted;
    RAISE NOTICE '  User ID: %', v_user_id;
    RAISE NOTICE '  Email: %', v_user_email;
    RAISE NOTICE '=========================================================================';

END $$;

-- Optional: Verify deletion
-- SELECT COUNT(*) as remaining FROM auth_user WHERE id = :user_id;
