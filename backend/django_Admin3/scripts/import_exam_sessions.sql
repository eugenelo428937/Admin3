-- =============================================================================
-- Script: import_exam_sessions.sql
-- Purpose: Import exam sessions from CSV data into acted.catalog_exam_sessions
-- Database: PostgreSQL (acted schema)
--
-- Usage:
--   \i import_exam_sessions.sql
--
-- Notes:
--   - Dates are converted from DD/MM/YYYY to TIMESTAMP format
--   - create_date and modified_date are set to NOW()
--   - Session code '98' appears twice (1996-1997 and 1997-1998) — both inserted
--   - Skips rows where session_code + start_date already exists (idempotent)
-- =============================================================================

\set ON_ERROR_STOP on
\timing on

BEGIN;

DO $$
DECLARE
    v_inserted INTEGER := 0;
    v_skipped INTEGER := 0;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'Importing exam sessions into acted.catalog_exam_sessions';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '=========================================================================';

    -- Create a temp table to stage the CSV data
    CREATE TEMP TABLE tmp_exam_sessions (
        session_code VARCHAR(50),
        start_date TIMESTAMP,
        end_date TIMESTAMP
    ) ON COMMIT DROP;

    -- =========================================================================
    -- Insert CSV data (dates converted from DD/MM/YYYY to TIMESTAMP)
    -- =========================================================================
    INSERT INTO tmp_exam_sessions (session_code, start_date, end_date) VALUES
    -- Winter sessions (October - March)
    ('00',  '1999-10-01'::timestamp, '2000-03-31'::timestamp),
    ('01',  '2000-10-01'::timestamp, '2001-03-31'::timestamp),
    ('02',  '2001-10-01'::timestamp, '2002-03-31'::timestamp),
    ('03',  '2002-10-01'::timestamp, '2003-03-31'::timestamp),
    ('04',  '2003-10-01'::timestamp, '2004-03-31'::timestamp),
    ('05',  '2004-10-01'::timestamp, '2005-03-31'::timestamp),
    ('06',  '2005-10-01'::timestamp, '2006-03-31'::timestamp),
    ('07',  '2006-10-01'::timestamp, '2007-03-31'::timestamp),
    ('08',  '2007-10-01'::timestamp, '2008-03-31'::timestamp),
    ('09',  '2008-10-01'::timestamp, '2009-03-31'::timestamp),
    ('10',  '2009-10-01'::timestamp, '2010-03-31'::timestamp),
    ('11',  '2010-10-01'::timestamp, '2011-03-31'::timestamp),
    ('12',  '2011-10-01'::timestamp, '2012-03-31'::timestamp),
    ('13',  '2012-10-01'::timestamp, '2013-03-31'::timestamp),
    ('14',  '2013-10-01'::timestamp, '2014-03-31'::timestamp),
    ('15',  '2014-10-01'::timestamp, '2015-03-31'::timestamp),
    ('16',  '2015-10-01'::timestamp, '2016-03-31'::timestamp),
    ('17',  '2016-10-01'::timestamp, '2017-03-31'::timestamp),
    ('18',  '2017-10-01'::timestamp, '2018-03-31'::timestamp),
    ('19',  '2018-10-01'::timestamp, '2019-03-31'::timestamp),
    ('20',  '2019-10-01'::timestamp, '2020-03-31'::timestamp),
    ('21',  '2020-10-01'::timestamp, '2021-03-31'::timestamp),
    ('22',  '2021-10-01'::timestamp, '2022-03-31'::timestamp),
    ('23',  '2022-10-01'::timestamp, '2023-03-31'::timestamp),
    ('24',  '2023-10-01'::timestamp, '2024-03-31'::timestamp),
    ('25',  '2024-10-01'::timestamp, '2025-03-31'::timestamp),
    ('26',  '2025-10-01'::timestamp, '2026-03-31'::timestamp),
    ('95',  '1993-10-01'::timestamp, '1994-03-31'::timestamp),
    ('96',  '1994-10-01'::timestamp, '1995-03-31'::timestamp),
    ('97',  '1995-10-01'::timestamp, '1996-03-31'::timestamp),
    ('98',  '1996-10-01'::timestamp, '1997-03-31'::timestamp),
    ('98',  '1997-10-01'::timestamp, '1998-03-31'::timestamp),  -- duplicate code, different dates
    ('99',  '1998-10-01'::timestamp, '1999-03-31'::timestamp),

    -- Summer sessions (April - September)
    ('00S', '2000-04-01'::timestamp, '2000-09-30'::timestamp),
    ('01S', '2001-04-01'::timestamp, '2001-09-30'::timestamp),
    ('02S', '2002-04-01'::timestamp, '2002-09-30'::timestamp),
    ('03S', '2003-04-01'::timestamp, '2003-09-30'::timestamp),
    ('04S', '2004-04-01'::timestamp, '2004-09-30'::timestamp),
    ('05S', '2005-04-01'::timestamp, '2005-09-30'::timestamp),
    ('06S', '2006-04-01'::timestamp, '2006-09-30'::timestamp),
    ('07S', '2007-04-01'::timestamp, '2007-09-30'::timestamp),
    ('08S', '2008-04-01'::timestamp, '2008-09-30'::timestamp),
    ('09S', '2009-04-01'::timestamp, '2009-09-30'::timestamp),
    ('10S', '2010-04-01'::timestamp, '2010-09-30'::timestamp),
    ('11S', '2011-04-01'::timestamp, '2011-09-30'::timestamp),
    ('12S', '2012-04-01'::timestamp, '2012-09-30'::timestamp),
    ('13S', '2013-04-01'::timestamp, '2013-09-30'::timestamp),
    ('14S', '2014-04-01'::timestamp, '2014-09-30'::timestamp),
    ('15S', '2015-04-01'::timestamp, '2015-09-30'::timestamp),
    ('16S', '2016-04-01'::timestamp, '2016-09-30'::timestamp),
    ('17S', '2017-04-01'::timestamp, '2017-09-30'::timestamp),
    ('18S', '2018-04-01'::timestamp, '2018-09-30'::timestamp),
    ('19S', '2019-04-01'::timestamp, '2019-09-30'::timestamp),
    ('20S', '2020-04-01'::timestamp, '2020-09-30'::timestamp),
    ('21S', '2021-04-01'::timestamp, '2021-09-30'::timestamp),
    ('22S', '2022-04-01'::timestamp, '2022-09-30'::timestamp),
    ('23S', '2023-04-01'::timestamp, '2023-09-30'::timestamp),
    ('24S', '2024-04-01'::timestamp, '2024-09-30'::timestamp),
    ('25S', '2025-04-01'::timestamp, '2025-09-30'::timestamp),
    ('26S', '2026-04-01'::timestamp, '2026-09-30'::timestamp),
    ('96S', '1996-04-01'::timestamp, '1996-09-30'::timestamp),
    ('97S', '1997-04-01'::timestamp, '1997-09-30'::timestamp),
    ('98S', '1998-04-01'::timestamp, '1998-09-30'::timestamp),
    ('99S', '1999-04-01'::timestamp, '1999-09-30'::timestamp);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Staged % rows in temp table', v_count;

    -- =========================================================================
    -- Insert into target table, skipping rows that already exist
    -- (matched on session_code + start_date to handle the duplicate '98' code)
    -- =========================================================================
    INSERT INTO "acted"."catalog_exam_sessions" (
        session_code,
        start_date,
        end_date,
        create_date,
        modified_date
    )
    SELECT
        t.session_code,
        t.start_date,
        t.end_date,
        NOW(),
        NOW()
    FROM tmp_exam_sessions t
    WHERE NOT EXISTS (
        SELECT 1
        FROM "acted"."catalog_exam_sessions" es
        WHERE es.session_code = t.session_code
          AND es.start_date = t.start_date
    );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_skipped := v_count - v_inserted;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================================';
    RAISE NOTICE 'IMPORT COMPLETE';
    RAISE NOTICE '  Rows inserted: %', v_inserted;
    RAISE NOTICE '  Rows skipped (already exist): %', v_skipped;
    RAISE NOTICE '  Timestamp: %', NOW();
    RAISE NOTICE '=========================================================================';

END $$;

COMMIT;

-- =============================================================================
-- Verification: Show imported exam sessions
-- =============================================================================
\echo ''
\echo '--- Verification: All exam sessions ---'

SELECT id, session_code, start_date, end_date
FROM "acted"."catalog_exam_sessions"
ORDER BY start_date;
