

---

## Part 1: Legacy Requirements (The "Old" System)

This section details the foundational logic that powers the CodePop user experience, focusing on the automated drink creation process and the core AI engine.

### 1.1 Geolocation and User Proximity Logic (M)
The core value proposition of CodePop is the "just-in-time" preparation of beverages using robotic automation. To achieve this, the application must handle location data with high precision to ensure products are fresh at the moment of pickup.

* **User Location Prompt (M):** After a successful payment transaction, the application must trigger a permissions request for the user's GPS data
* **Proximity Calculation (M):** If the user grants permission ("Yes"), the AI engine will begin a real-time analysis of the user’s rate of approach (velocity) combined with the current estimated time of assembly for the specific order.
* **Automated Trigger (M):** The system must determine the **"Golden Window"**—the exact distance at which the robots should begin the pour to ensure the drink is fresh the moment the user arrives at the CodePop location. This minimizes wait times and ensures optimal beverage temperature.
* **Manual Override ("Start" Button) (M):**  In scenarios where the user denies location access ("No"), or if the GPS signal is unavailable, the UI must provide a "Start" button. This puts the power in the user's hands to signal when they are heading to the store.
* **Time Estimates (M):** Regardless of whether GPS is used, the user will get to know how long their order will take. This enables them to press the “start” option at the right time, ensuring the drink is ready exactly when they arrive.
* **Scheduled Orders (M):** Beyond immediate proximity, the system provides an option for scheduling drinks to be ready at a certain time. This is essential for users who want to plan their day in advance or pick up a drink on a specific commute schedule.

### 1.2 Inventory Tracking and AI Forecasting (M)
Inventory management is critical for a robotic storefront to prevent service interruptions and logistical bottlenecks.

* **Real-Time Monitoring (M):** To prevent a CodePop location from running out of ingredients, an AI will keep track of how popular certain ingredients are and the rate at which they are being used within the specific store showing a depletion rate.
* **Usage Trend Analysis (M):** The AI will analyze popularity trends—for example, identifying if a specific cherry syrup is trending at a certain time, like the weekends or at a certain location, like Utah or a specific store, to adjust replenishment alerts.
* **Manager Notifications (M):**  When stock levels cross a predictive threshold (indicating they will run out before the next scheduled delivery), the system must automatically notify the local manager to initiate a restock order.

### 1.3 Integrated AI Functionalities (M)
AI is an integral part of the app/website’s functionality and is used in a variety of places to streamline the user experience.

* **Randomly Generated Drinks (M):** To encourage exploration, the AI will create a randomized drink for the user upon request. 
    * Analyze user preferences (based on order history) to suggest a new flavor profile.
    * Alternatively, it can create a completely random combination for adventurous users.
    * If the user does not like what the AI creates, they can have the AI re-randomize a new drink instantly.
* **Geolocation and EST (M):** The AI will calculate the perfect preparation time based on current robot load, drink complexity, and travel speed to give the customer the best and most refreshing product. No one likes it when their ice is all melted, and this will stop that problem from happening.

### 1.4 Non-Functional Requirements (NFRs)
These requirements define the quality attributes of the system, ensuring stability, security, and accessibility.

* **Responsiveness (M):** The application must be responsive, providing an optimal user experience across a variety of devices, including desktops, tablets, and mobile devices, with seamless adaptation to different screen sizes and orientations.
* **Error Messages (M):** The application must provide clear, informative error messages for user interactions, invalid inputs, and system errors. Messages should be concise and include suggestions for resolution.
* **Security (M):** All sensitive data, including user credentials, payment information, and location data, must be encrypted using industry-standard encryption protocols, such as TLS (Transport Layer Security). The application must adhere to best practices for secure coding. and data storage
* **Cross-Browser Capability (S):** The application must be compatible with the latest versions of major browsers, including Chrome, Firefox, Safari, and Edge, ensuring consistent functionality across platforms.
* **Scalability (S):** The application should be designed to scale efficiently, handling an increasing number of transactions and data volume without performance degradation.
* **Availability (C):** Orders can only be placed when the store is open, but scheduled ordering is supported. The application should maintain an uptime of at least 99.9%. While the store is closed, users can schedule orders to be processed once the store reopens.

---

## Part 2: New Requirements

This section covers the new administrative and maintenance features required for regional management and hardware upkeep.

### 2.1 Machine Maintenance Tracking (M)
As CodePop expands, maintaining the robotic hardware becomes a primary operational requirement.

* **Maintenance Logs (M):** The software must maintain a digital ledger/history for every machine, tracking its service history, part replacements, and cleaning cycles.
* **Role: repair_staff (M):** A new role is required: `repair_staff`. These users are responsible for managing repair schedules for machines at the specific locations they are in charge of. They must have a dashboard to see which machines need attention.
    * Viewing a dashboard of machines requiring service.
    * Updating the status of a machine (e.g., "In Service," "Operational," "Offline").
    * Logging specific repair actions taken.
* **System Population (M):** Development must include scripts or CSV seeds to populate the database with initial machine data for testing the maintenance workflows.


### 2.2 Advanced User Roles and Permissions(M)
Advanced User Roles are required to manage a regional or national rollout, and hierarchical access control is necessary.

#### New Role: logistics_manager (M)
The `logistics_manager` is a specialized role focused on the "behind-the-scenes" movement of goods.
* **Regional Supply Oversight (M):** They must be able to view and manage the inventory levels of all local stores within their assigned geographical region.
* **Supply Routing (M):** They are responsible for determining the most efficient paths for supply delivery trucks to reach stores needing restock.
* **AI Pattern Recognition (M):** The manager will upload CSV files containing historical supply data. An AI module will then parse this data to identify patterns (e.g., "Store A always runs out of lemons on Tuesdays").
* **Automated Scheduling (M):** Based on the patterns identified by the AI, the logistics manager can create or update recurring supply delivery schedules to preemptively solve stock shortages.

#### New Role: super_admin (M)
The `super_admin` is the highest tier of access, providing a bird's-eye view of the entire operation.
* **Universal Data Access (M):** The super_admin can access data for any store location across the entire network, bypassing regional restrictions.
* **System-Wide Configuration (C):** They have the authority to create new roles, adjust global AI parameters, and override system settings in case of emergencies or hardware failures.

### 2.3 Extended Logistics and AI Integration (S)
Building upon the inventory tracking from Part 1, the new requirements demand a deeper integration between data and action to work effectively together.

* **CSV Data Ingestion (M):** The system must provide a robust interface for logistics managers to upload raw data files. The system must validate these files for correct formatting before processing.
* **Predictive Supply Updates (C):** Once the AI identifies a pattern from the CSV data, it should suggest specific schedule modifications to the logistics manager. Ideally, the manager should be able to approve these suggestions with a single click.

---



