import csv
import base64
import copy
import os
import sys
import pip._vendor.requests as requests
import json
import time
import datetime
import getpass
import pip._vendor.certifi 
import validators
from pip._vendor.requests.adapters import HTTPAdapter
from pip._vendor.urllib3.util.retry import Retry
import logging

retries = Retry(total=10,
                backoff_factor=2,
                status_forcelist=[429, 500, 502, 503, 504])
logging.basicConfig(level=logging.DEBUG)
s = requests.Session()
s.mount('http://', HTTPAdapter(max_retries=retries))

queryFilePath = r"C:\Administrate\Result\query"+datetime.datetime.now().strftime("%Y%m%d")+".txt"
filePath = r"C:\Administrate\Source_file\test25.csv"
resultFilePath = r"C:\Administrate\Result\importResult"+datetime.datetime.now().strftime("%Y%m%d")+".txt"
# Configuration variables - START
instance_url = 'bppacted.administrateapp.com'
#instance_url = 'bppacteduat.administrateapp.com'
#   PROD ActEd 99001 Tutorials
admin_userid = 51769
#   UAT ActEd 99001 Tutorials
#admin_userid = 51843
rest_api_link ="https://bppacted.administrateapp.com"
#rest_api_link ="https://bppacteduat.administrateapp.com"


api_url = "https://api.getadministrate.com/graphql"
token_file_path = 'C:/Administrate/'
error_lines = []
# Configuration variables - END
instanceId = ''
token_cache = {}
eventList= []

get_session_id_from_event = """
query{{
  events(filters:[{{field: id, operation: eq, value:"{_event_id}"}}]){{
    edges{{
      node{{
        id
        legacyId
        sessions(filters:[],first: 1,offset:{_session_count}){{
          edges{{
            node{{
              id
              legacyId
              title
              lifecycleState
              parentEvent{{
                legacyId
              }}
            }}
          }}
        }}
      }}
    }}
  }}
}}
"""

get_location_id_query = """
query{{
  locations(filters:[{{field:name,operation: eq, value:"{location_name}"}}])
  {{
    edges{{
      node{{
        id
        code
        name
        legacyId
      }}
    }}
  }}
}}
"""
create_blended_event_query = """
mutation createEvent {{
  event {{
    createBlended(input:{{
        eventType:{_eventType}
        locationId:"{_locationId}"
        taxType:"{_taxType}"
        courseTemplateId:"{_courseTemplateId}"
        timeZoneName:"{_timeZoneName}"
        classroomStartDateTime: "{_classroomStartDateTime}"
        classroomEndDateTime: "{_classroomEndDateTime}"
        lmsStartDateTime: "{_lmsStartDateTime}"
        lmsEndDateTime: "{_lmsEndDateTime}"
        maxPlaces:{_maxPlaces}
        timeZone:"Europe/London"
    }}){{
      event {{ id legacyId sessions {{
                                edges{{
                                    node{{
                                        id
                                        legacyId
                                        }}
                                    }}
                                }}
                                }}
      errors {{ label message value }}
    }}
  }}
}}
"""
create_lms_event_query = """
mutation{{
    event{{
        createLMS(input:{{
        courseTemplateId:"{_courseTemplateId}"
        eventType:{_eventType}
        timeZonedLmsEnd:"{_classroomEndDateTime}"
        timeZonedLmsStart:"{_classroomStartDateTime}"
        locationId:"{_locationId}"
        taxType:"{_taxType}"
        timeZoneName:"Europe/London"
        }}){{
            event {{ id legacyId sessions {{
                                    edges{{
                                        node{{
                                            id
                                            legacyId
                                            }}
                                        }}
                                    }}
                                    }}
            errors {{ label message value }}
        }}
    }} 
}}
"""
update_session_query = """
mutation{{
  session{{
    update(sessionId:"{_session_id}",
            input:{{
			    code:"{session_code}"
                start:"{session_start_date}"
                end:"{session_end_date}"
                title:"{title}"
                locationId:"{_locationId}"
                timeZoneName:"Europe/London"
                customFieldValues: [
                {{
                    definitionKey: "{_dayDefinitionKey}",
                    value: "{_dayValue}"
                }},
                {{
                    definitionKey: "{_urlDefinitionKey}",
                    value: "{_urlValue}"
                }},
                ]
            }}){{
      session {{id legacyId}}
      errors {{ label message value}}
    }}
  }}
}}
"""

update_event_custom_fields_query = """
mutation {{
  event {{
    update(
      eventId: "{_event_id}",
      input: {{
        customFieldValues: [
          {_custom_fields}
        ]
        title:"{_title}"
      }}
      ) {{
      event {{
        id
      }}
      errors {{
        label
        value
        message
      }}
    }}
  }}
}}
"""

update_session_custom_fields_query = """
mutation {{
  session {{
    update(
      sessionId: "{_sessionId}",
      input: {{
        title:"{_sessionTitle}"
        locationId:"{_locationId}"
        venueId:"{_venue_id}"
        timeZoneName:"Europe/London"
        start:"{session_start_date}"
        end:"{session_end_date}"
        customFieldValues: [
          {{
              definitionKey: "{_dayDefinitionKey}",
              value: "{_dayValue}"
          }},
          {{
              definitionKey: "{_urlDefinitionKey}",
              value: "{_urlValue}"
          }},
        ]
      }}
      ) {{
      session {{
        id
      }}
      errors {{
        label
        value
        message
      }}
    }}
  }}
}}
"""
get_tutor_id_query = """
query{{
  contacts(filters:[{{field:name,operation:like,value:"{_tutorName}"}}
  {{field:isInstructor,operation:eq,value:"true"}}]){{
    edges{{
      node{{
        id
        legacyId
        firstName
        lastName
        isInstructor
      }}
    }}
  }}
}}
"""
get_venue_id_query ="""

"""

# Constants - END
def override_where():
    """ overrides certifi.core.where to return actual location of cacert.pem"""
    # change this to match the location of cacert.pem
    return os.path.abspath("cacert.pem")

def checkCSV(filePath):
    
    error_lines.append("Start checking "+filePath)
    isError = False
    with open(filePath) as csv_file:
        print(f'Checking file.')
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        
        for row in csv_reader:
            print("Checking: "+str(line_count))
            if len(row)==37:
                if line_count == 0:
                    if not len(row)==37:
                        isError = True
                        error_lines.append(f'Column number not match.')
                else:
                    if line_count >= 4:
                        if row:
                            if len(row[0])>0:
                                courseCode = row[0]
                                #check Events fields
                                if checkEventData(row,line_count):
                                    isError = True
                                    writeResultToFile(error_lines)
                            else:
                                #check Session fields
                                if checkSessionData(row,line_count,courseCode):
                                    isError = True
                                    writeResultToFile(error_lines)
            line_count += 1

        error_lines.append(f'End Checking {line_count} lines.')
    return isError

def checkEventData(row,line_count):
     #check course template id
    isError=False
    query= get_course_template_id_query.format(course_template_name=row[0])
    course_template_id = getCourseTemplateId(query)

    if not course_template_id:
        error_lines.append("Error: line "+str(line_count+1)+", column 1. Course Template not found. Current value: " +row[0] )
        isError = True

    #check title empty or spaces
    if not row[1] or len(row[1].strip())==0:
        error_lines.append("Error: line "+str(line_count+1)+", column 2. Title must have value e.g. CB1-2-23S. Current value: " +row[1] )
        isError = True
        
    

    #check location
    query= get_location_id_query.format(location_name=row[5])
    location_id = getlocationId(query)
    if not location_id:
        error_lines.append("Error: line "+str(line_count+1)+", column 6. location not found. Current value: " +row[5])
        isError = True
    
    
    #check venue
    if len(row[6].strip())!=0:
        venue_id = getVenueLegacyId(row[6])
        if not venue_id:
            error_lines.append("Error: line "+str(line_count+1)+", column 7. location not found. Current value: " +row[6])
            isError = True
    
    #check Classroom start date
    if "OC" not in row[0] and "WAITLIST" not in row[0]:
        try:
            d = datetime.datetime.strptime(row[8]+" "+row[9],"%d/%m/%Y %H:%M").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 9-10. Error found in classroom startdate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023 23:59.  Current value: " +row[8]+" "+row[9])
            isError = True

        #check Classroom end date
        try:
            d = datetime.datetime.strptime(row[10]+" "+row[11],"%d/%m/%Y %H:%M").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 11-12. Error found in classroom enddate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023  23:59.  Current value: " +row[10]+" "+row[12])
            isError = True
        
        #check LMS start date
        try:
            d = datetime.datetime.strptime(row[12]+" "+row[13],"%d/%m/%Y %H:%M").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 13-14. Error found in classroom enddate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023  23:59.  Current value: " +row[12]+" "+row[13])
            isError = True
        
        #check LMS end date
        try:
            d = datetime.datetime.strptime(row[14]+" "+row[15],"%d/%m/%Y %H:%M").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 15-16. Error found in classroom enddate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023  23:59.  Current value: " +row[14]+" "+row[15])
            isError = True

        #check tutor
            
        if row[20]:
            tutorNamelist=row[20].strip().split("/")
            tutor_id_list = []
            for t in tutorNamelist:
                query = get_tutor_id_query.format(
                    _tutorName=t.strip().replace(" ", "%"))
                tutor_id = -1
                tutor_id = getTutorId(query)
                if tutor_id == -1:
                    error_lines.append("Error: line "+str(line_count+1)+", column 21. Error found in Instructor. Instructor not found.  Current value: " +t.strip())
                    isError = True
                else:
                    #check tutor in course template
                    checkTutorWithCourseCode(tutor_id,row[0])
        else:
            error_lines.append("Error: line "+str(line_count+1)+", column 21. Error found in Instructor. Instructor not found.  Current value: " +row[20])
            isError = True

    #check url
    if row[32]:
        if not validators.url(row[32]):
            error_lines.append("Error: line "+str(line_count+1)+", column 33. Error found in URL. Expected valid url.  Current value: " +row[32])
            isError = True
    #check Day
    if row[34]:
        if not row[34].isnumeric():      
            error_lines.append("Error: line "+str(line_count+1)+", column 37. Error found in Day. Expected integer.  Current value: " +row[34])
            isError = True

    # check Finialisation Date    
    if row[29]:
        try:
            d = datetime.datetime.strptime(row[29],"%d/%m/%Y").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 30. Error found in Finialisation Date . Expected format DD/MM/YYYY e.g.: 13/12/2023.  Current value: " +row[29])
            isError = True
    # check Registration Deadline    
    if row[7]:
        try:
            d = datetime.datetime.strptime(row[7],"%d/%m/%Y").isoformat()
        except ValueError:
            error_lines.append("Error: line "+str(line_count+1)+", column 8. Error found in Registration Deadline. Expected format DD/MM/YYYY e.g.: 13/12/2023.  Current value: " +row[7])
            isError = True

    if isError:
        writeResultToFile(error_lines)

    return isError

def checkSessionData(row,line_count,courseCode):
    isError=False

     #session title
    if not row[2] or len(row[2].strip())==0:
        error_lines.append("Error: line "+str(line_count+1)+", column 3. Session Title must have value e.g. CB1-01-24A-1. Current value: " +row[2] )
        isError = True
    
    #check LMS start date
    try:
        d = datetime.datetime.strptime(row[8]+" "+row[9],"%d/%m/%Y %H:%M").isoformat()
    except ValueError:
        error_lines.append("Error: line "+str(line_count+1)+", column 9-10. Session Error found in classroom enddate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023  23:59.  Current value: " +row[8]+" "+row[9])
        isError = True
    
    #check LMS end date
    try:
        d = datetime.datetime.strptime(row[10]+" "+row[11],"%d/%m/%Y %H:%M").isoformat()
    except ValueError:
        error_lines.append("Error: line "+str(line_count+1)+", column 11-12. Session Error found in classroom enddate. Expected format DD/MM/YYYY HH:mm e.g.: 13/12/2023  23:59.  Current value: " +row[10]+" "+row[11])
        isError = True
    
     #check url
    if row[33]:
        if not validators.url(row[33]):
            error_lines.append("Error: line "+str(line_count+1)+", column 34. Error found in URL. Expected valid url.  Current value: " +row[33])
            isError = True
    
    #check tutor
    if row[21]:
        query= get_tutor_id_query.format(_tutorName=row[21].replace(" ","%"))
        tutor_id = getTutorId(query)
        if not tutor_id:
            error_lines.append("Error: line "+str(line_count+1)+", column 22. Error found in Instructor. Instructor not found.  Current value: " +row[21])
            isError = True
        else:
            #check tutor in course template
            if not checkTutorWithCourseCode(tutor_id,courseCode):
                error_lines.append("Error: line "+str(line_count+1)+", column 21. Instructor not found in course template.  Current value: " +row[21])
                isError = True

    if isError:
        writeResultToFile(error_lines)
    return isError
   
def checkTutorWithCourseCode(tutorId,courseCode):
    query = """
        query{{
  courseTemplates(filters:[{{field:code,operation:eq,value: "{_courseCode}" }}]){{
    edges{{
      node{{
        title
        code
        approvedInstructors{{
          edges{{
            node{{
              legacyId
            }}
          }}
        }}
      }}
    }}
  }}
}}
    """
    foundTutor = False
    query = query.format(_courseCode=courseCode)
    response_json = makeGraphQLCall(query)
    lookup_data = getNestedValueInDict(response_json, 'edges')
    if lookup_data[0]:
        tutorList = getNestedValueInDict(getNestedValueInDict(lookup_data[0], 'approvedInstructors'),"edges")
        
        for tutor in tutorList:
            if tutorId==tutor["node"]["legacyId"]:
                foundTutor = True
    return foundTutor

def readCSV(filePath):
    error_lines = []
    error_lines.append("Start importing "+filePath)
    customFieldDefKey = getEventCustomFieldKey()
    sessionCustomFieldDefKey = getSessionCustomFieldKey()

    with open(filePath) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        for row in csv_reader:
            print("Importing: "+str(line_count))
            if line_count < 4:
                line_count += 1
            else:
                if row:
                    if len(row[0])>0:
                        #tutor id
                        
                        tutorName = ""
                        tutor_id = ""
                        location_id = ""
                        maxPlaces = 0

                        tutorNamelist=row[20].strip().split("/")
                        tutor_id_list = []
                        for t in tutorNamelist:
                            query = get_tutor_id_query.format(
                                _tutorName=t.strip().replace(" ", "%"))
                            tutor_id = 0
                            tutor_id = getTutorId(query)
                            tutor_id_list.append(tutor_id)
                        
                        query= get_location_id_query.format(location_name=row[5])
                        location_id = getlocationId(query)
                        if len(row[17]) >0:
                            maxPlaces = row[17]
                        else:
                            maxPlaces = 999

                        if "OC" not in row[0] and "WAITLIST" not in row[0]:
                            venue_id = getVenueLegacyId(row[6])
                        else:
                            venue_id = None
                        
                        session_count = 0
                        encoded_event_id = populateEventQuery(row,customFieldDefKey,tutor_id_list,location_id,venue_id,maxPlaces,sessionCustomFieldDefKey)
                        sessionCode=row[0]
                        session_count = 1
                    else:
                        #get session id
                        session_id= populateGetSessionIdQuery(encoded_event_id,session_count)
                        
                        if session_id:
                            #update sessions

                            if len(row[5])>0:
                                # if empty, use parent events location
                                query= get_location_id_query.format(location_name=row[5])
                                location_id = getlocationId(query)
                                
                            session_id = populateSessionQuery(row,encoded_event_id,sessionCode,session_id,location_id,sessionDayCustomFieldKey,row[34],sessionUrlCustomFieldKey,row[33])

                            # add venue with restapi if not Online Classroom
                            if "OC" not in row[0] and "WAITLIST" not in row[0]:
                                if len(row[6])>0:
                                    venue_id = getVenueLegacyId(row[6])

                                addVenue(session_id,venue_id)    

                                #add tutor to session
                                if len(row[21])>0:
                                    query= get_tutor_id_query.format(_tutorName=row[21].strip().replace(" ","%"))
                                    tutor_id = getTutorId(query)
                                    if tutor_id:
                                        addInstructor(session_id,tutor_id)
                                else:
                                    query = get_tutor_id_query.format(
                                        _tutorName=row[21].replace(" ", "%"))
                                    tutor_id = getTutorId(query)
                                    if tutor_id:
                                        addInstructor(session_id,tutor_id)                          

                            # if not session_id:
                            #     error_lines.append(f'Session Import Error on {line_count+1} lines.')
                            # else:
                            #     created_session_id = updateSessionCustomField(session_id,row[2],sessionDayCustomFieldKey,row[34],sessionUrlCustomFieldKey,row[33],location_id,venue_id)
                            #     #add tutor to session
                        session_count += 1            
                line_count += 1
        
        error_lines.append(f'End Importing {line_count} lines.')
        global eventList
        writeResultToFile(error_lines)
        writeResultToFile(eventList)

def updateSessionCustomField(sessionId,sessionTitle, dayCustomFieldKey,dayValue,urlCustomFieldKey,urlValue,location_id,venue_id,startDate,endDate):
    encoded_session_id = str(base64.b64encode(bytes("Course:"+str(sessionId), 'utf-8')).decode("utf-8"))

    encoded_venue_id = str(base64.b64encode(bytes("Venue:"+str(venue_id), 'utf-8')).decode("utf-8"))
    query= update_session_custom_fields_query.format(_sessionId=encoded_session_id,_sessionTitle=sessionTitle,_dayDefinitionKey=dayCustomFieldKey,_dayValue=dayValue,_urlDefinitionKey=urlCustomFieldKey,_urlValue=urlValue,_locationId=location_id,_venue_id=encoded_venue_id,session_start_date=startDate,session_end_date=endDate)
    response_json = makeGraphQLCall(query)
    created_session_id = getNestedValueInDict(response_json, 'legacyId')

    if not created_session_id:
        return 
    else:
        return created_session_id
def getSessionCustomFieldKey():
    response_json = makeGraphQLCall(get_session_custom_field_key_query)
    lookup_data = getNestedValueInDict(response_json, 'edges')
    customFields = getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(response_json, 'edges')[0],'sessions'),'edges')[0],'customFieldValues')
        
    for x in customFields:
        match x["definition"]["label"]:
            case "URL":
                global sessionUrlCustomFieldKey
                sessionUrlCustomFieldKey = x["definition"]["key"]
            case "Day":
                global sessionDayCustomFieldKey
                sessionDayCustomFieldKey =x["definition"]["key"]
        sessionCustomFieldDefKey = {sessionUrlCustomFieldKey: "",
                                    sessionDayCustomFieldKey:""
                                    }
    return sessionCustomFieldDefKey

def getEventCustomFieldKey():
    response_json = makeGraphQLCall(get_event_custom_field_key_query)
    lookup_data = getNestedValueInDict(response_json, 'edges')
    customFields = getNestedValueInDict(getNestedValueInDict(response_json, 'edges')[0],'customFieldValues')
   
    for x in customFields:
        match x["definition"]["label"]:
            case "Sitting":
                global sittingCustomFieldKey
                sittingCustomFieldKey = x["definition"]["key"]
            case "Subject":
                global subjectCustomFieldKey
                subjectCustomFieldKey = x["definition"]["key"]
            case "Cancelled":
                global cancelledCustomFieldKey
                cancelledCustomFieldKey= x["definition"]["key"]
            case "Door code":
                global doorCodeCustomFieldKey 
                doorCodeCustomFieldKey = x["definition"]["key"]
            case "Extra information":
                global extraInfoCustomFieldKey 
                extraInfoCustomFieldKey = x["definition"]["key"]
            case "Finalisation date":
                global finalisationCustomFieldKey 
                finalisationCustomFieldKey = x["definition"]["key"]
            case "Recording pin":
                global pinCustomFieldKey 
                pinCustomFieldKey = x["definition"]["key"]
            case "Recordings":
                global recordingCustomFieldKey 
                recordingCustomFieldKey = x["definition"]["key"]
            case "Sage code":
                global sageCodeCustomFieldKey 
                sageCodeCustomFieldKey = x["definition"]["key"]
            case "Tutors":
                global tutorsCustomFieldKey 
                tutorsCustomFieldKey = x["definition"]["key"]
            case "Web sale":
                global webSaleCustomFieldKey
                webSaleCustomFieldKey = x["definition"]["key"]
            case "URL":
                global urlCustomFieldKey
                urlCustomFieldKey = x["definition"]["key"]
            case "Day":
                global dayCustomFieldKey
                dayCustomFieldKey =x["definition"]["key"]
            case "OCR Moodle Code":
                global OCRMoodleCodeCustomFieldKey
                OCRMoodleCodeCustomFieldKey = x["definition"]["key"]

    customFieldDefKey = {sittingCustomFieldKey :"",
                     subjectCustomFieldKey:"",
                     cancelledCustomFieldKey :"",
                     doorCodeCustomFieldKey:"",
                     extraInfoCustomFieldKey:"",
                     finalisationCustomFieldKey :"",
                     pinCustomFieldKey :"",
                     recordingCustomFieldKey :"",
                     sageCodeCustomFieldKey:"",
                     tutorsCustomFieldKey :"",
                     webSaleCustomFieldKey :"",
                     urlCustomFieldKey:"",
                     dayCustomFieldKey:"",
                     OCRMoodleCodeCustomFieldKey:""
                     }
    return customFieldDefKey

def populateEventQuery(row,customFieldDefKey, tutor_id_list,location_id,venue_id,maxPlaces,sessionCustomFieldDefKey):
    error_lines = []
    
    #get course template id
    query= get_course_template_id_query.format(course_template_name=row[0])
    course_template_id = getCourseTemplateId(query)

    #get tax type
    tax_type = "VGF4VHlwZTox"
    #get eventType
    eventType="public"

    query= get_course_template_id_query.format(course_template_name=row[0])
    course_template_id = getCourseTemplateId(query)

    if "OC" not in row[0] and "WAITLIST" not in row[0]:
        mode= "blended"
        startDate = datetime.datetime.strptime(row[8]+"T"+row[9],"%d/%m/%YT%H:%M").isoformat()
        endDate = datetime.datetime.strptime(row[10]+"T"+row[11],"%d/%m/%YT%H:%M").isoformat()
        lmsStartDate = datetime.datetime.strptime(row[12]+"T"+row[13],"%d/%m/%YT%H:%M").isoformat()
        lmsEndDate = datetime.datetime.strptime(row[14]+"T"+row[15],"%d/%m/%YT%H:%M").isoformat()
        query = create_blended_event_query.format(_courseTemplateId=course_template_id,
                                      _locationId=location_id,
                                      _taxType=tax_type,
                                      _eventType=eventType,
                                      _timeZoneName="UTC",
                                      _classroomStartDateTime=startDate,
                                      _classroomEndDateTime=endDate,
                                      _lmsStartDateTime=lmsStartDate,
                                      _lmsEndDateTime=lmsEndDate,
                                      _maxPlaces=maxPlaces
                                        )
    else:
        mode= "lms"
        startDate = datetime.datetime.strptime("01/04/2024T00:00","%d/%m/%YT%H:%M").strftime('%Y-%m-%dT%H:%M:%SZ')
        endDate = datetime.datetime.strptime("30/09/2024T00:00","%d/%m/%YT%H:%M").strftime('%Y-%m-%dT%H:%M:%SZ')
        query = create_lms_event_query.format(_courseTemplateId=course_template_id,
                                              _eventType=eventType,
                                              _classroomStartDateTime=startDate,
                                              _classroomEndDateTime=endDate,
                                              _locationId=location_id,
                                              _taxType=tax_type)
        
    eventRespnse = createEvent(query,mode)
    
    event_id = eventRespnse[0]
    error_lines.append(f"Import Event ID  "+event_id+" lines.")
    writeResultToFile(error_lines)
    encoded_session_id = eventRespnse[1]
    session_id = eventRespnse[2]
    encoded_event_id = str(base64.b64encode(bytes("Course:"+str(event_id), 'utf-8')).decode("utf-8"))
    global eventList
    eventList.append(event_id)

    #set custom fields value
    if encoded_event_id:
        customFieldDefKey[sittingCustomFieldKey] = row[23]
        customFieldDefKey[recordingCustomFieldKey] = row[24]
        customFieldDefKey[pinCustomFieldKey] = row[25]
        
        customFieldDefKey[tutorsCustomFieldKey] = row[26]
        customFieldDefKey[sageCodeCustomFieldKey] = row[27]

        if not row[28]:
            customFieldDefKey[cancelledCustomFieldKey] = None
        else:
            if row[28] == "Y":
                customFieldDefKey[cancelledCustomFieldKey] = True
            else:
                customFieldDefKey[cancelledCustomFieldKey] = False

        if not row[29]:
            customFieldDefKey[finalisationCustomFieldKey] = None
        else:
            customFieldDefKey[finalisationCustomFieldKey] = datetime.datetime.strptime(row[29],"%d/%m/%Y").date()

        if row[30] == "Y":
                customFieldDefKey[webSaleCustomFieldKey] = True
        else:
            customFieldDefKey[webSaleCustomFieldKey] = False

        customFieldDefKey[extraInfoCustomFieldKey] = row[31]
        customFieldDefKey[urlCustomFieldKey] = row[32]  
        customFieldDefKey[OCRMoodleCodeCustomFieldKey] = row[36]

        query= populateCustomFields(update_event_custom_fields_query, encoded_event_id, customFieldDefKey, row[1]) 
        
        _result = insertEventCustomFields(query)
        if "OC" not in row[0] and "WAITLIST" not in row[0]:
            for t in tutor_id_list:
                if t:
                    addInstructor(event_id,t)
                
            addVenue(event_id,venue_id)
            addAdministrator(event_id,admin_userid)
        #add venue
        if "OC" not in row[0] and "WAITLIST" not in row[0]:
            #add tutor to session
            if not row[21]:
                addInstructor(session_id,tutor_id)
            else:
                query = get_tutor_id_query.format(
                    _tutorName=row[21].replace(" ", "%"))
                tutor_id = getTutorId(query)
                addInstructor(session_id,tutor_id)
        
            addVenue(session_id,venue_id)
        sessionCustomFieldDefKey[sessionUrlCustomFieldKey]= "",
        sessionCustomFieldDefKey[sessionDayCustomFieldKey]=""
        
        created_session_id = updateSessionCustomField(session_id,row[2],sessionDayCustomFieldKey,row[34],sessionUrlCustomFieldKey,row[33],location_id,venue_id,startDate.replace("Z", ""),endDate.replace("Z", ""))
        if not _result:
            return
        else:
            return encoded_event_id
    else:
        return
    
def getSessionIdFromEvent(query):
    response_json = makeGraphQLCall(query)
    session_id = getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(response_json,"edges")[0],"sessions"),"edges")[0],"node")["id"]
    return session_id


def populateGetSessionIdQuery(event_id, session_count):
    query = get_session_id_from_event.format(_event_id=event_id,
                                             _session_count=session_count)
    return getSessionIdFromEvent(query)    



def populateSessionQuery(row,_event_id,code,session_id,location_id,sessionDayCustomFieldKey,sessionDay,sessionUrlCustomFieldKey,sessionUrl):
    start_date = datetime.datetime.strptime(row[8]+"T"+row[9],"%d/%m/%YT%H:%M").isoformat()
    endDate = datetime.datetime.strptime(row[10]+"T"+row[11],"%d/%m/%YT%H:%M").isoformat()

    query=update_session_query.format(_session_id=session_id,
                                      session_code=code,
                                      session_start_date=start_date,
                                      session_end_date=endDate,
                                      title=row[2],
                                      _locationId= location_id,
                                      _dayDefinitionKey = sessionDayCustomFieldKey,
                                      _dayValue= sessionDay,
                                      _urlDefinitionKey = sessionUrlCustomFieldKey,
                                      _urlValue = sessionUrl
                                )
    return update_session(query)

def populateCustomFields(query, event_id, customFieldDict, title):
    customFields = ""
    dictItemCount = len(customFieldDict)
    dictPos = 1
    for k,v in customFieldDict.items():
        if v:
            if dictPos!=dictItemCount:
                customFields += ("{definitionKey: \""+k+"\",value: \""+str(v)+"\"},")
            else:
                customFields += ("{definitionKey: \""+k+"\",value: \""+str(v)+"\"}")
        dictPos+=1

    query = query.format(_event_id=event_id,
                         _custom_fields=customFields,
                         _title= title
                         )
    return query
def update_session(query):
    response_json = makeGraphQLCall(query)
    created_session_id = getNestedValueInDict(response_json, 'legacyId')
    if not created_session_id:
        return 
    else:
        return created_session_id

def addVenue(eventId, venueId):
    data = {u'account_venue_id': int(venueId)}

    response = s.post(rest_api_link+'/api/v2/event/public_events/'+str(eventId),
                            data=json.dumps(data),
                            headers={'content-type': 'application/json'},
                            auth=('acted-test@bpp.com', 'P@ssw0rd!'))
    d= json.loads(response.text)
    event_id = d["id"]
    return event_id
    
def getVenueLegacyId(venueName):
    response = s.get(rest_api_link+"/api/v2/event/account_venues?name__eq={_venueName}".format(_venueName=venueName), 
     auth=('acted-test@bpp.com', 'P@ssw0rd!')
    )
    data = response.text
    d= json.loads(data)
    if response.status_code == 200:
        return d[0]['id']
    else:
        return None
    
def createEvent(query,mode):
    response_json = makeGraphQLCall(query)
    if mode == "blended":
        created_event_ids = getNestedValueInDict(getNestedValueInDict(response_json, 'createBlended'), 'event')
        encoded_session_id = getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(response_json, 'createBlended'), 'sessions'),"edges")[0],"id")
        session_id = getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(getNestedValueInDict(response_json, 'createBlended'), 'sessions'),"edges")[0],"legacyId")
    else:
        created_event_ids = getNestedValueInDict(getNestedValueInDict(response_json, 'createLMS'), 'event')
        encoded_session_id = None
        session_id = None

    if not created_event_ids:
        return 
    else:
        return created_event_ids['legacyId'],encoded_session_id,session_id

def insertEventCustomFields(query):

    response_json = makeGraphQLCall(query)
    event_ids = getNestedValueInDict(response_json, 'event')
    if not event_ids:
        return 
    else:
        return event_ids

def addInstructor(eventId,instrustorId):
    data = {u'event_id': int(eventId), u'type': u'instructor', u'contact_id': int(instrustorId)}

    response = s.post(rest_api_link+'/api/v2/event/personnel',
                            data=json.dumps(data),
                            headers={'content-type': 'application/json'},
                            auth=('acted-test@bpp.com', 'P@ssw0rd!'))
    d= json.loads(response.text)
    event_id = d["event_id"]
    return event_id

def addAdministrator(eventId,adminId):
    data = {u'event_id': int(eventId), u'type': u'administrator', u'contact_id': int(adminId)}

    response = s.post(rest_api_link+'/api/v2/event/personnel',
                            data=json.dumps(data),
                            headers={'content-type': 'application/json'},
                            auth=('acted-test@bpp.com', 'P@ssw0rd!'))
    d= json.loads(response.text)
    event_id = d["event_id"]
    return event_id
def exitWithMessage(message_txt, exit_value=0, exit_time=5):
    if exit_value > 0:
        message_txt = TEXT_COLOR_RED + "ERROR(" + str(exit_value) + "): " + TEXT_COLOR_END + message_txt
    if message_txt:
        print(message_txt)
    if exit_time > 0:
        print("Exiting in " + str(exit_time) + " seconds...")
        time.sleep(exit_time)



def setup():
    global instanceId, instance_url
    csv_full_path = filePath
    if len(csv_full_path) < 2:
        exitWithMessage("You need to provide a CSV file to be processed.", 1, 10)
    # print("Processing CSV: '" + csv_full_path + "'")
    # Get instance ID
    instanceId = 'NOT_FOUND'
    if not instance_url:
        instance_url = input("Please enter the target instance: ")
    if instanceId == 'NOT_FOUND' and instance_url:
        instanceId = instance_url.strip().split(".", 1)[0]
        if not instanceId:
            instanceId = 'NOT_FOUND'
    if instanceId == 'NOT_FOUND':
        exitWithMessage("Instance not found and not provided, cannot continue without this info.", 1, 10)

    return csv_full_path


def writeQueryToFile(query):
    f = open(queryFilePath, "a")
    f.write(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")+"\n")
    f.write(query+"\n")
    f.close()
    return 

def writeResultToFile(contentList):
    f = open(resultFilePath, "a")
    f.write(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")+"\n")
    for i in contentList:
        f.write(i+"\n")
    f.close()
    return 

def main():
    csv_file = setup()
    
    #checkCSV(csv_file)
    readCSV(csv_file)
    # if not checkCSV(csv_file):
    #     readCSV(csv_file)
    # else:
    #     print("Error: Please see log file ")



# Start of execution, call main function
main()