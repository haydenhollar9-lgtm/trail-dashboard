// Outdoors Dashboard - Firebase Firestore Edition (Compat SDK)

let hikes = [];
let unsubscribe = null;

// Wait for Firebase to initialize
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.firebaseDb) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

// Sample activities for initial seeding
const sampleTrails = [
    { trailName: "Alum Cave Trail", location: "Great Smoky Mountains NP", distance: 5, elevation: 1150, difficulty: "Moderate", type: "Hike", rating: 5, notes: "Beautiful arch, scenic views, popular" },
    { trailName: "Abrams Falls", location: "Great Smoky Mountains NP", distance: 5, elevation: 780, difficulty: "Moderate", type: "Hike", rating: 5, notes: "20-ft waterfall, stunning gorge" },
    { trailName: "Grotto Falls", location: "Roaring Fork Motor Trail", distance: 2.6, elevation: 400, difficulty: "Easy", type: "Hike", rating: 4, notes: "Walk behind the waterfall" },
    { trailName: "Clingmans Dome", location: "Great Smoky Mountains NP", distance: 1.3, elevation: 330, difficulty: "Moderate", type: "Hike", rating: 4, notes: "Highest point in TN, 360 views" },
    { trailName: "Charlies Bunion", location: "Great Smoky Mountains NP", distance: 4.2, elevation: 900, difficulty: "Moderate", type: "Hike", rating: 5, notes: "Rocky outcrop with amazing views" }
];

// Initialize app
async function initApp() {
    await waitForFirebase();
    console.log("Firebase ready, connecting to Firestore...");
    
    // Subscribe to Firestore collection
    const hikesRef = window.firebaseDb.collection('hikes');
    const q = window.firebaseDb.app_.firebase_.firestore().query(hikesRef, window.firebaseDb.app_.firebase_.firestore().orderBy('date', 'desc'));
    
    // Using compat API
    hikesRef.orderBy('date', 'desc').onSnapshot((snapshot) => {
        hikes = [];
        snapshot.forEach((doc) => {
            hikes.push({ id: doc.id, ...doc.data() });
        });
        
        console.log("Loaded hikes:", hikes.length);
        
        // Seed data if empty
        if (hikes.length === 0) {
            console.log("Seeding initial data...");
            seedData();
        } else {
            renderAll();
        }
    }, (error) => {
        console.error("Firestore error:", error);
    });
    
    setupEventListeners();
    
    // Show dashboard
    document.getElementById('statsSection').style.display = 'grid';
    document.getElementById('goalsSection').style.display = 'block';
    document.getElementById('filtersSection').style.display = 'flex';
    document.getElementById('addBtn').style.display = 'inline-block';
}

// Seed sample data
async function seedData() {
    for (const trail of sampleTrails) {
        const hike = {
            ...trail,
            date: getRandomDate(),
            duration: getEstimatedDuration(trail.distance),
            weather: "Clear, 65°F",
            gear: "Hiking boots, water, snacks",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.firebaseDb.collection('hikes').add(hike);
    }
    console.log("Sample data seeded");
}

// Stats Calculations
function calculateStats(hikesData) {
    const totalHikes = hikesData.length;
    const totalMiles = hikesData.reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
    const totalElevation = hikesData.reduce((sum, h) => sum + (parseInt(h.elevation) || 0), 0);
    const streak = calculateStreak(hikesData);
    
    return { totalHikes, totalMiles, totalElevation, streak };
}

function calculateStreak(hikesData) {
    if (hikesData.length === 0) return 0;
    
    const dates = [...new Set(hikesData.map(h => h.date))].sort().reverse();
    if (dates.length === 0) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
        const current = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diff = (current - prev) / 86400000;
        
        if (diff === 1) streak++;
        else break;
    }
    
    return streak;
}

// Goal Progress
function calculateGoals(hikesData) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const yearHikes = hikesData.filter(h => h.date && h.date.startsWith(currentYear));
    const monthHikes = hikesData.filter(h => h.date && h.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`));
    
    const yearMiles = yearHikes.reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
    const monthMiles = monthHikes.reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
    
    return { yearMiles, monthMiles };
}

// Render Functions
function renderAll() {
    renderStats();
    renderGoals();
    renderHikes();
}

function renderStats() {
    const stats = calculateStats(hikes);
    
    document.getElementById('totalHikes').textContent = stats.totalHikes;
    document.getElementById('totalMiles').textContent = stats.totalMiles.toFixed(1);
    document.getElementById('totalElevation').textContent = stats.totalElevation.toLocaleString();
    document.getElementById('currentStreak').textContent = stats.streak;
}

function renderGoals() {
    const goals = calculateGoals(hikes);
    const yearGoal = 100;
    const monthGoal = 20;
    
    document.getElementById('yearMiles').textContent = `${goals.yearMiles.toFixed(1)} / ${yearGoal}`;
    document.getElementById('yearProgress').style.width = `${Math.min((goals.yearMiles / yearGoal) * 100, 100)}%`;
    
    document.getElementById('monthMiles').textContent = `${goals.monthMiles.toFixed(1)} / ${monthGoal}`;
    document.getElementById('monthProgress').style.width = `${Math.min((goals.monthMiles / monthGoal) * 100, 100)}%`;
}

function renderHikes() {
    const search = document.getElementById('search').value.toLowerCase();
    const filterType = document.getElementById('filterDifficulty').value;
    const sortBy = document.getElementById('sortBy').value;
    
    let filtered = hikes.filter(hike => {
        const matchSearch = !search || 
            hike.trailName?.toLowerCase().includes(search) || 
            hike.location?.toLowerCase().includes(search);
        const matchType = !filterType || hike.type === filterType;
        return matchSearch && matchType;
    });
    
    // Sort
    filtered.sort((a, b) => {
        if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'miles') return (parseFloat(b.distance) || 0) - (parseFloat(a.distance) || 0);
        if (sortBy === 'rating') return (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0);
        return 0;
    });
    
    const container = document.getElementById('hikesList');
    container.innerHTML = filtered.map(hike => `
        <div class="hike-card">
            <div class="hike-header">
                <h3>${hike.trailName}</h3>
                <div class="hike-rating">${'⭐'.repeat(parseInt(hike.rating) || 0)}</div>
            </div>
            <div class="hike-meta">
                <span>📍 ${hike.location || 'Unknown'}</span>
                <span>📅 ${hike.date || 'N/A'}</span>
                <span>${hike.type || 'Hike'}</span>
            </div>
            <div class="hike-stats">
                <span>🥾 ${hike.distance || '?'} mi</span>
                <span>⛰️ ${hike.elevation || '?'} ft</span>
                <span>⏱️ ${hike.duration || '?'}</span>
                <span class="difficulty-${hike.difficulty?.toLowerCase()}">${hike.difficulty || '?'}</span>
            </div>
            ${hike.weather ? `<div class="hike-weather">🌤️ ${hike.weather}</div>` : ''}
            ${hike.gear ? `<div class="hike-gear">🎒 ${hike.gear}</div>` : ''}
            ${hike.notes ? `<div class="hike-notes">📝 ${hike.notes}</div>` : ''}
            <div class="hike-actions">
                <button onclick="editHike('${hike.id}')" class="btn-small">Edit</button>
                <button onclick="deleteHike('${hike.id}')" class="btn-small btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('hikeForm').addEventListener('submit', handleSubmit);
    
    document.getElementById('search').addEventListener('input', renderHikes);
    document.getElementById('filterDifficulty').addEventListener('change', renderHikes);
    document.getElementById('sortBy').addEventListener('change', renderHikes);
}

// Modal Functions
function openModal(hikeId = null) {
    const modal = document.getElementById('hikeModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('hikeForm');
    
    form.reset();
    document.getElementById('hikeId').value = '';
    
    if (hikeId) {
        const hike = hikes.find(h => h.id === hikeId);
        if (hike) {
            title.textContent = 'Edit Activity';
            document.getElementById('hikeId').value = hike.id;
            document.getElementById('trailName').value = hike.trailName || '';
            document.getElementById('activityType').value = hike.type || 'Hike';
            document.getElementById('location').value = hike.location || '';
            document.getElementById('date').value = hike.date || '';
            document.getElementById('distance').value = hike.distance || '';
            document.getElementById('elevation').value = hike.elevation || '';
            document.getElementById('duration').value = hike.duration || '';
            document.getElementById('difficulty').value = hike.difficulty || 'Easy';
            document.getElementById('weather').value = hike.weather || '';
            document.getElementById('gear').value = hike.gear || '';
            document.getElementById('notes').value = hike.notes || '';
            
            const rating = parseInt(hike.rating) || 5;
            document.querySelectorAll('input[name="rating"]').forEach(r => {
                r.checked = parseInt(r.value) === rating;
            });
        }
    } else {
        title.textContent = 'Add Activity';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('hikeModal').style.display = 'none';
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('hikeId').value;
    const hike = {
        trailName: document.getElementById('trailName').value,
        type: document.getElementById('activityType').value,
        location: document.getElementById('location').value,
        date: document.getElementById('date').value,
        distance: parseFloat(document.getElementById('distance').value) || 0,
        elevation: parseInt(document.getElementById('elevation').value) || 0,
        duration: document.getElementById('duration').value,
        difficulty: document.getElementById('difficulty').value,
        weather: document.getElementById('weather').value,
        gear: document.getElementById('gear').value,
        notes: document.getElementById('notes').value,
        rating: parseInt(document.querySelector('input[name="rating"]:checked')?.value) || 5
    };
    
    if (id) {
        const hikeRef = window.firebaseDb.collection('hikes').doc(id);
        await hikeRef.update({
            ...hike,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        await window.firebaseDb.collection('hikes').add({
            ...hike,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    closeModal();
}

async function deleteHike(id) {
    if (confirm('Delete this activity?')) {
        await window.firebaseDb.collection('hikes').doc(id).delete();
    }
}

window.editHike = openModal;
window.deleteHike = deleteHike;

// Helpers
function getRandomDate() {
    const start = new Date('2025-01-01');
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function getEstimatedDuration(miles) {
    const hours = miles / 2;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Start
initApp();
