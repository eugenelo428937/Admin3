#!/usr/bin/env python3
"""
Generate static website with downloadable ICS files for GitHub Pages
"""
import os
from calendar_server import DeadlineDatabase

def generate_static_site():
    """Generate static HTML and ICS files for hosting."""

    # Create output directory
    os.makedirs('static_site', exist_ok=True)

    # Initialize database
    db = DeadlineDatabase('deadlines.db')
    groups = db.get_module_groups()

    # Generate ICS files
    from ics import Calendar, Event
    from datetime import datetime

    # Generate individual group calendars
    for group in groups:
        deadlines = db.get_deadlines_by_group(group)
        calendar = Calendar()

        for module_code, assignment_code, title, deadline_date_str, recommend_date_str in deadlines:
            deadline_date = datetime.strptime(deadline_date_str, "%Y-%m-%d").date()

            event = Event()
            event.name = f"{module_code} {assignment_code} deadline"
            event.begin = deadline_date
            event.end = deadline_date
            event.description = f"Assignment deadline for {module_code} {assignment_code}"
            event.uid = f"{module_code}-{assignment_code}-{deadline_date_str}@deadlines-calendar"

            calendar.events.add(event)

        # Save ICS file
        filename = f"{group.lower()}_assignment_deadlines_september_2026.ics"
        with open(f'static_site/{filename}', 'w', encoding='utf-8') as f:
            f.write(calendar.serialize())

    # Generate combined calendar
    all_deadlines = db.get_deadlines_by_group(None)
    all_calendar = Calendar()

    for module_code, assignment_code, title, deadline_date_str, recommend_date_str in all_deadlines:
        deadline_date = datetime.strptime(deadline_date_str, "%Y-%m-%d").date()

        event = Event()
        event.name = f"{module_code} {assignment_code} deadline"
        event.begin = deadline_date
        event.end = deadline_date
        event.description = f"Assignment deadline for {module_code} {assignment_code}"
        event.uid = f"{module_code}-{assignment_code}-{deadline_date_str}@deadlines-calendar"

        all_calendar.events.add(event)

    with open('static_site/all_assignment_deadlines_september_2026.ics', 'w', encoding='utf-8') as f:
        f.write(all_calendar.serialize())

    # Generate HTML index
    html = '''<!DOCTYPE html>
<html>
<head>
    <title>Assignment Deadlines Calendar</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; max-width: 800px; }
        .download-link {
            display: block;
            margin: 10px 0;
            padding: 15px;
            background: #f0f8ff;
            border: 1px solid #007acc;
            border-radius: 5px;
            text-decoration: none;
            color: #007acc;
            font-weight: bold;
        }
        .download-link:hover { background: #e6f3ff; }
        .instructions { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .updated { color: #666; font-style: italic; }
    </style>
</head>
<body>
    <h1>📅 Assignment Deadlines Calendar</h1>

    <div class="instructions">
        <h3>How to Import:</h3>
        <ol>
            <li>Click the download link for your module below</li>
            <li>Save the .ics file to your computer</li>
            <li>Open your calendar app (Outlook, Google Calendar, Apple Calendar, etc.)</li>
            <li>Choose "Import Calendar" and select the downloaded file</li>
        </ol>

        <p><strong>Note:</strong> These are static files. If deadlines change, you'll need to download and import again.</p>
    </div>

    <h2>📚 Individual Module Calendars:</h2>
'''

    # Add download links for each group
    group_names = {
        'CM1': 'CM1 Assignment Deadlines September 2026',
        'CM2': 'CM2 Assignment Deadlines September 2026',
        'CS1': 'CS1 Assignment Deadlines September 2026',
        'CS2': 'CS2 Assignment Deadlines September 2026',
        'CB': 'CB Assignment Deadlines September 2026',
        'CP1': 'CP1 Assignment Deadlines September 2026',
        'CP2': 'CP2 Assignment Deadlines September 2026',
        'CP3': 'CP3 Assignment Deadlines September 2026',
        'SP': 'SP Assignment Deadlines September 2026',
        'SA': 'SA Assignment Deadlines September 2026'
    }

    for group in sorted(groups):
        if group in group_names:
            filename = f"{group.lower()}_assignment_deadlines_september_2026.ics"
            html += f'''
    <a href="{filename}" class="download-link" download>
        📥 Download {group_names[group]}
    </a>'''

    html += '''
    <h2>📋 Combined Calendar:</h2>
    <a href="all_assignment_deadlines_september_2026.ics" class="download-link" download>
        📥 Download All Assignment Deadlines September 2026
    </a>

    <div class="updated">
        Last updated: ''' + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '''
    </div>
</body>
</html>'''

    with open('static_site/index.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("Static site generated in 'static_site/' directory")
    print("Upload the contents to any web hosting service")

if __name__ == '__main__':
    generate_static_site()