# deadlines_to_ics.py
"""
Script to convert a TSV deadlines file to multiple .ics calendar files for each module group.
Usage: python deadlines_to_ics.py <input_tsv_path>
"""
import sys
import csv
from datetime import datetime
from ics import Calendar, Event


def parse_date(date_str):
    # Handles dates in format DD/MM/YYYY
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y")
    except Exception:
        return None

def main(input_path):
    # Mapping of module code to output file name
    module_files = {
        'CM1': 'CM1 Assignment Deadlines September 2025.ics',
        'CM2': 'CM2 Assignment Deadlines September 2025.ics',
        'CS1': 'CS1 Assignment Deadlines September 2025.ics',
        'CS2': 'CS2 Assignment Deadlines September 2025.ics',
        'CB': 'CB Assignment Deadlines September 2025.ics',
        'CP1': 'CP1 Assignment Deadlines September 2025.ics',
        'CP2': 'CP2 Assignment Deadlines September 2025.ics',
        'CP3': 'CP3 Assignment Deadlines September 2025.ics',
        'SP': 'SP Assignment Deadlines September 2025.ics',
        'SA': 'SA Assignment Deadlines September 2025.ics',
    }
    # Create a calendar for each module
    calendars = {key: Calendar() for key in module_files}
    with open(input_path, encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 4:
                continue
            module, code, reccomend_date_str, deadline_date_str = row[:4]
            start = parse_date(deadline_date_str)
            if not start:
                continue
            # Find the module group (e.g., CM1, CM2, etc.)
            for mod_key in module_files:
                if module.strip().upper().startswith(mod_key):
                    event = Event()
                    event.name = f"{module} {code} deadline"
                    event.begin = start
                    event.end = start
                    calendars[mod_key].events.add(event)
                    break
    # Write each calendar to its respective file
    for mod_key, cal in calendars.items():
        if cal.events:
            with open(module_files[mod_key], "w", encoding="utf-8") as f:
                f.writelines(cal)
            print(f"ICS file written to {module_files[mod_key]}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python deadlines_to_ics.py <input_tsv_path>")
        sys.exit(1)
    main(sys.argv[1])
