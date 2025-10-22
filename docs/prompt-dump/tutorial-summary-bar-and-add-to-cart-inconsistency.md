# Tutorial Summary bar issue and inconsistent behavior when adding tutorial to cart

In the @001-docs-stories-epic, we have implemented the tutorial choice summary bar. Upon further testing, I discovered some issue.

- In the tutorial summary bar the remove button does not work. When I check the dev tool network tab, there are no calls to the backend. The expected behavior is when user click on the button, it should remove the tutorial choices of that subject. If the tutorial choices is already in cart (isDraft : false), remove both in cart and in tutorial choice context and local storage. If the tutorial choice is in tutorial choice context, clear it frm the tutorial choice context and local storage. Then remove the summary bar of that subject.

- In mobile (resolution sm or smaller), the tutorial summary bar is obstructing the screen. Suggest a way to collapse the summary bar in mobile view that does not affect UX.

- Inconsistent behavior in add to cart button in tutorial selection summary bar, tutorial selection dialog and tutorialProductList. See below steps for reproducing the error.

- The Clear cart button does not complete clear the tutorial selections. See step 5 below.

Reproducing the issue:

1. Add CS1-30-25S (Edinburgh) to cart from TutorialSelectionDialog.
1. Add CS1-20-25S (London) to cart from TutorialSelectionDialog.
1. Cart only shows CS1-20-25S (London) but Tutorial Selection summary bar shows CS1-30-25S and CS1-20-25S.
1. If i then click on the add to cart button in the tutorial summary bar, both tutorials appear in cart.
1. When I clear the cart from the CartPanel, then click on any CS1 tutorial prodcut card's "Select tutorial" button. Before i select any tutorial, the tutorial summary bar appears with CS1-20-25S (London) already in selection.

I suggest first fix the tutorial summary bar the remove button and the responsive layout issue for tutorial summary bar. Then fix the issue for clearing cart. After the above is done, then investigate the issue with adding tutorial to cart.

**IMPORTANT**
Tutorial selection should always base on the TutorialChoiceContext. For each subject, there can be up to three selections. Each selections can either be IN DRAFT SELECTION BUT NOT IN CART (isDraft=true) or ADDED IN CART (isDraft=false). In each of the add to cart button, it should always send ALL selections of that subject in the tutorialChoiceContext of that subject to the cart.
