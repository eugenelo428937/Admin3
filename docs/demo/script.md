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

If we can take more risk and update both frontend and backend in one go, it will provide much more value in a more efficient manner. It can match most of the feature when comparing with our competitors. We will need to update the frontend 1.75 times and the backend twice to achieve our ultimate goal.

