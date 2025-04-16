""" scrapeWebsite.py 
    elo - 20231121

    Program to construct searchable data from a website and output it into a CSV file for further use.
    The script reads page definitions from a CSV file ("actedWebSiteStructure.csv"), then for each page,
    fetches the webpage, parses its tabs and sections, and finally writes the assembled link information 
    into "WebsiteLinkToSection.csv". This data can be used, for example, to generate a searchable data structure 
    on a website.

    Add the class="searchable searchTag" in the html to specify which section should be made serachable
    Usage:
    Run the module directly:
        python scrapeWebsite.py

    Requirements:
        - Python 3.x
        - BeautifulSoup  (from the bs4 package)
        - urllib.request (standard library)
        - csv (standard library)
        - pathlib (standard library)
"""
import requests
from bs4 import BeautifulSoup
import html5lib
from pathlib import Path
import os
import time
import random
from tenacity import retry, stop_after_attempt
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
# Page class, just for tidy access to each row of the searchDataStructure.csv

marksFilePath = r"C:\TEMP\25S Hublink\MarksSept2025.txt"
markersFilePath = r"C:\TEMP\25S Hublink\MarkersSept2025.txt"
tab = "\t"
def linkToSoup_selenium(
        l, ecx=None, clickFirst=None, strictMode=False, by_method='x',
        scrollN=0, tmout=25, returnErr=False, fparser='html.parser', isv=True):
    # pass strictMode=True if you don't want to continue when ecx/clickFirst can't be loaded/clicked

    # scrollElToTop = "arguments[0].scrollIntoView(true);"
    scrollElToBottom = "arguments[0].scrollIntoView(false);"
    scrollToBottom = "window.scrollTo(0, document.body.scrollHeight);"

    try:
        by_xc = By.CSS_SELECTOR if 'css' in by_method else By.XPATH
        driver = webdriver.Chrome('chromedriver.exe')
        # I copy chromedriver.exe to the same folder as this py file

        # send tmout as string --> one extra wait
        extraWait = False
        if type(tmout) not in [int, float]:
            if str(tmout).isdigit():
                tmout = int(str(tmout))
                extraWait = True
            else:
                tmout = 25  # default
        # driver.set_page_load_timeout(tmout)

        # for shortening some lines
        wwait_til = WebDriverWait(driver, tmout).until
        ecc = EC.element_to_be_clickable
        ecv = EC.visibility_of_all_elements_located

        driver.get(l)  # go to link
        driver.maximize_window()
        if extraWait:
            time.sleep(tmout)  # wait

        if type(scrollN) == tuple and len(scrollN) == 2:
            time.sleep(scrollN[1])
            for i in range(scrollN[0]):
                driver.execute_script(scrollToBottom)
                time.sleep(scrollN[1])

        # if something needs to be confirmed by click
        if clickFirst:
            # can pass as either string (single) or list (multiple)
            if type(clickFirst) == list:
                clickFirst = [str(c) for c in clickFirst]
            else:
                clickFirst = [str(clickFirst)]

            for cf in clickFirst:
                try:
                    wwait_til(ecc((by_xc, cf)))
                    cfEl = driver.find_element(by_xc, cf)
                    driver.execute_script(scrollElToBottom, cfEl)
                    cfEl.click()
                except Exception as e:
                    errMsg = f'could not click [{cf}] - {type(e)}: {e}'
                    if strictMode:
                        if isv:
                            print(f'quitting bc {errMsg}')
                        return errMsg if returnErr else None
                    elif isv:
                        print(f'[continuing even though] {errMsg}')

        # if some section needs to be loaded first
        if ecx:
            # can pass as either string (single) or list (multiple)
            if type(ecx) == list:
                ecx = [str(e) for e in ecx]
            else:
                ecx = [str(ecx)]

            for e in ecx:
                try:
                    wwait_til(ecv((by_xc, e)))
                except Exception as ex:
                    errMsg = f'could not load [{e}] - {type(ex)}: {ex}'
                    if strictMode:
                        if isv:
                            print(f'quitting bc {errMsg}')
                        return errMsg if returnErr else None
                    elif isv:
                        print(f'[continuing even though] {errMsg}')

        lSoup = BeautifulSoup(driver.page_source, fparser)
        driver.close()  # (just in case)
        del driver  # (just in case)
        return lSoup
    except Exception as e:
        errMsg = f'could not scrape [{l}] \n{type(e)}: {e}'
        if isv:
            print(errMsg)
        return errMsg if returnErr else None


class MarkerItems:
    """
    Represents a web page with searchable content.

    Attributes:
        id (str): Unique identifier for the page.
        name (str): Optional name for the page.
        text (str): Additional descriptive text for the page.
        title (str): Title of the page.
        url (str): Relative or absolute URL of the page.
        tabs (list): A list of Tab objects representing navigation tabs on the page.
    """

    def __init__(self, name, url):
        self.name = name
        self.url = url

class MarkingItems:
    """
    Represents a web page with searchable content.

    Attributes:
        id (str): Unique identifier for the page.
        name (str): Optional name for the page.
        text (str): Additional descriptive text for the page.
        title (str): Title of the page.
        url (str): Relative or absolute URL of the page.
        tabs (list): A list of Tab objects representing navigation tabs on the page.
    """

    def __init__(self, name, url):
        self.name = name
        self.url = url
        
def buildWebsiteStructure(page):
    """
    Builds the website structure for the given page object by retrieving its content,
    parsing the tabs and associated sections from the HTML, and populating the page object.

    Args:
        page (Page): A Page object containing the URL, which will be updated with tabs and sections.

    Returns:
        Page: The updated Page object with its tabs attribute populated with Tab objects,
              where each Tab object contains a list of its associated Section objects.
    """
    # Open URL to create a stream; replace relative URL with absolute URL if necessary.
          


def login(driver, wait, url, username, password):
    """
    Logs into a website using Selenium WebDriver
    
    Args:
        url: Login page URL
        username: Username or email
        password: Password
    
    Returns:
        The WebDriver instance after successful login
    """         
    
    # Navigate to the login page
    driver.get(url)
    WebDriverWait(driver, 2).until(
        EC.url_contains(("https://id.bpp.com/login")))
    
    if driver.find_element(By.ID, "onetrust-group-container").is_displayed():
        cookie_accept_btn = wait.until(
            EC.presence_of_element_located((By.ID, "onetrust-accept-btn-handler")))
        cookie_accept_btn.click()
    time.sleep(2)

    # Find the username and password fields
    # Note: You'll need to inspect the login page and replace these selectors
    # with the actual ones from your target website
    # or By.NAME, By.CSS_SELECTOR, etc.
    username_field = wait.until(
        EC.presence_of_element_located((By.ID, "1-email")))
    password_field = driver.find_element(
        By.CSS_SELECTOR, "input[type='password']")  # adjust selector as needed
    
    # Enter credentials
    username_field.send_keys(username)
    password_field.send_keys(password)
    
    # Find and click the login button
    login_button = driver.find_element(
        By.CSS_SELECTOR, "button[type='submit']")  # adjust selector as needed
    login_button.click()
    time.sleep(2)
    # Wait for login to complete - look for an element that appears after successful login
    WebDriverWait(driver, 5).until(
        EC.url_contains(("https://hub.bpp.com/account/home")))
    wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, "h1.text-heading-2")))  # adjust selector as needed
    
    print("Login successful")
    return driver

def writeResultToFile(filePath, contentList):    
    f = open(filePath, "w")
    f.write(contentList+"\r\n")
    f.close()
    return

def get_marking_hublinks(driver, wait, marking_url):
    marking_items = []    
    file_content = ""
    driver.get(marking_url)    
    WebDriverWait(driver,10).until(EC.url_contains(
        ("https://www.bpp.com/my/learning/course/5614")))

    wait.until(EC.presence_of_element_located(
         (By.CSS_SELECTOR, "div.course-sections")))

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    hublinks_sections = soup.find_all(attrs={"class": "single-section"})
    for section in hublinks_sections:
        section_name_element = section.find(
            attrs={"class": "section-name"})
        section_name = section_name_element.text.strip(
        ) if section_name_element else "No name found"

        section_link_element = section.find(
            attrs={"class": "section-link"})
        link_href = section_link_element.get(
            'href') if section_link_element else "No link found"
        marking_item = MarkingItems(section_name, link_href)
        marking_items.append(marking_item)

    for mi in marking_items:
        print(f"Name: {mi.name}, Link: {mi.url}")
        file_content += f"{mi.name}{tab}{mi.url}\r\n"

    if len(marking_items)>1:
        writeResultToFile(marksFilePath, file_content)
    
    return driver, marking_items


def get_markers_hublinks(driver, wait, marker_url):
    marker_items = []
    file_content = ""
    # Navigate to the URL
    driver.get(marker_url)
    time.sleep(2)
    WebDriverWait(driver, 10).until(EC.url_contains((marker_url)))
    exclude_list = ["Solutions", "feedback"]
    wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, ".course-content")))

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    hublinks_sections = soup.find_all(
        "div", attrs={"class": "activityinstance"})
    for section in hublinks_sections:
        section_element = section.find("a")
        section_name = section_element.text.strip(
        ) if section_element else "No name found"

        section_url = section_element.get(
            'href') if section_element else "No link found"

        if ("solution" not in section_name.casefold() and "feedback" not in section_name.casefold()):
            marker_item = MarkerItems(section_name, section_url)
            marker_items.append(marker_item)

    for mri in marker_items:
        print(f"Name: {mri.name}, Link: {mri.url}")
        file_content += f"{mri.name}{tab}{mri.url}\r\n"

    if len(marker_items) > 1:
        writeResultToFile(markersFilePath, file_content)

    return driver, marker_items


# @retry(stop=stop_after_attempt(3))
def hublink_page_sequence(driver, wait):
    marking_url = r"https://www.bpp.com/my/learning/course/5614"
    marker_url = r"https://learn.bpp.com/course/view.php?id=5614"
    driver = login(driver, wait,
                   r"https://hub.bpp.com/account/home", "eugenelo@bpp.com", "Suke352863!")
    # Wait for the page to load
    
    print(f"Start Marking")
    driver, marking_items = get_marking_hublinks(driver, wait, marking_url)
    print(f"Marking items: {len(marking_items)}")
    # Wait for the page to load
    
    driver, marker_items = get_markers_hublinks(driver, wait, marker_url)
    print(f"Marking marker_items: {len(marker_items)}")



def main():
    """
    Main function that orchestrates the scraping of website structure and writing the search data into a CSV file.
    
    Process:
        1. Reads page definitions from "C:\Temp\actedWebSiteStructure.csv".
        2. For each page, calls buildWebsiteStructure() to fetch and parse its tab and section information.
        3. Writes the aggregated information into "C:\Temp\WebsiteLinkToSection.csv" with the following columns:
           - URL constructed from the page, tab, and section.
           - Page Title.
           - Tab Description.
           - Section Description.
    
    Returns:
        list: A list of Page objects updated with the parsed website structure.
    """
    print("START !!!")
    marking_items = []
    marker_items = []
    file_content = ""
    DRIVER_PATH = r"C:\TEMP\chromedriver-win64"
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    wait = WebDriverWait(driver, timeout=30)
    
    # Navigate to the URL
    try:
        hublink_page_sequence(driver, wait)
    except Exception as e:
        print(f"An error occurred: {e}")
        driver.quit()
    
    # response = requests.get(
    #     "https://www.bpp.com/assets/bpp0036-bpp-digital-696ec018a6ff65d7c51c2757d748777b.js")
    

    # r = linkToSoup_selenium(
    #     'https://www.bpp.com/my/learning/course/5614', headers=headers)
    
    #     # it actually just has to scroll, not click [but I haven't added an option for that yet],
    #     clickFirst='//strong[@data-item="avg_F"]',
    #     # waits till this loads
    #     ecx='//strong[@data-item="avg_F"][text()!="-"]'
    # )

    # if soup is not None:
    #     print({
    #         t.find_previous_sibling().get_text(' ').strip(): t.get_text(' ').strip()
    #         for t in soup.select('div#payout-section span.title + strong.value')
    #     })

    # soup = BeautifulSoup(response.text, 'html5lib')
    # hublinks = soup.select(".section-link")

    # for h in hublinks:
    #     print(h["href"])


main()
