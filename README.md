# Disaster Relief & Resource Management System (DRRMS) — City of Batac

> **IT 161 – Information Management: Class Project 1**  
> Operational Information System & Institutional Information Management Framework for the **City Disaster Risk Reduction and Management Office (CDRRMO) of the City of Batac, Ilocos Norte**  
> Built with Next.js TypeScript, Java JDBC REST API & Desktop Client, and Supabase Cloud PostgreSQL 15 (3NF)

---

## 📌 Project Overview
The **Disaster Relief & Resource Management System (DRRMS)** is a localized humanitarian relief coordination platform designed for the **City of Batac, Ilocos Norte**. It enables CDRRMO emergency administrators, citizen donors, the **43 official Barangays of Batac**, and field logistics volunteers to register localized disaster events (such as Quiaoit River flash floods), submit multi-item relief requisitions, manage central warehouse inventory at the Batac City Evacuation & Logistics Center, track fleet deliveries, and generate operational decision reports.

Behind both the **Next.js TypeScript web portal (`web/`)** and the **Java Swing desktop client (`disasterrelief.gui`)** is a normalized **Third Normal Form (3NF) PostgreSQL 15 database** hosted on **Supabase**, powered by a **Java JDBC HTTP REST API (`disasterrelief.api.ApiServer`)**.

---

## 🛠️ Full-Stack Architecture
* **Frontend (Vercel):** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS (`web/`)
* **Backend API (Render / Docker):** Java 17+ built-in `com.sun.net.httpserver.HttpServer` (`disasterrelief.api.ApiServer`, Port `8080`) using PostgreSQL JDBC (`lib/postgresql-42.7.3.jar`)
* **Database (Supabase):** PostgreSQL 15 Pooler (Port `6543`)
* **Resilient Proxy Fallback:** `web/app/api/proxy/[...path]/route.ts` forwards requests to `JAVA_API_URL` and automatically falls back to direct PostgreSQL (`pg`) execution if the Render Java container is cold-starting.
* **Desktop Client (Optional):** Java Swing GUI (`disasterrelief.gui.main.Main`)

---

## 🚀 Key Features
* **Role-Based Portals (`/admin`, `/donor`, `/organization`, `/volunteer`):**
  * **Admin Operations Console:** Disaster registry CRUD, request approval with strict warehouse stock verification, donation verification & atomic stock credit, inventory audit adjustments, approved-request fleet dispatch, user directory, notifications, and 3 exportable/printable reports.
  * **Citizen & Donor Portal:** Multi-item donation builder, live warehouse stock visibility, donation history filtering, disaster list, and notifications.
  * **Organization & Partner Portal:** Community relief request builder with warehouse stock warnings, request tracking, incoming delivery status, and notifications.
  * **Field Volunteer Portal:** Assigned delivery status workflow (`Pending` -> `In Transit` -> `Delivered`, automatically marking linked requests `Fulfilled`), vehicle/availability profile editing, and notifications.
* **Database Normalization (3NF) & ACID Integrity:**
  * Split parent-child tables (`Donation` → `DonationItem`, `ReliefRequest` → `RequestItem`).
  * Transactional `FOR UPDATE` stock checks prevent negative warehouse inventory balances and non-Approved dispatches.
* **Security & Validation:**
  * SHA-256 Base64 password hashing and parameterized SQL (`PreparedStatement` / `$1..$n` bindings).
  * Self-registration (`POST /api/auth/register`) restricted to `Donor`, `Organization`, and `Volunteer` roles with password minimum length checks.

---

## 🗄️ Database Architecture (13 Normalized Tables)
1. `UserAccount`: Master user authentication and role mapping (`Admin`, `Donor`, `Organization`, `Volunteer`, `Manager`).
2. `Donor`: Donor profile entity (`Individual` / `Corporate`).
3. `Organization`: Humanitarian agencies, partner NGOs, and LGUs.
4. `Volunteer`: Field responders, vehicle types, and availability status.
5. `DisasterEvent`: Monitored disaster incidents (`Active` / `Resolved`).
6. `ReliefGood`: Master catalog of relief goods across categories.
7. `Inventory`: Central warehouse stock levels linked to `ReliefGood`.
8. `Donation`: Donation transaction header.
9. `DonationItem`: Line-items mapping goods and donated quantities.
10. `ReliefRequest`: Community aid request header submitted by organizations.
11. `RequestItem`: Line-items for requested goods and quantities.
12. `Delivery`: Fleet dispatch linking volunteers to `Approved` relief requests.
13. `Notification`: Operational audit trail and user alert messages.

---

## 🔑 Login Credentials

Sample accounts in Supabase (also listed in [`credentials.txt`](credentials.txt)):

| Role | Username | Password | Portal |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | `/admin` |
| **Donor (Individual / Corporate)** | `donor1` to `donor10` | `pass123` | `/donor` |
| **Partner Organization / LGU** | `org1` to `org10` | `pass123` | `/organization` |
| **Field Volunteer** | `vol1` to `vol10` | `pass123` | `/volunteer` |

---

## 🏃 Running the Application Locally

### Option 1: Full-Stack Web App + Java JDBC Server (Windows)
1. Double-click **`start-all.bat`** (or run `run-api.bat` and `run-web.bat` in separate terminals).
   * Java JDBC REST API launches on `http://localhost:8080`
   * Next.js TypeScript portal launches on `http://localhost:3000` (runs `npm install` automatically if needed)
   * Both `run-api.bat` and `run.bat` auto-detect JDK on `PATH` or Eclipse Embedded JDK / Adoptium installations.
2. Open **`http://localhost:3000`** in your browser.

### Option 2: Java Swing Desktop Client
* Double-click **`run.bat`** (or in Eclipse IDE, right-click `disasterrelief.gui.main.Main` → **Run As → Java Application**).

---

## ☁️ Cloud Deployment Overview
* **Java API (Render):** Deploy the root repository using [`Dockerfile`](Dockerfile) and [`render.yaml`](render.yaml) on port `8080`.
* **Web Frontend (Vercel):** Set the Root Directory to `web`, framework Next.js, and configure environment variables from [`web/.env.example`](web/.env.example):
  * `JAVA_API_URL` (your Render URL, e.g. `https://drrms-java-jdbc-api.onrender.com`)
  * `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (Supabase Pooler connection)
  * `SMTP_HOST` (`smtp.gmail.com`), `SMTP_PORT` (`465`), `SMTP_USER` (your Gmail address), `SMTP_PASS` (Google 16-character App Password for 6-digit email OTP verification)

---

## 📄 Reference Files
* [`IT161_Phase1_Project_Documentation_and_Defense_Guide.pdf`](IT161_Phase1_Project_Documentation_and_Defense_Guide.pdf)
* [`credentials.txt`](credentials.txt)
* [`src/main/resources/database/disaster_relief_schema_postgres.sql`](src/main/resources/database/disaster_relief_schema_postgres.sql)
* [`src/main/resources/database/migration_email_verification.sql`](src/main/resources/database/migration_email_verification.sql)
