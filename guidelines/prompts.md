
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
Have drinks in cart have names:
Usermade- better options than "Drink in user cart"?
When the AI creates a drink, it should also name the drink something fun based on the ingredients. Right now it just says "Your AI drink". The cart should also show this name.
When you click 'like' button in design page, the user should be prompted to name the drink before it gets saved to the home screen. The saved drinks section should show the name with an option to change it.

"Rate Your Drink" section looks bad in post checkout. Make it show what drinks were ordered in a carousel that matches the UI design of the rest of the app. Each drink should show the name, an option to add it to the favorites in the home page (if signed in- if not it will tell the user to sign in), and five stars. Once the stars are clicked, a message will come back with "thank you for your feedback", and the stars will stay like that and nothing will happen with storing that information or anything yet.

Add a backbutton for the 'sign in' page to go back to the home page after clicking 'sign in' in the home page.

The tax is not shown in the confirmation message when recurring order is toggled on in the checkout page.

The tax is not shown with stripe.

Get rid of the 'edit' pencil icon in profile page on the tab at the top that shows name, email, and points. It is not hooked up to anything and I do not think we need it

Create a 'menu'? Right now we just have seasonals and 'make your own'.

"Rate your drink" redesign:
~/.claude/plans/serene-fluttering-bachman.md

Minor fixes:
~/.claude/plans/spicy-dancing-fog.md

-=-=-=-=-=-=-=--=-=---=-=-

After I change a name of a drink after clicking add to favorites in the drink design page, I get the error:
Error saving drink: Error: Failed to save drink. Status: 403.

When I click Ask Tonic it generates a name for the drink which is amazing. when I make my own drink the name of the drink is just the name of the previously made AI drink's name or it is 'My Drink' if no AI drinks have been made yet. Have the AI generate a name for a custom made drink after the user clicks 'add to cart' so that the name shows up in the cart.