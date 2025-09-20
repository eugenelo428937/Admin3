# Checkout Preference rules

let's continue to work on @epic
and start the implementation for order user preference type rules. 
These rules are similar to the acknowledgment rules we have implemented. (see terms and condition rule and digital consent rule)
These rules can be blocking or non blocking, and they store user preferences in relation to the order they made.
This type of rules will have action type : "user_preference".

There will be two actions variations:

1. display the options and input inline
1. display the options and input in a dialog box

both options will consist of a title, content, and input.
Input can be of textbox (single or multiline), radiobutton and checkboxes. Reserve the possibility of new input elements for the future

When user completes an order, similar to acknowledgment rules, it will store user input to acted_order_user_preference table.
each rule should save as a seperate entry in the table.

USE STRICT TDD implementation. Write test in small increments. Make sure it all failed (Red phase)
Try to reuse the existing rules engine code.
Implement the least amount of code to fullfil the requirement in small increments and pass the test.(green phase)
Refactor if needed but make sure any refactoring needs to be reflected in the test case.

Then create a new inline preference rule with title : "Marketing and other emails", content : "You can choose to receive marketing and other information relevant to the courses you are interested in. Please use the checkboxes below to let us know if you are happy to receive these communications. You can opt out of marketing at any time, either by emailing us or clicking the Unsubscribe link on future emails. We will not share your marketing information outside of the BPP Professional Education Group."
it will have two radio button, and default option 1 is checked.

1. I am happy to receive marketing and product information from ActEd
2. I don't want to receive marketing and product information from ActEd

Create a new  "Preference" checkoutsteps component and add it in the checkout steps. Then in the component create a call to rules engine with entry point "checkout_preference".
