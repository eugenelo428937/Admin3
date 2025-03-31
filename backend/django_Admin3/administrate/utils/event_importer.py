import pandas as pd
import os
import logging
from datetime import datetime
from django.core.exceptions import ValidationError
from administrate.models import Instructor, CourseTemplate
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query

logger = logging.getLogger(__name__)


def validate_and_process_event_excel(file_path, debug=False):
    """
    Load and validate Excel file data for Administrate Event creation
    
    Args:
        file_path (str): Path to the Excel file
        debug (bool): Enable debug logging
    
    Returns:
        tuple: (valid_data, error_data) - Lists of dictionaries containing valid rows and error rows
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel file not found: {file_path}")
    
    # Set up logging
    if debug:
        logger.setLevel(logging.DEBUG)
    
    # Get API service for validations
    api_service = AdministrateAPIService()
    
    # Initialize results
    valid_data = []
    error_data = []
    
    try:
        # Load Excel file
        logger.info(f"Loading Excel file: {file_path}")
        df = pd.read_excel(file_path, na_values=[''])
        
        # Check required columns
        required_columns = [
            '!Course Code',         # Course template code
        #     'title',              # Event title
        #     'location',           # Location name
        #     'start_date',         # Start date (DD/MM/YYYY)
        #     'start_time',         # Start time (HH:MM)
        #     'end_date',           # End date (DD/MM/YYYY)
        #     'end_time',           # End time (HH:MM)
        #     'instructor',         # Instructor name
        #     'price_level'         # Price level
         ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValidationError(f"Missing required columns in Excel file: {', '.join(missing_columns)}")
        
        # Process each row
        for index, row in df.iterrows():
            row_number = index + 3  # +2 because Excel is 1-indexed and has header row
            row_data = row.to_dict()
            row_data['row_number'] = row_number
            row_errors = []
            
            # Validate Course Template
            try:
                if not row['!Course Code']:
                    course_template = validate_course_template(
                        api_service, row['!Course Code'])
                    if not course_template:
                        row_errors.append(
                            f"Invalid course template code: {row['!Course Code']}")
                    else:
                        row_data['course_template_id'] = course_template['id']
            except Exception as e:
                row_errors.append(f"Error validating course template: {str(e)}")
            
            # Validate Location
            # try:
            #     location = validate_location(api_service, row['location'])
            #     if not location:
            #         row_errors.append(f"Invalid location: {row['location']}")
            #     else:
            #         row_data['location_id'] = location['id']
            # except Exception as e:
            #     row_errors.append(f"Error validating location: {str(e)}")
            
            # Validate Dates
            # try:
            #     start_datetime = validate_and_format_datetime(row['start_date'], row['start_time'])
            #     if not start_datetime:
            #         row_errors.append(f"Invalid start date/time: {row['start_date']} {row['start_time']}")
            #     else:
            #         row_data['formatted_start_datetime'] = start_datetime
            # except Exception as e:
            #     row_errors.append(f"Error validating start date/time: {str(e)}")
            
            # try:
            #     end_datetime = validate_and_format_datetime(row['end_date'], row['end_time'])
            #     if not end_datetime:
            #         row_errors.append(f"Invalid end date/time: {row['end_date']} {row['end_time']}")
            #     else:
            #         row_data['formatted_end_datetime'] = end_datetime
                
            #     # Check that end date is after start date
            #     if start_datetime and end_datetime and end_datetime <= start_datetime:
            #         row_errors.append(f"End date/time must be after start date/time")
            # except Exception as e:
            #     row_errors.append(f"Error validating end date/time: {str(e)}")
            
            # # Validate Instructor
            # try:
            #     instructor = validate_instructor(api_service, row['instructor'])
            #     if not instructor:
            #         row_errors.append(f"Invalid instructor: {row['instructor']}")
            #     else:
            #         row_data['instructor_id'] = instructor['id']
                    
            #         # Also check if instructor is authorized for this course
            #         if 'course_template_id' in row_data and not instructor_authorized_for_course(
            #             api_service, instructor['id'], row_data['course_template_id']):
            #             row_errors.append(f"Instructor {row['instructor']} is not authorized for course {row['course_code']}")
            # except Exception as e:
            #     row_errors.append(f"Error validating instructor: {str(e)}")
            
            # # Validate Price Level
            # try:
            #     price_level = validate_price_level(api_service, row['price_level'])
            #     if not price_level:
            #         row_errors.append(f"Invalid price level: {row['price_level']}")
            #     else:
            #         row_data['price_level_id'] = price_level['id']
            # except Exception as e:
            #     row_errors.append(f"Error validating price level: {str(e)}")
            
            # Add to appropriate result list
            if row_errors:
                row_data['errors'] = row_errors
                error_data.append(row_data)
                logger.warning(f"Row {row_number} has validation errors: {row_errors}")
            else:
                valid_data.append(row_data)
                logger.debug(f"Row {row_number} passed validation")
                print(row_number)
        
        logger.info(f"Validation complete. Valid rows: {len(valid_data)}, Error rows: {len(error_data)}")
        
        return valid_data, error_data
    
    except Exception as e:
        logger.exception(f"Error processing Excel file: {str(e)}")
        raise
        
        
def validate_and_format_datetime(date_value, time_value):
    """
    Validate and format date and time values into ISO format
    
    Args:
        date_value: Date in DD/MM/YYYY format
        time_value: Time in HH:MM format
    
    Returns:
        str: ISO formatted datetime or None if invalid
    """
    if pd.isna(date_value) or pd.isna(time_value):
        return None
    
    try:
        # Handle different possible date formats
        if isinstance(date_value, datetime):
            date_obj = date_value
        elif isinstance(date_value, str):
            if '/' in date_value:
                date_obj = datetime.strptime(date_value, "%d/%m/%Y")
            else:
                date_obj = datetime.strptime(date_value, "%Y-%m-%d")
        else:
            return None
        
        # Handle time format
        if isinstance(time_value, str):
            hour, minute = map(int, time_value.split(':'))
        else:
            # If it's not a string (e.g., a timedelta)
            return None
            
        # Create a full datetime object
        dt = datetime(date_obj.year, date_obj.month, date_obj.day, hour, minute)
        return dt.isoformat()
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid date/time format: {date_value} {time_value}, {str(e)}")
        return None


def validate_course_template(api_service, course_code):
    """
    Validate that a course template exists with the given code
    
    Args:
        api_service: AdministrateAPIService instance
        course_code: Course template code to validate
    
    Returns:
        dict: Course template data or None if invalid
    """
    try:
        # First try to find in our local database
        course_templates = CourseTemplate.objects.filter(
            code__iexact=course_code
        )

        if course_templates.exists():
            course_template = course_templates.first()
            return {
                'id': course_template.external_id,                
                'code': course_template.code,
                'title': course_template.title
            }

        # If not found locally, try the API
        query = load_graphql_query('get_course_template_by_code')
        variables = {"code": course_code}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'courseTemplates' in result['data'] and
            'edges' in result['data']['courseTemplates'] and
                len(result['data']['courseTemplates']['edges']) > 0):
            return result['data']['courseTemplates']['edges'][0]['node']

        logger.warning(f"Course template not found: {course_code}")
        return None
    except Exception as e:
        logger.warning(
            f"Error validating course template {course_code}: {str(e)}")
        return None


def validate_location(api_service, location_name):
    """
    Validate that a location exists with the given name
    
    Args:
        api_service: AdministrateAPIService instance
        location_name: Location name to validate
    
    Returns:
        dict: Location data or None if invalid
    """
    try:
        query = load_graphql_query('get_location_by_name')
        variables = {"name": location_name}
        result = api_service.execute_query(query, variables)
        
        if (result and 'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
            len(result['data']['locations']['edges']) > 0):
            return result['data']['locations']['edges'][0]['node']
        return None
    except AdministrateAPIError as e:
        logger.warning(f"API error validating location {location_name}: {str(e)}")
        return None


def validate_instructor(api_service, instructor_name):
    """
    Validate that an instructor exists with the given name
    
    Args:
        api_service: AdministrateAPIService instance
        instructor_name: Instructor name to validate
    
    Returns:
        dict: Instructor data or None if invalid
    """
    try:
        # First try to find in our local database
        name_parts = instructor_name.strip().split()
        
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = " ".join(name_parts[1:]) 
            
            instructors = Instructor.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                is_active=True
            )
            
            if instructors.exists():
                instructor = instructors.first()
                return {
                    'id': instructor.external_id,
                    'legacy_id': instructor.legacy_id,
                    'name': instructor.name
                }
        
        # If not found locally, try the API
        query = load_graphql_query('get_instructor_by_name')
        variables = {"name": instructor_name.replace(" ", "%")}
        result = api_service.execute_query(query, variables)
        
        if (result and 'data' in result and
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
            len(result['data']['contacts']['edges']) > 0):
            return result['data']['contacts']['edges'][0]['node']
        return None
    except AdministrateAPIError as e:
        logger.warning(f"API error validating instructor {instructor_name}: {str(e)}")
        return None


def validate_price_level(api_service, price_level_name):
    """
    Validate that a price level exists with the given name
    
    Args:
        api_service: AdministrateAPIService instance
        price_level_name: Price level name to validate
    
    Returns:
        dict: Price level data or None if invalid
    """
    try:
        query = load_graphql_query('get_price_level_by_name')
        variables = {"name": price_level_name}
        result = api_service.execute_query(query, variables)
        
        if (result and 'data' in result and
            'priceLevels' in result['data'] and
            'edges' in result['data']['priceLevels'] and
            len(result['data']['priceLevels']['edges']) > 0):
            return result['data']['priceLevels']['edges'][0]['node']
        return None
    except AdministrateAPIError as e:
        logger.warning(f"API error validating price level {price_level_name}: {str(e)}")
        return None


def instructor_authorized_for_course(api_service, instructor_id, course_template_id):
    """
    Check if the instructor is authorized to teach the given course
    
    Args:
        api_service: AdministrateAPIService instance
        instructor_id: Instructor ID
        course_template_id: Course template ID
    
    Returns:
        bool: True if instructor is authorized, False otherwise
    """
    try:
        query = load_graphql_query('get_course_approved_instructors')
        variables = {"courseId": course_template_id}
        result = api_service.execute_query(query, variables)
        
        if (result and 'data' in result and
            'courseTemplate' in result['data'] and
            'approvedInstructors' in result['data']['courseTemplate'] and
            'edges' in result['data']['courseTemplate']['approvedInstructors']):
            
            instructors = result['data']['courseTemplate']['approvedInstructors']['edges']
            for instructor in instructors:
                if instructor['node']['id'] == instructor_id:
                    return True
        return False
    except AdministrateAPIError as e:
        logger.warning(f"API error checking instructor authorization: {str(e)}")
        return False


def create_administrate_events(api_service, valid_data, debug=False):
    """
    Create events in Administrate based on validated data

    Args:
        api_service: AdministrateAPIService instance
        valid_data: List of validated data dictionaries
        debug: Enable debug logging

    Returns:
        tuple: (successful_events, failed_events) - Lists of successful and failed event creations
    """
    successful_events = []
    failed_events = []

    query = load_graphql_query('create_event')

    for row_data in valid_data:
        try:
            # Prepare event creation variables
            variables = {
                "input": {
                    "title": row_data['title'],
                    "courseTemplateId": row_data['course_template_id'],
                    "locationId": row_data['location_id'],
                    "startTime": row_data['formatted_start_datetime'],
                    "endTime": row_data['formatted_end_datetime'],
                    "instructorIds": [row_data['instructor_id']],
                    "priceLevelId": row_data['price_level_id']
                }
            }

            # Add optional fields if present
            if 'capacity' in row_data and not pd.isna(row_data['capacity']):
                variables["input"]["capacity"] = int(row_data['capacity'])

            if 'description' in row_data and not pd.isna(row_data['description']):
                variables["input"]["description"] = str(
                    row_data['description'])

            if 'active' in row_data:
                variables["input"]["active"] = bool(
                    row_data.get('active', True))
            else:
                variables["input"]["active"] = True

            logger.debug(f"Creating event with variables: {variables}")

            result = api_service.execute_query(query, variables)

            if (result and 'data' in result and
                'createEvent' in result['data'] and
                    'event' in result['data']['createEvent']):

                event = result['data']['createEvent']['event']
                row_data['event_id'] = event['id']
                successful_events.append(row_data)
                logger.info(
                    f"Successfully created event '{row_data['title']}' with ID {event['id']}")
            else:
                # Check for errors
                errors = []
                if 'errors' in result:
                    errors = [error.get('message', 'Unknown error')
                              for error in result.get('errors', [])]
                elif 'data' in result and 'createEvent' in result['data'] and 'errors' in result['data']['createEvent']:
                    errors = [error.get('message', 'Unknown error')
                              for error in result['data']['createEvent'].get('errors', [])]

                error_message = ', '.join(
                    errors) if errors else "Unknown error creating event"
                row_data['error'] = error_message
                failed_events.append(row_data)
                logger.error(
                    f"Failed to create event '{row_data['title']}': {error_message}")

                if debug:
                    logger.debug(f"Failed event creation response: {result}")

        except Exception as e:
            row_data['error'] = str(e)
            failed_events.append(row_data)
            logger.error(
                f"Exception creating event '{row_data['title']}': {str(e)}")
            if debug:
                logger.exception(e)

    return successful_events, failed_events


def bulk_upload_events_from_excel(file_path, debug=False, dry_run=False):
    """
    Main function to handle the bulk upload of events from Excel file

    Args:
        file_path (str): Path to the Excel file
        debug (bool): Enable debug logging
        dry_run (bool): If True, only validate the data without creating events

    Returns:
        dict: Results containing counts and details of processing
    """
    # Set up logging
    if debug:
        logger.setLevel(logging.DEBUG)

    logger.info(f"Starting bulk upload from {file_path} (dry_run={dry_run})")

    try:
        # Step 1: Validate the Excel data
        api_service = AdministrateAPIService()
        valid_data, error_data = validate_and_process_event_excel(
            file_path, debug)

        results = {
            "total_rows": len(valid_data) + len(error_data),
            "valid_rows": len(valid_data),
            "error_rows": len(error_data),
            "validation_errors": error_data,
            "created_events": [],
            "failed_events": []
        }

        # Step 2: Create events if not a dry run
        if not dry_run and valid_data:
            logger.info(f"Creating {len(valid_data)} events in Administrate")
            successful_events, failed_events = create_administrate_events(
                api_service, valid_data, debug)

            results["created_count"] = len(successful_events)
            results["failed_count"] = len(failed_events)
            results["created_events"] = successful_events
            results["failed_events"] = failed_events

            logger.info(
                f"Event creation complete. Created: {len(successful_events)}, Failed: {len(failed_events)}")
        elif dry_run:
            logger.info("Dry run - not creating events")
            results["dry_run"] = True

        return results

    except Exception as e:
        logger.exception(f"Error in bulk upload process: {str(e)}")
        raise


def generate_error_report(results, output_path=None):
    """
    Generate an Excel report of validation and creation errors

    Args:
        results (dict): Results from bulk_upload_events_from_excel
        output_path (str): Path to save the error report, defaults to 'event_upload_errors.xlsx'

    Returns:
        str: Path to the generated report
    """
    if output_path is None:
        output_path = 'event_upload_errors.xlsx'

    # Combine validation errors and creation errors
    all_errors = []

    # Process validation errors
    for row in results.get('validation_errors', []):
        all_errors.append({
            'Row': row.get('row_number', 'N/A'),
            'Title': row.get('title', 'N/A'),
            'Course Code': row.get('course_code', 'N/A'),
            'Location': row.get('location', 'N/A'),
            'Start Date': row.get('start_date', 'N/A'),
            'End Date': row.get('end_date', 'N/A'),
            'Instructor': row.get('instructor', 'N/A'),
            'Error Type': 'Validation Error',
            'Error Detail': '; '.join(row.get('errors', ['Unknown error']))
        })

    # Process creation errors
    for row in results.get('failed_events', []):
        all_errors.append({
            'Row': row.get('row_number', 'N/A'),
            'Title': row.get('title', 'N/A'),
            'Course Code': row.get('course_code', 'N/A'),
            'Location': row.get('location', 'N/A'),
            'Start Date': row.get('start_date', 'N/A'),
            'End Date': row.get('end_date', 'N/A'),
            'Instructor': row.get('instructor', 'N/A'),
            'Error Type': 'Creation Error',
            'Error Detail': row.get('error', 'Unknown error')
        })

    if all_errors:
        df = pd.DataFrame(all_errors)
        df.to_excel(output_path, index=False)
        logger.info(f"Error report generated at {output_path}")
        return output_path
    else:
        logger.info("No errors to report")
        return None

