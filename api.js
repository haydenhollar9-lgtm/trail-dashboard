const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 18791;
const DATA_FILE = path.join(__dirname, 'data', 'hikes.json');

app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Read hikes
function readHikes() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return [];
    }
}

// Write hikes
function writeHikes(hikes) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(hikes, null, 2));
}

// Get all hikes
app.get('/api/hikes', (req, res) => {
    const hikes = readHikes();
    res.json(hikes);
});

// Add hike
app.post('/api/hikes', (req, res) => {
    const hikes = readHikes();
    const hike = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
    hikes.push(hike);
    writeHikes(hikes);
    res.json(hike);
});

// Update hike
app.put('/api/hikes/:id', (req, res) => {
    const hikes = readHikes();
    const index = hikes.findIndex(h => h.id == req.params.id);
    if (index !== -1) {
        hikes[index] = { ...hikes[index], ...req.body, updatedAt: new Date().toISOString() };
        writeHikes(hikes);
        res.json(hikes[index]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Delete hike
app.delete('/api/hikes/:id', (req, res) => {
    let hikes = readHikes();
    const initialLength = hikes.length;
    hikes = hikes.filter(h => h.id != req.params.id);
    if (hikes.length !== initialLength) {
        writeHikes(hikes);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Sync - replace all hikes (for full sync)
app.post('/api/sync', (req, res) => {
    const { hikes } = req.body;
    writeHikes(hikes);
    res.json({ success: true, count: hikes.length });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trail API running on port ${PORT}`);
    console.log(`  Local:   http://localhost:${PORT}/api/hikes`);
});
