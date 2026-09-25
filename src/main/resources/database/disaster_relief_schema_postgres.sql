-- ==========================================
-- PostgreSQL Schema for Supabase - FULL V2
-- 13 Tables matching 12 Modules
-- ==========================================

-- Drop existing tables to allow clean re-run
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

-- 1. AUTHENTICATION (UserAccount)
CREATE TABLE UserAccount (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Donor', 'Volunteer', 'Manager', 'Organization')),
    full_name VARCHAR(100) NOT NULL,
    contact_info VARCHAR(100)
);

-- 2. DONORS (Donor)
CREATE TABLE Donor (
    donor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    donor_type VARCHAR(20) DEFAULT 'Individual' CHECK (donor_type IN ('Individual', 'Corporate')),
    FOREIGN KEY (user_id) REFERENCES UserAccount(user_id) ON DELETE CASCADE
);

-- 3. ORGANIZATIONS (Organization)
CREATE TABLE Organization (
    org_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    org_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES UserAccount(user_id) ON DELETE CASCADE
);

-- 4. VOLUNTEERS (Volunteer)
CREATE TABLE Volunteer (
    volunteer_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    vehicle_type VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    FOREIGN KEY (user_id) REFERENCES UserAccount(user_id) ON DELETE CASCADE
);

-- 5. DISASTER EVENTS
CREATE TABLE DisasterEvent (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved')),
    start_date DATE NOT NULL
);

-- 6. RELIEF GOODS (Master list of items)
CREATE TABLE ReliefGood (
    good_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL
);

-- 7. INVENTORY (Central warehouse stock tracking)
CREATE TABLE Inventory (
    inventory_id SERIAL PRIMARY KEY,
    good_id INT NOT NULL UNIQUE,
    current_stock INT DEFAULT 0,
    FOREIGN KEY (good_id) REFERENCES ReliefGood(good_id) ON DELETE CASCADE
);

-- 8. DONATIONS
CREATE TABLE Donation (
    donation_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL,
    event_id INT, -- Can be null if donating to general fund
    donation_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved')),
    FOREIGN KEY (donor_id) REFERENCES Donor(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES DisasterEvent(event_id) ON DELETE SET NULL
);

-- 9. DONATION ITEMS
CREATE TABLE DonationItem (
    item_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL,
    good_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (donation_id) REFERENCES Donation(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (good_id) REFERENCES ReliefGood(good_id) ON DELETE CASCADE
);

-- 10. REQUESTS
CREATE TABLE ReliefRequest (
    request_id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    event_id INT NOT NULL,
    request_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Fulfilled')),
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES DisasterEvent(event_id) ON DELETE CASCADE
);

-- 11. REQUEST ITEMS
CREATE TABLE RequestItem (
    request_item_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    good_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES ReliefRequest(request_id) ON DELETE CASCADE,
    FOREIGN KEY (good_id) REFERENCES ReliefGood(good_id) ON DELETE CASCADE
);

-- 12. DELIVERIES
CREATE TABLE Delivery (
    delivery_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    volunteer_id INT, -- Assigned later
    dispatch_date DATE,
    delivery_status VARCHAR(20) DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'In Transit', 'Delivered')),
    FOREIGN KEY (request_id) REFERENCES ReliefRequest(request_id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE SET NULL
);

-- 13. NOTIFICATIONS
CREATE TABLE Notification (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES UserAccount(user_id) ON DELETE CASCADE
);

-- ==========================================
-- SAMPLE DATA (>= 10 records per major table)
-- ==========================================

-- 1. Users (32 Accounts)
-- Passwords:
-- 'admin' -> 'admin123' (Hash: JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=)
-- All others -> 'pass123' (Hash: m4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=)
INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES
('admin', 'JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=', 'Admin', 'System Administrator', '0917-000-0001'),
-- Donors (user_id 2 to 11)
('donor1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Robert Tan', '0917-111-2222'),
('donor2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Ayala Foundation', '0917-222-3333'),
('donor3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Maria Santos', '0918-333-4444'),
('donor4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'SM Cares Corp', '0919-444-5555'),
('donor5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Juan Dela Cruz', '0920-555-6666'),
('donor6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'GMA Kapuso Foundation', '0921-666-7777'),
('donor7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Elena Rostova', '0922-777-8888'),
('donor8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'San Miguel Foundation', '0923-888-9999'),
('donor9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'Carlos Mendoza', '0924-999-0000'),
('donor10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Donor', 'PLDT-Smart Gabay Kalikasan', '0925-101-1122'),
-- Organizations (user_id 12 to 21)
('org1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Philippine Red Cross Manila', '0918-100-0001'),
('org2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'LGU Marikina CDRRMO', '0918-100-0002'),
('org3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'DSWD Field Office Region IV-A', '0918-100-0003'),
('org4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Caritas Manila Relief', '0918-100-0004'),
('org5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'LGU Tuguegarao Emergency Ops', '0918-100-0005'),
('org6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Cebu Provincial Disaster Council', '0918-100-0006'),
('org7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Angat Buhay NGO', '0918-100-0007'),
('org8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'LGU Albay Emergency Command', '0918-100-0008'),
('org9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'Habitat for Humanity PH', '0918-100-0009'),
('org10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Organization', 'LGU Davao City Disaster Unit', '0918-100-0010'),
-- Volunteers (user_id 22 to 31)
('vol1', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Charlie Driver', '0919-200-0001'),
('vol2', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Dave Logistics', '0919-200-0002'),
('vol3', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Grace Ramos', '0919-200-0003'),
('vol4', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Fernando Poe Jr', '0919-200-0004'),
('vol5', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Hannah Lim', '0919-200-0005'),
('vol6', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Ian Bautista', '0919-200-0006'),
('vol7', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Karen Joy Cortez', '0919-200-0007'),
('vol8', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Leo Gonzales', '0919-200-0008'),
('vol9', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Mia Villanueva', '0919-200-0009'),
('vol10', 'm4dppKdClZotApjDb7cGI/LfrNqENiN98I2N/Vs3N0w=', 'Volunteer', 'Noel Alcantara', '0919-200-0010');

-- 2. Donors (10 Records)
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

-- 3. Organizations (10 Records)
INSERT INTO Organization (user_id, org_name, location) VALUES
(12, 'Philippine Red Cross Manila', 'Port Area, Manila'),
(13, 'LGU Marikina CDRRMO', 'Marikina City'),
(14, 'DSWD Field Office Region IV-A', 'Calamba, Laguna'),
(15, 'Caritas Manila Relief', 'Pandacan, Manila'),
(16, 'LGU Tuguegarao Emergency Ops', 'Tuguegarao, Cagayan'),
(17, 'Cebu Provincial Disaster Council', 'Cebu City'),
(18, 'Angat Buhay NGO', 'Quezon City'),
(19, 'LGU Albay Emergency Command', 'Legazpi City, Albay'),
(20, 'Habitat for Humanity PH', 'Mandaluyong City'),
(21, 'LGU Davao City Disaster Unit', 'Davao City');

-- 4. Volunteers (10 Records)
INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES
(22, 'Truck', true),
(23, 'Van', true),
(24, 'Pickup / 4x4', true),
(25, 'Motorcycle', false),
(26, 'Van', true),
(27, 'Truck', false),
(28, 'Boat / Watercraft', true),
(29, 'Pickup / 4x4', true),
(30, 'Motorcycle', true),
(31, 'Van', false);

-- 5. Disaster Events (10 Records)
INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES
('Typhoon Carina Flood', 'Metro Manila & Rizal', 'Active', '2024-07-24'),
('Mt. Kanlaon Volcanic Unrest', 'Canlaon, Negros Oriental', 'Active', '2024-06-03'),
('Super Typhoon Mawar Relief', 'Batanes & Cagayan', 'Resolved', '2023-05-31'),
('Mindanao 6.8 Magnitude Earthquake', 'Sarangani, Davao Occidental', 'Resolved', '2023-11-17'),
('Taal Volcano Sulfur Gas Crisis', 'Batangas', 'Active', '2024-08-15'),
('Typhoon Egay Coastal Surge', 'Ilocos Norte & Aparri', 'Resolved', '2023-07-26'),
('Northern Samar Flash Floods', 'Catarman, Northern Samar', 'Resolved', '2023-11-20'),
('Davao De Oro Landslide Disaster', 'Maco, Davao de Oro', 'Resolved', '2024-02-06'),
('Tropical Storm Kristine Prep', 'Bicol Region & Eastern Samar', 'Active', '2024-10-21'),
('Central Luzon Monsoon Inundation', 'Pampanga & Bulacan', 'Active', '2024-08-02');

-- 6. Relief Goods (10 Records)
INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES
('Bottled Drinking Water 1L', 'Water', 'Bottles'),
('Rice 25kg Sack', 'Food', 'Sacks'),
('Canned Sardines 155g', 'Food', 'Cans'),
('Thermal Blankets & Mats', 'Non-Food', 'Pieces'),
('Paracetamol 500mg (100s)', 'Medicine', 'Boxes'),
('Hygiene Kit (Soap/Toothbrush)', 'Hygiene', 'Kits'),
('Instant Noodles (Pack of 55)', 'Food', 'Boxes'),
('First Aid Trauma Kit', 'Medicine', 'Kits'),
('Heavy-Duty Family Tent', 'Non-Food', 'Units'),
('Baby Formula & Diaper Pack', 'Care', 'Kits');

-- 7. Inventory (10 Records matching Goods 1-10)
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

-- 8. Donations (12 Records)
INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES
(1, 1, '2024-07-25', 'Approved'),
(2, 1, '2024-07-26', 'Approved'),
(3, 2, '2024-06-05', 'Approved'),
(4, 1, '2024-07-28', 'Approved'),
(5, 5, '2024-08-16', 'Approved'),
(6, 1, '2024-07-29', 'Approved'),
(7, 9, '2024-10-22', 'Pending'),
(8, 10, '2024-08-04', 'Approved'),
(9, 2, '2024-06-10', 'Approved'),
(10, 9, '2024-10-23', 'Pending'),
(1, NULL, '2024-08-10', 'Approved'),
(2, 10, '2024-08-12', 'Approved');

-- 9. Donation Items (15 Records)
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
(11, 9, 20);

-- 10. Relief Requests (12 Records)
INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES
(1, 1, '2024-07-26', 'Approved'),
(2, 1, '2024-07-27', 'Approved'),
(3, 1, '2024-07-28', 'Approved'),
(4, 2, '2024-06-06', 'Approved'),
(5, 1, '2024-07-30', 'Pending'),
(6, 10, '2024-08-05', 'Approved'),
(7, 5, '2024-08-18', 'Approved'),
(8, 9, '2024-10-23', 'Pending'),
(9, 1, '2024-08-01', 'Approved'),
(10, 10, '2024-08-06', 'Approved'),
(1, 9, '2024-10-24', 'Pending'),
(2, 5, '2024-08-20', 'Approved');

-- 11. Request Items (15 Records)
INSERT INTO RequestItem (request_id, good_id, quantity) VALUES
(1, 1, 400),
(1, 2, 30),
(2, 3, 600),
(2, 6, 150),
(3, 4, 200),
(4, 5, 50),
(5, 1, 500),
(6, 2, 40),
(7, 8, 30),
(8, 1, 600),
(9, 7, 120),
(10, 2, 50),
(10, 3, 400),
(11, 6, 250),
(12, 4, 100);

-- 12. Deliveries (10 Records)
INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES
(1, 1, '2024-07-28', 'Delivered'),
(2, 2, '2024-07-29', 'Delivered'),
(3, 3, '2024-07-30', 'Delivered'),
(4, 4, '2024-06-08', 'Delivered'),
(6, 5, '2024-08-07', 'In Transit'),
(7, 6, '2024-08-21', 'Delivered'),
(9, 7, '2024-08-03', 'Delivered'),
(10, 8, '2024-08-09', 'In Transit'),
(12, 9, '2024-08-23', 'In Transit'),
(1, 10, '2024-07-29', 'Delivered');

-- 13. Notifications (10 Records)
INSERT INTO Notification (user_id, message, is_read) VALUES
(12, 'Your relief request #1 has been approved and dispatched.', true),
(13, 'Your relief request #2 is scheduled for fleet transit.', true),
(22, 'Assigned to delivery route #1 for Marikina evacuation center.', true),
(23, 'Assigned to delivery route #2 for DSWD Field Command.', true),
(2, 'Thank you! Your donation #1 has been approved and allocated.', true),
(3, 'Corporate relief aid acknowledged by NDRDMS logistics.', true),
(14, 'Emergency request #3 goods have arrived on site.', false),
(24, 'Dispatch route #3 update: road clearance verified.', false),
(15, 'Urgent: Water purification kits allocation pending review.', false),
(1, 'System Notice: Database backup and replication sync complete.', false);

