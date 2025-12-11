-- =============================================================================
-- Script: remove_user_function.sql
-- Purpose: Create a reusable function to remove users from Admin3 database
-- Database: PostgreSQL
--
-- This script creates a function that can be called with either user ID or email.
-- It supports dry-run mode to preview what would be deleted.
--
-- Usage Examples:
--   -- Dry run by ID (preview only, no deletion):
--   SELECT * FROM remove_user_by_id(123, true);
--
--   -- Actual deletion by ID:
  --SELECT * FROM remove_user_by_id(128, false);
--
--   -- Dry run by email (preview only, no deletion):
--   SELECT * FROM remove_user_by_email('user@example.com', true);
--
--   -- Actual deletion by email:
--   SELECT * FROM remove_user_by_email('user@example.com', false);
-- =============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS remove_user_by_id(INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS remove_user_by_email(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS _remove_user_internal(INTEGER, BOOLEAN);

-- =============================================================================
-- Internal function that does the actual work
-- =============================================================================
CREATE OR REPLACE FUNCTION _remove_user_internal(
    p_user_id INTEGER,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE (
    table_name TEXT,
    records_affected INTEGER,
    action TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_email TEXT;
    v_user_profile_id INTEGER;
    v_username TEXT;
    v_count INTEGER;
BEGIN
    -- Validate user exists
    SELECT email, username INTO v_user_email, v_username
    FROM auth_user
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id;
    END IF;

    -- Get user profile ID
    SELECT id INTO v_user_profile_id
    FROM acted_user_profile
    WHERE user_id = p_user_id;

    -- Set action type based on mode
    IF p_dry_run THEN
        action := 'WOULD DELETE';
    ELSE
        action := 'DELETED';
    END IF;

    -- =========================================================================
    -- Order-related tables
    -- =========================================================================

    -- acted_order_user_acknowledgments
    SELECT COUNT(*) INTO v_count
    FROM acted_order_user_acknowledgments
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);

    table_name := 'acted_order_user_acknowledgments';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_order_user_acknowledgments
        WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);
    END IF;

    -- acted_order_user_preferences
    SELECT COUNT(*) INTO v_count
    FROM acted_order_user_preferences
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);

    table_name := 'acted_order_user_preferences';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_order_user_preferences
        WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);
    END IF;

    -- acted_order_user_contact
    SELECT COUNT(*) INTO v_count
    FROM acted_order_user_contact
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);

    table_name := 'acted_order_user_contact';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_order_user_contact
        WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);
    END IF;

    -- acted_order_items
    SELECT COUNT(*) INTO v_count
    FROM acted_order_items
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);

    table_name := 'acted_order_items';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_order_items
        WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);
    END IF;

    -- acted_order_payments
    SELECT COUNT(*) INTO v_count
    FROM acted_order_payments
    WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);

    table_name := 'acted_order_payments';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_order_payments
        WHERE order_id IN (SELECT id FROM acted_orders WHERE user_id = p_user_id);
    END IF;

    -- acted_orders
    SELECT COUNT(*) INTO v_count FROM acted_orders WHERE user_id = p_user_id;

    table_name := 'acted_orders';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_orders WHERE user_id = p_user_id;
    END IF;

    -- =========================================================================
    -- Cart-related tables
    -- =========================================================================

    -- acted_cart_fees
    SELECT COUNT(*) INTO v_count
    FROM acted_cart_fees
    WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = p_user_id);

    table_name := 'acted_cart_fees';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_cart_fees
        WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = p_user_id);
    END IF;

    -- acted_cart_items
    SELECT COUNT(*) INTO v_count
    FROM acted_cart_items
    WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = p_user_id);

    table_name := 'acted_cart_items';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_cart_items
        WHERE cart_id IN (SELECT id FROM acted_carts WHERE user_id = p_user_id);
    END IF;

    -- acted_carts
    SELECT COUNT(*) INTO v_count FROM acted_carts WHERE user_id = p_user_id;

    table_name := 'acted_carts';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_carts WHERE user_id = p_user_id;
    END IF;

    -- =========================================================================
    -- User Profile-related tables
    -- =========================================================================

    IF v_user_profile_id IS NOT NULL THEN
        -- acted_user_profile_address
        SELECT COUNT(*) INTO v_count FROM acted_user_profile_address WHERE user_profile_id = v_user_profile_id;

        table_name := 'acted_user_profile_address';
        records_affected := v_count;
        RETURN NEXT;

        IF NOT p_dry_run AND v_count > 0 THEN
            DELETE FROM acted_user_profile_address WHERE user_profile_id = v_user_profile_id;
        END IF;

        -- acted_user_profile_contact_number
        SELECT COUNT(*) INTO v_count FROM acted_user_profile_contact_number WHERE user_profile_id = v_user_profile_id;

        table_name := 'acted_user_profile_contact_number';
        records_affected := v_count;
        RETURN NEXT;

        IF NOT p_dry_run AND v_count > 0 THEN
            DELETE FROM acted_user_profile_contact_number WHERE user_profile_id = v_user_profile_id;
        END IF;

        -- acted_user_profile_email
        SELECT COUNT(*) INTO v_count FROM acted_user_profile_email WHERE user_profile_id = v_user_profile_id;

        table_name := 'acted_user_profile_email';
        records_affected := v_count;
        RETURN NEXT;

        IF NOT p_dry_run AND v_count > 0 THEN
            DELETE FROM acted_user_profile_email WHERE user_profile_id = v_user_profile_id;
        END IF;

        -- acted_user_profile
        table_name := 'acted_user_profile';
        records_affected := 1;
        RETURN NEXT;

        IF NOT p_dry_run THEN
            DELETE FROM acted_user_profile WHERE id = v_user_profile_id;
        END IF;
    ELSE
        table_name := 'acted_user_profile';
        records_affected := 0;
        RETURN NEXT;

        table_name := 'acted_user_profile_address';
        records_affected := 0;
        RETURN NEXT;

        table_name := 'acted_user_profile_contact_number';
        records_affected := 0;
        RETURN NEXT;

        table_name := 'acted_user_profile_email';
        records_affected := 0;
        RETURN NEXT;
    END IF;

    -- =========================================================================
    -- Email-related tables (logs have FK to queue, so delete logs first)
    -- =========================================================================

    -- utils_email_log (delete FIRST - has FK to utils_email_queue.queue_item_id)
    -- Delete logs that either:
    -- 1. Are sent to this user's email, OR
    -- 2. Belong to queue items created by/for this user
    SELECT COUNT(*) INTO v_count
    FROM utils_email_log
    WHERE LOWER(to_email) = LOWER(v_user_email)
       OR queue_item_id IN (
           SELECT id FROM utils_email_queue
           WHERE created_by_id = p_user_id
              OR to_emails::text ILIKE '%' || v_user_email || '%'
       );

    table_name := 'utils_email_log';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM utils_email_log
        WHERE LOWER(to_email) = LOWER(v_user_email)
           OR queue_item_id IN (
               SELECT id FROM utils_email_queue
               WHERE created_by_id = p_user_id
                  OR to_emails::text ILIKE '%' || v_user_email || '%'
           );
    END IF;

    -- utils_email_queue (delete AFTER logs)
    SELECT COUNT(*) INTO v_count
    FROM utils_email_queue
    WHERE created_by_id = p_user_id
       OR to_emails::text ILIKE '%' || v_user_email || '%';

    table_name := 'utils_email_queue';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM utils_email_queue
        WHERE created_by_id = p_user_id
           OR to_emails::text ILIKE '%' || v_user_email || '%';
    END IF;

    -- =========================================================================
    -- Student record
    -- =========================================================================

    SELECT COUNT(*) INTO v_count FROM acted_students WHERE user_id = p_user_id;

    table_name := 'acted_students';
    records_affected := v_count;
    RETURN NEXT;

    IF NOT p_dry_run AND v_count > 0 THEN
        DELETE FROM acted_students WHERE user_id = p_user_id;
    END IF;

    -- =========================================================================
    -- Auth user
    -- =========================================================================

    table_name := 'auth_user';
    records_affected := 1;
    RETURN NEXT;

    IF NOT p_dry_run THEN
        DELETE FROM auth_user WHERE id = p_user_id;
    END IF;

    -- Summary row
    table_name := '--- SUMMARY ---';
    records_affected := NULL;
    IF p_dry_run THEN
        action := 'DRY RUN COMPLETE (no changes made)';
    ELSE
        action := 'DELETION COMPLETE';
    END IF;
    RETURN NEXT;
END;
$$;

-- =============================================================================
-- Public function: Remove user by ID
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_user_by_id(
    p_user_id INTEGER,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE (
    table_name TEXT,
    records_affected INTEGER,
    action TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY SELECT * FROM _remove_user_internal(p_user_id, p_dry_run);
END;
$$;

COMMENT ON FUNCTION remove_user_by_id IS
'Remove a user and all related data by user ID.
Parameters:
  p_user_id: The auth_user.id of the user to remove
  p_dry_run: If true (default), only shows what would be deleted without making changes

Examples:
  SELECT * FROM remove_user_by_id(123, true);   -- Preview
  SELECT * FROM remove_user_by_id(123, false);  -- Actual deletion';

-- =============================================================================
-- Public function: Remove user by email
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_user_by_email(
    p_user_email TEXT,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE (
    table_name TEXT,
    records_affected INTEGER,
    action TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Lookup user ID by email
    SELECT id INTO v_user_id
    FROM auth_user
    WHERE LOWER(email) = LOWER(p_user_email);

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;

    RETURN QUERY SELECT * FROM _remove_user_internal(v_user_id, p_dry_run);
END;
$$;

COMMENT ON FUNCTION remove_user_by_email IS
'Remove a user and all related data by email address.
Parameters:
  p_user_email: The email address of the user to remove
  p_dry_run: If true (default), only shows what would be deleted without making changes

Examples:
  SELECT * FROM remove_user_by_email(''user@example.com'', true);   -- Preview
  SELECT * FROM remove_user_by_email(''user@example.com'', false);  -- Actual deletion';

-- =============================================================================
-- Example usage queries (commented out)
-- =============================================================================

-- Preview what would be deleted for user ID 123:
-- SELECT * FROM remove_user_by_id(123, true);

-- Actually delete user ID 123:
-- SELECT * FROM remove_user_by_id(123, false);

-- Preview what would be deleted for email:
-- SELECT * FROM remove_user_by_email('user@example.com', true);

-- Actually delete by email:
-- SELECT * FROM remove_user_by_email('user@example.com', false);

-- Show all users for reference:
-- SELECT id, username, email, date_joined, last_login FROM auth_user ORDER BY id;
