# Intro

## Background and Objectives

A year ago you asked me to update the estore layout, I explored modernising the current UI while retaining the table layout and FoxPro backend. After several iterations of prototype, I came across some hurdles that I have difficulties overcoming.

### 1. Hurdles

The first item is about the table layout. I had a few attempts redesigning the products table, I could not come up with a design that look decent and works well in mobile.

#### 1.1 Table layout vs mobile friendliness

For table to be responsive, row height need to be increased. I tried using minimal styling and content but it still feels crowded. If we need to add more info in the future it will become even less readable.

Another common approach is to use Bootstrap flex grid. Table cell will wrap to next line when it is over the resolution breakpoint but the wrapping not only breaks the relationship between printed and ebook product but also disassociate the "buy both" button is referring to which two products.

### 1.2 Relationships and Information/Visual Hierarchy

Next issue I came across is about the Information Hierarchy and Visual Hierarchy within products and the relationship of products in the table.

#### 1.2.1 Information Hierarchy vs Visual Hierarchy in the products table

Visual hierarchy is the arrangement to guide user through content in order of importance by fonts, weights, colour, contrast, and negative space. Whereas Information hierarchy shows the importance of an information in relation to other elements.

In the product table, the row containing the bundle product ranked highest in both visual hierarchy and information hierarchy. It has a different background colour, font weight and more negaive space. For rows with printed and ebook version or the ebook and its corresponding marking product, they ranked lowest in both hierarchy. However for rows for ASET, Mini-ASET, the Vault and Additional Mock Pack, they should have the same level of information hierarchy, but visually they are more obvious because of more negative space. In this table here, you notice the row with bundles and ASET first.

#### 1.2.2 Relationship within each row in the products table

Another thing to note is the behaviour of the "Buy both" button. For printed material and its corresponding ebook, they are the same product with different format. The "Buy both" button will add both product to cart with standard and additional rate respectively. In essence we can call this button "Buy both variations". Whereas in the row for Mock exam and assignments with its corresponding marking product, they are different products and the "Buy both" button will add the two product with standard price. The "Buy both" button means "Buy with recommended product". In the same table the "Buy Both" button triggers different behaviour.

### 1.3 Layout coupled with products.dbf table

The last difficulty I came across is about how the table layout is rendered. In the estore_product_list, table is set by the initial where clause of the SQL query. It specified which product NOT to include and use the add_on_sale field to fetch which product should be on the same row.

Imagine in the future if we need to add a third variation, for example Hub. It requires a "Buy Both" button for either ebook and printed material, so Hub with ebook and Hub with printed. It will be very challenging to show clearly all three variations and the different buy both relationships in a table layout.

Another scenario is if we phase out all printed product in several subjects, the logic for deciding which product to fetch first and which product to include in the add_on_sale will need some major changes.

The table layout and how it is rendered are making it less flexibility and less adaptable to change. Rather than form follows function, the form, the layout, is limiting the function, the behaviour of products.

I have created a more in-depth analysis in the wiki.

### 2 Research : Industry Patterns

After identifying the issue of using a table layout, I researched into how other company overcome this issue.

#### 2.1 Focus

I studies a few companies that provide actuarial education and some other e-commerce stores to see how they handle displaying product. Also, identify common functionlities and its behaviour.

#### 2.2 Sites studied

It includes iFOA, Actex, ThinkActuary, Oxford Univeristy Press, Amazon and apple. They all shared similar approach. 

IFoA uses a horizontal card for products. Each card includes price, availability, and descriptions. It also include login function in the navigation menu on the left. When clicking on the cart button it stays on the same page and opens up the cart preview panel.

On ActEx, They use a larger horizontal tiles to display products with price, descriptions, and buttons for samples. On the navigation menu at the top, you can find the user related functions. When clicking on the cart button it opens up the cart preview panel on the same page without reloading.

I came across ThinkActuary from Actuarial Society of South Africa. It only offer SP1 courses but the Available Subjects section uses cards in a grid layout displaying different subject.

Other sites like Oxford Univeristy Press, Amazon and apple all shared similar approach.

In summary it includes product card layout in grid format. Each card have a fixed height and width and includes product description and prices. ActEx and other e-commerce store have filtering and searching for products.

There is a cart preview panel that opens up when adding product to cart, without the need of page reload.

User related functions are incorporated into the navigation bar and accessible thru out the site.

Navigation menu is accessible by a hamburger icon in mobile. It opens up a drawer in a layered structure menu for general product category to more specific subcategory on each level.

### 3 Feasibility Study

After identifying how others handles the functionality, I did a feasibility study and explore how the features above can be applied to our e-Store. To keep this demo short, I have created a high level documentation about what needs to be changed for each features.

In short, if we only update the layout while keeping most of foxpro code, we can only make marginal improvement on the products page. We might be able to refactor the cart panel and login functions into the navigation bar.

This approach is safer but it is like going the long way around and we will need to trace our footsteps in each iteration. After we updated the backend, we still need to update a huge portion of the layout.

If we can update the both the layout and backend code, it can provide a more noticible value. It requires a lot more effort but it will have a more efficient risk to reward ratio.

However, it is still a very long road if our ultimate goal is to have a fully modernised online store.

Therefore, I would like to introduce our new ActEd Online Store.

## The new ActEd Online Store

## Part 2 : The new ActEd Online Store

You probably know I am terrible in explaining how things work, it might be better to show you the end product. It is something I have been working on the past year. It is by no means 100% complete, but it is now in a good enough state to illustrate its function.

### 1. Technology Stack

This application is build with PostgreSQL Database. Python as the backend programming language with Django as the web framework and Object relational mapper.

In the frontend, it uses ReactJS javascript library and Google's Material Design Component.

### 3. Implementation Progress: Feature Matrix

Here shows the feature matrix and let me have a quick walk thru of all the features. Rather than me rambling, can you share your screen and open up the link in the chat.

#### 3.1 User Management (11 features)

Let's begin with the navigation bar on the top, you can find the login function and user related functions. You can register a new account by clicking on the "Create account" button. The registration is a step by step process to minimise cognitive load and provide better accessibility to mobile resolution. When you enter a phone number, it uses Google libphonenumber javascript library to provide validation and auto formatting. You can try using a UK number and a Vietname phone number.

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

The both frontend and backend uses Test-driven development so before any code is written, corresopnding test cases will be written first. This ensures the implementation contains only what is necessary.

Each test case will then be organised in a test suite to ensure any change in the future will not break existing code.

The test suite consist of 704 backend tests and 3698 frontend test which achieves 95% total coverage and 100% passing test.

<!-- Demo test suite -->

That concludes this demo. I would say it is around 70% complete and another 6 months it will ready for full scale User acceptance test.

A year ago when I was constantly moaning about the disappointing 2% payrise and I thought to myself I will need to show I can do more. So when I was stuck with re-designing the estore layout, while providing same level of work in my daily task, I thought creating a new estore will allow me to provide much more value to the company. I understand you much prefer a safer approach but I do believe it comes to a point of diminished return. In the new age of AI, developement is accelerating exponatially, we need to catch up so we do not fall behind.

I am 41 now and I will need to have a better plan for getting married, having a famliy or raising children if I am lucky. So I am looking for a place I can commit in the long run and I hope this will demonstrate my commitment towards ActEd. In return I am hoping it can merit a 25% pay increase.
