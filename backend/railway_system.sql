-- ==========================================================
-- Railway System Database (Comprehensive Schema)
-- ==========================================================

-- 1. Stations
CREATE TABLE Station (
    station_id INT PRIMARY KEY AUTO_INCREMENT,
    station_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    station_code VARCHAR(10) NOT NULL UNIQUE,
    state VARCHAR(100),
    platforms INT,
    zone VARCHAR(50)
);

-- 2. Trains
CREATE TABLE Train (
    train_id INT PRIMARY KEY,
    train_name VARCHAR(120) NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL
);

-- 3. Passengers
CREATE TABLE Passenger (
    passenger_id INT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE
);

-- 4. Schedules (Train Timings)
CREATE TABLE Schedule (
    schedule_id INT PRIMARY KEY,
    train_id INT NOT NULL,
    station_id INT NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_number INT,
    day_of_journey INT,
    FOREIGN KEY (train_id) REFERENCES Train(train_id),
    FOREIGN KEY (station_id) REFERENCES Station(station_id)
);

-- 5. Seat Availability (Class-wise)
CREATE TABLE SeatClass (
    class_id INT PRIMARY KEY,
    train_id INT NOT NULL,
    class_type VARCHAR(30) NOT NULL,
    base_fare DECIMAL(10,2) NOT NULL,
    available_seats INT NOT NULL,
    UNIQUE (train_id, class_type),
    FOREIGN KEY (train_id) REFERENCES Train(train_id)
);

-- 6. Bookings (Reservations)
CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    PNR VARCHAR(20) NOT NULL UNIQUE,
    passenger_id INT NOT NULL,
    train_id INT NOT NULL,
    journey_date DATE NOT NULL,
    seat_class VARCHAR(30) NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    gender VARCHAR(20),
    preferred_seat VARCHAR(50),
    qty INT DEFAULT 1,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id),
    FOREIGN KEY (train_id) REFERENCES Train(train_id)
);

-- 7. Payments (Ticketing & Revenue)
CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id)
);

-- 8. Cancellations
CREATE TABLE Cancellation (
    cancellation_id INT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    refund_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    cancellation_date DATE,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id)
);

-- 9. Customer Queries
CREATE TABLE CustomerQuery (
    query_id INT PRIMARY KEY AUTO_INCREMENT,
    passenger_id INT,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id)
);

-- ----------------------------------------------------------
-- SAMPLE DATA
-- ----------------------------------------------------------

-- Stations
INSERT INTO Station (station_id, station_name, city, station_code, state, platforms) VALUES
(1, 'New Delhi', 'Delhi', 'NDLS', 'Delhi', 16),
(2, 'Mumbai Central', 'Mumbai', 'BCT', 'Maharashtra', 9),
(3, 'Howrah Junction', 'Kolkata', 'HWH', 'West Bengal', 23),
(4, 'Chennai Central', 'Chennai', 'MAS', 'Tamil Nadu', 17),
(5, 'Bengaluru City', 'Bengaluru', 'SBC', 'Karnataka', 10);

-- Trains
INSERT INTO Train (train_id, train_name, total_seats, available_seats, source, destination) VALUES
(101, 'Rajdhani Express', 1200, 960, 'New Delhi', 'Mumbai Central'),
(102, 'Duronto Express', 1000, 710, 'Howrah Junction', 'New Delhi'),
(103, 'Shatabdi Express', 800, 520, 'Chennai Central', 'Bengaluru City');

-- Passengers
INSERT INTO Passenger (passenger_id, name, age, gender, contact, email) VALUES
(1001, 'Aarav Sharma', 28, 'Male', '9876500011', 'aarav@example.com'),
(1002, 'Meera Nair', 24, 'Female', '9876500022', 'meera@example.com');

-- Seat Classes
INSERT INTO SeatClass (class_id, train_id, class_type, base_fare, available_seats) VALUES
(7001, 101, '1A', 4200.00, 80),
(7002, 101, '2A', 3000.00, 140),
(7003, 102, '3A', 2100.00, 180),
(7004, 103, 'CC', 1500.00, 190);

-- Schedules
INSERT INTO Schedule (schedule_id, train_id, station_id, arrival_time, departure_time, stop_number, day_of_journey) VALUES
(5001, 101, 1, '06:00:00', '06:30:00', 1, 1),
(5002, 101, 2, '20:15:00', '20:35:00', 2, 1),
(5003, 102, 3, '07:00:00', '07:20:00', 1, 1),
(5004, 103, 4, '08:00:00', '08:20:00', 1, 1);

-- ==========================================================
-- 10. SQL QUERIES (FOR REPORT DOCUMENTATION)
-- ==========================================================

-- 10.1 Aggregate Functions
-- Total revenue generated
-- SELECT SUM(amount) AS total_revenue FROM Payment;

-- Average fare
-- SELECT AVG(base_fare) FROM SeatClass;

-- Count of passengers
-- SELECT COUNT(*) FROM Passenger;

-- 10.2 Joins
-- Booking details with passenger
-- SELECT b.PNR, p.name, b.journey_date FROM Booking b JOIN Passenger p ON b.passenger_id = p.passenger_id;

-- Train schedule with station names
-- SELECT t.train_name, s.station_name, sch.arrival_time FROM Schedule sch JOIN Train t ON sch.train_id = t.train_id JOIN Station s ON sch.station_id = s.station_id;

-- 10.3 Subqueries
-- Find trains with maximum seats
-- SELECT train_name FROM Train WHERE total_seats = (SELECT MAX(total_seats) FROM Train);

-- Passengers who made bookings
-- SELECT name FROM Passenger WHERE passenger_id IN (SELECT passenger_id FROM Booking);


-- ==========================================================
-- 11. CREATION OF VIEWS
-- ==========================================================

-- View for booking details
CREATE VIEW IF NOT EXISTS BookingDetails AS
SELECT b.PNR, p.name, t.train_name, b.journey_date, b.status
FROM Booking b
JOIN Passenger p ON b.passenger_id = p.passenger_id
JOIN Train t ON b.train_id = t.train_id;

-- View for revenue report
CREATE VIEW IF NOT EXISTS RevenueReport AS
SELECT SUM(amount) AS total_revenue
FROM Payment;

-- View for train schedule
CREATE VIEW IF NOT EXISTS TrainScheduleView AS
SELECT t.train_name, s.station_name, sch.arrival_time, sch.departure_time
FROM Schedule sch
JOIN Train t ON sch.train_id = t.train_id
JOIN Station s ON sch.station_id = s.station_id;

use railway_db;
