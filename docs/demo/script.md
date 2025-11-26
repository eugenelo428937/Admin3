# script

## Part 1

### Intro

A year ago you asked me to update the estore layout, it includes the horiontal menu on the top, the navigation menu, the product list page, the tutorial page and the Online Classroom page.

### Background and Objectives

The main 5 objectives is to modernise the layout, adaptive to different screen size, intuitive navigation, improve accessibility and align user interface and user exprience with modern app behavior.

First, I seperated the process into 2 part. The first part will include the initial analysis identifying some issues in the products table I came across in the current estore, then I researched how other companies tackle these issue and followed by a feasibility study on how to apply those features to own eStore.

### 1. Initial Analysis

I have done a initial analysis and access which area we should focus on first.
The first item on the list is keeping the table layout. I had a few attempts redsigning the layout incorparating the table but I could not come up with a design that looks decent and works well especially in mobile.

#### 1.1 Table layout vs mobile friendliness

For table to be responsive, the row height will need to be increased. The smaller the screen size, the height of each cell will need to be taller in order to show the content. I tried stripping most styling with minimal padding and margin to make table adapt to mobile, but even with each cell only containing the product name without extra info it still feels crowded. And if we add more info in the future it becomes less readible with a single product takes up most of the screen.

Another approach is to use flex grid in Bootstrap CSS. Table cell will wrap to next line when it is over the resolution breakpoint. The wrapping not only breaks the relationship between printed and ebook product but also disassociate which two products the "buy both" button is referring to.

### 1.2 Relationships and Information/Visual Hierarchy

The next item on the analysis is also related to products table and the Information Hierarchy and Visual Hierarchy relationships within products.

#### 1.2.2 Information Hierarchy vs Visual Hierarchy in the products table

Visual hierarchy is the arrangement of elements in a design to guide the viewer's eye through content in order of importance. Whereas Information hierarchy is the strategic organization and arrangement of content to guide users, prioritizing essential information and creating a clear, logical flow. In this table, it shows the four main relationship in a product table. The row containing the bundle product ranked highest in both visual hierarchy and information heirarchy. Visually it has a orange background color, the heavier font weight and more negaive space. For rows that consist of both printed and ebook version or the ebook and its corresponding marking product, they have the lowest visual hierarchy and information hierarchy. However for rows for ASET, Mini-ASET, the Vault and AMP, they should have the same level of information hierarchy, but visually they are more obvious because there are more negative space. Even in this table here, when you first look at it, you will first notice the row with bundles and aset. This mismatch is often an issue of a table layout with some cell are merged.

#### 1.2.2 Relationship within each row in the products table

Another thing to note is the behavior of the "Buy both" button. In the rows for printed material and its corresponding ebook, they are the same product with different medium of delivery. The "buy both" button will add both material product to cart, printed in standard price and the ebook in additional price. In essence we can say this button is "Buy both variations".  Whereas in the row for Mock exam and assignments with its corresponding marking product, they are two different products. The "Buy both" button will add the two product with both using standard price. This button means "Buy with recommended product". In the same table, the "Buy Both" button triggers different behavior.

### 1.3 Layout controlled by products.dbf table

The last item in the analysis is about how the table layout is controled by the products.dbf table. In the estore_product_list file, the layout is set by the inital where clause of the SQL query.  It hardcoded which specific product NOT to include and use the add_on_sale field to fetch which product should be in the same row. Imagine in the future we will need to add, for example AI, as the third variation, and it requires a "Buy Both" button for either ebook and printed material, so AI with ebook and AI with printed. It will be very charllanging to satisfy the requirment and showing concisely different relationships in a table layout.

Another scenario is if we retire all printed product in several subjects, the logic for deciding which product to fetch first and which product to include in the add_on_sale will need some major changes.

It shows the rigid structure is susceptible to change. The layout is restricting the flexibility of the data structure and less adaptable to future business needs.

Rather than form follows function, the form or the layout is limiting the function which is the behavior of products.

### 2 Research : Industry Patterns

After identifying the issue of using a table layout, I then looked at how other company overcome this issue.

#### 2.1 Focus

I studies a few companies that provide actuarial education and some other e-commerce giant to see how they handle displaying product. How the navigation behaves in mobile. Also, any common functionlities.

#### 2.2 Sites studied

Although it does not look particularly well proportioned in mobile resolution, IFoA uses a horizontal card for products. Each card includes price, availability, and descriptions. It also include login function in the navigation menu on the left. When clicking on the cart button it stays on the same page and opens up the cart preview panel.

On ActEx, They use a larger horizontal tiles to display products. Each tile spans the whole width of the screen, and including price, descriptions, and buttons for samples. Clicking on the price button will redirect to the product details page. On the navigation menu on the top, you can find the user related function like login, logout, profiles, order history and update password functions as well as searching function. When clicking on the cart button it opens up the cart preview panel on the same page without reloading.

I came across ThinkActuary from ASSA, it does not seems to be active at the moment but "Available Subjects" section also contains an example of using cards in a grid layout displaying different subject.

Other sites like Oxford Univeristy Press, Amazon and apple all shared similar approach and I have summarise in the following.

#### 2.3 Summary

1. Product card layout with grid.
    1. Fixed height/width cards for each resolutions
    1. Includes pricing and descriptions
    1. Some includes filter and searching (ActEx, Amazon, ebay, apple)
1. A collapsible cart preview panel that opens up without postback.
1. User related functionalities incorparated in Navigation Bar.
1. Navigation menu is accessible by a hamburger icon in mobile. It opens up a drawer in a layered structure menu for general product category to more specific subcategory on each level.

### 3 Feasibility Study

After we summaries the approach how other sites handles the functionality, I conducted a feasibility study and explore how the features above can be applied to our e-Store.

#### 3.1 Products

For switching to products card layout, estore_product_list requires some major updates to change how products are fetched initially as well as how the "Buy Both" will work. There are also 40+ files that might be affected, I searched for files that contains products, products_oc, products_special, class and addonsale. Some maybe obsolete.

#### 3.2 Filtering and searching

For adding Filtering and searching for products, it requires adding a filter panel and search box in estore_product_list. Also need to add a container to preview search result.

It also requires some new tables for mapping filters to products and product categories. The backend need to implement for building products metadata, and returning the relavant results.

#### 3.3 Refactoring User functionality from checkout process

Refactoring the User functionality from the checkout process is much simpler in comparison. We will need to refactor the user functions from the checkout pages to make it accessible thru out the store. The most time consuming will be testing any files requires user authentications.

#### 3.4 Preview Cart Function (No postback)

Preview cart panel requires refactoring estore_cart_view into a common component and work with estore_manager and estore_cart tables. The layout and collapsible behavior can be done by using Offcanvas Components Bootstrap css library for collapsible sidebar.

#### 3.5 Navigation Refactoring

We can use boostrap CSS Navbar Component that we have been using in our website to update the navigation menu. We can leverage the filtering functionality for displaying the relavant products.

## Crossroads

### Approach 1 : Frontend only

When you first ask me to update the e-Store UI but keeping the table layout and minimal change in the backend, I have several attempts but it all leads to a results that is only marginally better. With the table layout, it is very difficult to achieve a full responsive and accessible online store. Keeping the backend change to minimum also hugely limit what we can do for the other functionalities.

This approach is safer but it is like going the long way around and we will need to trace our footsteps in each iteration. If our goal is to achieve an online store with modern technology, we will have to update the frontend 3 time and the backend 2 times. If we first update the current frontend to the best we can, then updating foxpro backend and followed by the frontend again to match the added functionalities. However, we will still need to revise both frontend and backend over again when we are ready for moving to a modern technology.

### Aproach 2 : Update both frontend and backend altogether

If we can take more risk and update both frontend and backend in one go, it will provide much more value in a more efficient manner. The result will not be a half baked solution that needs reworked in a later statge. It can match most of the feature when comparing with our competitors. Using this approach, we will need to update the frontend 1.75 times and the backend twice to achieve our ultimate goal.

### Approach 3

Both approach will be significant amount of work and it is a hugely complex task.

However, both approach in the previous table share a common step.

And here I would like to introduce the third approach.

## The new ActEd Online Store

## Part 2 : The new ActEd Online Store

A year ago when I was constantly moaning about the disappointing 2% payrise and I thought to myself I will need show I can do more. So when I was stuck with re-designing the estore layout, I thought creating a new estore will allow me to provide much more value to the company. I understand you much prefer a more safer approach but I do believe it comes to the point of dimished return if we stick to updating the eStore with Foxpro.

Since I am really terrible in explaining how things will work, it will be more direct to show you the end product.

### 1. Technology Stack

This application is build with PostgreSQL Database. Python as the backend programming language with Django as the web framework and Object relational mapper to communicate with the database.

In the frontend, it uses ReactJS javascript library and Google's Material Design Component.

### 2. Methodology & Architecture

I used Agile methodology to manage each sprints. The application is developed using object oriented programming concept and Test-driven development to ensure quality of code. The system architecture is a Model-View-Controller Architecture. It also cohere to Design patterns for best practices.

### 3. Implementation Progress: Feature Matrix

Here shows the feature matrix and let me have a quick walk thru of all the features.

#### 3.1 User Management (11 features)

On the navigation bar on the top, you can see the login function and user related functions. You can register a new account by clicking on the "Create account" button. The registration is a step by step process to minimise congnitive load and better accessibility to mobile resolution. When you enter a phone number, it will uss Google libphonenumber javascript library to provide validation and auto formatting. You can try using a UK number and a Vietname phone number.

The Home and Work Address also has a similar mechanism. When you selected a country, it will show the Postcode field if the selected country uses postcode and the address searchbox. When you click enter, it will send an request to postcoder API to do a address lookup. At the moment to save credit, i made this textbox to made the api call when user press enter, but when it is live, the suggested address should be updated as user types. If the Country is not supported by the Postcoder service, it will flow to manual address input.

when you select one of the suggested address, it will autofill the address form. This form can also be accessed by clicking the manual entry button. Similar to the phone numbervalidation, it will call the Google libaddressinput API to dynamically generate fields according to the selected country and also applied related validation for mandatory fields on the fly. For example, if you select India, there will be a pin field instead of textbox. If you selected US, you will see the state dropdown.

These two valdation services will be a way to minimise input error to save time when admin team processig orders.

When user successfully registered, they will receive an email for verification of their email address. User will need to verify before the account is active. This also make sure they have enter their email correctly.

When user updates their profile, if they changed their email address, verification will also be required. Password reset will trigger a email notification.

with the account setup you are now ready to order. You can logout first so you can see the whole workflow.

#### 3.2 Products (11 features)
There are 6 types of product card, Materials, Marking, tutorials, Bundles, Online classroom and Marking Voucher. Each with its own customise content tailored to the specific product type.

Remember I mentioned the issue with a table layout and the relationship between ebook and printed product. If a product has two variations, it will show in the card content.

For example, material product will have ebook and printed. And Online classroom will have UK and India as their variations.

For the "Buy Both" button, now it is implemented using a speed dial button. When you click on the add to cart button, if available it will show different options. Like Course Notes will have a Buy Both button and Mock Exam will have a Buy with recommended button listed.

Bundle product card will have the content listed, and marking product card will shows the marking deadlines information with warnings if any deadlines are expired.

For tutorial product, each card is seperate by Location. Since most students only attends tutorials convienient for them, we do not need to show every location unless they want to.When you click on the "+" button, it will show available options. If you click on select tutorials, it will open up the selection panel to choose your tutorial preference. When you close the selection panel, on the left, you have the selection summary bar, to edit your selection, add your selection to cart, or remove current selection. The tutorial selection states are managed by a redux Javascript library so user have the flexibility add/edit/remove in any of these panels.

#### 3.3 Search & Filtering (9 features)

On the Landing page as well as the top navigation bar, you can find the searching feature. The idea is if user knew what they will be ordering so it provides a quick and direct way to order straight from the landing page. When you enter some text for seraching, the result panel will populated with the top matching results. When you click on View all results, it will redirect to the products page that contains only the search result.

It uses FuzzyWuzzy, a python library that calculated the lavenshein distance between the search text and the metadata of each product. It provides a flexible searching function that tolerates typos, partial matches and singular or plurals.

On the left is the filter panel, at the moment there are four filters: subjects, categories, product type and mode of delivery. It supports multiple filters and the list of product will refresh automatically.

Same as the tutorial selections, the filters state is also managed by Redux.

#### 3.4 Rules Engine (24 features)

One of the highlights of this application is the Rules Engine. It replaces a big proportion of code containing business logics. The rules engine will begin the execution at predefined entry point like checkout start, landing page loaded, product card loaded...Each entry point contain a set of rules to be executed.

Each rule have a condition and action. A rules will exectue only when the condition is met. If the condition is not met then it will move on to the next rule. The condition and action is evaluated using JSONLogic, an expression for share logic between front-end and backend using json.

After matching the condition, it will perform its action. There 4 type of actions: display message, user acknowledgment, user preferences, and update action.

- display message action
  - these are rules when showing a message is sufficient. It can be an inline or a modal popup messagebox. It has four level of severity which control the color and themes.
  - e.g. holiday message, ASET and Vault warning.
- user acknowledgment action
  - when we require user to acknowledge an important message and the acknowledgment will need to be stored in the database, we will use user acknowledgment rules. It is mandatory for user confirmation before it can proceed.
  -e.g. terms and condition, nominal booking fee for tutorial orders with credit card.
- user preference action
  - this includes marketing preference, health and safety preference that are optional but require to store the value if reqired by user.
- update action
  - When executed, it will perform updates on objects in the carts or orders.
  - We have use the update action to calculate VAT for different countries and different product variations. Also adding and removing the tutorial booking fee.

Rules can be chained so it replaces the need of giant "if then else" code block. The beauty of using JSONLogic is that all conditions and actions are stored in the database. In other words, it will be made configurable for admin staff.

!!!demo rules engine admin

#### 3.5 Shopping Cart & Checkout (11 features)

When you click on the cart icon in the navigation menu, the cart preview panel will open and it includes all the neccessary functions for cart operations. If you click on the checkout button, it will open up the step by step checkout wizard.

On the right, you can find the order summary panel thru out the checkout process.

Cart review is the first step, the rules for checkout start entry point will run at this point. User can update their invoice or delivery preference. When updating each address, it reuses the address lookup component and have the option to update just for this order or applied to the user profle as well.

Phone number fields also reuses the phone number componenet with the dynamic validator in the user registeration.

Email are deliberately set to read-only to ensure it is verified.

Terms and condition is the second step and rules for checkout terms entry point will run. The terms and condition is dynamically generated by the rules engine and user acknowledging the terms will be recorded. The Next button will be greyed out until user checked the box.

The third step is the order preference and the entry point for checkout preference. Same as the previous step, each preference is dynamically generated with each matching product.

The Final step is the payment, since I do not have access to opayo test account so i uses a dummy detail for now.

With the order completed, you will recveive an email confirmation.

#### 3.6 Email System (16 features)

The email confirmation together with other email are generated from a MJML template (MailJet Markup Language). It is designed to simplify coding for responsive email.

The email module uses the MJML template and includes the functionality for conditional content rendering into placeholder in the template and adding attachments when conditions are met. The module will then transform it into html and place in the email queue. A worker process will send emails from the queue every 30s. The result will be saved in email log. It has setting to configure the number of retries.

### 4. Test Coverage

The both frontend and backend uses Test-driven development so before any code is written, corresopnding test cases will be written first. This ensures the implementation contains only what is neccessary.

Each test case will then be organised in a test suite to ensure any change in the future will not break existing code.

The test suite consist of 999 tests which achieves 95% total coverage and 100% passing test.

<!-- Demo test suite -->