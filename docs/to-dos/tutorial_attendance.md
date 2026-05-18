# Tutorial Attendance

## Prerequisite

- **TBI** Students are synced from Foxpro at X hrs interval (0700,0900,1100,1300,1500,1700??)
  - Django Task will make copy from the students table and import to DB

- Administrate Webhook pushes any new/updated data to DataBase in near-realtime latency.

## Process Timeline

1. Django Task fetch Tutorial sessions running in T+7 to T+14 days at 0715
    1. Create secure link to access attendance input/upload form
    1. Produce Attendance.xlsx
        1. Email to tutor with secure link
        1. Store in Teams
1. Django Task fetch Tutorial sessions running in Today at 0730
    1. If roster updated between T to T+7, produce an updated Attendance.xlsx
        1. Email to tutor with secure link
        1. Store in Teams
1. Tutor completes roll call updates attendance report with secure link by:
    1. File Upload
    1. Manual input
1. Record saved in database
1. Django Task fetch delta of attendance record and transfer to Administrate via graphQL

## Infrastructure

Choices:

1: Single Windows Server 2022 (8GB RAM)
    - Running 4 Docker Containers
        1. Database (PostgreSQL)
        1. Backend (Django)
        1. Frontend (ReactJs/Typescript)
        1. Worker (Django Task)

2: Deploy in Web or File Server

3: Hosting in external service

- Events
- Sessions
- Course Templates
- Instructors
- Locations
- Venues
- Learner
- Learner Attendance

    1. Events
        - acted.tutorial_events
        - acted.tutorial_sessions
        - acted.tutorial_attendance
        - tutorial_course_templates
        - tutorial_instructors
        - tutorial_locations
        - tutorial_registrations
        - tutorial_venues
        adm.events
    1. Sessions
    1. registration

1. Sync data from Administrate
    1. Events
    1. Sessions
    1. Sync tutorial from Administrate

