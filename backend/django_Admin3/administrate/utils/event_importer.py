import sys
import pandas as pd
from pathlib import Path
import os
import validators
import django
import logging
import json
import environ
from dotenv import load_dotenv

# Disable urllib3 debug logging
logging.getLogger('urllib3.connectionpool').setLevel(logging.WARNING)

from enum import Enum
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../..')))
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# Configure Django settings

# Load the production environment file
# env_path = os.path.join(project_root, '.env.production')
env_path = os.path.join(project_root, '.env.development')
load_dotenv(env_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'django_Admin3.settings')
django.setup()

from datetime import datetime,date,time
from django.core.exceptions import ValidationError
from administrate.services.api_service import AdministrateAPIService
from administrate.models import CourseTemplate, Location, Venue, Instructor, CustomField
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query, load_graphql_mutation
logger = logging.getLogger(__name__)
file_path = r"C:\Code\Admin3\backend\django_Admin3\administrate\src\EventSessionImportTemplate 2026A V1.xlsx"
queryFilePath = r"C:\Administrate\Result\query"+datetime.now().strftime("%Y%m%d")+"FINALLIVE.txt"
resultFilePath = r"C:\Administrate\Result\importResult"+datetime.now().strftime("%Y%m%d")+"FINALLIVE.txt"
ValidationFilePath = r"C:\Administrate\Result\ValidationResult"+datetime.now().strftime("%Y%m%d")+".txt"
tbc_venue_name = list(map(str.casefold, ["To be confirmed", "TBC", "TBD"]))

class EventLifecycleState(Enum):
    DRAFT = "Draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"

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
        df = pd.read_excel(file_path, na_filter=False,
                           skiprows=lambda x: 1 <= x <= 2)

        # remove space in column values using strip() function
        df = df.map(lambda x: x.strip() if isinstance(x, str) else x)

        # Check required columns
        required_columns = [
            'Course template code',
            'Event title',
            'Session title',
            'Learning mode',
            'Location',
            'Venue',
            'Time Zone',
            'Classroom start date',
            'Classroom start time',
            'Classroom end date',
            'Classroom end time',
            'LMS start date',
            'LMS start time',
            'LMS end date',
            'LMS end time',
            'Max places',
            'Instructor',
            'Session_instructor',
            'Event_administrator',
            'Day',
            'Event url',
            'Session_url',
            'Finalisation date',
            'Web sale',
            'Sitting',
            'OCR_moodle_code',            
         ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValidationError(f"Missing required columns in Excel file: {', '.join(missing_columns)}")
        
        parent_lms_start_date = None
        parent_course_template_id = None
        
        for index, row in df.iterrows():                        
            row_number = index + 5
            row_data = row.to_dict()
            row_data['row_number'] = row_number
            row_errors = []            
            print(row_number)
            lms_start_date = row['LMS start date']
            if not row['LMS start date']:
                lms_start_date = parent_lms_start_date
            if row['Course template code']:
                parent_lms_start_date = row['LMS start date']
                
                result = (
                    validate_event( 
                        api_service, 
                        row['Course template code'],
                        row['Event title'],                         
                        row['Location'], 
                        row['Venue'], 
                        row['Instructor'],
                        row['Session_instructor'],
                        row['Day'],
                        row['Max places'],
                        row['Sitting'],
                        row['Finalisation date'],
                        row['Event url'],
                        row['Web sale'],
                        row['Event_administrator'],
                        )
                )
                if result['row_errors']:
                    row_errors.extend(result['row_errors'])

                row_data.update(result['row_data'])
                row_data['event_or_session'] = "event"
                if row['Event title'].casefold() == "waitlist":
                    row_data['subject'] = row['Event title'].split('-')[0]
                
                parent_course_template_id = row_data['course_template_id']

                if result:
                    if "OC" not in row['Course template code'] and "WAITLIST" not in row['Course template code']:                        
                        result=(
                            validate_blended_event(
                                api_service, 
                                row['Classroom start date'],
                                row['Classroom start time'],
                                row['Classroom end date'],
                                row['Classroom end time'],
                                lms_start_date,
                                row['LMS start time'], 
                                row['LMS end date'],                                 
                                row['LMS end time'])
                            )
                        if result['row_errors']:
                            row_errors.extend(result['row_errors'])

                        row_data.update(result['row_data'])
                        row_data['event_mode'] = "blended"

                    else:                        
                        result = (
                            validate_lms_event(
                                api_service, 
                                lms_start_date,
                                row['LMS start time'],
                                row['LMS end date'],
                                row['LMS end time'],
                                row['Sitting'])
                            )
                        if result['row_errors']:
                            row_errors.extend(result['row_errors'])
                        row_data.update(result['row_data'])
                        row_data['event_mode'] = "lms"
            else:                
                result = validate_session(api_service,
                                          parent_course_template_id,
                                          row['Session title'],
                                          row['Classroom start date'],
                                          row['Classroom start time'],
                                          row['Classroom end date'],
                                          row['Classroom end time'],
                                          row['Session_instructor'],
                                          row['Session_url'],
                                          row['Day'])
                if result['row_errors']:
                    row_errors.extend(result['row_errors'])

                row_data.update(result['row_data'])
                row_data['event_or_session'] = "session"
            
            # Validate Price Level
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
                writeValidationResultToFile(
                    f"Row {row_number} has validation errors: {row_errors}")
            else:
                valid_data.append(row_data)
                # logger.debug(f"Row {row_number} passed validation")                
        
        logger.info(f"Validation complete. Valid rows: {len(valid_data)}, Error rows: {len(error_data)}")
        
        return valid_data, error_data
    
    except Exception as e:
        logger.exception(f"Error processing Excel file: {str(e)}")
        raise
    
def validate_event(api_service, 
                   course_template_code, 
                   event_title, 
                   location_name, 
                   venue_name, 
                   instructor_names, 
                   session_instructor_names,
                   session_day,
                   max_places,
                   sitting,
                   finaliztion_date, 
                   event_url, 
                   web_sale,
                   administrator_names
                   ):
    row_errors = []
    row_data = {}
    # Validate Course Template
    try:
        if course_template_code:
            course_template = validate_course_template(
                api_service, course_template_code)
            if not course_template:
                row_errors.append(
                    f"Invalid course template code: {course_template_code}")
            else:
                row_data['course_template_id'] = course_template['id']                
    except Exception as e:
        row_errors.append(
            f"Error validating course template: {str(e)}")

    # Validate Event title
    try:
        # if course template is not empty then it must have event title
        if not event_title and course_template_code:
            row_errors.append("Event title is required")
        else:
            row_data['event_title'] = event_title
    except Exception as e:
        row_errors.append(f"Error validating Event title: {str(e)}")

    # Validate Location
    try:
        if location_name:
            location = validate_location(api_service, location_name)
            if not location:
                row_errors.append(
                    f"Invalid location: {location_name}")            
            else:
                row_data['location_id'] = location['id']
                
    except Exception as e:
        row_errors.append(f"Error validating location: {str(e)}")

    # Validate venues
    try:        
        if venue_name:
            if (venue_name.casefold() not in tbc_venue_name):            
                if venue_name and row_data['location_id']:
                    venue = validate_venue(
                        api_service, venue_name, row_data['location_id'])
                    if not venue:
                        row_errors.append(
                            f"Invalid Venue: {venue_name}")
                    else:
                        row_data['venue_id'] = venue['id']

    except Exception as e:
        row_errors.append(f"Error validating venue: {str(e)}")
    
    # Validate Instructor and check if authorized for course
    try:
        row_data['instructor_ids'] = []
        if instructor_names:
            for instructor_name in instructor_names.split('/'):
                instructor = validate_instructor(
                    api_service, instructor_name)
                if not instructor:
                    row_errors.append(
                        f"Invalid instructor: {instructor_name}")
                else:
                # Also check if instructor is authorized for this course
                    if (row_data['course_template_id'] and 
                        instructor_authorized_for_course(
                            api_service, 
                            instructor['id'], 
                            row_data['course_template_id'])):
                        row_data['instructor_ids'].append(instructor['id'])
                    else:
                        row_errors.append(
                            f"Instructor {instructor_name} is not authorized for course {row_data['course_template_id']}")
                    
    except Exception as e:
        row_errors.append(f"Error validating instructor: {str(e)}")

    # Validate Instructor and check if authorized for course
    try:
        row_data['session_instructor_ids'] = []
        for instructor_name in session_instructor_names.split('/|;|,'):
            if instructor_name:
                instructor = validate_instructor(
                    api_service, instructor_name.strip())
                if not instructor:
                    row_errors.append(
                        f"Invalid instructor: {instructor_name}")                    
                else:
                    # Also check if instructor is authorized for this course
                    if (instructor_authorized_for_course(
                            api_service,
                            instructor['id'],
                            row_data['course_template_id'])):
                        row_data['session_instructor_ids'].append(instructor['id'])
                    else:
                        row_errors.append(
                            f"Instructor {instructor_name} is not authorized for course {row_data['course_template_id']}")
                             
    except Exception as e:
        row_errors.append(f"Error validating instructor: {str(e)}")

    # event url
    try:
        if event_url and not validators.url(event_url):
            row_errors.append(f"Invalid Event_url: {event_url}")
        else:
            row_data['Event url'] = event_url
    except Exception as e:
        row_errors.append(f"Error validating Event_url: {str(e)}")

    if finaliztion_date:              
        try:
            if isinstance(finaliztion_date, (datetime, date)):
                finalisation_datetime = finaliztion_date                        
            else:
                if isinstance(finaliztion_date, str):
                    finalisation_datetime_str = finaliztion_date.split(
                    )
                    finalisation_datetime = validate_and_format_datetime(
                        finalisation_datetime_str[0], finalisation_datetime_str[1])
                else:
                    row_errors.append(
                        f"Invalid Finalisation_date: {finaliztion_date}")
                    
            row_data['finalisation_datetime'] = finalisation_datetime.strftime(
                "%Y-%m-%d")
            
        except Exception as e:
            row_errors.append(
                f"Error validating Finalisation_date: {str(e)}")
    
    # Day
    if session_day:
        try:
            if not isinstance(session_day, int):
                row_errors.append(
                    f"Invalid Day: {session_day}")
            else:
                row_data['session_day'] = session_day
        except Exception as e:
            row_errors.append(f"Error validating Day: {str(e)}")    

    # max_places
    try:
        if max_places:
            if not isinstance(max_places, int):
                row_errors.append(
                    f"Invalid max_places: {max_places}")
            else:
                row_data['Max places'] = max_places
    except Exception as e:
        row_errors.append(f"Error validating max_places: {str(e)}")

    # sitting
    try:
        if not sitting:
            row_errors.append(
                    f"Sitting not provided: {sitting}")
        else:
            row_data['sitting'] = sitting
    except Exception as e:
        row_errors.append(f"Error validating Sitting: {str(e)}")
    
    # web_sale
    try:
        if web_sale:
            web_sale = web_sale.upper().strip()
            if web_sale not in ["Y","N"]:
                row_errors.append(f"Error validating web_sale Y/N Only: {str(e)}")
            else:     
                if web_sale == "Y":
                    web_sale_value = True
                else:
                    web_sale_value = False
        else:
            web_sale_value = False

        row_data['Web sale'] = web_sale_value
    except Exception as e:
        row_errors.append(f"Error validating Sitting: {str(e)}")

    # event_administrator
    try:
        row_data['administrator_ids'] = []
        for administrator_name in administrator_names.split('/'):
            if administrator_name:
                event_administrator = validate_admin(api_service, administrator_name)
                if not event_administrator:
                    row_errors.append(
                        f"Invalid instructor: {administrator_name}")
                else:
                    row_data['administrator_ids'].append(
                        event_administrator['id'])

    except Exception as e:
        row_errors.append(f"Error validating instructor: {str(e)}")

    return {'row_data': row_data, 
            'row_errors': row_errors if len(row_errors) > 0 else None}    
            
def validate_lms_event(api_service, lms_start_date, lms_start_time, lms_end_date, lms_end_time, sitting):
    row_errors = []
    row_data = {}
    
    # validate 'LMS start date','LMS start time','LMS end date','LMS end time'
    try:
        lms_start_datetime = validate_and_format_datetime(
            lms_start_date, lms_start_time)
        if not lms_start_datetime:
            row_errors.append(
                f"Invalid LMS start date/time: {lms_start_date} {lms_start_time}")
        else:
            row_data['formatted_lms_start_datetime'] = lms_start_datetime

        lms_end_datetime = validate_and_format_datetime(
            lms_end_date, lms_end_time)
        if not lms_end_datetime:
            row_errors.append(
                f"Invalid LMS end date/time: {lms_end_date} {lms_end_time}")
        else:
            row_data['formatted_lms_end_datetime'] = lms_end_datetime

        # Check that end date is after start date
        if (row_data['formatted_lms_start_datetime'] and
            row_data['formatted_lms_end_datetime'] and
                row_data['formatted_lms_end_datetime'] <= row_data['formatted_lms_start_datetime']):
            row_errors.append(
                f"End date/time must be after start date/time")
    except Exception as e:
        row_errors.append(
            f"Error validating LMS end date/time: {str(e)}")
    
    # sitting
    try:
        if not sitting:
            row_errors.append(
                    f"Sitting not provided: {sitting}")
        else:
            row_data['sitting'] = sitting
    except Exception as e:
        row_errors.append(f"Error validating Sitting: {str(e)}")
        
    return {'row_data': row_data,
            'row_errors': row_errors if len(row_errors) > 0 else None}

def validate_blended_event(api_service, classroom_start_date, classroom_start_time, classroom_end_date, classroom_end_time, lms_start_date, lms_start_time, lms_end_date, lms_end_time):
    row_errors = []
    row_data = {}

    # Classroom start date and time
    try:
        classroom_start_datetime = validate_and_format_datetime(
            classroom_start_date, classroom_start_time)
        if not classroom_start_datetime:
            row_errors.append(
                f"Invalid classroom start date/time: {classroom_start_date} {classroom_start_time}")
        else:
            row_data['formatted_classroom_start_datetime'] = classroom_start_datetime
    except Exception as e:
        row_errors.append(
            f"Error validating classroom start date/time: {str(e)}")

    try:
        classroom_end_datetime = validate_and_format_datetime(
            classroom_end_date, classroom_end_time)
        if not classroom_end_datetime:
            row_errors.append(
                f"Invalid end date/time: {classroom_end_date} {classroom_end_time}")
        else:
            row_data['formatted_classroom_end_datetime'] = classroom_end_datetime

        # Check that end date is after start date
        if (row_data['formatted_classroom_start_datetime'] and 
            row_data['formatted_classroom_end_datetime'] and 
            row_data['formatted_classroom_end_datetime'] <= row_data['formatted_classroom_start_datetime']):
            row_errors.append(
                f"End date/time must be after start date/time")
    except Exception as e:
        row_errors.append(
            f"Error validating classroom end date/time: {str(e)} {str(type(e))}")

    # validate 'LMS start date','LMS start time','LMS end date','LMS end time'

    try:
        lms_start_datetime = validate_and_format_datetime(
            lms_start_date, lms_start_time)
        if not lms_start_datetime:
            row_errors.append(
                f"Invalid LMS start date/time: {lms_start_date} {lms_start_time}")
        else:
            row_data['formatted_lms_start_datetime'] = lms_start_datetime

        lms_end_datetime = validate_and_format_datetime(
            lms_end_date, lms_end_time)
        if not lms_end_datetime:
            row_errors.append(
                f"Invalid LMS end date/time: {lms_end_date} {lms_end_time}")
        else:
            row_data['formatted_lms_end_datetime'] = lms_end_datetime

        # Check that end date is after start date
        if (row_data['formatted_lms_start_datetime'] and 
            row_data['formatted_lms_end_datetime'] and 
            row_data['formatted_lms_end_datetime'] <= row_data['formatted_lms_start_datetime']):
            row_errors.append(
                f"End date/time must be after start date/time")
    except Exception as e:
        row_errors.append(
            f"Error validating LMS end date/time: {str(e)}")

    return {'row_data': row_data,
            'row_errors': row_errors if len(row_errors) > 0 else None}

def validate_waitlist_event():
    pass

def validate_session(api_service,
                     course_template_id,
                     session_title, 
                     start_date, 
                     start_time, 
                     end_date, 
                     end_time, 
                     session_instructor, 
                     session_url, 
                     session_day):
    row_errors = []
    row_data = {}

    # Validate session_title
    try:
        # if course template is not empty then it must have event title
        if not session_title:
            row_errors.append("Event title is required")
        else:
            row_data['event_title'] = session_title
    except Exception as e:
        row_errors.append(f"Error validating Event title: {str(e)}")

    # validate 'start_date','start_time','end_date','end_time'

    try:
        start_datetime = validate_and_format_datetime(
            start_date, start_time)
        if not start_datetime:
            row_errors.append(
                f"Invalid LMS start date/time: {start_date} {start_time}")
        else:
            row_data['formatted_classroom_start_datetime'] = start_datetime

        end_datetime = validate_and_format_datetime(
            end_date, end_time)
        if not end_datetime:
            row_errors.append(
                f"Invalid LMS end date/time: {end_date} {end_time}")
        else:
            row_data['formatted_classroom_end_datetime'] = end_datetime

        # Check that end date is after start date
        if (row_data['formatted_classroom_start_datetime'] and 
            row_data['formatted_classroom_end_datetime'] and 
                row_data['formatted_classroom_end_datetime'] <= row_data['formatted_classroom_start_datetime']):
            row_errors.append(
                f"End date/time must be after start date/time")
    except Exception as e:
        row_errors.append(
            f"Error validating LMS end date/time: {str(e)}")

    # Validate Instructor and check if authorized for course
    try:
        row_data['session_instructor_ids'] = []
        for instructor_name in session_instructor.split('/|;|,'):
            if instructor_name:
                instructor = validate_instructor(
                    api_service, instructor_name.strip())
                if not instructor:
                    row_errors.append(
                        f"Invalid instructor: {instructor_name}")                    
                else:
                    # Also check if instructor is authorized for this course
                    if (instructor_authorized_for_course(
                            api_service,
                            instructor['id'],
                            course_template_id)):
                        row_data['session_instructor_ids'].append(instructor['id'])
                    else:
                        row_errors.append(
                            f"Instructor {instructor_name} is not authorized for course {row_data['course_template_id']}")
                             
    except Exception as e:
        row_errors.append(f"Error validating instructor: {str(e)}")

    # session url
    try:
        if session_url and not validators.url(session_url):
            row_errors.append(
                f"Invalid Session URL: {session_url}")
            row_data['session_url'] = session_url
    except Exception as e:
        row_errors.append(f"Error validating Session URL: {str(e)}")

    # Day
    try:
        if not isinstance(session_day, int):
            row_errors.append(
                f"Invalid Day: {session_day}")
        else:
            row_data['session_day'] = session_day
    except Exception as e:
        row_errors.append(f"Error validating Day: {str(e)}")

    return {'row_data': row_data,
            'row_errors': row_errors if len(row_errors) > 0 else None}

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
                date_obj = datetime.strptime(
                    date_value, "%d/%m/%Y")
            else:                
                date_obj = datetime.strptime(
                    date_value, "%d-%m-%Y")
        else:            
            return None                
                
        # Handle time format
        if isinstance(time_value, str):            
            hour, minute = map(int, time_value.split(':'))

        elif isinstance(time_value, time):            
            hour = time_value.hour
            minute = time_value.minute
        else:                        
            return None
                        
        # Create a full datetime object
        dt = datetime(date_obj.year, date_obj.month, date_obj.day, hour, minute)        
        return dt.isoformat()
    
    except (ValueError, TypeError) as e:
        logger.warning(
            f"Invalid date/time format: {date_value} {time_value}, {str(e)}")
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
        # First try to find in our local database
        locations = Location.objects.filter(
            name__iexact=location_name
        )

        if locations.exists():
            location = locations.first()
            return {
                'id': location.external_id,
                'code': location.code,
                'name': location.name
            }
        
        # If not found locally, try the API
        query = load_graphql_query('get_location_by_name')
        variables = {"location_name": location_name}
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

def validate_venue(api_service, venue_name, location_id):
    """
    Validate that a venue exists with the given name 
    and the given location
    
    Args:
        api_service: AdministrateAPIService instance
        venue_name: Venue name to validate
        location_id: Location name to validate
    
    Returns:
        dict: Location data or None if invalid
    """
    
    try:
        # First try to find in our local database    
        venues = Venue.objects.filter(
            name__iexact=venue_name,
            location_id=location_id
        )

        if venues.exists():
            venue = venues.first()
            return {
                'id': venue.external_id,                
                'name': venue.name
            }

        # If not found locally, try the API
        query = load_graphql_query('get_venue_by_name')
        variables = {"venue_name": venue_name}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
                len(result['data']['locations']['edges']) > 0):
            return result['data']['locations']['edges'][0]['node']
        return None
    except AdministrateAPIError as e:
        logger.warning(
            f"API error validating location {venue_name}: {str(e)}")
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

        # If there's only one part, return it as lastname with empty firstname
        if len(name_parts) == 1:
            return ("", name_parts[0])

        # Last part is the lastname
        last_name = name_parts[-1]

        # All other parts are firstname
        first_name = " ".join(name_parts[:-1])        
        # the "i" in iexact stands for "case-insensitive"
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
        variables = {"tutorname": instructor_name.replace(" ", "%")}
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

def validate_admin(api_service, contact_name):
    """
        Validate that a contact exists with the given name

        Args:
            api_service: AdministrateAPIService instance
            event_administrator_name: Contact name to validate
        
        Returns:
            dict: Contact data or None if invalid
    """
    try:
        # First try to find in our local database
        name_parts = contact_name.strip().split()

        # If there's only one part, return it as lastname with empty firstname
        if len(name_parts) == 1:
            return ("", name_parts[0])

        # Last part is the lastname
        last_name = name_parts[-1]

        # All other parts are firstname
        first_name = " ".join(name_parts[:-1])
        # the "i" in iexact stands for "case-insensitive"
        # contacts = Contact.objects.filter(
        #     first_name__iexact=first_name,
        #     last_name__iexact=last_name,
        #     is_active=True
        # )

        # if contacts.exists():
        #     contact = contacts.first()
        #     return {
        #         'id': contact.external_id,
        #         'legacy_id': contact.legacy_id,
        #         'name': contact.name
        #     }

        # If not found locally, try the API
        query = load_graphql_query('get_admin_by_name')
        variables = {"name": contact_name.replace(" ", "%")}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
                len(result['data']['contacts']['edges']) > 0):
            return result['data']['contacts']['edges'][0]['node']
        return None
    except AdministrateAPIError as e:
        logger.warning(
            f"API error validating instructor {contact_name}: {str(e)}")
        return None
    pass

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
            'courseTemplates' in result['data'] and
            'approvedInstructors' in result['data']['courseTemplates']['edges'][0]['node'] and
                'edges' in result['data']['courseTemplates']['edges'][0]['node']['approvedInstructors']):
            
            instructors = result['data']['courseTemplates']['edges'][0]['node']['approvedInstructors']['edges']            
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
    rownum = 0
    successful_events = []
    failed_events = []
    # constants
    tax_type = "VGF4VHlwZTox"    
    eventType="public"
    timeZone="Europe/London"
    # Get custom field keys
    event_custom_field_keys = {}
    session_custom_field_keys = {}
    event_custom_field_keys = get_custom_field_keys_by_entity_type(
        api_service, "Event", debug)
    session_custom_field_keys = get_custom_field_keys_by_entity_type(
        api_service, "Session", debug)    
    for row_data in valid_data:
        rownum+=1        
        # try:
        if row_data['event_or_session'] == "event":
            parent_event = None
            if "OC" not in row_data['Course template code'] and "WAITLIST" not in row_data['Course template code']:            
                # create blended event 
                result = create_blended_event(
                    api_service, row_data, event_custom_field_keys, session_custom_field_keys, eventType, tax_type, timeZone, debug)

                if result:                        
                    parent_event = result
                    successful_events.append(result)
                    session = parent_event['sessions']['edges'][0]['node']
                    session_result = update_session(api_service, parent_event, row_data, session['id'], session_custom_field_keys, timeZone, debug)

            else:
                # create LMS event - includes OC and WAITLIST
                result = create_lms_event(
                    api_service, row_data, event_custom_field_keys, eventType, tax_type, timeZone, debug)                                
                        
        else:
            # session are created automatically when creating with a valid course template
            # so use update session mutation to update the session details
            if parent_event:
                session = parent_event['sessions']['edges'][row_data['session_day']-1]['node']
                session_result = update_session(api_service, parent_event, row_data, session['id'],
                               session_custom_field_keys, timeZone, debug)
                            
        print(f"END : ROW {str(rownum)}")
        if (result):                                
                successful_events.append(row_data)
                logger.info(
                    f"Successfully created event '{row_data['Event title']}'")
        else:
            # Check for errors
            # errors = []
            # if 'errors' in result:
            #     errors = [error.get('message', 'Unknown error')
            #             for error in result.get('errors', [])]
            # elif 'data' in result and 'createEvent' in result['data'] and 'errors' in result['data']['createEvent']:
            #     errors = [error.get('message', 'Unknown error')
            #             for error in result['data']['createEvent'].get('errors', [])]

            # error_message = ', '.join(
            #     errors) if errors else "Unknown error creating event"
            # row_data['error'] = error_message
            failed_events.append(row_data)
            logger.error(
                f"Failed to create event '{row_data['Event title']}'")

            if debug:
                logger.debug(f"Failed event creation response: {result}")

        # except Exception as e:
        #     row_data['error'] = str(e)
        #     failed_events.append(row_data)
        #     logger.error(
        #         f"Exception creating event '{row_data['Event title']}': {str(e)}")
        #     if debug:
        #         logger.exception(e)

    return successful_events, failed_events

def create_blended_event(api_service, row_data, event_custom_field_keys, session_custom_field_keys, eventType, tax_type, timeZone, debug):
    """
    Create a blended event using the provided API service and row data.
    """
    # try:
    query = load_graphql_mutation('create_blended_event')
    variables = {        
        "title": row_data['Event title'],
        "locationId": row_data['location_id'],
        "venueId": row_data.get('venue_id'),                        
        "eventType": eventType,
        "taxType": tax_type,
        "courseTemplateId": row_data['course_template_id'],
        "timeZoneName": timeZone,
        "classroomStartDateTime": row_data['formatted_classroom_start_datetime'],
        "classroomEndDateTime": row_data['formatted_classroom_end_datetime'],                       
        "lmsStartDateTime": row_data['formatted_lms_start_datetime'],
        "lmsEndDateTime": row_data['formatted_lms_end_datetime'],
        "maxPlaces": row_data['Max places'],
        "sittingCFKey": event_custom_field_keys['Sitting'],
        "sittingCFValue": row_data['Sitting'],
        "finalisationDateCFKey": event_custom_field_keys['Finalisation date'],
        "finalisationDateCFValue": row_data['finalisation_datetime'],
        "eventUrlCFKey": event_custom_field_keys['URL'],
        "eventUrlCFValue": row_data['Event url'],
        "webSaleCFKey": event_custom_field_keys['Web sale'],
        "webSaleCFValue": str(row_data['Web sale']),        
    }
    logger.debug(f"Creating blended event with variables: {variables}")

    result = api_service.execute_query(query, variables)
    writeQueryToFile(query)        
    writeQueryToFile(variables)          
    if (result and 'data' in result and
        'event' in result['data'] and
            'createBlended' in result['data']['event']):

        event = result['data']['event']['createBlended']['event']
        row_data['event_id'] = event['id']
        

        # Add Instructors to event
        # add_course_staff(api_service, event['id'],
        #                     row_data['instructor_ids'], "instructor", debug)

        # Add Instructors to event
        add_course_staff(api_service, "event", event['id'],
                        row_data['administrator_ids'], "administrator", debug)
                
        logger.info(
            f"Successfully created event '{row_data['Event title']}' with ID {event['id']}")
        writeResultToFile(f"{event['legacyId']}||{event['id']}")
        return event
    else:
        # Check for errors
        errors = []
        if 'data' in result and 'errors' in result['data']:
            errors = [error.get('message', 'Unknown error')
                    for error in result.get('errors', [])]
        elif 'data' in result and 'event' in result['data'] and 'errors' in result['data']['event']['createEvent']:
            errors = [error.get('message', 'Unknown error')
                    for error in result['data']['createEvent'].get('errors', [])]

        error_message = ', '.join(
            errors) if errors else "Unknown error creating event"
        row_data['error'] = error_message            
        logger.error(
            f"Failed to create event '{row_data['Event title']}': {error_message}")

        if debug:
            logger.debug(f"Failed event creation response: {result}")
        return None
    # except Exception as e:
    #     row_data['error'] = str(e)        
    #     logger.error(
    #         f"Exception creating event '{row_data['Event title']}': {str(e)}")
    #     if debug:
    #         logger.exception(e)

def create_lms_event(api_service, row_data, event_custom_field_keys, eventType, tax_type, timeZone, debug):
    try:
        query = load_graphql_mutation('create_lms_event')
        variables = {    
            "courseTemplateId": row_data['course_template_id'],
            "eventType": eventType,
            "title": row_data['Event title'],
            "lmsStartDateTime": row_data['formatted_lms_start_datetime'],
            "lmsEndDateTime": row_data['formatted_lms_end_datetime'],                       
            "locationId": row_data.get('location_id'),
            "taxType": tax_type,
            "timeZoneName": timeZone,
            "sittingCFKey": event_custom_field_keys['Sitting'],
            "sittingCFValue": row_data['Sitting'],
            "ocrMoodleCodeCFKey": event_custom_field_keys['OCR Moodle Code'],
            "ocrMoodleCodeCFValue": row_data.get('OCR_moodle_code'),
            "webSaleCFKey": event_custom_field_keys['Web sale'],
            "webSaleCFValue": row_data['Web sale'],        
        }
        # logger.debug(f"Creating lms event with variables: {variables}")

        result = api_service.execute_query(query, variables)
        writeQueryToFile(query)        
        writeQueryToFile(variables)  
        if (result and 'data' in result and
            'event' in result['data'] and
                'createLMS' in result['data']['event']):

            event = result['data']['event']['createLMS']['event']
            row_data['event_id'] = event['id']
            
            logger.info(
                f"Successfully created event '{row_data['Event title']}' with ID {event['id']}")
             
            writeResultToFile(event['legacyId'])
            return event
        else:
            # Check for errors
            errors = []
            if 'data' in result and 'errors' in result['data']:
                errors = [error.get('message', 'Unknown error')
                        for error in result.get('errors', [])]
            elif 'data' in result and 'event' in result['data'] and 'errors' in result['data']['event']['createEvent']:
                errors = [error.get('message', 'Unknown error')
                        for error in result['data']['createEvent'].get('errors', [])]

            error_message = ', '.join(
                errors) if errors else "Unknown error creating event"
            row_data['error'] = error_message            
            logger.error(
                f"Failed to create event '{row_data['Event title']}': {error_message}")

            if debug:
                logger.debug(f"Failed event creation response: {result}")
            return None
    except Exception as e:
        row_data['error'] = str(e)        
        logger.error(
            f"Exception creating event '{row_data['Event title']}': {str(e)}")
        if debug:
            logger.exception(e)
    
def update_session(api_service, parent_event, row_data, session_id, session_custom_field_keys, timeZone, debug):
    query = load_graphql_mutation('update_session')
    variables = {        
        "sessionId": session_id,
        "sessionTitle": row_data["Session title"],
        "locationId": parent_event["Location"]["id"],
        "venue_id": parent_event["venue"]["id"] if parent_event.get("venue") else None,
        "timeZoneName": timeZone,
        "session_start_date": row_data["formatted_classroom_start_datetime"],
        "session_end_date": row_data["formatted_classroom_end_datetime"],
        "dayDefinitionKey": session_custom_field_keys["Day"],
        "dayValue": row_data["session_day"],
        "urlDefinitionKey": session_custom_field_keys["URL"],
        "urlValue": row_data['Session_url']
    }
    result = api_service.execute_query(query, variables)
    writeQueryToFile(query)        
    writeQueryToFile(variables)  
    if result:
        # Add Instructors to event
        add_course_staff(api_service, "session", session_id,
                         row_data['session_instructor_ids'], "instructor", debug)
    return result

def add_course_staff(api_service, event_or_session, event_id, contact_ids, staffType, debug):
    """Add course staff to an event."""
    staff_error=[]
    staff_added=[]
    if event_or_session == "event":
        query = load_graphql_mutation('add_event_staff')
        
    else:
        query = load_graphql_mutation('add_session_staff')
    # try:            
    for contact_id in contact_ids:
        variables = {
            "eventId": event_id,
            "contactId": contact_id,
            "staffType": staffType
        }
        writeQueryToFile("=======================================================")
        writeQueryToFile(query)        
        writeQueryToFile(variables)
        result = api_service.execute_query(query, variables)
        
        writeQueryToFile(result)
        writeQueryToFile("=======================================================")
        if result['data'].get('event'):  
            if result['data']['event']['addStaff']['errors']:
                    if (result['data']['event']['addStaff']['errors'][0]['message'] and 
                        result['data']['event']['addStaff']['errors'][0]['message'] != "The input Contact already exists as staff on the Event"):
                        logger.error(
                            f"Failed to add instructors {contact_ids} to event {event_id}")
                        staff_error.extend(contact_ids)
                    elif (result['data']['event']['addStaff']['errors'][1]['message'] and 
                        result['data']['event']['addStaff']['errors'][1]['message'] != "The input Contact already exists as staff on the Event"):
                        logger.error(
                            f"Failed to add instructors {contact_ids} to event {event_id}")
                        staff_error.extend(contact_ids)
            elif (result and 'data' in result and
                    'event' in result['data'] and
                    'addStaff' in result['data']['event']):
                        # staff_added = result['data']['addStaff']['event']
                        staff_added.extend(
                            result['data']['event']['addStaff']['event'])                        
        elif result['data'].get('session'):
            if result['data']['session']['addStaff']['errors']:
                if (result['data']['session']['addStaff']['errors'][0]['message'] and 
                    result['data']['session']['addStaff']['errors'][0]['message'] != "The input Contact already exists as staff on the Event"):
                    logger.error(
                        f"Failed to add instructors {contact_ids} to session {event_id}")
                    staff_error.extend(contact_ids)
                elif (result['data']['session']['addStaff']['errors'][1]['message'] and 
                    result['data']['session']['addStaff']['errors'][1]['message'] != "The input Contact already exists as staff on the Event"):
                    logger.error(
                        f"Failed to add instructors {contact_ids} to session {event_id}")
                    staff_error.extend(contact_ids)
        elif (result and 'data' in result and
                'session' in result['data'] and
                'addStaff' in result['data']['session']):
                    # staff_added = result['data']['addStaff']['event']
                    staff_added.extend(
                        result['data']['session']['addStaff']['session'])
        
            
        
                
    # except Exception as e:
    #     # row_data['error'] = str(e)
    #     # failed_events.append(row_data)
    #     logger.error(
    #         f"Exception add staff {contact_ids} with staffType {staffType} to event {event_id}: {str(e)}")
    #     if debug:
    #         logger.exception(e)    
    #     return None

def get_custom_field_keys_by_entity_type(api_service, entity_type, debug):
    """
    Get the definition keys for custom fields needed for event creation
    
    Returns:
        dict: Dictionary mapping field labels to their definition keys
    """
    from django.db import connections
    
    custom_field_keys = {}
        
    try:
        custom_fields = CustomField.objects.filter(
            entity_type=entity_type
        )

        for cf in custom_fields:
            custom_field_keys[cf.label] = cf.external_id

        if debug:
            logger.info(
                f"Retrieved {len(custom_field_keys)} custom field keys for {entity_type}")
            
        return custom_field_keys
    
    except Exception as e:
        logger.error(f"Error retrieving custom field keys: {str(e)}")
        return {}
                    
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

        # results = {
        #     "total_rows": len(valid_data) + len(error_data),
        #     "valid_rows": len(valid_data),
        #     "error_rows": len(error_data),
        #     "validation_errors": error_data,
        #     "created_events": [],
        #     "failed_events": []
        # }
        # 
        # Step 2: Create events if not a dry run
        if not dry_run and valid_data:
            logger.info(f"Creating {len(valid_data)} events in Administrate")
            create_administrate_events(
                api_service, valid_data, debug)

            # results["created_count"] = len(successful_events)
            # results["failed_count"] = len(failed_events)
            # results["created_events"] = successful_events
            # results["failed_events"] = failed_events

            logger.info(
                f"Event creation complete.")
        elif dry_run:
            logger.info("Dry run - not creating events")
            # results["dry_run"] = True

        # return results

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
            'Location': row.get('Location', 'N/A'),
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
            'Location': row.get('Location', 'N/A'),
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

def writeQueryToFile(query):
    f = open(queryFilePath, "a")
    f.write(datetime.now().strftime("%Y-%m-%d %H:%M:%S")+"\n")
    f.write(str(query)+"\n")
    f.close()
    return 


def writeValidationResultToFile(content):
    f = open(ValidationFilePath, "a")
    f.write(content+"\n")
    f.close()
    return

def writeResultToFile(contentList):
    f = open(resultFilePath, "a")    
    f.write(contentList+"\n")
    f.close()
    return 


def get_events(api_service, current_sitting, state, first=100, offset=0):
    events = []        
    query = load_graphql_query('get_events_by_sitting_and_lifecycle')
    variables = {"current_sitting": current_sitting,
                    "state": state,
                 "first": first,
                 "offset": offset}
    result = api_service.execute_query(query,variables)    

    if (result and 'data' in result and
            'events' in result['data'] and
            'edges' in result['data']['events']):
        for event in result['data']['events']['edges']:
            events.append(event['node']['id'])
    return events

def delete_events(api_service,events):
    query = load_graphql_mutation('delete_events')
    variables = {"eventids": events}
    print(events)
    result = api_service.execute_query(query, variables)
    print(result)
    return result


def set_event_websale(api_service, event_id, websaleCFKey, websale, lifecycleState):
    """
    Set the web sale status of an event
    
    Args:
        api_service: AdministrateAPIService instance
        event_id: Event ID to update
        websale: Web sale status (True/False)
    
    Returns:
        dict: Result of the update operation
    """
    
    query = load_graphql_mutation('set_event_websale')
    variables = {
        "eventId": event_id,
        "websale": websale,
        "websaleCFKey": websaleCFKey,
        "lifecycleState": lifecycleState,
    }
    result = api_service.execute_query(query, variables)
   
    return result

if __name__ == "__main__":
    result = bulk_upload_events_from_excel(file_path,debug=True,dry_run=False)
    count=0
    api_service = AdministrateAPIService()
    # event_custom_field_keys = get_custom_field_keys_by_entity_type(
    #     api_service, "Event", False)
    
    # result = get_events(api_service,"26A",EventLifecycleState.DRAFT.value)
    # print(len(result))
    # for event_id in result:
    #     print(count)
    #     set_event_websale(api_service, event_id, event_custom_field_keys["Web sale"], "True",
    #                       EventLifecycleState.PUBLISHED.value)
    #     count += 1

    # print(result)
    # delete_events(api_service,result)
    # bulk_upload_events_from_excel(file_path, debug=True)
    
