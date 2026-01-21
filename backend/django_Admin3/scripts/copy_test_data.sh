#!/bin/bash
# =============================================================================
# Copy Test Data from ACTEDDBDEV01 to test_ACTEDDBDEV01
# =============================================================================
# This script copies specific tables needed for Cart VAT workflow tests
# from the development database to the test database.
#
# Usage:
#   ./scripts/copy_test_data.sh              # Copy all VAT-related tables
#   ./scripts/copy_test_data.sh --tables     # List available tables
#   ./scripts/copy_test_data.sh --dry-run    # Show what would be copied
# =============================================================================

# Continue on non-critical errors
set +e

# Database configuration
SOURCE_DB="ACTEDDBDEV01"
TARGET_DB="test_ACTEDDBDEV01"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_USER="actedadmin"
export PGPASSWORD="Act3d@dm1n0EEoo"

# Tables needed for Cart VAT workflow tests
# Order matters due to foreign key dependencies
VAT_TABLES=(
    # Core reference tables
    "country_country"
    # Catalog tables in 'acted' schema (new consolidated catalog)
    "acted.catalog_subjects"
    "acted.catalog_exam_sessions"
    "acted.catalog_products"
    "acted.catalog_product_variations"
    # Legacy tables (still referenced by some FKs)
    "acted_subjects"
    "acted_products"
    "acted_product_variations"
    # Exam session mappings
    "acted_exam_session_subjects"
    "acted_exam_session_subject_products"
    "acted_exam_session_subject_product_variations"
    "acted_exam_session_subject_product_variation_price"
    # Rules engine tables
    "acted_rule_entry_points"
    "acted_rules_fields"
    "acted_rules_message_templates"
    "acted_rules"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if table exists in database (handles schema.table format)
table_exists() {
    local db=$1
    local table=$2
    local schema="public"
    local tbl_name="$table"

    # Handle schema-qualified table names (e.g., acted.catalog_subjects)
    if [[ "$table" == *.* ]]; then
        schema="${table%%.*}"
        tbl_name="${table#*.}"
    fi

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -t -c \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '$schema' AND table_name = '$tbl_name');" 2>/dev/null | tr -d ' '
}

# Get row count for table (handles schema.table format)
get_row_count() {
    local db=$1
    local table=$2
    # Quote schema-qualified names properly
    local quoted_table="$table"
    if [[ "$table" == *.* ]]; then
        local schema="${table%%.*}"
        local tbl_name="${table#*.}"
        quoted_table="\"$schema\".\"$tbl_name\""
    fi
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -t -c "SELECT COUNT(*) FROM $quoted_table" 2>/dev/null | tr -d ' '
}

# Check if target database exists
check_target_db() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$TARGET_DB"; then
        echo_error "Target database '$TARGET_DB' does not exist!"
        echo_info "Run Django tests first to create it: python manage.py test --keepdb"
        exit 1
    fi
}

# List available tables
list_tables() {
    echo_info "Tables that will be copied for VAT workflow tests:"
    echo ""
    for table in "${VAT_TABLES[@]}"; do
        source_exists=$(table_exists "$SOURCE_DB" "$table")
        target_exists=$(table_exists "$TARGET_DB" "$table")

        if [[ "$source_exists" == "t" ]]; then
            count=$(get_row_count "$SOURCE_DB" "$table")
            if [[ "$target_exists" == "t" ]]; then
                printf "  %-50s %s rows\n" "$table" "$count"
            else
                printf "  %-50s %s rows ${YELLOW}(target table missing)${NC}\n" "$table" "$count"
            fi
        else
            printf "  %-50s ${RED}(source table missing)${NC}\n" "$table"
        fi
    done
    echo ""
}

# Dry run - show what would be copied
dry_run() {
    echo_info "DRY RUN - Tables that would be copied:"
    echo ""
    for table in "${VAT_TABLES[@]}"; do
        source_exists=$(table_exists "$SOURCE_DB" "$table")
        target_exists=$(table_exists "$TARGET_DB" "$table")

        if [[ "$source_exists" == "t" && "$target_exists" == "t" ]]; then
            source_count=$(get_row_count "$SOURCE_DB" "$table")
            target_count=$(get_row_count "$TARGET_DB" "$table")
            printf "  %-50s %s -> %s rows\n" "$table" "$source_count" "$target_count"
        elif [[ "$source_exists" != "t" ]]; then
            printf "  %-50s ${RED}SKIP (source missing)${NC}\n" "$table"
        elif [[ "$target_exists" != "t" ]]; then
            printf "  %-50s ${YELLOW}SKIP (target missing)${NC}\n" "$table"
        fi
    done
    echo ""
    echo_warn "No changes made. Remove --dry-run to execute."
}

# Copy a single table using pg_dump with INSERT statements (no superuser needed)
copy_table() {
    local table=$1

    # Check if table exists in both databases
    source_exists=$(table_exists "$SOURCE_DB" "$table")
    target_exists=$(table_exists "$TARGET_DB" "$table")

    if [[ "$source_exists" != "t" ]]; then
        echo_warn "Skipping $table (not in source database)"
        return 0
    fi

    if [[ "$target_exists" != "t" ]]; then
        echo_warn "Skipping $table (not in target database)"
        return 0
    fi

    echo_info "Copying $table..."

    # Create temp file for INSERT statements
    local temp_file="/tmp/${table}_inserts.sql"

    # Export data as INSERT statements with column names (handles schema drift)
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$SOURCE_DB" \
        --table="$table" --data-only --column-inserts --no-owner --no-privileges \
        > "$temp_file" 2>/dev/null

    # Disable foreign key checks and truncate target table
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -c "
        SET session_replication_role = replica;
        TRUNCATE TABLE $table CASCADE;
    " 2>/dev/null || true

    # Import data using INSERT statements
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -q -f "$temp_file" 2>/dev/null

    # Re-enable foreign key checks
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -c "
        SET session_replication_role = DEFAULT;
    " 2>/dev/null || true

    # Clean up temp file
    rm -f "$temp_file"

    # Show count
    count=$(get_row_count "$TARGET_DB" "$table")
    echo_info "  -> $count rows copied"
}

# Copy all tables
copy_all_tables() {
    echo_info "Starting data copy from $SOURCE_DB to $TARGET_DB"
    echo ""

    check_target_db

    for table in "${VAT_TABLES[@]}"; do
        copy_table "$table"
    done

    echo ""
    echo_info "Data copy complete!"
}

# Reset sequences after copy
reset_sequences() {
    echo_info "Resetting sequences..."

    for table in "${VAT_TABLES[@]}"; do
        target_exists=$(table_exists "$TARGET_DB" "$table")
        if [[ "$target_exists" == "t" ]]; then
            # Try to reset sequence if it exists
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -c "
                DO \$\$
                DECLARE
                    seq_name TEXT;
                BEGIN
                    SELECT pg_get_serial_sequence('$table', 'id') INTO seq_name;
                    IF seq_name IS NOT NULL THEN
                        EXECUTE format('SELECT setval(%L, COALESCE(MAX(id), 1)) FROM $table', seq_name);
                    END IF;
                END
                \$\$;
            " 2>/dev/null || true
        fi
    done

    echo_info "Sequences reset complete!"
}

# Main execution
case "${1:-}" in
    --tables)
        list_tables
        ;;
    --dry-run)
        dry_run
        ;;
    --reset-sequences)
        reset_sequences
        ;;
    --help|-h)
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --tables           List tables that will be copied"
        echo "  --dry-run          Show what would be copied without making changes"
        echo "  --reset-sequences  Reset auto-increment sequences after copy"
        echo "  --help, -h         Show this help message"
        echo ""
        echo "Without options, copies all VAT-related tables from $SOURCE_DB to $TARGET_DB"
        ;;
    *)
        copy_all_tables
        reset_sequences
        echo ""
        echo_info "You can now run Cart VAT workflow tests with:"
        echo "  cd backend/django_Admin3 && python manage.py test cart --keepdb"
        ;;
esac

unset PGPASSWORD
