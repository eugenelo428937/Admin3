# Rules Engine Refinement

We have tried to implement the rules engine, now i would like to refine the functionality. Study the documentation and the rules engine folder in the django app and the js files in the react app for the rules engine to work.  

## Entry Points

First I would like to explicitly define the entry point of the the rules engine to execute.
At the moment we are using the trigger_type in acted_rules to determine the entry point, I would prefer a strict definition of the entry points.

- home page mount
- product list mount
- add to cart
- checkout: start
- checkout: terms and conditions 
- checkout: details
- checkout: payment start
- checkout: payment end
- checkout: order placed
- user registration start
- user registration end
- user authenticated

# Rules Chain
For each rules that is executing in the same entry point, create a model to store the order of execution.
And in each rules, we need to define what is the success and failure criteria. We should have a return value true or false.
If true it will continue to the next rule, if false it will stop the execution of the whole chain and a message will be sent to the front end and the user.

# Rules Conditions
Each rules condition should be a finite set of variables and a set of operators.
Rules will need to be able to compose with other rules. A rules condition can be a combination of more than one child rules.

Below are some examples of rules with composite condition:

- if cart.has_tutorial = true AND checkout.payment_method = 'card'
- if user.country = "ZA" and product.product_variations = "ebook"

Below is some of the fields that need to be included:
{
    User :{
        country,
        home_address,
        home_email,
        work_address,
        work_email,
        is_reduced_rate, //to be implemented
        is_apprentice, //to be implemented
        is_caa, //to be implemented
        is_study_plus, //to be implemented
    },
    Cart :{
        has_material, // material product in cart
        has_marking, // marking product in cart
        has_tutorial, // tutorial product in cart
    },
    product :{
        product_id,
        product_variations,// ebook, printed, tutorial, etc.
        material_product : {
            despatch_date,
        },
        marking_product : {
            has_expired_deadlines,
        },
        tutorial : {
            has_started,
        },
    },
    exam_session :{
        tansition_period,
    },
    date : {
        xmas,
        easter,
    },
    Checkout : {
        payment_method,
        employer_code,
    },
}

## Rules actions

Actions will be of two types: Display, Acknowledge, Update, Custom

- Display: display a message to a defined placeholder, the message will be stored in the database. e.g. Holiday period, Easter period etc. See acted_rules_message_templates.
- Acknowledge: prompts user to acknowledge the message. e.g. transition period, expiring deadlines, terms and conditions etc. See acted_rules_user_acknowledge.
- Update: update the values. e.g. add an additional charge to the cart, add vat to the cart, update user status etc.
- Custom: it will execute a custom function that cannot be achieved with the other actions.
