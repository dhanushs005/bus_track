// server.js
const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Initialize Express
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Database setup
const dbPath = path.resolve(__dirname, "buses.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create table if not exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS bus_locations (
  bus_id TEXT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`;
db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Error creating table:", err.message);
  } else {
    console.log("Table 'bus_locations' ready.");
  }
});

// API endpoint to receive location
app.post("/update", (req, res) => {
  const { busId, latitude, longitude } = req.body;

  if (!busId || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing busId, latitude, or longitude" });
  }

  // Upsert: Update if exists, Insert if not
  const upsertQuery = `
  INSERT INTO bus_locations (bus_id, latitude, longitude)
  VALUES (?, ?, ?)
  ON CONFLICT(bus_id) DO UPDATE SET
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    timestamp = CURRENT_TIMESTAMP
  `;
  db.run(upsertQuery, [busId, latitude, longitude], function (err) {
    if (err) {
      console.error("Error updating/inserting location:", err.message);
      return res.status(500).json({ error: "Failed to store location" });
    }
    res.json({ success: true });
  });
});

// API endpoint to get latest location of a bus
app.get("/bus/:busId", (req, res) => {
  const busId = req.params.busId;
  const selectQuery = `SELECT * FROM bus_locations WHERE bus_id = ?`;
  db.get(selectQuery, [busId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Bus not found" });
    res.json(row);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
