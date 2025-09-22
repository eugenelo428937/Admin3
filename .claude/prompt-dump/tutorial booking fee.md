we will continue to implement the rules engine .
We will start on the rules with update action. 
These type of rules will perform updates (e.g. user, cart) if conditions are met.
Let's start by implementing a rules "Tutorial Only Credit Card Payment".
This rule has condition if the cart contains tutorial item only (excluding online classroom product) and user choose to use cerdit card payment.
It will add a item to cart items for "tutorial booking fee" of £1.
It will trigger at checkout_payment, and when user click on the "payment-card" radio button.

first make sure when user add products to cart, it will update the cart.has_material, cart.has_tutorial, cart.has_marking when user add product to cart for each type of product card.
Then when user reaching checkout_payment step, when user click on the payment type radio button, it will add the payment type to the cart payment context.
Then the rules engine will be triggered with  checkout_payment entry point.
The tutorial booking fee rule will check if cart.has_tutorial is true and (cart.has_material and cart.has_marking both false).
if condition is met, it will add a the booking fee to the cart.item, the price should be recalculated.
A MUI Snackbar will notify user "£1 tutorial booking fee has been added to the cart".