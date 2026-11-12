-- ==============================================================================
-- NATIONAL DISASTER RELIEF & RESOURCE MANAGEMENT SYSTEM (DRRMS)
-- LOCALIZED JURISDICTION: CITY OF BATAC, ILOCOS NORTE (CDRRMO SETTING)
-- PostgreSQL Schema for Supabase - FULL 3NF V3 (All 43 Barangays of Batac City)
-- ==============================================================================

-- Drop existing tables in reverse dependency order to allow clean re-execution
DROP TABLE IF EXISTS PendingVerification CASCADE;
DROP TABLE IF EXISTS Notification CASCADE;
DROP TABLE IF EXISTS Delivery CASCADE;
DROP TABLE IF EXISTS RequestItem CASCADE;
DROP TABLE IF EXISTS ReliefRequest CASCADE;
DROP TABLE IF EXISTS DonationItem CASCADE;
DROP TABLE IF EXISTS Donation CASCADE;
DROP TABLE IF EXISTS Inventory CASCADE;
DROP TABLE IF EXISTS ReliefGood CASCADE;
DROP TABLE IF EXISTS DisasterEvent CASCADE;
DROP TABLE IF EXISTS Volunteer CASCADE;
DROP TABLE IF EXISTS Organization CASCADE;
DROP TABLE IF EXISTS Donor CASCADE;
DROP TABLE IF EXISTS UserAccount CASCADE;

-- ==============================================================================
-- 1. AUTHENTICATION & ACCESS CONTROL (UserAccount)
-- ==============================================================================
CREATE TABLE UserAccount (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Donor', 'Organization', 'Volunteer', 'Manager')),
    full_name VARCHAR(100) NOT NULL,
    contact_info VARCHAR(100),
    email VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_useraccount_email_unique
    ON UserAccount (LOWER(email))
    WHERE email IS NOT NULL;

-- ==============================================================================
-- 2. STAKEHOLDER PROFILE SUBTYPES (1:1 with UserAccount)
-- ==============================================================================
CREATE TABLE Donor (
    donor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES UserAccount(user_id) ON DELETE CASCADE,
    donor_type VARCHAR(20) NOT NULL DEFAULT 'Individual' CHECK (donor_type IN ('Individual', 'Corporate', 'NGO', 'Government'))
);

CREATE TABLE Organization (
    org_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES UserAccount(user_id) ON DELETE CASCADE,
    org_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL
);

CREATE TABLE Volunteer (
    volunteer_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES UserAccount(user_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50),
    is_available BOOLEAN DEFAULT true
);

-- ==============================================================================
-- 3. MASTER CATALOGS (DisasterEvent, ReliefGood, Inventory)
-- ==============================================================================
CREATE TABLE DisasterEvent (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Monitoring')),
    start_date DATE NOT NULL,
    end_date DATE
);

CREATE TABLE ReliefGood (
    good_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Food', 'Water', 'Medicine', 'Non-Food', 'Hygiene', 'Care', 'Shelter', 'Other')),
    unit_of_measure VARCHAR(30) NOT NULL
);

CREATE TABLE Inventory (
    inventory_id SERIAL PRIMARY KEY,
    good_id INT NOT NULL UNIQUE REFERENCES ReliefGood(good_id) ON DELETE CASCADE,
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. SPLIT TRANSACTION: DONATIONS (Donation & DonationItem)
-- ==============================================================================
CREATE TABLE Donation (
    donation_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES Donor(donor_id) ON DELETE CASCADE,
    event_id INT REFERENCES DisasterEvent(event_id) ON DELETE SET NULL,
    donation_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Distributed', 'Cancelled'))
);

CREATE TABLE DonationItem (
    item_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL REFERENCES Donation(donation_id) ON DELETE CASCADE,
    good_id INT NOT NULL REFERENCES ReliefGood(good_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- ==============================================================================
-- 5. SPLIT TRANSACTION: RELIEF REQUESTS (ReliefRequest & RequestItem)
-- ==============================================================================
CREATE TABLE ReliefRequest (
    request_id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES Organization(org_id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES DisasterEvent(event_id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Fulfilled', 'Rejected'))
);

CREATE TABLE RequestItem (
    request_item_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES ReliefRequest(request_id) ON DELETE CASCADE,
    good_id INT NOT NULL REFERENCES ReliefGood(good_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- ==============================================================================
-- 6. LOGISTICS DISPATCH & NOTIFICATIONS (Delivery & Notification)
-- ==============================================================================
CREATE TABLE Delivery (
    delivery_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES ReliefRequest(request_id) ON DELETE CASCADE,
    volunteer_id INT REFERENCES Volunteer(volunteer_id) ON DELETE SET NULL,
    dispatch_date DATE DEFAULT CURRENT_DATE,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Scheduled', 'In Transit', 'Delivered', 'Cancelled'))
);

CREATE TABLE Notification (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES UserAccount(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. EMAIL REGISTRATION VERIFICATION (Next.js Web Portal OTP)
-- ==============================================================================
CREATE TABLE PendingVerification (
    verification_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    payload_json TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SAMPLE SEED DATA - LOCALIZED TO CITY OF BATAC, ILOCOS NORTE
-- Passwords:
-- 'admin' -> 'admin123' (Hash: JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=)
-- All others -> 'pass123' (Hash: m4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=)
-- ==============================================================================

-- 1. System Administrator (user_id 1)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES
('admin', 'JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=', 'Admin', 'Batac City CDRRMO Administrator', '0917-000-0001');

-- 2. Donors (user_id 2 to 11)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES
('donor1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Robert Tan', '0917-111-2222'),
('donor2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'MMSU Alumni Association Batac', '0917-222-3333'),
('donor3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Maria Santos (Quiling Sur)', '0918-333-4444'),
('donor4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac City Chamber of Commerce', '0919-444-5555'),
('donor5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Juan Dela Cruz (Poblacion)', '0920-555-6666'),
('donor6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'INEC Cares - Batac Substation', '0921-666-7777'),
('donor7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac Civic & Rotary Club', '0922-777-8888'),
('donor8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'San Miguel Logistics Ilocos', '0923-888-9999'),
('donor9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Carlos Mendoza', '0924-999-0000'),
('donor10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac Agricultural Multipurpose Coop', '0925-101-1122');

-- 3. Organizations: ALL 43 BARANGAYS OF BATAC CITY (user_id 12 to 54)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES
('org1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 1-N Ricarte (Nalasin) Council', '0918-100-0001'),
('org2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 1-S Valdez (Caoayan) Relief Desk', '0918-100-0002'),
('org3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 2 Ablan (Labucao) Council', '0918-100-0003'),
('org4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 3 Cangrunaan Council', '0918-100-0004'),
('org5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 4 Nalupta (Suabit) Emergency Team', '0918-100-0005'),
('org6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 5 Callaguip Relief Ops', '0918-100-0006'),
('org7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 6 San Julian Council', '0918-100-0007'),
('org8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 7 Caunayan Disaster Committee', '0918-100-0008'),
('org9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 8 Acosta (Iloilo) Council', '0918-100-0009'),
('org10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 9 Aglipay Relief Operations', '0918-100-0010'),
('org11', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 10-S Barani Council', '0918-100-0011'),
('org12', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 10-N Lacub Relief Desk', '0918-100-0012'),
('org13', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 11 Ben-Agan Council', '0918-100-0013'),
('org14', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 12 Palpalicong Council', '0918-100-0014'),
('org15', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 13 Baay Disaster Committee', '0918-100-0015'),
('org16', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 14 Bungon Relief Desk', '0918-100-0016'),
('org17', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 15 Baligat Council', '0918-100-0017'),
('org18', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 16-N Quiling Norte Council', '0918-100-0018'),
('org19', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 16-S Quiling Sur Council (MMSU)', '0918-100-0019'),
('org20', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 17 Tabug Council', '0918-100-0020'),
('org21', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 18 Magnuang Emergency Ops', '0918-100-0021'),
('org22', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 19 Pimentel (Cubol) Council', '0918-100-0022'),
('org23', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 20-N Colo Disaster Unit', '0918-100-0023'),
('org24', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 20-S Mabaleng Council', '0918-100-0024'),
('org25', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 21 Quiom Relief Desk', '0918-100-0025'),
('org26', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 22 Maipalig Council', '0918-100-0026'),
('org27', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 23 Biningan Disaster Committee', '0918-100-0027'),
('org28', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 24 Sumader Council', '0918-100-0028'),
('org29', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 25-N Camguidan Relief Desk', '0918-100-0029'),
('org30', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 25-S Payao Council', '0918-100-0030'),
('org31', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 26 Parangopong Council', '0918-100-0031'),
('org32', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 27-E Capacuan Emergency Unit', '0918-100-0032'),
('org33', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 27-W Naguirangan Council', '0918-100-0033'),
('org34', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 28 San Mateo Council', '0918-100-0034'),
('org35', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 29 San Pedro Disaster Committee', '0918-100-0035'),
('org36', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 30-E Baoa East Council', '0918-100-0036'),
('org37', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 30-W Baoa West Council', '0918-100-0037'),
('org38', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 31 Camandingan Council', '0918-100-0038'),
('org39', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 32 Palongpong Emergency Desk', '0918-100-0039'),
('org40', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 33-N Nagbacalan Council', '0918-100-0040'),
('org41', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 33-S Rayuray Council', '0918-100-0041'),
('org42', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 34 Dariwdiw Disaster Team', '0918-100-0042'),
('org43', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 35 Bil-loca Council', '0918-100-0043');

-- 4. Volunteers: Local Batac Responders (user_id 55 to 64)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES
('vol1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Charlie Driver (Batac Unit)', '0919-200-0001'),
('vol2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Dave Logistics (Central Depot)', '0919-200-0002'),
('vol3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Grace Ramos (Poblacion Team)', '0919-200-0003'),
('vol4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Fernando Poe Jr (Rapid Assessment)', '0919-200-0004'),
('vol5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Hannah Lim (MMSU Volunteer Corps)', '0919-200-0005'),
('vol6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Ian Bautista (Riverside Responder)', '0919-200-0006'),
('vol7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Karen Joy Cortez (Batac Youth Desk)', '0919-200-0007'),
('vol8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Leo Gonzales (Quiling Sur Unit)', '0919-200-0008'),
('vol9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Mia Villanueva (City Health Aux)', '0919-200-0009'),
('vol10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Noel Alcantara (Batac CDRRMO Logistics)', '0919-200-0010');

-- 2. Donors (10 Records, user_id 2 to 11 -> donor_id 1 to 10)
INSERT INTO Donor (user_id, donor_type) VALUES
(2, 'Individual'),
(3, 'Corporate'),
(4, 'Individual'),
(5, 'Corporate'),
(6, 'Individual'),
(7, 'Corporate'),
(8, 'Individual'),
(9, 'Corporate'),
(10, 'Individual'),
(11, 'Corporate');

-- 3. Organizations: ALL 43 BARANGAYS (user_id 12 to 54 -> org_id 1 to 43)
INSERT INTO Organization (user_id, org_name, location) VALUES
(12, 'Brgy. 1-N Ricarte (Nalasin) Council', 'City of Batac, Ilocos Norte'),
(13, 'Brgy. 1-S Valdez (Caoayan) Relief Desk', 'City of Batac, Ilocos Norte'),
(14, 'Brgy. 2 Ablan (Labucao) Council', 'City of Batac, Ilocos Norte'),
(15, 'Brgy. 3 Cangrunaan Council', 'City of Batac, Ilocos Norte'),
(16, 'Brgy. 4 Nalupta (Suabit) Emergency Team', 'City of Batac, Ilocos Norte'),
(17, 'Brgy. 5 Callaguip Relief Ops', 'City of Batac, Ilocos Norte'),
(18, 'Brgy. 6 San Julian Council', 'City of Batac, Ilocos Norte'),
(19, 'Brgy. 7 Caunayan Disaster Committee', 'City of Batac, Ilocos Norte'),
(20, 'Brgy. 8 Acosta (Iloilo) Council', 'City of Batac, Ilocos Norte'),
(21, 'Brgy. 9 Aglipay Relief Operations', 'City of Batac, Ilocos Norte'),
(22, 'Brgy. 10-S Barani Council', 'City of Batac, Ilocos Norte'),
(23, 'Brgy. 10-N Lacub Relief Desk', 'City of Batac, Ilocos Norte'),
(24, 'Brgy. 11 Ben-Agan Council', 'City of Batac, Ilocos Norte'),
(25, 'Brgy. 12 Palpalicong Council', 'City of Batac, Ilocos Norte'),
(26, 'Brgy. 13 Baay Disaster Committee', 'City of Batac, Ilocos Norte'),
(27, 'Brgy. 14 Bungon Relief Desk', 'City of Batac, Ilocos Norte'),
(28, 'Brgy. 15 Baligat Council', 'City of Batac, Ilocos Norte'),
(29, 'Brgy. 16-N Quiling Norte Council', 'City of Batac, Ilocos Norte'),
(30, 'Brgy. 16-S Quiling Sur Council (MMSU)', 'City of Batac, Ilocos Norte'),
(31, 'Brgy. 17 Tabug Council', 'City of Batac, Ilocos Norte'),
(32, 'Brgy. 18 Magnuang Emergency Ops', 'City of Batac, Ilocos Norte'),
(33, 'Brgy. 19 Pimentel (Cubol) Council', 'City of Batac, Ilocos Norte'),
(34, 'Brgy. 20-N Colo Disaster Unit', 'City of Batac, Ilocos Norte'),
(35, 'Brgy. 20-S Mabaleng Council', 'City of Batac, Ilocos Norte'),
(36, 'Brgy. 21 Quiom Relief Desk', 'City of Batac, Ilocos Norte'),
(37, 'Brgy. 22 Maipalig Council', 'City of Batac, Ilocos Norte'),
(38, 'Brgy. 23 Biningan Disaster Committee', 'City of Batac, Ilocos Norte'),
(39, 'Brgy. 24 Sumader Council', 'City of Batac, Ilocos Norte'),
(40, 'Brgy. 25-N Camguidan Relief Desk', 'City of Batac, Ilocos Norte'),
(41, 'Brgy. 25-S Payao Council', 'City of Batac, Ilocos Norte'),
(42, 'Brgy. 26 Parangopong Council', 'City of Batac, Ilocos Norte'),
(43, 'Brgy. 27-E Capacuan Emergency Unit', 'City of Batac, Ilocos Norte'),
(44, 'Brgy. 27-W Naguirangan Council', 'City of Batac, Ilocos Norte'),
(45, 'Brgy. 28 San Mateo Council', 'City of Batac, Ilocos Norte'),
(46, 'Brgy. 29 San Pedro Disaster Committee', 'City of Batac, Ilocos Norte'),
(47, 'Brgy. 30-E Baoa East Council', 'City of Batac, Ilocos Norte'),
(48, 'Brgy. 30-W Baoa West Council', 'City of Batac, Ilocos Norte'),
(49, 'Brgy. 31 Camandingan Council', 'City of Batac, Ilocos Norte'),
(50, 'Brgy. 32 Palongpong Emergency Desk', 'City of Batac, Ilocos Norte'),
(51, 'Brgy. 33-N Nagbacalan Council', 'City of Batac, Ilocos Norte'),
(52, 'Brgy. 33-S Rayuray Council', 'City of Batac, Ilocos Norte'),
(53, 'Brgy. 34 Dariwdiw Disaster Team', 'City of Batac, Ilocos Norte'),
(54, 'Brgy. 35 Bil-loca Council', 'City of Batac, Ilocos Norte');

-- 4. Volunteers (10 Records, user_id 55 to 64 -> volunteer_id 1 to 10)
INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES
(55, 'Pickup Truck', true),
(56, 'Cargo Van', true),
(57, 'Multicab', true),
(58, 'Motorcycle', true),
(59, 'Light Truck', true),
(60, 'Van', true),
(61, 'Multicab', true),
(62, 'Pickup Truck', true),
(63, 'Van', true),
(64, 'Light Truck', true);

-- 5. Disaster Events (10 Calamity Incidents Localized to Batac City / Ilocos Norte)
INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES
('Typhoon Carina - Quiaoit River Flash Flood', 'Riverside Barangays, Batac City', 'Active', '2024-07-24'),
('Typhoon Egay - City-Wide Agricultural Recovery', 'City of Batac, Ilocos Norte', 'Resolved', '2023-07-26'),
('Typhoon Marce - Low-Lying Riverside Response', 'City of Batac, Ilocos Norte', 'Active', '2024-11-06'),
('Typhoon Julian - Northern Calamity Assistance', 'Batac City & Ilocos Norte', 'Resolved', '2024-09-30'),
('Localized Flash Flood Incident - Quiling & Bil-loca', 'Quiling & Bil-loca, Batac City', 'Resolved', '2024-08-15'),
('Severe Tropical Storm Kristine Preparedness', 'City of Batac, Ilocos Norte', 'Active', '2024-10-21'),
('Super Typhoon Pepito Pre-Emptive Operations', 'Batac City Evacuation Center', 'Active', '2024-11-10'),
('Monsoon Inundation - Riverside & Agricultural Sectors', 'City of Batac, Ilocos Norte', 'Resolved', '2023-08-10'),
('Typhoon Goring Flash Flood Assistance', 'Eastern Barangays, Batac City', 'Resolved', '2023-08-28'),
('Tropical Storm Enteng Drainage Inundation', 'Poblacion Barangays, Batac City', 'Resolved', '2024-09-02');

-- 6. Relief Goods (10 Standard Humanitarian Commodities)
INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES
('Bottled Drinking Water 1L', 'Water', 'Bottles'),
('Rice 25kg Sack', 'Food', 'Sacks'),
('Canned Sardines 155g', 'Food', 'Cans'),
('Thermal Blankets & Mats', 'Non-Food', 'Pieces'),
('Paracetamol 500mg (100s)', 'Medicine', 'Boxes'),
('Hygiene Kit (Soap/Toothbrush)', 'Hygiene', 'Kits'),
('Instant Noodles (Pack of 55)', 'Food', 'Boxes'),
('First Aid Trauma Kit', 'Medicine', 'Kits'),
('Heavy-Duty Family Tent', 'Shelter', 'Units'),
('Baby Formula & Diaper Pack', 'Care', 'Kits');

-- 7. Inventory (Stock Balances at Batac City Central Relief Depot)
INSERT INTO Inventory (good_id, current_stock) VALUES
(1, 12500),
(2, 850),
(3, 4200),
(4, 1500),
(5, 620),
(6, 2100),
(7, 3400),
(8, 480),
(9, 150),
(10, 310);

-- 8. Donations (12 Records from Local Donors)
INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES
(1, 1, '2024-07-25', 'Approved'),
(2, 1, '2024-07-26', 'Approved'),
(3, 2, '2023-07-27', 'Approved'),
(4, 1, '2024-07-28', 'Approved'),
(5, 5, '2024-08-16', 'Approved'),
(6, 1, '2024-07-29', 'Approved'),
(7, 6, '2024-10-22', 'Pending'),
(8, 3, '2024-11-07', 'Approved'),
(9, 2, '2023-07-28', 'Approved'),
(10, 6, '2024-10-23', 'Pending'),
(1, NULL, '2024-08-10', 'Approved'),
(2, 7, '2024-11-11', 'Approved');

-- 9. Donation Items (16 Split-Transaction Line Items)
INSERT INTO DonationItem (donation_id, good_id, quantity) VALUES
(1, 1, 500),
(1, 2, 50),
(2, 3, 1000),
(2, 6, 200),
(3, 4, 300),
(4, 1, 1000),
(4, 7, 200),
(5, 5, 100),
(6, 2, 100),
(7, 1, 800),
(8, 2, 75),
(8, 3, 500),
(9, 8, 50),
(10, 6, 300),
(11, 9, 20),
(12, 10, 50);

-- 10. Relief Requests (15 Sample Requests from Batac Barangays)
INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES
(1, 1, '2024-07-26', 'Approved'),   -- Brgy. 1-N Ricarte
(2, 1, '2024-07-27', 'Approved'),   -- Brgy. 1-S Valdez
(3, 1, '2024-07-28', 'Approved'),   -- Brgy. 2 Ablan
(4, 1, '2024-07-29', 'Approved'),   -- Brgy. 3 Cangrunaan
(5, 1, '2024-07-30', 'Pending'),    -- Brgy. 4 Nalupta
(6, 3, '2024-11-07', 'Approved'),   -- Brgy. 5 Callaguip
(19, 3, '2024-11-08', 'Approved'),  -- Brgy. 16-S Quiling Sur (MMSU)
(18, 3, '2024-11-08', 'Pending'),   -- Brgy. 16-N Quiling Norte
(36, 5, '2024-08-16', 'Approved'),  -- Brgy. 30-E Baoa East
(37, 5, '2024-08-16', 'Approved'),  -- Brgy. 30-W Baoa West
(43, 5, '2024-08-17', 'Pending'),   -- Brgy. 35 Bil-loca
(11, 1, '2024-07-31', 'Approved'),  -- Brgy. 10-S Barani
(13, 1, '2024-08-01', 'Approved'),  -- Brgy. 11 Ben-Agan
(14, 7, '2024-11-11', 'Approved'),  -- Brgy. 12 Palpalicong
(15, 7, '2024-11-12', 'Pending');   -- Brgy. 13 Baay

-- 11. Request Items (19 Split-Transaction Line Items)
INSERT INTO RequestItem (request_id, good_id, quantity) VALUES
(1, 1, 400),
(1, 2, 30),
(2, 3, 600),
(2, 6, 150),
(3, 4, 200),
(4, 5, 50),
(5, 1, 500),
(6, 2, 40),
(7, 1, 300),
(7, 3, 250),
(8, 2, 20),
(9, 1, 450),
(10, 2, 35),
(11, 6, 100),
(12, 7, 120),
(13, 2, 50),
(13, 3, 400),
(14, 4, 100),
(15, 1, 250);

-- 12. Deliveries (10 Dispatch Records to Batac Barangays)
INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES
(1, 1, '2024-07-28', 'Delivered'),   -- To Brgy. 1-N Ricarte via Charlie Driver
(2, 2, '2024-07-29', 'Delivered'),   -- To Brgy. 1-S Valdez via Dave Logistics
(3, 3, '2024-07-30', 'Delivered'),   -- To Brgy. 2 Ablan via Grace Ramos
(4, 4, '2024-07-31', 'Delivered'),   -- To Brgy. 3 Cangrunaan via Fernando Poe Jr
(6, 5, '2024-11-08', 'In Transit'),  -- To Brgy. 5 Callaguip via Hannah Lim
(7, 8, '2024-11-09', 'Delivered'),   -- To Brgy. 16-S Quiling Sur via Leo Gonzales
(9, 6, '2024-08-18', 'Delivered'),   -- To Brgy. 30-E Baoa East via Ian Bautista
(10, 7, '2024-08-19', 'In Transit'), -- To Brgy. 30-W Baoa West via Karen Joy Cortez
(12, 9, '2024-08-02', 'Delivered'),  -- To Brgy. 10-S Barani via Mia Villanueva
(13, 10, '2024-08-03', 'Delivered'); -- To Brgy. 11 Ben-Agan via Noel Alcantara

-- 13. Notifications (15 Audit & Operational Alerts)
INSERT INTO Notification (user_id, message, is_read) VALUES
(12, 'Your relief request #1 for Brgy. 1-N Ricarte has been approved and dispatched from Central Depot.', true),
(13, 'Your relief request #2 for Brgy. 1-S Valdez is scheduled for fleet transit.', true),
(30, 'Emergency request #7 for Brgy. 16-S Quiling Sur has been delivered successfully.', true),
(55, 'Assigned to delivery route #1 for Brgy. Ricarte evacuation staging area.', true),
(56, 'Assigned to delivery route #2 for Brgy. Valdez relief station.', true),
(62, 'Assigned to delivery route #7 for Quiling Sur emergency response.', true),
(2, 'Thank you! Your donation #1 has been acknowledged and allocated to Quiaoit River flood relief.', true),
(3, 'Corporate relief aid from MMSU Alumni acknowledged by Batac CDRRMO logistics.', true),
(14, 'Emergency request #3 goods have arrived on site at Brgy. 2 Ablan.', false),
(47, 'Dispatch route #9 update: Baoa East road access verified cleared.', false),
(15, 'Urgent: Water purification kits allocation for Brgy. Cangrunaan pending review.', false),
(1, 'System Notice: Daily automated backup for Batac CDRRMO database complete.', false),
(48, 'Your relief request #10 for Brgy. Baoa West is now In Transit.', false),
(24, 'Your relief request #13 for Brgy. Ben-Agan has been fulfilled.', true),
(25, 'Pre-emptive evacuation supplies allocated for Brgy. Palpalicong.', false);
