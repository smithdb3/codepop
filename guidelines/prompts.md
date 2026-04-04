
**Admin:**
- "add user" button doesn't work. 
- "+Custom Rule" doesn't do anything.



- Can access information for their store only
- Has access to manage user account data
- Has ability to update account
  - remove/unlock user accounts
- Has the ability to add manager accounts/grant permissions

What is the scope for each role?
- Admin: Their store (access to user/manager accounts)
- Super admin: Access to all accounts for all stores and data for all stores/hubs
- Logistics manager: Data for their hub
- Manager: data for their store
- Repair staff: stores within a region

What is the scope for each role?
- Admin: They should be assigned to a store and only have access to accounts that pertain to that store.
- Super admin: Access to all accounts for all stores and data for all stores/hubs
- Logistics manager: They should be assigned to a hub and only have access to the data for that hub.
- Manager: They should be assigned to a store and only have access to the data for that store.
- Repair staff: They should have access to a region and only have access to the data for the stores within that region

Let's start applying that scope. What are the steps to making that happen?




A couple other fixes:



-=-=-=-=-=-=-
Add a backbutton for the 'sign in' page after clicking 'sign in' in the home page.

"Drink in user cart" cart page

-=-=-=-=-=-=-

Now let's work on the recurring order feature (in checkout page) and Recurring Orders section in the Profile page. We do not need to work on hooking stripe up yet. Just having the checkout page save the data and the recurring orders section pull the data and show/modify it.

Checkout page: After setting the recurrence and clicking 'done' there should be a database table that saves all of that information for each user (or is there a better way to save that info than with the database?).

Also after clicking 'done' this should happen:
  * (M) Recurring Order Confirmation Screen
    * If this option is selected the user will receive a text box that says, 
      "By selecting this option, your order will be automatically placed and your saved payment method will be charged $___ 30 minutes before your scheduled time. You can modify or cancel recurring orders at any time in your account settings."

Recurring Orders section: This section should pull from the database (or wherever) and show all recurring orders that the user has set in a visually pleasing way. The user should then be able to cancel or edit those recurring orders. A graphic similar to that in the checkout page should appear when editing a recurring order.



