# National Disaster Relief & Resource Distribution Management System (NDRDMS)

> **IT 161 – Information Management: Class Project 1 (Phase I)**  
> Operational Information System Development with PostgreSQL & JDBC

---

## 📌 Project Overview
The **National Disaster Relief & Resource Distribution Management System (NDRDMS)** is a comprehensive Java-based database application designed to support end-to-end humanitarian disaster coordination. It allows emergency response agencies, donors, local government units (LGUs), and field volunteers to manage disaster events, facilitate split-transaction donations, track community aid requests, and oversee logistics fleet dispatches.

Behind the system is a fully normalized **Third Normal Form (3NF) relational database** hosted on **Supabase Cloud PostgreSQL**, interfaced natively using **Java Database Connectivity (JDBC)**.

---

## 🚀 Key Features

* **Role-Based Portals:**
  * **Command Center / Admin Operations Portal:** Full system CRUD, real-time analytics dashboard, user account management, disaster zone monitoring, and operational reporting.
  * **Citizen & Donor Portal:** Public transparency feed, multi-item donation builder, personal historical contribution tracking.
  * **Organization & Partner Portal:** Community relief request submission, item request management, historical tracking.
  * **Field Volunteer Portal:** Dispatch assignment tracking, availability status toggle, vehicle selection, emergency contact management.
* **Database Normalization (3NF):**
  * Solves multi-valued dependencies via split parent-child transaction tables (`Donation` $\rightarrow$ `DonationItem`, `ReliefRequest` $\rightarrow$ `RequestItem`).
* **Complete CRUD Operations:**
  * Real SQL `INSERT`, `SELECT`, `UPDATE`, and `DELETE` with cascade referential integrity across all major entities.
* **Three (3) Meaningful Operational Reports:**
  * **Disaster Relief Operational Summary:** Multi-table `JOIN` aggregating active and resolved disaster incidents with live donation, request, and delivery counts.
  * **Warehouse Inventory & Replenishment Alert:** Tracks stock levels against donations/requests with automated threshold health alerts (`CRITICAL ALERT`, `LOW STOCK`, `SUFFICIENT`).
  * **Donor Contribution & Impact Audit Ledger:** Audits individual and corporate donors, total contributions, events supported, and donated volume.
* **Security & Input Validation:**
  * SHA-256 Base64 password hashing.
  * Parameterized `PreparedStatement`s across all DAOs to prevent SQL injection.
  * Rigorous format validation for contact numbers, quantities, and required fields.

---

## 🛠️ Technology Stack
* **Language & Runtime:** Java (JDK 23 / 24)
* **IDE:** Eclipse IDE / VS Code / IntelliJ IDEA
* **Database Engine:** PostgreSQL 15 on Supabase Cloud
* **Connectivity:** PostgreSQL JDBC Driver (`postgresql-42.7.3.jar`)
* **Build System:** Apache Maven (`pom.xml`)
* **GUI Framework:** Java Swing (Modern Flat Web / SaaS Design System with Custom Components)

---

## 🗄️ Database Architecture (13 Normalized Tables)

1. `UserAccount`: Master user authentication and role mapping (SHA-256 password hash).
2. `Donor`: Donor profile entity (Individual / Corporate classification).
3. `Organization`: Humanitarian agencies, partner NGOs, and LGUs.
4. `Volunteer`: Field responders, transport modes, and availability states.
5. `DisasterEvent`: Monitored natural disaster incidents and response zones.
6. `ReliefGood`: Master catalog of relief goods across categories.
7. `Inventory`: Central warehouse stock tracking for relief items.
8. `Donation`: Donation event transaction header.
9. `DonationItem`: Transaction line-items mapping goods and quantities.
10. `ReliefRequest`: Aid request header submitted by organizations.
11. `RequestItem`: Transaction line-items for requested goods and quantities.
12. `Delivery`: Logistics fleet dispatch linking volunteers to approved requests.
13. `Notification`: Operational audit trail and alert notification messages.

---

## 🔑 Login Credentials

All sample accounts use the following credentials (also available in [`credentials.txt`](credentials.txt)):

| Role | Username | Password | Default Portal |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | Admin Operations Portal |
| **Donor (Individual / Corporate)** | `donor1` to `donor10` | `pass123` | Citizen & Donor Portal |
| **Field Volunteer** | `vol1` to `vol10` | `pass123` | Field Volunteer Portal |
| **Partner Organization / LGU** | `org1` to `org10` | `pass123` | Organization & Partner Portal |

---

## 🏃 Running the Application

### Option A: In Eclipse IDE
1. Open Eclipse IDE.
2. Select **File > Import... > Existing Projects into Workspace** (or **Existing Maven Projects**).
3. Browse and select the `DisasterReliefSystem` folder.
4. Right-click the project, select **Run As > Java Application**.
5. Choose `disasterrelief.gui.main.LoginFrame` as the main class.

### Option B: From Command Line / Terminal
```bash
# Compile with PostgreSQL JDBC driver
javac -cp "lib/postgresql-42.7.3.jar" -d bin src/main/java/disasterrelief/**/*.java

# Launch the Application
java -cp "bin;lib/postgresql-42.7.3.jar" disasterrelief.gui.main.LoginFrame
```

---

## 📄 Project Documentation & Defense Guide
* Full documentation and presentation defense walkthrough is available in:
  * [`IT161_Phase1_Project_Documentation_and_Defense_Guide.pdf`](IT161_Phase1_Project_Documentation_and_Defense_Guide.pdf)
  * [`credentials.txt`](credentials.txt)
  * [`src/main/resources/database/disaster_relief_schema_postgres.sql`](src/main/resources/database/disaster_relief_schema_postgres.sql)
