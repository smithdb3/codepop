# Final Report



## **Sprint 1 Summary**

### How The Sprint Was Tackled

We first discussed the format for the new HLD. We decided to divide it into 11 sections, similar to the previous exising HLD in the codebase made by the previous team. After breifly going over the previous HLD in a meeting, the team leader made five different roles, one for each team member, each covering 2-3 sections of the HLD:

| Role | Name | Sections of HLD |
|------|------|-----------------|
| Database Lead          | Braden  | 3 (Architecture Design), 5 (Data Design)                   |
| Backend Lead           | Nathan  | 4 (Modules and Components), 9 (Security and Privacy)       |
| API Lead               | Jordan  | 2 (Overview), 6 (Integration Points), 8 (Input and Output) | 
| Frontend Lead          | Barret  | 1 (Introduction), 7 (UI Design)                            |
| Quality Assurance Lead | Brayden | 10 (Testing Strategy), 11 (Risks/Mitigations)              |

Each team member then reviewed the existing content in their assigned sections of the previous HLD. We then all came together and discussed content and features that we wanted to keep, change, or get rid of in each section. The drafting process then begun. Once we began putting the finishing touches on the HLD, we came together to plan our prototype presentation using Figma. The team lead then reviewed the final HLD and submitted it. 

### Tasks

The following tables list the tasks each team member accomplished individually (unless stated otherwise) throughout the sprint. There were no planned tasks that didn't get done because we only targeted the necessary challenges (getting each section of the HLD written out and planning our presentation). Any challenge tackled outside of that could be considered "extra work". The team accomplished everything we planned to do.


#### Barret's Accomplishments

| Task Description                                     | Completed By | Time Taken (mins) |
|------------------------------------------------------|--------------|-------------------|
| Study UI / prepare suggestions                       | Barrett      | 150               |
| Ask Claude how UI works                              | Barrett      | 120               |
| Draw out the UI                                      | Barrett      | 120               |
| Make suggestions to improve the UI                   | Barrett      | 30                |
| Type suggestions into HLD                            | Barrett      | 30                |
| Add MoSCoW analysis                                  | Barrett      | 30                |
| Summarize the old HLD                                | Barrett      | 30                |
| Include all new requirements in HLD                  | Barrett      | 120               |



#### Jordan's Accomplishments


| Task Description                                     | Completed By | Time Taken (mins) |
|------------------------------------------------------|--------------|-------------------|
| Researched best integration point/technology         | Jordan       | 180               |
| Worked on system overview                            | Jordan       | 60                |
| Worked on integration points                         | Jordan       | 60                |
| Worked on input/output                               | Jordan       | 30                |
| Brainstormed new app layout with team                | Jordan       | 30                |
| Worked on Figma prototype                            | Jordan       | 240               |



#### Nathan's Accomplishments

| Task Description                                     | Completed By | Time Taken (mins) |
|------------------------------------------------------|--------------|-------------------|
| Studied old HLD                                      | Nathan       | 60                |
| Researched internal interfaces                       | Nathan       | 90                |
| Updated internal interfaces                          | Nathan       | 90                |
| Researched security                                  | Nathan       | 90                |
| Updated security                                     | Nathan       | 60                |
| Worked on prototype                                  | Nathan       | 240               |



#### Braden's Accomplishments

| Task Description                                     | Completed By | Time Taken (mins) |
|------------------------------------------------------|--------------|-------------------|
| Researched decentralized server                      | Braden       | 240               |
| Worked with Claude on architecture section           | Braden       | 90                |
| Researched database structure                        | Braden       | 60                |
| Worked with Claude on database sections              | Braden       | 90                |
| Worked on Figma design                               | Braden       | 120               |



#### Brayden's Accomplishments

| Task Description                                             | Completed By | Time Taken (mins) |
|--------------------------------------------------------------|--------------|-------------------|
| Summarized requirements / decided on formatting for new HLD  | Brayden      | 60                |
| Made five roles that covered HLD sections                    | Brayden      | 60                |
| Researched extent of CodePop's testing strategy              | Brayden      | 30                |
| Developed new testing stragegy that covers new features      | Brayden      | 30                |
| Drafted new testing strategy for HLD                         | Brayden      | 45                |
| Reviewed the Risks/Mitigations section of HLD                | Brayden      | 40                |
| Drafted new Risks/Mitigation section of HLD                  | Brayden      | 30                |
| Reviewed completed HLD and made edits where appropriate      | Brayden      | 120               |


## **Sprint 3 Summary**

#### Braden's Accomplishments (25 hours)
Braden spent the majority of this sprint setting up and implementing the distributed system. It was definitely some of the most technically intensive but also most rewarding. I spent many hours setting up GCP VMs and a CI/CD pipeline that automatically ran unit tests and deployed to these VMs. I built a first implementation of the distributed system, which I then scrapped, took what I had learned from that, and built a new, better system. Once that was all complete and working, I built an HTML demo showing off its functionality. 

| Task Description                                | Completed By | Time Taken (mins) |
|-------------------------------------------------|--------------|-------------------|
| Setting up GCP VMs                              | Braden       | 480               |
| First implementation of distributed system      | Braden       | 480               |
| Final implementation of distributed system      | Braden       | 480               |
| Creating demo for distributed system            | Braden       | 60                |

#### Barrett's Accomplishments (10.75 hours)

Barrett took on the brunt of the UI design. He started by just doing some research on best UI design and working with Claude to design some guidelines for our app to follow. After having those guidelines, he designed the main homepage. He went through the rest of the app and made an abundant amount of UI changes to make it fit the style we were going for. 

| Task Description                                | Completed By | Time Taken (mins) |
|-------------------------------------------------|--------------|-------------------|
| Make UI docs/research                           | Barrett      | 120               |
| Make UI homepage                                | Barrett      | 195               |
| All other UI changes                            | Barrett      | 330               |

#### Brayden's Accomplishments (3 hours)

Brayden worked on the database side of things for this sprint. He researched some of the existing models in the database and edited them to make the database more in line for what we were designing for the app. He also created some test data that we will use in the future. 

| Task Description                                | Completed By | Time Taken (mins) |
|-------------------------------------------------|--------------|-------------------|
| Research existing CodePop backend database models | Brayden    | 60                |
| Edit existing models                            | Brayden      | 60                |
| Create test data propagation                    | Brayden      | 60                |

#### Jordan's Accomplishments (11.5 hours)

Jordan spent much of the sprint just trying to get the app runnable on his device. It was just roadblock after roadblock for him. However, he took on the implementation of Stripe and begun figuring that entire system out. He also worked on the customer service chatbot but did not finish that. 

| Task Description                                | Completed By | Time Taken (mins) |
|-------------------------------------------------|--------------|-------------------|
| Begun implementation for Stripe API             | Jordan       | 180               |
| Worked on customer service AI                   | Jordan       | 180               |
| Worked on getting the app runnable on his device | Jordan      | 330               |

#### Nathan's Accomplishments (8 hours)
    
Nathan focused heavily on the backend for this sprint, with his main priority being the schedule upload for the repair staff. In doing this, he adjusted some of the basic configurations of the backend. He moved on to other areas of the backend before completely finishing the CSV upload functionality. Communication was limited with Nathan this sprint and difficult to contact at times. 

| Task Description                                | Completed By | Time Taken (mins) |
|-------------------------------------------------|--------------|-------------------|
| Project configurations                          | Nathan       | 120               |
| Work on schedule upload                         | Nathan       | 180               |
| Work on backend                                 | Nathan       | 180               |


## **CodePop Sprint 4 Summary & Meeting Minutes**

**Sprint Dates:** March 25 – April 3
---

### **Part 4.1: Meeting Minutes**

* **March 25**  
  * **Attendees:** Barrett Smith, Braden Peterson, Nathan Haight  
  * **Topics Covered:** Stripe integration, Google Maps implementation, and Dashboard UI planning.  
* **March 27**  
  * **Attendees:** Barrett Smith, Braden Peterson, Nathan Haight, Brayden Brimhall  
  * **Topics Covered:** Dashboard logic and UI refinement, Stripe, and Google Maps progress.  
* **March 30**  
  * **Attendees:** Barrett Smith, Braden Peterson, Nathan Haight, Brayden Brimhall  
  * **Topics Covered:** User post-checkout flow, continued work on Dashboard logic/UI, Stripe, and Google Maps.  
* **April 1**  
  * **Attendees:** Barrett Smith, Braden Peterson, Nathan Haight, Brayden Brimhall  
  * **Topics Covered:** Drink naming conventions, active debugging sessions, and test data propagation.  
* **April 3**  
  * **Attendees:** Barrett Smith, Braden Peterson, Nathan Haight  
  * **Topics Covered:** App and dashboard presentation strategy, bug tracking, Dashboard UI, seasonal offerings, and recurring orders.

---

### **Part 4.2: Sprint Worklog & Contributions**

**Barrett Smith (Total: 9 hrs)**

* Stripe Integration (2 hrs) – **Completed**  
* Admin/Super Admin User Management (1 hr) – **Completed**  
* Seasonal Drinks Logic (1 hr) – **Completed**  
* Recurring Orders (1.5 hrs) – **Completed**  
* Order Convenience Features (1 hr) – **Completed**  
* Drink Feedback UI (1.5 hrs) – **Completed**  
* Minor App Improvements (1 hr) – **Completed**  
* Drink Naming Conventions (1 hr) – **Completed**

**Braden Peterson (Total: 10.5 hrs)**

* Integrated Drink Suggestion AI (2 hrs) – **Completed**  
* Integrated Chatbot with AI (1 hr) – **Completed**  
* Created Saved Drinks Functionality (3 hrs) – **Completed**  
* Fixed Token Exchange between VMs (1 hr) – **Completed**  
* Adjusted User Post-Checkout Flow (2 hrs) – **Completed**  
* Improved UI Between Tabs (1.5 hrs) – **Completed**

**Nathan Haight (Total: 9.5 hrs)**

* Creating Endpoints (1.5 hrs) – **Completed**  
* Project Setup & Debugging (2 hrs) – **Completed**  
* Scheduling Frontend (2.5 hrs) – **Completed**  
* Scheduling Backend (2 hrs) – **Completed**  
* Frontend API Setup (1.5 hrs) – **Completed**

**Brayden Brimhall (Total: 7.5 hrs)**

* Test Data Propagation & Debugging (1.5 hrs) – **Completed**  
* Chatbot AI Dependency Experimentation (1.5 hrs) – **Completed**  
* Repair Staff Dashboard Models (1 hr) – **Completed**  
* Connecting Repair Staff to Backend (1.5 hrs) – **Completed**  
* Addressing Merge Conflicts (2 hrs) – **Completed**

**Jordan (Total: 8 hrs)**

* Stripe Integration (2 hrs) – **Completed**  
* Google Maps Integration (2 hrs) – **Completed**  
* Manager Dashboard (2 hrs) – **Completed**  
* Logistics Dashboard (1 hr) – **Completed**  
* Android App Bug Fixing (1 hr) – **Not Completed** *(Pushed to next sprint)*

---

### **Part 4.3: Sprint Retrospective**

**Setbacks & Blockers**

* **Cross-Platform Discrepancies:** The most significant setback involved the Google Maps integration. While functional on iOS, geo locaton issues persisted on the Android build.  
* **Payment Gateway Issues:** Stripe integration encountered unexpected bugs on iOS. While the team successfully resolved this, the debugging process consumed a substantial amount of development time.

**Tasks Pushed to Next Sprint**

* **Android Google Maps Integration:** Pushed back due to time constraints.  
* **Process Improvement Note:** The primary root cause for running out of time was delaying our testing phase until the end of the sprint. Moving forward, the team will implement continuous "test-as-we-go" practices to catch cross-platform bugs earlier in the pipeline.

---
