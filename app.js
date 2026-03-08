// Trail Dashboard - Firebase Edition

let currentUser = null;
let hikes = [];

// Sample trails for initial seeding
const sampleTrails = [
    { trailName: "Alum Cave Trail", location: "Great Smoky Mountains NP", distance: 5, elevation: 1150, difficulty: "Moderate", rating: 5, notes: "Beautiful arch, scenic views, popular" },
    { trailName: "Abrams Falls", location: "Great Smoky Mountains NP", distance: 5, elevation: 780, difficulty: "Moderate", rating: 5, notes: "20-ft waterfall, stunning gorge" },
    { trailName: "Grotto Falls", location: "Roaring Fork Motor Trail", distance: 2.6, elevation: 400, difficulty: "Easy", rating: 4, notes: "Walk behind the waterfall" },
    { trailName: "Clingmans Dome", location: "Great Smoky Mountains NP", distance: 1.3, elevation: 330, difficulty: "Moderate", rating: 4, notes: "Highest point in TN, 360 views" },
    { trailName: "Charlies Bunion", location: "Great Smoky Mountains NP", distance: 4.2, elevation: 900, difficulty: "Moderate", rating: 5, notes: "Rocky outcrop with amazing views" },
    { trailName: "Mount Cammerer", location: "Great Smoky Mountains NP", distance: 5.5, elevation: 1200, difficulty: "Hard", rating: 5, notes: "Historic fire tower at summit" },
    { trailName: "Rainbow Falls", location: "Great Smoky Mountains NP", distance: 5.4, elevation: 900, difficulty: "Moderate", rating: 4, notes: "80-ft waterfall" },
    { trailName: "Chimney Tops", location: "Great Smoky Mountains NP", distance: 4, elevation: 1400, difficulty: "Hard", rating: 4, notes: "Rocky peak, steep climb" },
    { trailName: "Ramsey Cascades", location: "Great Smoky Mountains NP", distance: 4, elevation: 1100, difficulty: "Hard", rating: 5, notes: "Highest waterfall in the park" },
    { trailName: "Cades Cove Loop", location: "Great Smoky Mountains NP", distance: 11, elevation: 400, difficulty: "Easy", rating: 5, notes: "Wildlife, historic cabins, cycling" }
];

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

// Auth state handler
function setupAuth() {
    window.firebaseOnAuth(window.firebaseAuth, async (user) => {
        currentUser = user;
        
        if (user) {
            // Show app, hide login
            document.getElementById('loginPrompt').style.display = 'none';
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('statsSection').style.display = 'grid';
            document.getElementById('goalsSection').style.display = 'block';
            document.getElementById('filtersSection').style.display = 'flex';
            document.getElementById('addBtn').style.display = 'inline-block';
            document.getElementById('logoutBtn').style.display = 'inline-block';
            
            // Subscribe to hikes collection
            subscribeToHikes();
        } else {
            // Show login
            document.getElementById('loginPrompt').style.display = 'block';
            document.getElementById('authSection').style.display = 'block';
            document.getElementById('statsSection').style.display = 'none';
            document.getElementById('goalsSection').style.display = 'none';
            document.getElementById('filtersSection').style.display = 'none';
            document.getElementById('addBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('hikesList').innerHTML = '';
            hikes = [];
        }
    });
}

// Subscribe to real-time hikes
function subscribeToHikes() {
    if (!currentUser) return;
    
    const q = window.firebaseQuery(
        window.firebaseDb ? window.firebaseDb : null,
        window.firebaseAuth ? window.firebaseAuth : null
    );
    
    // Using Firestore real-time listener
    const hikesRef = window.firebaseDb.collection('hikes');
    
    window.firebaseOnSnapshot(
        window.firebaseQuery(hikesRef, window.firebaseOrderBy('date', 'desc')),
        (snapshot) => {
            hikes = [];
            snapshot.forEach((doc) => {
                hikes.push({ id: doc.id, ...doc.data() });
            });
            
            // Check if need to seed data
            if (hikes.length === 0) {
                seedData();
            } else {
                renderAll();
            }
        }
    );
}

// Seed sample data
async function seedData() {
    for (const trail of sampleTrails) {
        await window.firebaseAddDoc(
            window.firebaseDb.collection('hikes'),
            {
                ...trail,
                date: getRandomDate(),
                duration: getEstimatedDuration(trail.distance),
                weather: "Clear, 65°F",
                gear: "Hiking boots, water, snacks",
                userId: currentUser.uid,
                createdAt: window.firebaseServerTimestamp()
            }
        );
    }
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
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const yearStart = new Date(year, 0, 1).toISOString().split('T')[0];
    
    const yearMiles = hikesData
        .filter(h => h.date >= yearStart)
        .reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
    
    const monthMiles = hikesData
        .filter(h => h.date >= monthStart)
        .reduce((sum, h) => sum + (parseFloat(h.distance) || 0), 0);
    
    return {
        yearMiles: yearMiles.toFixed(1),
        yearGoal: 100,
        monthMiles: monthMiles.toFixed(1),
        monthGoal: 20
    };
}

// UI Rendering
function renderStats(stats) {
    document.getElementById('totalHikes').textContent = stats.totalHikes;
    document.getElementById('totalMiles').textContent = stats.totalMiles.toFixed(1);
    document.getElementById('totalElevation').textContent = stats.totalElevation.toLocaleString();
    document.getElementById('currentStreak').textContent = stats.streak;
}

function renderGoals(goals) {
    const yearPercent = Math.min((goals.yearMiles / goals.yearGoal) * 100, 100);
    const monthPercent = Math.min((goals.monthMiles / goals.monthGoal) * 100, 100);
    
    document.getElementById('yearProgress').style.width = yearPercent + '%';
    document.getElementById('yearMiles').textContent = `${goals.yearMiles} / ${goals.yearGoal}`;
    
    document.getElementById('monthProgress').style.width = monthPercent + '%';
    document.getElementById('monthMiles').textContent = `${goals.monthMiles} / ${goals.monthGoal}`;
}

function renderHikes(hikesData) {
    const container = document.getElementById('hikesList');
    
    if (hikesData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No hikes yet</h3>
                <p>Click "Add Hike" to log your first trail!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = hikesData.map(hike => `
        <div class="hike-card">
            <div class="hike-main">
                <h3>${escapeHtml(hike.trailName)}</h3>
                <div class="hike-meta">
                    <span>📍 ${escapeHtml(hike.location || '—')}</span>
                    <span>📅 ${formatDate(hike.date)}</span>
                    <span>👣 ${hike.distance || '—'} mi</span>
                    <span>⛰️ ${hike.elevation ? hike.elevation + ' ft' : '—'}</span>
                    <span>⏱️ ${hike.duration || '—'}</span>
                    <span class="difficulty-badge difficulty-${hike.difficulty || 'Moderate'}">${hike.difficulty || 'Moderate'}</span>
                    <span class="rating-display">${'⭐'.repeat(parseInt(hike.rating) || 5)}</span>
                </div>
                ${hike.notes ? `<div class="hike-notes">${escapeHtml(hike.notes)}</div>` : ''}
            </div>
            <div class="hike-actions">
                <button class="btn-edit" onclick="editHike('${hike.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteHikeConfirm('${hike.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderAll() {
    const filtered = filterAndSortHikes();
    renderStats(calculateStats(hikes));
    renderGoals(calculateGoals(hikes));
    renderHikes(filtered);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRandomDate() {
    const start = new Date(2025, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function getEstimatedDuration(miles) {
    const hours = miles / 2;
    const mins = Math.round((hours % 1) * 60);
    return `${Math.floor(hours)}h ${mins}m`;
}

// Filter & Sort
function filterAndSortHikes() {
    const search = document.getElementById('search').value.toLowerCase();
    const difficulty = document.getElementById('filterDifficulty').value;
    const sortBy = document.getElementById('sortBy').value;
    
    let filtered = hikes.filter(hike => {
        const matchesSearch = !search || 
            (hike.trailName && hike.trailName.toLowerCase().includes(search)) ||
            (hike.location && hike.location.toLowerCase().includes(search));
        const matchesDifficulty = !difficulty || hike.difficulty === difficulty;
        return matchesSearch && matchesDifficulty;
    });
    
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.date) - new Date(a.date);
            case 'miles':
                return (parseFloat(b.distance) || 0) - (parseFloat(a.distance) || 0);
            case 'rating':
                return (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0);
            default:
                return 0;
        }
    });
    
    return filtered;
}

// Modal Handling
function openModal(hike = null) {
    const modal = document.getElementById('hikeModal');
    const form = document.getElementById('hikeForm');
    const title = document.getElementById('modalTitle');
    
    form.reset();
    document.getElementById('hikeId').value = '';
    
    if (hike) {
        title.textContent = 'Edit Hike';
        document.getElementById('hikeId').value = hike.id;
        document.getElementById('trailName').value = hike.trailName || '';
        document.getElementById('location').value = hike.location || '';
        document.getElementById('date').value = hike.date || '';
        document.getElementById('distance').value = hike.distance || '';
        document.getElementById('elevation').value = hike.elevation || '';
        document.getElementById('duration').value = hike.duration || '';
        document.getElementById('difficulty').value = hike.difficulty || 'Moderate';
        document.getElementById('weather').value = hike.weather || '';
        document.getElementById('gear').value = hike.gear || '';
        document.getElementById('notes').value = hike.notes || '';
        
        if (hike.rating) {
            const radios = document.querySelectorAll('input[name="rating"]');
            radios.forEach(r => r.checked = r.value == hike.rating);
        }
    } else {
        title.textContent = 'Add Hike';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('hikeModal').classList.remove('show');
}

// Actions
async function editHike(id) {
    const hike = hikes.find(h => h.id === id);
    if (hike) openModal(hike);
}

async function deleteHikeConfirm(id) {
    if (confirm('Are you sure you want to delete this hike?')) {
        await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, 'hikes', id));
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('hikeId').value;
    const hikeData = {
        trailName: document.getElementById('trailName').value,
        location: document.getElementById('location').value,
        date: document.getElementById('date').value,
        distance: parseFloat(document.getElementById('distance').value) || 0,
        elevation: parseInt(document.getElementById('elevation').value) || 0,
        duration: document.getElementById('duration').value,
        difficulty: document.getElementById('difficulty').value,
        weather: document.getElementById('weather').value,
        rating: document.querySelector('input[name="rating"]:checked')?.value || 5,
        gear: document.getElementById('gear').value,
        notes: document.getElementById('notes').value,
        userId: currentUser.uid
    };
    
    if (id) {
        // Update existing
        await window.firebaseUpdateDoc(window.firebaseDoc(window.firebaseDb, 'hikes', id), hikeData);
    } else {
        // Add new
        hikeData.createdAt = window.firebaseServerTimestamp();
        await window.firebaseAddDoc(window.firebaseDb.collection('hikes'), hikeData);
    }
    
    closeModal();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await waitForFirebase();
    setupAuth();
    
    document.getElementById('loginBtn').addEventListener('click', () => window.firebaseSignIn());
    document.getElementById('logoutBtn').addEventListener('click', () => window.firebaseSignOut());
    document.getElementById('addBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('hikeForm').addEventListener('submit', handleFormSubmit);
    
    document.getElementById('search').addEventListener('input', renderAll);
    document.getElementById('filterDifficulty').addEventListener('change', renderAll);
    document.getElementById('sortBy').addEventListener('change', renderAll);
    
    document.getElementById('hikeModal').addEventListener('click', (e) => {
        if (e.target.id === 'hikeModal') closeModal();
    });
});
