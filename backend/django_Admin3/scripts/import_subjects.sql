-- =============================================================================
-- Script: import_subjects.sql
-- Purpose: Import subjects into acted.catalog_subjects from CSV data.
--          Skips any subject whose code already exists (ON CONFLICT DO NOTHING).
-- Database: PostgreSQL (acted schema)
--
-- Usage:
--   \i import_subjects.sql
-- =============================================================================

\set ON_ERROR_STOP on
\timing on

BEGIN;

DO $$
DECLARE
    v_before INTEGER;
    v_after INTEGER;
    v_inserted INTEGER;
BEGIN
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'Importing subjects into acted.catalog_subjects';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '=========================================================================';

    SELECT COUNT(*) INTO v_before FROM "acted"."catalog_subjects";

    INSERT INTO "acted"."catalog_subjects" (code, description, active, created_at, updated_at)
    VALUES
        ('*',    NULL, TRUE, NOW(), NOW()),
        ('101',  NULL, TRUE, NOW(), NOW()),
        ('102',  NULL, TRUE, NOW(), NOW()),
        ('103',  NULL, TRUE, NOW(), NOW()),
        ('104',  NULL, TRUE, NOW(), NOW()),
        ('105',  NULL, TRUE, NOW(), NOW()),
        ('106',  NULL, TRUE, NOW(), NOW()),
        ('107',  NULL, TRUE, NOW(), NOW()),
        ('108',  NULL, TRUE, NOW(), NOW()),
        ('109',  NULL, TRUE, NOW(), NOW()),
        ('201',  NULL, TRUE, NOW(), NOW()),
        ('301',  NULL, TRUE, NOW(), NOW()),
        ('302',  NULL, TRUE, NOW(), NOW()),
        ('303',  NULL, TRUE, NOW(), NOW()),
        ('304',  NULL, TRUE, NOW(), NOW()),
        ('305',  NULL, TRUE, NOW(), NOW()),
        ('401',  NULL, TRUE, NOW(), NOW()),
        ('402',  NULL, TRUE, NOW(), NOW()),
        ('403',  NULL, TRUE, NOW(), NOW()),
        ('404',  NULL, TRUE, NOW(), NOW()),
        ('88',   NULL, TRUE, NOW(), NOW()),
        ('A',    NULL, TRUE, NOW(), NOW()),
        ('A1',   NULL, TRUE, NOW(), NOW()),
        ('A2',   NULL, TRUE, NOW(), NOW()),
        ('A211', NULL, TRUE, NOW(), NOW()),
        ('A213', NULL, TRUE, NOW(), NOW()),
        ('A302', NULL, TRUE, NOW(), NOW()),
        ('A311', NULL, TRUE, NOW(), NOW()),
        ('B',    NULL, TRUE, NOW(), NOW()),
        ('B1',   NULL, TRUE, NOW(), NOW()),
        ('B2',   NULL, TRUE, NOW(), NOW()),
        ('C',    NULL, TRUE, NOW(), NOW()),
        ('C0',   NULL, TRUE, NOW(), NOW()),
        ('C1',   NULL, TRUE, NOW(), NOW()),
        ('C103', NULL, TRUE, NOW(), NOW()),
        ('C104', NULL, TRUE, NOW(), NOW()),
        ('C2',   NULL, TRUE, NOW(), NOW()),
        ('CA1',  NULL, TRUE, NOW(), NOW()),
        ('CA11', NULL, TRUE, NOW(), NOW()),
        ('CA12', NULL, TRUE, NOW(), NOW()),
        ('CA2',  NULL, TRUE, NOW(), NOW()),
        ('CA3',  NULL, TRUE, NOW(), NOW()),
        ('CAA0', NULL, TRUE, NOW(), NOW()),
        ('CAA1', NULL, TRUE, NOW(), NOW()),
        ('CAA2', NULL, TRUE, NOW(), NOW()),
        ('CAA3', NULL, TRUE, NOW(), NOW()),
        ('CAA4', NULL, TRUE, NOW(), NOW()),
        ('CAA5', NULL, TRUE, NOW(), NOW()),
        ('CB1',  NULL, TRUE, NOW(), NOW()),
        ('CB2',  NULL, TRUE, NOW(), NOW()),
        ('CM1',  NULL, TRUE, NOW(), NOW()),
        ('CM2',  NULL, TRUE, NOW(), NOW()),
        ('CP1',  NULL, TRUE, NOW(), NOW()),
        ('CP2',  NULL, TRUE, NOW(), NOW()),
        ('CP3',  NULL, TRUE, NOW(), NOW()),
        ('CPD',  NULL, TRUE, NOW(), NOW()),
        ('CS1',  NULL, TRUE, NOW(), NOW()),
        ('CS2',  NULL, TRUE, NOW(), NOW()),
        ('CT1',  NULL, TRUE, NOW(), NOW()),
        ('CT2',  NULL, TRUE, NOW(), NOW()),
        ('CT3',  NULL, TRUE, NOW(), NOW()),
        ('CT4',  NULL, TRUE, NOW(), NOW()),
        ('CT5',  NULL, TRUE, NOW(), NOW()),
        ('CT6',  NULL, TRUE, NOW(), NOW()),
        ('CT7',  NULL, TRUE, NOW(), NOW()),
        ('CT8',  NULL, TRUE, NOW(), NOW()),
        ('CT9',  NULL, TRUE, NOW(), NOW()),
        ('D',    NULL, TRUE, NOW(), NOW()),
        ('D1',   NULL, TRUE, NOW(), NOW()),
        ('D2',   NULL, TRUE, NOW(), NOW()),
        ('E',    NULL, TRUE, NOW(), NOW()),
        ('F',    NULL, TRUE, NOW(), NOW()),
        ('F101', NULL, TRUE, NOW(), NOW()),
        ('F102', NULL, TRUE, NOW(), NOW()),
        ('F103', NULL, TRUE, NOW(), NOW()),
        ('F104', NULL, TRUE, NOW(), NOW()),
        ('F105', NULL, TRUE, NOW(), NOW()),
        ('F108', NULL, TRUE, NOW(), NOW()),
        ('F201', NULL, TRUE, NOW(), NOW()),
        ('F202', NULL, TRUE, NOW(), NOW()),
        ('F203', NULL, TRUE, NOW(), NOW()),
        ('F204', NULL, TRUE, NOW(), NOW()),
        ('F205', NULL, TRUE, NOW(), NOW()),
        ('F206', NULL, TRUE, NOW(), NOW()),
        ('F210', NULL, TRUE, NOW(), NOW()),
        ('G',    NULL, TRUE, NOW(), NOW()),
        ('H',    NULL, TRUE, NOW(), NOW()),
        ('N211', NULL, TRUE, NOW(), NOW()),
        ('NA21', NULL, TRUE, NOW(), NOW()),
        ('PM0',  NULL, TRUE, NOW(), NOW()),
        ('PM1',  NULL, TRUE, NOW(), NOW()),
        ('PM2',  NULL, TRUE, NOW(), NOW()),
        ('PM3',  NULL, TRUE, NOW(), NOW()),
        ('PM4',  NULL, TRUE, NOW(), NOW()),
        ('PM5',  NULL, TRUE, NOW(), NOW()),
        ('PM6',  NULL, TRUE, NOW(), NOW()),
        ('PM7',  NULL, TRUE, NOW(), NOW()),
        ('PMS',  NULL, TRUE, NOW(), NOW()),
        ('QE',   NULL, TRUE, NOW(), NOW()),
        ('QF',   NULL, TRUE, NOW(), NOW()),
        ('QG',   NULL, TRUE, NOW(), NOW()),
        ('QH',   NULL, TRUE, NOW(), NOW()),
        ('QQ',   NULL, TRUE, NOW(), NOW()),
        ('ROWS', NULL, TRUE, NOW(), NOW()),
        ('SA1',  NULL, TRUE, NOW(), NOW()),
        ('SA2',  NULL, TRUE, NOW(), NOW()),
        ('SA3',  NULL, TRUE, NOW(), NOW()),
        ('SA4',  NULL, TRUE, NOW(), NOW()),
        ('SA5',  NULL, TRUE, NOW(), NOW()),
        ('SA6',  NULL, TRUE, NOW(), NOW()),
        ('SA7',  NULL, TRUE, NOW(), NOW()),
        ('SP1',  NULL, TRUE, NOW(), NOW()),
        ('SP2',  NULL, TRUE, NOW(), NOW()),
        ('SP4',  NULL, TRUE, NOW(), NOW()),
        ('SP5',  NULL, TRUE, NOW(), NOW()),
        ('SP6',  NULL, TRUE, NOW(), NOW()),
        ('SP7',  NULL, TRUE, NOW(), NOW()),
        ('SP8',  NULL, TRUE, NOW(), NOW()),
        ('SP9',  NULL, TRUE, NOW(), NOW()),
        ('ST1',  NULL, TRUE, NOW(), NOW()),
        ('ST2',  NULL, TRUE, NOW(), NOW()),
        ('ST3',  NULL, TRUE, NOW(), NOW()),
        ('ST4',  NULL, TRUE, NOW(), NOW()),
        ('ST5',  NULL, TRUE, NOW(), NOW()),
        ('ST6',  NULL, TRUE, NOW(), NOW()),
        ('ST7',  NULL, TRUE, NOW(), NOW()),
        ('ST8',  NULL, TRUE, NOW(), NOW()),
        ('ST9',  NULL, TRUE, NOW(), NOW()),
        ('UFM',  NULL, TRUE, NOW(), NOW()),
        ('UP',   NULL, TRUE, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    SELECT COUNT(*) INTO v_after FROM "acted"."catalog_subjects";
    v_inserted := v_after - v_before;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'IMPORT COMPLETE';
    RAISE NOTICE '  Rows inserted: %', v_inserted;
    RAISE NOTICE '  Rows skipped (already exist): %', 126 - v_inserted;
    RAISE NOTICE '  Total rows in table: %', v_after;
    RAISE NOTICE '=========================================================================';

END $$;

COMMIT;

-- =============================================================================
-- Verification: Show all subjects
-- =============================================================================
\echo ''
\echo '--- Verification: All subjects ---'

SELECT id, code, active
FROM "acted"."catalog_subjects"
ORDER BY code;
