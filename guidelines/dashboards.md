    * (M) Super Admin Dashboard
      * (M) Global Navigation Panel
        * (M) Region selector (with override enabled)
        * (M) Store, hub, and system-level data views
        * (C) Role & permissions management access
        * (C) AI configuration controls
      * (C) System Overview Panel
        * Network-wide performance metrics
        * Active alerts (regional issues, stock risks, system faults)
        * Emergency override indicators
      * (C) Configuration & Control Section
        * (C) Role creation and permission editor
        * (M) Global AI parameter controls
        * System override toggles for emergency or maintenance scenarios
    * (M) Repair Staff Dashboard
      * (M) Regional Overview Panel
        * (M) Store selector
        * (C) Summary cards to give immediate visibility into machine health
      * (M) Machine Status Table- A sortable, filterable data table showing all machines within the assigned region.
      * (M) Repair Schedule Manager- Calendar or timeline view showing:
        * Upcoming repairs
        * In-progress service jobs
        * Overdue maintenance
      * (S) Machine Detail View
        * When selecting a machine, show repair status, history, and any notes
      * (C) Schedule Optimization Tool
        * A utility panel that suggests route grouping and recommends optimal scheduling
    * (M) Logistics Manager Dashboard
      * (M) Hubs
        * Supply levels
      * (M) Stores
        * Supply levels
        * Usage trends
      * (M) Supply usage statistics
          * (C) History of supply usage.
          * (M) Popularity trends
            * Do certain syrups, sodas, or addins trend higher than average based on time of year, month, or week? Do certain ingredients trend higher at one location over another? AI generated. (report is region-based, not store-based).
      * (M) Delivery schedules/routes
        * (M) Planning View
          * Forecasted depletion dates per store
          * Suggested restock window (AI calculated)
        * (M) Routing View
          * (C) Route building
          * (M) AI suggested optimal route buttonstores needing restock.
        * (C) Automated Scheduling
          * Like the customer recurring UI — but for supply.
    * (M) Manager dashboard
      * A dashboard that contains links to a notifications section, store revenue report, a store inventory report, order statistics, and a supply request page.  
        * (M) Notifications section:
          * Notifications appear here when stock levels cross a predictive threshold (they will run out before the next scheduled delivery).
          * The notification includes: which ingredient + how much is left + recommendations (how much to order/from where).
        * (M) Revenue report:
          * Total revenue.
          * Inventory costs.
          * Total user accounts assigned to that location.
        * (M) Inventory report:
          * Levels of syrups, soda, addins.
          * Estimated amount of syrups, soda, addins to order that month - AI generated.
            * included in the AI report will be AI's recommendation for the best places to purchase ingredients.
          * grid of the levels of syrups, sodas, addins.
            * grid can be configured to sort by how much is left.
          * grid of coolers/status (full/empty).
          * for every full cooler, it shows how long the drink has been sitting there.
          * A grid that shows the inventory of nearby stores.
          * A grid that shows the inventory of the supply hub.
        * (M) Order statistics
          * (C) History of orders.
          * (C) Average time between order made and picked up.
          * (M) Popularity trends
            * Do certain syrups, sodas, or addins trend higher than average based on time of year, month, or week? Do certain ingredients trend higher at one location over another? AI generated.
        * (M) Supply request page
          * Here you can submit an order form for all supplies. Two options for submission button:
            * (C) Request from nearby store.
              * If selected, the user must specify which store from a list of the nearby stores within a 100 mile radius.
            * (M) Request from supply hub.
          * (S) There is also a way to view pending supply requests and their progress (like a track package UI).
          * (C) History of supply movements and requests
        * (M) AI will be used to estimate when supplies need to be ordered to notify the manager and also find the best places to purchase ingredients.
    * (M) Admin dashboard  
      * (M) Shows all user accounts (searchable):
        * 3 sections: Active, disabled, and deleted
        * Active: delete, disable, make manager
        * Disabled: delete, enable
        * Deleted: no buttons (non-recoverable. purely a log)
      * (M) Shows all manager accounts (searchable)




