# Marking data import

1. Update the models and fields below:

- rename the marking_paper.store_product_id to marking_paper.purchasable_ptr_id.
- rename the marking_paper_submissions.marking_voucher_id to redeemed_voucher_id and referencing to redeemed_voucher.id
- add a column "grade" in marking_paper_gradings
- rename marking_paper_gradings.submission_date to graded_date
- remove marking_paper_gradings.hub_download_date
- add a column "Intials" in public.auth_user
- rename marking_paper_feedbacks.grade to rating
- rename marking_paper_feedbacks.submission_date to feedback_date
- remove marking_paper_feedbacks.hub_download_date

1. Create a redeemed_voucher model in the marking_voucher app in the backend.

- FK issued_vouchers.id
- FK marking_paper.id
Also create the neccessary views, serializer...etc

1. Then, create a script to migrate the data from @docs/misc/markers.csv  to markers and @docs/misc/marks26.csv  to marking_paper_submissions, marking_paper_gradings and marking_paper_feedbacks.
For markers, validate the csv and check all firstname+lastname can be located to one auth_user.  Then create a new field "legacy_id" in the markers model. Then import to the markers table.

2. Create a script to migrate the data from @docs/misc/marks26.csv:

validate the following:

- All ref(column A) can be found in students table.
- All subject+session (last 2-3 charcter from column "assign") can be found in catalog_exam_session_subjects.
- The orderno can be found in orderitems.metadata.orderno
- Excluding "*/MV/*" (column C), all product code in "assign" column exist in acted.products and marking_paper
- If "*/MV/*" (column C) and "datelogged" (Column F) contains valid date, then check if a corresponding record exist in the marking_paper using "subject" (Column B), "abbrev" (Column D) and "sequence" (Column E)

To process the @docs/misc/marks26.csv:

a. Create marking voucher to issued_vouchers for column C = "*/MV/*"

- all marking voucher has purchasables.id = 6
- use the orderno to query orderitems.metadata.orderno to get the order_items.id
- use "expiry" (Column X) as issued_vouchers.expires_at
- voucher_code : column R "voucher"
- If "datelogged" (Column F) contains valid date, create a record in redeemed_voucher with issued_vouchers.id and use "subject" (Column B), "abbrev" (Column D) and "sequence" (Column E) to get the marking_paper.id

b. For all rows that contains valid date in "datelogged" (Column F)

create a record in marking_paper_submissions:

submission_date : Column W "realdatein"
hub_download_date : Column AG "hubdownld"
marking_paper_id : use "subject" (Column B), "abbrev" (Column D) and "sequence" (Column E) to get the marking_paper.id
redeemed_voucher_id : If column C "assign" = "*/MV/*", get the redeemed_voucher.id using column U "voucher" with matching marking_paper.id
order_item_id : get order_items.id with order_items.metadata.orderno = Column U "order"
student_id : get students.id with student_ref = Column A "ref"

c. For all rows that contains valid date in "dateout" (Column H)

create a record in marking_paper_gradings:

allocate_date : "dateout" (Column H)
graded_date : "hubout" (Column AH)
hub_upload_date : "hubout" (Column AH)
score : "score" (column M)
allocate_by_id : look up staff.id using "staffalloc" (Column AD) = auth_user.initials
marker_id : lookup markers.id using "marker" (Column O) = markers.initial
submission_id : marking_paper_submissions.id

d. For all rows that contains valid date in "hubfeedbk" (Column AI):

create a record in marking_paper_feedbacks:

rating : Column P "rating"
comments : Colunmn AL "comments"
feedback_date : "hubfeedbk" (Column AI)
grading_id : marking_paper_gradings.id
