# New session process

1. Create new session
2. Subjects:
    a. List all subjects from previous session in MUI Transfer List.
    b. "New subjects"          button for openning new subjects modal to create new subjects.
    c. On saving new subjects, add it to the transfer list.
    d. save to acted_exam_session_subjects
3. Any new master product? Any new master product variations?
    - If yes :
        a. Open "New Products" Form and add to acted_products.
        b. Add "New Product Varaitions" Form and add to acted_product_variations and acted_product_productvariation.
        c. Add acted_product_productgroup.
    - If no :
        a. Products will be seperated into subject tab
        b. Each subject tab will be a table containing products for last session
        c. Each row will display the fullname, shortname, description and a sub table containing the product variations.
        d. save to acted_exam_session_subject_products and acted_exam_session_subject_product_variations 
4. Adjust Bundles and bundle products? or copy from last session?
5. Price

