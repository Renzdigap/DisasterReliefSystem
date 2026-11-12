-- ==============================================================================
-- NATIONAL DISASTER RELIEF & RESOURCE MANAGEMENT SYSTEM (DRRMS)
-- LOCALIZED JURISDICTION: CITY OF BATAC, ILOCOS NORTE (CDRRMO SETTING)
-- PostgreSQL Schema for Supabase - FULL 3NF V4 (14 TABLES, 2024-2026 RECENT DATA)
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
-- SAMPLE SEED DATA - LOCALIZED TO CITY OF BATAC, ILOCOS NORTE (2024-2026 RECENT)
-- Passwords:
-- 'admin' -> 'admin123' (Hash: JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=)
-- All others -> 'pass123' (Hash: m4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=)
-- ==============================================================================

-- 1. System Administrator (user_id 1)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info, email, is_verified, created_at) VALUES
('admin', 'JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=', 'Admin', 'Batac City CDRRMO Administrator', '0917-000-0001', 'cdrrmo.batac@gmail.com', true, '2024-01-10 08:00:00');

-- 2. Donors (20 Records: user_id 2 to 21)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info, email, is_verified, created_at) VALUES
('donor1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Robert Tan', '0917-111-2222', 'robert.tan@gmail.com', true, '2024-02-15 09:30:00'),
('donor2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'MMSU Alumni Association Batac', '0917-222-3333', 'mmsu.alumni@mmsu.edu.ph', true, '2024-03-01 10:15:00'),
('donor3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Maria Santos (Quiling Sur)', '0918-333-4444', 'maria.santos@gmail.com', true, '2024-04-12 11:20:00'),
('donor4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac City Chamber of Commerce', '0919-444-5555', 'chamber.batac@gmail.com', true, '2024-05-20 14:00:00'),
('donor5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Juan Dela Cruz (Poblacion)', '0920-555-6666', 'juan.delacruz@gmail.com', true, '2024-06-18 16:45:00'),
('donor6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'INEC Cares - Batac Substation', '0921-666-7777', 'inec.batac@inec.org.ph', true, '2024-07-02 08:30:00'),
('donor7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac Civic & Rotary Club', '0922-777-8888', 'rotary.batac@gmail.com', true, '2024-07-15 13:10:00'),
('donor8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'San Miguel Logistics Ilocos', '0923-888-9999', 'smg.ilocos@smg.com.ph', true, '2024-08-01 09:00:00'),
('donor9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Carlos Mendoza', '0924-999-0000', 'carlos.mendoza@gmail.com', true, '2024-08-25 15:30:00'),
('donor10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac Agricultural Multipurpose Coop', '0925-101-1122', 'batac.agricoop@gmail.com', true, '2024-09-10 10:45:00'),
('donor11', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Engr. Arnel P. Agcaoili (Batac Builders)', '0926-212-3344', 'arnel.builders@gmail.com', true, '2025-01-18 11:00:00'),
('donor12', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Ilocos Norte Overseas Workers Association', '0927-323-4455', 'in.ofw.assoc@gmail.com', true, '2025-03-22 14:15:00'),
('donor13', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Dr. Vanessa Corpuz (Batac Medical Clinic)', '0928-434-5566', 'vanessa.corpuz.md@gmail.com', true, '2025-05-14 09:30:00'),
('donor14', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Robinsons Place Ilocos Community Outreach', '0929-545-6677', 'robinsons.cares.ilocos@robinsons.com.ph', true, '2025-07-09 16:00:00'),
('donor15', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Atty. Ferdinand Valdez', '0930-656-7788', 'atty.valdez@gmail.com', true, '2025-09-04 10:20:00'),
('donor16', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Batac United Farmers Federation', '0931-767-8899', 'buff.batac@gmail.com', true, '2025-11-12 13:40:00'),
('donor17', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Puregold Batac Hypermarket Cares', '0932-878-9900', 'puregold.batac@puregold.com.ph', true, '2026-02-20 09:15:00'),
('donor18', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Teresa G. Ramos (California Ilocano Clan)', '0933-989-0011', 'tramos.clan@gmail.com', true, '2026-04-18 11:30:00'),
('donor19', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Universal Leaf Philippines - Batac Depot', '0934-090-1122', 'ulp.batac@ulp.com', true, '2026-07-25 15:00:00'),
('donor20', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Provincial Government of Ilocos Norte (PDRRMO Grant)', '0935-101-2233', 'pdrrmo.ilocosnorte@gmail.com', true, '2026-09-10 08:45:00');

-- 3. Organizations: ALL 43 BARANGAYS + 4 ACCREDITED ENTITIES (47 Records: user_id 22 to 68)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info, email, is_verified, created_at) VALUES
('org1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 1-N Ricarte (Nalasin) Council', '0918-100-0001', 'brgy.ricarte@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 1-S Valdez (Caoayan) Relief Desk', '0918-100-0002', 'brgy.valdez@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 2 Ablan (Labucao) Council', '0918-100-0003', 'brgy.ablan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 3 Cangrunaan Council', '0918-100-0004', 'brgy.cangrunaan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 4 Nalupta (Suabit) Emergency Team', '0918-100-0005', 'brgy.nalupta@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 5 Callaguip Relief Ops', '0918-100-0006', 'brgy.callaguip@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 6 San Julian Council', '0918-100-0007', 'brgy.sanjulian@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 7 Caunayan Disaster Committee', '0918-100-0008', 'brgy.caunayan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 8 Acosta (Iloilo) Council', '0918-100-0009', 'brgy.acosta@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 9 Aglipay Relief Operations', '0918-100-0010', 'brgy.aglipay@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org11', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 10-S Barani Council', '0918-100-0011', 'brgy.barani@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org12', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 10-N Lacub Relief Desk', '0918-100-0012', 'brgy.lacub@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org13', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 11 Ben-Agan Council', '0918-100-0013', 'brgy.benagan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org14', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 12 Palpalicong Council', '0918-100-0014', 'brgy.palpalicong@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org15', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 13 Baay Disaster Committee', '0918-100-0015', 'brgy.baay@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org16', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 14 Bungon Relief Desk', '0918-100-0016', 'brgy.bungon@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org17', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 15 Baligat Council', '0918-100-0017', 'brgy.baligat@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org18', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 16-N Quiling Norte Council', '0918-100-0018', 'brgy.quilingnorte@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org19', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 16-S Quiling Sur Council (MMSU Campus)', '0918-100-0019', 'brgy.quilingsur@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org20', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 17 Tabug Council', '0918-100-0020', 'brgy.tabug@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org21', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 18 Magnuang Emergency Ops', '0918-100-0021', 'brgy.magnuang@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org22', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 19 Pimentel (Cubol) Council', '0918-100-0022', 'brgy.pimentel@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org23', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 20-N Colo Disaster Unit', '0918-100-0023', 'brgy.colo@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org24', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 20-S Mabaleng Council', '0918-100-0024', 'brgy.mabaleng@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org25', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 21 Quiom Relief Desk', '0918-100-0025', 'brgy.quiom@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org26', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 22 Maipalig Council', '0918-100-0026', 'brgy.maipalig@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org27', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 23 Biningan Disaster Committee', '0918-100-0027', 'brgy.biningan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org28', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 24 Sumader Council', '0918-100-0028', 'brgy.sumader@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org29', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 25-N Camguidan Relief Desk', '0918-100-0029', 'brgy.camguidan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org30', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 25-S Payao Council', '0918-100-0030', 'brgy.payao@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org31', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 26 Parangopong Council', '0918-100-0031', 'brgy.parangopong@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org32', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 27-E Capacuan Emergency Unit', '0918-100-0032', 'brgy.capacuan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org33', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 27-W Naguirangan Council', '0918-100-0033', 'brgy.naguirangan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org34', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 28 San Mateo Council', '0918-100-0034', 'brgy.sanmateo@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org35', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 29 San Pedro Disaster Committee', '0918-100-0035', 'brgy.sanpedro@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org36', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 30-E Baoa East Council', '0918-100-0036', 'brgy.baoaeast@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org37', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 30-W Baoa West Council', '0918-100-0037', 'brgy.baoawest@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org38', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 31 Camandingan Council', '0918-100-0038', 'brgy.camandingan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org39', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 32 Palongpong Emergency Desk', '0918-100-0039', 'brgy.palongpong@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org40', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 33-N Nagbacalan Council', '0918-100-0040', 'brgy.nagbacalan@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org41', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 33-S Rayuray Council', '0918-100-0041', 'brgy.rayuray@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org42', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 34 Dariwdiw Disaster Team', '0918-100-0042', 'brgy.dariwdiw@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org43', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Brgy. 35 Bil-loca Council', '0918-100-0043', 'brgy.billoca@batac.gov.ph', true, '2024-01-15 08:00:00'),
('org44', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Philippine Red Cross - Batac City Chapter', '0918-100-0044', 'redcross.batac@redcross.org.ph', true, '2024-02-10 09:00:00'),
('org45', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'MMSU CCIS Emergency Tech & Relief Responders', '0918-100-0045', 'ccis.responders@mmsu.edu.ph', true, '2024-02-15 10:00:00'),
('org46', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Batac Volunteer Fire & Rescue Brigade', '0918-100-0046', 'bvfb.batac@gmail.com', true, '2024-03-01 11:00:00'),
('org47', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Batac Rural Health Auxiliary Volunteers', '0918-100-0047', 'healthaux.batac@gmail.com', true, '2024-03-15 13:00:00');

-- 4. Volunteers (20 Records: user_id 69 to 88)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info, email, is_verified, created_at) VALUES
('vol1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Charlie Driver (Batac Unit)', '0919-200-0001', 'charlie.driver@gmail.com', true, '2024-02-01 08:00:00'),
('vol2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Dave Logistics (Central Depot)', '0919-200-0002', 'dave.logistics@gmail.com', true, '2024-02-05 08:30:00'),
('vol3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Grace Ramos (Poblacion Team)', '0919-200-0003', 'grace.ramos@gmail.com', true, '2024-02-10 09:00:00'),
('vol4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Fernando Poe Jr (Rapid Assessment)', '0919-200-0004', 'fpj.rapid@gmail.com', true, '2024-02-15 09:30:00'),
('vol5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Hannah Lim (MMSU Volunteer Corps)', '0919-200-0005', 'hannah.lim@gmail.com', true, '2024-02-20 10:00:00'),
('vol6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Ian Bautista (Riverside Responder)', '0919-200-0006', 'ian.bautista@gmail.com', true, '2024-03-01 10:30:00'),
('vol7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Karen Joy Cortez (Batac Youth Desk)', '0919-200-0007', 'karen.cortez@gmail.com', true, '2024-03-10 11:00:00'),
('vol8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Leo Gonzales (Quiling Sur Unit)', '0919-200-0008', 'leo.gonzales@gmail.com', true, '2024-03-15 11:30:00'),
('vol9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Mia Villanueva (City Health Aux)', '0919-200-0009', 'mia.villanueva@gmail.com', true, '2024-03-20 13:00:00'),
('vol10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Noel Alcantara (CDRRMO Logistics)', '0919-200-0010', 'noel.alcantara@gmail.com', true, '2024-04-01 13:30:00'),
('vol11', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Oliver Pascual (Eastern Sector 4x4)', '0919-200-0011', 'oliver.pascual@gmail.com', true, '2025-01-15 08:30:00'),
('vol12', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Patricia De Guzman (MMSU Student Council)', '0919-200-0012', 'patricia.dg@gmail.com', true, '2025-02-10 09:00:00'),
('vol13', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Quirino Tamayo (Baoa-Biningan Transit)', '0919-200-0013', 'quirino.tamayo@gmail.com', true, '2025-03-05 10:00:00'),
('vol14', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Rowena Agcaoili (First Aid Aux)', '0919-200-0014', 'rowena.agcaoili@gmail.com', true, '2025-04-12 11:00:00'),
('vol15', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Samuel Pimentel (Southern Dispatch)', '0919-200-0015', 'samuel.pimentel@gmail.com', true, '2025-06-01 13:30:00'),
('vol16', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Theresa Domingo (Evac Coordinator)', '0919-200-0016', 'theresa.domingo@gmail.com', true, '2026-01-20 08:00:00'),
('vol17', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Ulysses Castro (Motorized Courier)', '0919-200-0017', 'ulysses.castro@gmail.com', true, '2026-03-10 09:30:00'),
('vol18', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Victor Almazan (Heavy Transport)', '0919-200-0018', 'victor.almazan@gmail.com', true, '2026-05-15 10:00:00'),
('vol19', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Wendy Siazon (Rapid Medicine Runner)', '0919-200-0019', 'wendy.siazon@gmail.com', true, '2026-07-01 11:30:00'),
('vol20', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Zaldy Manegdeg (Poblacion Quick Response)', '0919-200-0020', 'zaldy.manegdeg@gmail.com', true, '2026-08-10 14:00:00');

-- ==============================================================================
-- 2. STAKEHOLDER PROFILES INSERTION
-- ==============================================================================
-- 20 Donors (donor_id 1 to 20, user_id 2 to 21)
INSERT INTO Donor (user_id, donor_type) VALUES
(2, 'Individual'),
(3, 'Corporate'),
(4, 'Individual'),
(5, 'Corporate'),
(6, 'Individual'),
(7, 'Corporate'),
(8, 'Corporate'),
(9, 'Corporate'),
(10, 'Individual'),
(11, 'Corporate'),
(12, 'Individual'),
(13, 'NGO'),
(14, 'Individual'),
(15, 'Corporate'),
(16, 'Individual'),
(17, 'NGO'),
(18, 'Corporate'),
(19, 'Individual'),
(20, 'Corporate'),
(21, 'Government');

-- 47 Organizations (org_id 1 to 47, user_id 22 to 68)
INSERT INTO Organization (user_id, org_name, location) VALUES
(22, 'Brgy. 1-N Ricarte (Nalasin) Council', 'City of Batac, Ilocos Norte'),
(23, 'Brgy. 1-S Valdez (Caoayan) Relief Desk', 'City of Batac, Ilocos Norte'),
(24, 'Brgy. 2 Ablan (Labucao) Council', 'City of Batac, Ilocos Norte'),
(25, 'Brgy. 3 Cangrunaan Council', 'City of Batac, Ilocos Norte'),
(26, 'Brgy. 4 Nalupta (Suabit) Emergency Team', 'City of Batac, Ilocos Norte'),
(27, 'Brgy. 5 Callaguip Relief Ops', 'City of Batac, Ilocos Norte'),
(28, 'Brgy. 6 San Julian Council', 'City of Batac, Ilocos Norte'),
(29, 'Brgy. 7 Caunayan Disaster Committee', 'City of Batac, Ilocos Norte'),
(30, 'Brgy. 8 Acosta (Iloilo) Council', 'City of Batac, Ilocos Norte'),
(31, 'Brgy. 9 Aglipay Relief Operations', 'City of Batac, Ilocos Norte'),
(32, 'Brgy. 10-S Barani Council', 'City of Batac, Ilocos Norte'),
(33, 'Brgy. 10-N Lacub Relief Desk', 'City of Batac, Ilocos Norte'),
(34, 'Brgy. 11 Ben-Agan Council', 'City of Batac, Ilocos Norte'),
(35, 'Brgy. 12 Palpalicong Council', 'City of Batac, Ilocos Norte'),
(36, 'Brgy. 13 Baay Disaster Committee', 'City of Batac, Ilocos Norte'),
(37, 'Brgy. 14 Bungon Relief Desk', 'City of Batac, Ilocos Norte'),
(38, 'Brgy. 15 Baligat Council', 'City of Batac, Ilocos Norte'),
(39, 'Brgy. 16-N Quiling Norte Council', 'City of Batac, Ilocos Norte'),
(40, 'Brgy. 16-S Quiling Sur Council (MMSU Campus)', 'City of Batac, Ilocos Norte'),
(41, 'Brgy. 17 Tabug Council', 'City of Batac, Ilocos Norte'),
(42, 'Brgy. 18 Magnuang Emergency Ops', 'City of Batac, Ilocos Norte'),
(43, 'Brgy. 19 Pimentel (Cubol) Council', 'City of Batac, Ilocos Norte'),
(44, 'Brgy. 20-N Colo Disaster Unit', 'City of Batac, Ilocos Norte'),
(45, 'Brgy. 20-S Mabaleng Council', 'City of Batac, Ilocos Norte'),
(46, 'Brgy. 21 Quiom Relief Desk', 'City of Batac, Ilocos Norte'),
(47, 'Brgy. 22 Maipalig Council', 'City of Batac, Ilocos Norte'),
(48, 'Brgy. 23 Biningan Disaster Committee', 'City of Batac, Ilocos Norte'),
(49, 'Brgy. 24 Sumader Council', 'City of Batac, Ilocos Norte'),
(50, 'Brgy. 25-N Camguidan Relief Desk', 'City of Batac, Ilocos Norte'),
(51, 'Brgy. 25-S Payao Council', 'City of Batac, Ilocos Norte'),
(52, 'Brgy. 26 Parangopong Council', 'City of Batac, Ilocos Norte'),
(53, 'Brgy. 27-E Capacuan Emergency Unit', 'City of Batac, Ilocos Norte'),
(54, 'Brgy. 27-W Naguirangan Council', 'City of Batac, Ilocos Norte'),
(55, 'Brgy. 28 San Mateo Council', 'City of Batac, Ilocos Norte'),
(56, 'Brgy. 29 San Pedro Disaster Committee', 'City of Batac, Ilocos Norte'),
(57, 'Brgy. 30-E Baoa East Council', 'City of Batac, Ilocos Norte'),
(58, 'Brgy. 30-W Baoa West Council', 'City of Batac, Ilocos Norte'),
(59, 'Brgy. 31 Camandingan Council', 'City of Batac, Ilocos Norte'),
(60, 'Brgy. 32 Palongpong Emergency Desk', 'City of Batac, Ilocos Norte'),
(61, 'Brgy. 33-N Nagbacalan Council', 'City of Batac, Ilocos Norte'),
(62, 'Brgy. 33-S Rayuray Council', 'City of Batac, Ilocos Norte'),
(63, 'Brgy. 34 Dariwdiw Disaster Team', 'City of Batac, Ilocos Norte'),
(64, 'Brgy. 35 Bil-loca Council', 'City of Batac, Ilocos Norte'),
(65, 'Philippine Red Cross - Batac City Chapter', 'City of Batac, Ilocos Norte'),
(66, 'MMSU CCIS Emergency Tech & Relief Responders', 'MMSU Main Campus, Batac City'),
(67, 'Batac Volunteer Fire & Rescue Brigade', 'Poblacion, Batac City'),
(68, 'Batac Rural Health Auxiliary Volunteers', 'City Health Office, Batac City');

-- 20 Volunteers (volunteer_id 1 to 20, user_id 69 to 88)
INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES
(69, 'Pickup Truck', true),
(70, 'Cargo Van', true),
(71, 'Multicab', true),
(72, 'Motorcycle', true),
(73, 'Light Truck', true),
(74, 'Van', true),
(75, 'Multicab', true),
(76, 'Pickup Truck', true),
(77, 'Cargo Van', true),
(78, 'Light Truck', true),
(79, '4x4 Utility Truck', true),
(80, 'Multicab', true),
(81, 'Pickup Truck', true),
(82, 'Cargo Van', true),
(83, 'Light Truck', true),
(84, 'Multicab', true),
(85, 'Motorcycle', true),
(86, '6-Wheeler Hauler', true),
(87, 'Motorcycle', true),
(88, 'Pickup Truck', true);

-- ==============================================================================
-- 3. MASTER CATALOGS INSERTION (2024-2026 CALAMITIES & COMMODITIES)
-- ==============================================================================
-- 16 Disaster Events Localized to Batac City (2024 to 2026)
INSERT INTO DisasterEvent (event_name, location, status, start_date, end_date) VALUES
('Typhoon Carina - Quiaoit River Flash Flood', 'Riverside Barangays, Batac City', 'Resolved', '2024-07-24', '2024-07-31'),
('Localized Flash Flood Incident - Quiling & Bil-loca', 'Quiling & Bil-loca, Batac City', 'Resolved', '2024-08-15', '2024-08-20'),
('Tropical Storm Enteng Drainage Inundation', 'Poblacion Barangays, Batac City', 'Resolved', '2024-09-02', '2024-09-07'),
('Typhoon Julian - Northern Calamity Assistance', 'Batac City & Ilocos Norte', 'Resolved', '2024-09-30', '2024-10-06'),
('Severe Tropical Storm Kristine Preparedness', 'City of Batac, Ilocos Norte', 'Resolved', '2024-10-21', '2024-10-27'),
('Typhoon Leon Pre-Emptive Flood Evacuation', 'Low-Lying Barangays, Batac City', 'Resolved', '2024-10-30', '2024-11-04'),
('Typhoon Marce - Low-Lying Riverside Response', 'City of Batac, Ilocos Norte', 'Resolved', '2024-11-06', '2024-11-10'),
('Super Typhoon Pepito Pre-Emptive Operations', 'Batac City Evacuation Center', 'Resolved', '2024-11-14', '2024-11-20'),
('Quiaoit River Siltation & Flash Inundation', 'Riverside Sector, Batac City', 'Resolved', '2025-06-18', '2025-06-25'),
('Southwest Monsoon (Habagat) Heavy Inundation', 'City-Wide Agricultural Sector, Batac', 'Resolved', '2025-08-04', '2025-08-12'),
('Severe Tropical Storm Falcon Relief Ops', 'Eastern Agricultural Barangays, Batac', 'Resolved', '2025-09-15', '2025-09-22'),
('Typhoon Gorio Agricultural Rehabilitation', 'City of Batac, Ilocos Norte', 'Resolved', '2025-10-25', '2025-11-02'),
('Pre-Emptive Evacuation Ops - Quiling & Bil-loca', 'Quiling Sur & Bil-loca Evac Centers', 'Resolved', '2026-06-20', '2026-06-26'),
('Southwest Monsoon Inundation & Siltation Response', 'Riverside Barangays, Batac City', 'Resolved', '2026-08-14', '2026-08-22'),
('Typhoon Helen - City-Wide Emergency Relief Response', 'City of Batac, Ilocos Norte', 'Active', '2026-10-28', NULL),
('Super Typhoon Igme Pre-Emptive Staging & Evacuation', 'Batac City Disaster Operations Center', 'Active', '2026-11-05', NULL);

-- 15 Standard Humanitarian Commodities
INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES
('Bottled Drinking Water 1L', 'Water', 'Bottles'),
('Rice 25kg Sack', 'Food', 'Sacks'),
('Canned Sardines 155g', 'Food', 'Cans'),
('Thermal Blankets & Mats', 'Non-Food', 'Pieces'),
('Paracetamol 500mg (100s)', 'Medicine', 'Boxes'),
('Hygiene Kit (Soap/Toothbrush/Towel)', 'Hygiene', 'Kits'),
('Instant Noodles (Pack of 55)', 'Food', 'Boxes'),
('First Aid Trauma Kit', 'Medicine', 'Kits'),
('Heavy-Duty Family Tent', 'Shelter', 'Units'),
('Baby Formula & Diaper Pack', 'Care', 'Kits'),
('Water Purification Tablets (100s)', 'Water', 'Bottles'),
('Heavy-Duty Solar Emergency Lantern', 'Non-Food', 'Units'),
('Ready-To-Eat Emergency Meals (MREs)', 'Food', 'Boxes'),
('Amoxicillin 500mg Antibiotics (100s)', 'Medicine', 'Boxes'),
('Mosquito Nets (Family Size)', 'Non-Food', 'Pieces');

-- Stock Balances at Batac City Central Relief Depot (Inventory for all 15 items)
INSERT INTO Inventory (good_id, current_stock) VALUES
(1, 15200),
(2, 1450),
(3, 5600),
(4, 2100),
(5, 850),
(6, 2800),
(7, 4200),
(8, 650),
(9, 220),
(10, 480),
(11, 1200),
(12, 380),
(13, 1750),
(14, 420),
(15, 980);

-- ==============================================================================
-- 4. DONATIONS & DONATION ITEMS (35 DONATIONS, 2024-2026 RECENT)
-- ==============================================================================
INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES
-- 2024 Donations
(1, 1, '2024-07-25', 'Approved'),
(2, 1, '2024-07-26', 'Approved'),
(3, 2, '2024-08-16', 'Approved'),
(4, 1, '2024-07-28', 'Approved'),
(5, 2, '2024-08-17', 'Approved'),
(6, 3, '2024-09-03', 'Approved'),
(7, 4, '2024-10-01', 'Approved'),
(8, 5, '2024-10-22', 'Approved'),
(9, 6, '2024-10-31', 'Approved'),
(10, 7, '2024-11-07', 'Approved'),
(1, NULL, '2024-08-10', 'Approved'),
(2, 8, '2024-11-15', 'Approved'),

-- 2025 Donations
(11, 9, '2025-06-19', 'Approved'),
(12, 10, '2025-08-05', 'Approved'),
(13, 10, '2025-08-06', 'Approved'),
(14, 11, '2025-09-16', 'Approved'),
(15, 11, '2025-09-17', 'Approved'),
(16, 12, '2025-10-26', 'Approved'),
(17, 12, '2025-10-28', 'Approved'),
(3, 10, '2025-08-08', 'Approved'),
(4, NULL, '2025-04-10', 'Approved'),
(7, 11, '2025-09-18', 'Approved'),
(8, 12, '2025-10-29', 'Approved'),

-- 2026 Donations
(18, 13, '2026-06-21', 'Approved'),
(19, 14, '2026-08-15', 'Approved'),
(20, 14, '2026-08-16', 'Approved'),
(1, 14, '2026-08-17', 'Approved'),
(2, 15, '2026-10-29', 'Approved'),
(5, 15, '2026-10-30', 'Approved'),
(6, 15, '2026-10-31', 'Approved'),
(9, 15, '2026-11-01', 'Approved'),
(10, 16, '2026-11-06', 'Approved'),
(11, 16, '2026-11-08', 'Approved'),
(12, 16, '2026-11-10', 'Pending'),
(14, 16, '2026-11-11', 'Pending');

-- 55 Split-Transaction Line Items for Donations
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
(7, 8, 50),
(8, 2, 75),
(8, 3, 500),
(9, 9, 20),
(10, 6, 300),
(10, 10, 50),
(11, 11, 200),
(12, 12, 50),
(12, 13, 150),
(13, 1, 1200),
(13, 2, 80),
(14, 3, 1200),
(14, 7, 300),
(15, 5, 150),
(15, 14, 80),
(16, 2, 120),
(16, 6, 250),
(17, 1, 1500),
(17, 13, 200),
(18, 4, 400),
(19, 10, 80),
(20, 15, 150),
(21, 1, 600),
(22, 2, 90),
(23, 3, 800),
(24, 1, 2000),
(24, 4, 500),
(25, 2, 150),
(25, 6, 400),
(26, 1, 1800),
(26, 7, 450),
(27, 3, 1500),
(28, 2, 200),
(28, 5, 200),
(29, 1, 2500),
(29, 6, 500),
(30, 8, 100),
(30, 9, 30),
(31, 12, 100),
(31, 13, 300),
(32, 1, 1000),
(32, 2, 100),
(33, 10, 120),
(33, 11, 300),
(34, 14, 100),
(35, 15, 200);

-- ==============================================================================
-- 5. RELIEF REQUESTS & REQUEST ITEMS (38 REQUESTS, 2024-2026 RECENT)
-- ==============================================================================
INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES
-- 2024 Requests
(1, 1, '2024-07-26', 'Approved'),   -- Brgy. 1-N Ricarte
(2, 1, '2024-07-27', 'Approved'),   -- Brgy. 1-S Valdez
(3, 1, '2024-07-28', 'Approved'),   -- Brgy. 2 Ablan
(4, 1, '2024-07-29', 'Approved'),   -- Brgy. 3 Cangrunaan
(5, 1, '2024-07-30', 'Fulfilled'),  -- Brgy. 4 Nalupta
(6, 2, '2024-08-16', 'Approved'),   -- Brgy. 5 Callaguip
(18, 2, '2024-08-16', 'Approved'),  -- Brgy. 16-N Quiling Norte
(19, 2, '2024-08-17', 'Approved'),  -- Brgy. 16-S Quiling Sur (MMSU)
(43, 2, '2024-08-17', 'Fulfilled'), -- Brgy. 35 Bil-loca
(11, 3, '2024-09-03', 'Approved'),  -- Brgy. 10-S Barani
(13, 3, '2024-09-04', 'Approved'),  -- Brgy. 11 Ben-Agan
(36, 4, '2024-10-02', 'Approved'),  -- Brgy. 30-E Baoa East
(37, 4, '2024-10-02', 'Approved'),  -- Brgy. 30-W Baoa West
(14, 5, '2024-10-22', 'Approved'),  -- Brgy. 12 Palpalicong
(15, 5, '2024-10-23', 'Fulfilled'), -- Brgy. 13 Baay
(20, 6, '2024-10-31', 'Approved'),  -- Brgy. 17 Tabug
(21, 7, '2024-11-07', 'Approved'),  -- Brgy. 18 Magnuang
(27, 8, '2024-11-15', 'Approved'),  -- Brgy. 23 Biningan

-- 2025 Requests
(7, 9, '2025-06-20', 'Approved'),   -- Brgy. 6 San Julian
(8, 9, '2025-06-21', 'Approved'),   -- Brgy. 7 Caunayan
(9, 10, '2025-08-05', 'Approved'),  -- Brgy. 8 Acosta
(10, 10, '2025-08-06', 'Approved'), -- Brgy. 9 Aglipay
(22, 10, '2025-08-07', 'Fulfilled'),-- Brgy. 19 Pimentel
(23, 11, '2025-09-16', 'Approved'), -- Brgy. 20-N Colo
(24, 11, '2025-09-17', 'Approved'), -- Brgy. 20-S Mabaleng
(25, 12, '2025-10-26', 'Approved'), -- Brgy. 21 Quiom
(26, 12, '2025-10-27', 'Approved'), -- Brgy. 22 Maipalig
(28, 12, '2025-10-28', 'Fulfilled'),-- Brgy. 24 Sumader

-- 2026 Requests
(29, 13, '2026-06-21', 'Approved'), -- Brgy. 25-N Camguidan
(30, 13, '2026-06-22', 'Approved'), -- Brgy. 25-S Payao
(31, 14, '2026-08-15', 'Approved'), -- Brgy. 26 Parangopong
(32, 14, '2026-08-16', 'Approved'), -- Brgy. 27-E Capacuan
(33, 14, '2026-08-17', 'Approved'), -- Brgy. 27-W Naguirangan
(34, 15, '2026-10-29', 'Approved'), -- Brgy. 28 San Mateo
(35, 15, '2026-10-30', 'Approved'), -- Brgy. 29 San Pedro
(38, 15, '2026-10-31', 'Pending'),  -- Brgy. 31 Camandingan
(39, 16, '2026-11-06', 'Approved'), -- Brgy. 32 Palongpong
(40, 16, '2026-11-08', 'Pending');  -- Brgy. 33-N Nagbacalan

-- 62 Split-Transaction Line Items for Relief Requests
INSERT INTO RequestItem (request_id, good_id, quantity) VALUES
(1, 1, 400),
(1, 2, 30),
(2, 3, 600),
(2, 6, 150),
(3, 4, 200),
(4, 5, 50),
(5, 1, 500),
(5, 2, 40),
(6, 2, 40),
(6, 7, 100),
(7, 1, 300),
(7, 3, 250),
(8, 2, 50),
(8, 6, 120),
(9, 4, 150),
(9, 8, 25),
(10, 1, 450),
(10, 2, 35),
(11, 6, 100),
(11, 7, 120),
(12, 1, 350),
(12, 2, 25),
(13, 3, 300),
(14, 4, 100),
(15, 1, 250),
(15, 6, 80),
(16, 9, 15),
(17, 1, 500),
(17, 2, 40),
(18, 10, 30),
(19, 1, 400),
(19, 3, 350),
(20, 2, 35),
(20, 6, 90),
(21, 1, 600),
(21, 7, 150),
(22, 4, 200),
(23, 2, 45),
(24, 1, 500),
(24, 8, 30),
(25, 3, 400),
(26, 6, 120),
(27, 2, 50),
(28, 1, 350),
(29, 1, 400),
(29, 2, 30),
(30, 4, 180),
(31, 1, 500),
(31, 3, 400),
(32, 2, 40),
(32, 6, 100),
(33, 7, 150),
(34, 1, 600),
(34, 2, 50),
(35, 3, 500),
(35, 12, 25),
(36, 1, 450),
(36, 6, 120),
(37, 2, 60),
(37, 9, 20),
(38, 1, 500),
(38, 10, 40);

-- ==============================================================================
-- 6. DELIVERIES (28 DISPATCH RECORDS, 2024-2026 RECENT)
-- ==============================================================================
INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES
-- 2024 Deliveries
(1, 1, '2024-07-28', 'Delivered'),   -- To Brgy. 1-N Ricarte via Charlie Driver (Pickup Truck)
(2, 2, '2024-07-29', 'Delivered'),   -- To Brgy. 1-S Valdez via Dave Logistics (Cargo Van)
(3, 3, '2024-07-30', 'Delivered'),   -- To Brgy. 2 Ablan via Grace Ramos (Multicab)
(4, 4, '2024-07-31', 'Delivered'),   -- To Brgy. 3 Cangrunaan via Fernando Poe Jr (Motorcycle)
(5, 5, '2024-08-01', 'Delivered'),   -- To Brgy. 4 Nalupta via Hannah Lim (Light Truck)
(6, 6, '2024-08-18', 'Delivered'),   -- To Brgy. 5 Callaguip via Ian Bautista (Van)
(7, 7, '2024-08-18', 'Delivered'),   -- To Brgy. 16-N Quiling Norte via Karen Joy Cortez (Multicab)
(8, 8, '2024-08-19', 'Delivered'),   -- To Brgy. 16-S Quiling Sur via Leo Gonzales (Pickup Truck)
(9, 9, '2024-08-20', 'Delivered'),   -- To Brgy. 35 Bil-loca via Mia Villanueva (Cargo Van)
(10, 10, '2024-09-05', 'Delivered'), -- To Brgy. 10-S Barani via Noel Alcantara (Light Truck)
(11, 1, '2024-09-06', 'Delivered'),  -- To Brgy. 11 Ben-Agan via Charlie Driver (Pickup Truck)
(12, 2, '2024-10-04', 'Delivered'),  -- To Brgy. 30-E Baoa East via Dave Logistics (Cargo Van)
(13, 3, '2024-10-04', 'Delivered'),  -- To Brgy. 30-W Baoa West via Grace Ramos (Multicab)
(14, 5, '2024-10-24', 'Delivered'),  -- To Brgy. 12 Palpalicong via Hannah Lim (Light Truck)
(15, 6, '2024-10-25', 'Delivered'),  -- To Brgy. 13 Baay via Ian Bautista (Van)
(16, 8, '2024-11-02', 'Delivered'),  -- To Brgy. 17 Tabug via Leo Gonzales (Pickup Truck)
(17, 10, '2024-11-09', 'Delivered'), -- To Brgy. 18 Magnuang via Noel Alcantara (Light Truck)
(18, 11, '2024-11-17', 'Delivered'), -- To Brgy. 23 Biningan via Oliver Pascual (4x4 Utility)

-- 2025 Deliveries
(19, 12, '2025-06-22', 'Delivered'), -- To Brgy. 6 San Julian via Patricia De Guzman (Multicab)
(20, 13, '2025-06-23', 'Delivered'), -- To Brgy. 7 Caunayan via Quirino Tamayo (Pickup Truck)
(21, 14, '2025-08-07', 'Delivered'), -- To Brgy. 8 Acosta via Rowena Agcaoili (Cargo Van)
(22, 15, '2025-08-08', 'Delivered'), -- To Brgy. 9 Aglipay via Samuel Pimentel (Light Truck)
(23, 16, '2025-08-09', 'Delivered'), -- To Brgy. 19 Pimentel via Theresa Domingo (Multicab)
(24, 18, '2025-09-18', 'Delivered'), -- To Brgy. 20-N Colo via Victor Almazan (6-Wheeler Hauler)

-- 2026 Deliveries
(29, 11, '2026-06-23', 'Delivered'), -- To Brgy. 25-N Camguidan via Oliver Pascual (4x4 Utility)
(31, 13, '2026-08-17', 'Delivered'), -- To Brgy. 26 Parangopong via Quirino Tamayo (Pickup)
(34, 15, '2026-10-31', 'Delivered'), -- To Brgy. 28 San Mateo via Samuel Pimentel (Light Truck)
(37, 20, '2026-11-08', 'In Transit');-- To Brgy. 32 Palongpong via Zaldy Manegdeg (Pickup Truck)

-- ==============================================================================
-- 7. NOTIFICATIONS (35 AUDIT & OPERATIONAL ALERTS, 2024-2026 RECENT)
-- ==============================================================================
INSERT INTO Notification (user_id, message, is_read, date_sent) VALUES
(22, 'Your relief request #1 for Brgy. 1-N Ricarte has been approved and dispatched from Central Depot.', true, '2024-07-28 07:00:00'),
(23, 'Your relief request #2 for Brgy. 1-S Valdez is scheduled for fleet transit.', true, '2024-07-29 08:30:00'),
(40, 'Emergency request #8 for Brgy. 16-S Quiling Sur has been delivered successfully.', true, '2024-08-19 14:15:00'),
(69, 'Assigned to delivery route #1 for Brgy. Ricarte evacuation staging area.', true, '2024-07-28 06:15:00'),
(70, 'Assigned to delivery route #2 for Brgy. Valdez relief station.', true, '2024-07-29 07:00:00'),
(76, 'Assigned to delivery route #8 for Quiling Sur emergency response.', true, '2024-08-19 08:00:00'),
(2, 'Thank you! Your donation #1 has been acknowledged and allocated to Quiaoit River flood relief.', true, '2024-07-25 10:00:00'),
(3, 'Corporate relief aid from MMSU Alumni acknowledged by Batac CDRRMO logistics.', true, '2024-07-26 11:30:00'),
(24, 'Emergency request #3 goods have arrived on site at Brgy. 2 Ablan.', true, '2024-07-30 16:00:00'),
(57, 'Dispatch route #12 update: Baoa East road access verified cleared.', true, '2024-10-04 10:00:00'),
(25, 'Urgent: Water purification kits allocation for Brgy. Cangrunaan pending review.', true, '2024-07-29 13:00:00'),
(1, 'System Notice: Daily automated database integrity verification completed.', true, '2024-10-31 23:59:00'),
(58, 'Your relief request #13 for Brgy. Baoa West has been delivered.', true, '2024-10-04 17:00:00'),
(34, 'Your relief request #11 for Brgy. Ben-Agan has been fulfilled.', true, '2024-09-06 15:30:00'),
(35, 'Pre-emptive evacuation supplies allocated for Brgy. Palpalicong.', true, '2024-10-24 11:00:00'),
(28, 'Relief aid dispatched for Brgy. 6 San Julian under Southwest Monsoon Response.', true, '2025-06-22 09:00:00'),
(29, 'Relief delivery completed for Brgy. 7 Caunayan evacuation center.', true, '2025-06-23 14:00:00'),
(30, 'Relief request #21 for Brgy. 8 Acosta approved and scheduled for hauler dispatch.', true, '2025-08-07 08:30:00'),
(31, 'Your relief request #22 for Brgy. 9 Aglipay has arrived at barangay hall.', true, '2025-08-08 16:30:00'),
(43, 'Emergency aid package for Brgy. 19 Pimentel delivered by volunteer unit.', true, '2025-08-09 15:00:00'),
(44, 'Heavy cargo delivery to Brgy. 20-N Colo confirmed by Barangay Captain.', true, '2025-09-18 17:00:00'),
(12, 'Donation #13 from Ilocos Norte OFW Association allocated to 2025 Habagat relief.', true, '2025-08-05 11:00:00'),
(15, 'Puregold Batac donation #17 verified by CDRRMO inventory division.', true, '2026-02-20 10:00:00'),
(50, 'Relief request #29 for Brgy. 25-N Camguidan delivered via 4x4 utility truck.', true, '2026-06-23 11:00:00'),
(52, 'Relief goods for Brgy. 26 Parangopong safely arrived at community center.', true, '2026-08-17 14:00:00'),
(55, 'Typhoon Helen response: Relief aid for Brgy. 28 San Mateo completed.', true, '2026-10-31 16:30:00'),
(60, 'Fleet Alert: Multicab dispatch #28 for Brgy. 32 Palongpong currently In Transit.', false, '2026-11-08 09:15:00'),
(88, 'Volunteer Assignment: Zaldy Manegdeg assigned to Palongpong delivery route.', true, '2026-11-08 08:45:00'),
(1, 'Priority Calamity Notice: Super Typhoon Igme Pre-Emptive Operations activated.', false, '2026-11-05 06:00:00'),
(17, 'Pledge #32 acknowledged: Puregold relief packages staged at Central Depot.', false, '2026-11-06 10:30:00'),
(56, 'Notice: Request #35 for Brgy. 29 San Pedro approved for depot staging.', false, '2026-10-30 14:00:00'),
(61, 'Your emergency request #38 for Brgy. 33-N Nagbacalan is currently under review.', false, '2026-11-08 11:00:00'),
(65, 'Coordination Alert: Philippine Red Cross Batac Chapter deploying mobile kitchen.', false, '2026-11-09 08:00:00'),
(66, 'MMSU CCIS Tech Responders: Live disaster inventory telemetry dashboard synchronized.', false, '2026-11-10 13:00:00'),
(1, 'System Audit: 38 Relief Requests and 28 Deliveries logged in 3NF CDRRMO ledger.', false, '2026-11-12 08:00:00');

-- ==============================================================================
-- 8. PENDING VERIFICATION SAMPLES (EMAIL 2FA OTP REGISTRATION)
-- ==============================================================================
INSERT INTO PendingVerification (email, username, code_hash, payload_json, attempts, expires_at) VALUES
('volunteer.applicant@gmail.com', 'vol_applicant1', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '{"fullName":"Juanito Ramos","role":"Volunteer","vehicleType":"Motorcycle"}', 0, NOW() + INTERVAL '15 minutes'),
('citizen.donor.batac@gmail.com', 'donor_citizen1', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '{"fullName":"Elena Castro","role":"Donor","donorType":"Individual"}', 0, NOW() + INTERVAL '15 minutes');
