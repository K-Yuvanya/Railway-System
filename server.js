require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

let db; // The connection pool

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
};

async function initDB() {
  try {
    // 1. Connect without database to create it if it doesn't exist
    const connection = await mysql.createConnection({
      ...DB_CONFIG,
      multipleStatements: true
    });

    await connection.query("CREATE DATABASE IF NOT EXISTS railway_db;");
    await connection.query("USE railway_db;");

    // 2. Check if tables exist
    const [rows] = await connection.query("SHOW TABLES LIKE 'Train';");
    if (rows.length === 0) {
      console.log("Initializing database with SQL script...");
      const sql = fs.readFileSync(path.join(__dirname, "railway_system.sql"), "utf8");
      await connection.query(sql);
      console.log("Database initialized successfully from railway_system.sql.");
    }
    await connection.end();

    // 3. Create a connection pool for the app to use
    db = mysql.createPool({
      ...DB_CONFIG,
      database: process.env.DB_NAME || "railway_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log(`Connected to MySQL database '${process.env.DB_NAME || "railway_db"}' on ${process.env.DB_HOST || "localhost"}.`);
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}

app.get("/api/db", async (_req, res) => {
  try {
    const [trainsData] = await db.query(`SELECT * FROM Train`);
    const [seatClasses] = await db.query(`SELECT * FROM SeatClass`);
    const trains = trainsData.map(t => {
      const fares = {};
      seatClasses.filter(sc => sc.train_id === t.train_id).forEach(sc => {
        fares[sc.class_type] = Number(sc.base_fare);
      });
      return {
        num: String(t.train_id),
        name: t.train_name,
        src: t.source,
        dst: t.destination,
        seats: t.total_seats,
        available: t.available_seats,
        fares: fares
      };
    });

    const [stationsData] = await db.query(`SELECT * FROM Station`);
    const stations = stationsData.map(s => ({
      code: s.station_code,
      name: s.station_name,
      city: s.city,
      state: s.state || "",
      platforms: s.platforms || 0,
      zone: s.zone || "N/A"
    }));

    const [schedulesData] = await db.query(`
      SELECT sch.*, t.train_name, s.station_name, s.station_code
      FROM Schedule sch
      JOIN Train t ON t.train_id = sch.train_id
      JOIN Station s ON s.station_id = sch.station_id
    `);
    const schedules = schedulesData.map(sch => ({
      id: sch.schedule_id,
      trainNum: String(sch.train_id),
      stationCode: sch.station_code,
      arr: sch.arrival_time,
      dep: sch.departure_time,
      stop: sch.stop_number || 1,
      day: sch.day_of_journey || 1,
      trainName: sch.train_name,
      stationName: sch.station_name
    }));

    const [bookingsData] = await db.query(`
      SELECT b.*, p.name, p.email, p.contact, p.age, t.train_name, pay.amount,
             DATE_FORMAT(b.journey_date, '%Y-%m-%d') as formatted_date
      FROM Booking b
      JOIN Passenger p ON p.passenger_id = b.passenger_id
      JOIN Train t ON t.train_id = b.train_id
      LEFT JOIN Payment pay ON pay.booking_id = b.booking_id
    `);
    const bookings = bookingsData.map(b => ({
      pnr: b.PNR,
      name: b.name,
      email: b.email,
      phone: b.contact,
      age: b.age,
      trainNum: String(b.train_id),
      trainName: b.train_name,
      seatClass: b.seat_class,
      seatNumber: b.seat_number, // Added seat number
      qty: b.qty,
      fare: Number(b.amount || 0),
      status: b.status,
      date: b.formatted_date // Added mapped date
    }));

    const [passengersData] = await db.query(`
      SELECT p.*,
             COUNT(b.booking_id) as bookings,
             SUM(pay.amount) as spent
      FROM Passenger p
      LEFT JOIN Booking b ON p.passenger_id = b.passenger_id
      LEFT JOIN Payment pay ON pay.booking_id = b.booking_id AND pay.payment_status = 'Success'
      GROUP BY p.passenger_id
    `);
    const passengers = passengersData.map(p => ({
      id: String(p.passenger_id),
      name: p.name,
      email: p.email,
      phone: p.contact,
      age: p.age,
      bookings: p.bookings || 0,
      spent: Number(p.spent || 0)
    }));

    // Add Payments
    const [paymentsData] = await db.query(`
      SELECT pay.*, b.PNR, p.name 
      FROM Payment pay
      JOIN Booking b ON b.booking_id = pay.booking_id
      JOIN Passenger p ON p.passenger_id = b.passenger_id
    `);
    const payments = paymentsData.map(p => ({
      paymentId: p.payment_id,
      pnr: p.PNR,
      name: p.name,
      mode: p.payment_method,
      amount: Number(p.amount),
      status: p.payment_status
    }));

    // Add Cancellations
    const [cancellationsData] = await db.query(`
      SELECT c.*, b.PNR, p.name 
      FROM Cancellation c
      JOIN Booking b ON b.booking_id = c.booking_id
      JOIN Passenger p ON p.passenger_id = b.passenger_id
    `);
    const cancellations = cancellationsData.map(c => ({
      cancellationId: c.cancellation_id,
      pnr: c.PNR,
      name: c.name,
      refundAmount: Number(c.refund_amount),
      reason: c.reason,
      status: c.status
    }));

    // Add Customer Queries
    const [queriesData] = await db.query(`SELECT cq.*, p.name FROM CustomerQuery cq LEFT JOIN Passenger p ON p.passenger_id = cq.passenger_id`);
    const queries = queriesData.map(q => ({
      id: q.query_id,
      name: q.name || "Anonymous",
      subject: q.subject,
      message: q.message,
      status: q.status,
      date: q.created_at
    }));

    res.json({ trains, stations, bookings, passengers, schedules, payments, cancellations, queries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/train", async (req, res) => {
  try {
    const { num, name, src, dst, seats, available, fares } = req.body;
    await db.execute(`INSERT INTO Train (train_id, train_name, total_seats, available_seats, source, destination) VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(num), name, Number(seats), Number(available), src, dst]);

    let classId = Date.now() % 100000;
    for (const [classType, fare] of Object.entries(fares)) {
      if (fare > 0) {
        await db.execute(`INSERT INTO SeatClass (class_id, train_id, class_type, base_fare, available_seats) VALUES (?, ?, ?, ?, ?)`,
          [classId++, Number(num), classType, Number(fare), Math.floor(Number(available) / 5)]);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post("/api/station", async (req, res) => {
  try {
    const { code, name, city, state, platforms, zone } = req.body;
    let newId = Date.now() % 100000;
    await db.execute(`INSERT INTO Station (station_id, station_name, city, station_code, state, platforms, zone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, name, city, code, state, Number(platforms), zone]);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post("/api/booking", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { name, email, phone, age, trainNum, date, seatClass, qty, gender, preferredSeat } = req.body;

    const [trainRows] = await connection.query(`SELECT * FROM Train WHERE train_id = ?`, [Number(trainNum)]);
    const train = trainRows[0];
    if (!train) throw new Error("Train not found.");
    if (train.available_seats < qty) throw new Error("Not enough seats available.");

    const [seatClassRows] = await connection.query(`SELECT base_fare FROM SeatClass WHERE train_id = ? AND class_type = ?`, [Number(trainNum), seatClass]);
    const seatClassInfo = seatClassRows[0];
    const fare = (seatClassInfo ? Number(seatClassInfo.base_fare) : 1000) * Number(qty);

    const [passengerRows] = await connection.query(`SELECT * FROM Passenger WHERE email = ?`, [email]);
    let passenger = passengerRows[0];
    let passId = passenger ? passenger.passenger_id : null;
    if (!passId) {
      passId = Date.now() % 100000;
      await connection.execute(`INSERT INTO Passenger (passenger_id, name, age, gender, contact, email) VALUES (?, ?, ?, ?, ?, ?)`,
        [passId, name, Number(age), gender || 'Unknown', phone, email]);
    } else if ((!passenger.gender || passenger.gender === 'Unknown') && gender) {
      await connection.execute(`UPDATE Passenger SET gender = ? WHERE passenger_id = ?`, [gender, passId]);
    }

    const bookId = Date.now() % 100000;
    const pnr = `PNR${bookId}`;
    const seatPrefix = seatClass === '1A' ? 'A' : seatClass === '2A' ? 'B' : seatClass === '3A' ? 'C' : 'S';
    const seatNum = `${seatPrefix}${Math.floor(Math.random() * 72) + 1}`; // Generate random seat

    await connection.execute(`INSERT INTO Booking (booking_id, PNR, passenger_id, train_id, journey_date, seat_class, seat_number, qty, status, gender, preferred_seat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookId, pnr, passId, Number(trainNum), date || new Date().toISOString().split('T')[0], seatClass, seatNum, Number(qty), 'Confirmed', gender, preferredSeat]);

    const payId = (Date.now() % 100000) + 1; // +1 to avoid collision if fast
    await connection.execute(`INSERT INTO Payment (payment_id, booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)`,
      [payId, bookId, fare, req.body.paymentMode || 'Card', 'Success']);

    await connection.execute(`UPDATE Train SET available_seats = available_seats - ? WHERE train_id = ?`, [Number(qty), Number(trainNum)]);

    await connection.commit();
    res.json({ ok: true, pnr, fare, seatNum }); // Include seatNum in response
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
});

app.post("/api/cancel/:pnr", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { reason } = req.body;
    const pnr = req.params.pnr;

    const [bookingRows] = await connection.query(`SELECT * FROM Booking WHERE PNR = ?`, [pnr]);
    const booking = bookingRows[0];
    if (!booking || booking.status === "Cancelled") throw new Error("Booking not found.");

    await connection.execute(`UPDATE Booking SET status = 'Cancelled' WHERE booking_id = ?`, [booking.booking_id]);
    await connection.execute(`UPDATE Train SET available_seats = available_seats + ? WHERE train_id = ?`, [booking.qty, booking.train_id]);

    const [paymentRows] = await connection.query(`SELECT amount FROM Payment WHERE booking_id = ?`, [booking.booking_id]);
    const payment = paymentRows[0];
    const refundAmount = payment ? Number(payment.amount) * 0.8 : 0;

    const cancId = Date.now() % 100000;
    const currentDate = new Date().toISOString().split('T')[0];
    await connection.execute(`INSERT INTO Cancellation (cancellation_id, booking_id, refund_amount, status, reason, cancellation_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [cancId, booking.booking_id, refundAmount, 'Processed', reason || 'Not provided', currentDate]);

    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
});

app.post("/api/schedule", async (req, res) => {
  try {
    const { trainNum, stationCode, arr, dep, stop, day } = req.body;
    const [stationRows] = await db.query(`SELECT station_id FROM Station WHERE station_code = ?`, [stationCode]);
    const station = stationRows[0];
    if (!station) return res.status(400).json({ message: "Station not found" });

    const schId = Date.now() % 100000;
    await db.execute(`INSERT INTO Schedule (schedule_id, train_id, station_id, arrival_time, departure_time, stop_number, day_of_journey) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schId, Number(trainNum), station.station_id, arr, dep, Number(stop), Number(day)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/train/:id", async (req, res) => {
  const trainId = Number(req.params.id);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM Schedule WHERE train_id = ?', [trainId]);
    await connection.execute('DELETE FROM SeatClass WHERE train_id = ?', [trainId]);
    await connection.execute('DELETE FROM Train WHERE train_id = ?', [trainId]);
    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
});

app.delete("/api/schedule/:id", async (req, res) => {
  try {
    await db.execute('DELETE FROM Schedule WHERE schedule_id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/station/:code", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [stationRows] = await connection.query('SELECT station_id FROM Station WHERE station_code = ?', [req.params.code]);
    if (stationRows.length > 0) {
      const stId = stationRows[0].station_id;
      await connection.execute('DELETE FROM Schedule WHERE station_id = ?', [stId]);
      await connection.execute('DELETE FROM Station WHERE station_id = ?', [stId]);
    }
    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
});

app.post("/api/query", async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    let passId = null;
    if (email) {
      const [passengerRows] = await db.query(`SELECT passenger_id FROM Passenger WHERE email = ?`, [email]);
      if (passengerRows.length > 0) passId = passengerRows[0].passenger_id;
    }
    await db.execute(`INSERT INTO CustomerQuery (passenger_id, subject, message) VALUES (?, ?, ?)`, [passId, subject, message]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/insights", async (req, res) => {
  try {
    const [revenueData] = await db.query(`SELECT SUM(amount) as total FROM Payment WHERE payment_status = 'Success'`);
    const [occupancyData] = await db.query(`
      SELECT train_name, total_seats, available_seats,
             ROUND(((total_seats - available_seats) * 100.0) / total_seats, 2) as percent
      FROM Train
    `);
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM Booking) as total_bookings,
        (SELECT COUNT(*) FROM Cancellation) as total_cancellations
    `);
    res.json({
      revenue: revenueData[0].total || 0,
      occupancy: occupancyData,
      efficiency: stats[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Railway DBMS running at http://localhost:${PORT}`);
  });
});
