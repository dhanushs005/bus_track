import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors"; // ✅ import cors

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app
const app = express();
const PORT = process.env.PORT || 3000;

// --- Add CORS middleware ---
app.use(cors()); // ✅ allow all origins
// If you want only your frontend origin: app.use(cors({ origin: "http://localhost:5500" }));

// Middleware
app.use(express.json());

// Database setup
const dbPath = path.resolve(__dirname, "buses.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB Error:", err.message);
  else console.log("Connected to SQLite database.");
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
  if (err) console.error("Table creation error:", err.message);
  else console.log("Table 'bus_locations' ready.");
});

// POST /update-location - insert or update bus location
app.post("/update-location", (req, res) => {
  const { busId, latitude, longitude } = req.body;

  if (!busId || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing busId, latitude, or longitude" });
  }

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

// GET /bus/:busId - get latest location of a bus
app.get("/bus/:busId", (req, res) => {
  const busId = req.params.busId;
  const selectQuery = `SELECT * FROM bus_locations WHERE bus_id = ?`;
  db.get(selectQuery, [busId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Bus not found" });
    res.json(row);
  });
});

// GET /buses - get all bus locations
app.get("/buses", (req, res) => {
  db.all(`SELECT * FROM bus_locations`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
