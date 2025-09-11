# Administrate Management Commands

This directory contains Django management commands for synchronizing data between the local database and the Administrate API.

## Prerequisites

Before running these commands:
1. Activate the virtual environment: `.\.venv\Scripts\activate`
2. Navigate to the Django project directory: `cd backend\django_Admin3`
3. Ensure database is migrated: `python manage.py migrate`
4. Ensure .env.development file has valid Administrate API credentials

## Available Commands

### 1. sync_course_templates
Synchronizes course templates from Administrate API to local database.

```bash
# Basic usage
python manage.py sync_course_templates

# With debug output
python manage.py sync_course_templates --debug

# Custom page size for API pagination (default: 100)
python manage.py sync_course_templates --page-size 50
```

### 2. sync_course_template_price_levels
Synchronizes price levels for course templates from Administrate API.

```bash
# Basic usage
python manage.py sync_course_template_price_levels

# With debug output
python manage.py sync_course_template_price_levels --debug

# Custom page size (default: 10)
python manage.py sync_course_template_price_levels --page-size 20
```

### 3. update_course_template_prices
Updates course template prices from an Excel file in the local database.

**Excel File Format:**
- Column B: Price level name (e.g., "Normal", "Retaker")
- Column C: Amount (e.g., "395.00" or "£395.00")
- Column D: Course code (e.g., "CS1")

```bash
# Dry run (default) - shows what would be updated without making changes
python manage.py update_course_template_prices "C:\path\to\price_file.xlsx"

# Apply changes to database
python manage.py update_course_template_prices "C:\path\to\price_file.xlsx" --no-dry-run

# With debug output
python manage.py update_course_template_prices "C:\path\to\price_file.xlsx" --debug

# Use specific Excel sheet
python manage.py update_course_template_prices "C:\path\to\price_file.xlsx" --sheet "Sheet2"

# Start reading from different row (default: 2)
python manage.py update_course_template_prices "C:\path\to\price_file.xlsx" --start-row 3
```

**Note:** The command automatically maps "Repeat / Additional" to "Retaker" price level.

### 4. update_administrate_prices
Pushes price updates from local database to Administrate API.

```bash
# Dry run (default) - shows what would be updated without making API calls
python manage.py update_administrate_prices

# Actually update prices in Administrate (use with caution!)
python manage.py update_administrate_prices --no-dry-run

# Filter by course code
python manage.py update_administrate_prices --course-code CS1

# Filter by price level
python manage.py update_administrate_prices --price-level Normal

# Adjust API call delay (default: 0.5 seconds)
python manage.py update_administrate_prices --delay 1.0

# Change batch confirmation size (default: 10)
python manage.py update_administrate_prices --batch-size 20

# Debug mode
python manage.py update_administrate_prices --debug
```

**⚠️ WARNING:** The `--no-dry-run` flag will make actual API calls to update prices in Administrate. Always test with dry run first!

## Typical Workflow

1. **Sync course templates** (if needed):
   ```bash
   python manage.py sync_course_templates
   ```

2. **Sync price levels**:
   ```bash
   python manage.py sync_course_template_price_levels
   ```

3. **Update prices from Excel**:
   ```bash
   # Test with dry run
   python manage.py update_course_template_prices "price_upload.xlsx"
   
   # Apply changes
   python manage.py update_course_template_prices "price_upload.xlsx" --no-dry-run
   ```

4. **Push to Administrate API**:
   ```bash
   # Test with dry run
   python manage.py update_administrate_prices
   
   # Actually update (after careful review!)
   python manage.py update_administrate_prices --no-dry-run
   ```

## Other Commands in this Directory

### sync_pricelevels
Synchronizes price level definitions from Administrate API.
```bash
python manage.py sync_pricelevels
```

## Safety Features

- **Dry Run Mode**: Most update commands default to dry-run mode to prevent accidental changes
- **Transaction Support**: Database operations use transactions for consistency
- **Confirmation Prompts**: Live updates require user confirmation in batches
- **Debug Logging**: Use `--debug` flag for detailed output
- **Error Handling**: Commands handle API errors gracefully and report issues

## Troubleshooting

1. **API Authentication Errors**: Check .env.development file for valid Administrate credentials
2. **Excel File Not Found**: Use absolute paths with proper escaping
3. **Price Level Not Found**: Run `sync_pricelevels` to ensure all price levels are synchronized
4. **Course Template Not Found**: Run `sync_course_templates` to ensure all templates are synchronized
5. **Rate Limiting**: Adjust `--delay` parameter if encountering API rate limits

## Development Notes

- GraphQL queries are stored in: `administrate/templates/graphql/queries/`
- GraphQL mutations are stored in: `administrate/templates/graphql/mutations/`
- Models are defined in: `administrate/models/`
- API service is in: `administrate/services/api_service.py`