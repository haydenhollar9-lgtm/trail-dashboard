// Outdoors Dashboard - Firebase Firestore Edition (Compat SDK)

var hikes = [];

// Wait for Firebase to initialize
function waitForFirebase() {
    return new Promise(function(resolve) {
        var check = function() {
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
var sampleTrails = [
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
    
    // Get reference to hikes collection
    var hikesRef = window.firebaseDb.collection('hikes');
    
    // Subscribe to real-time updates
    hikesRef.orderBy('date', 'desc').onSnapshot(function(snapshot) {
        hikes = [];
        snapshot.forEach(function(doc) {
            hikes.push({ id: doc.id, data: doc.data() });
        });
        
        console.log("Loaded hikes:", hikes.length);
        
        // Seed data if empty
        if (hikes.length === 0) {
            console.log("Seeding initial data...");
            seedData();
        } else {
            renderAll();
        }
    }, function(error) {
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
function seedData() {
    var batch = window.firebaseDb.batch();
    var count = 0;
    
    sampleTrails.forEach(function(trail) {
        var hikeRef = window.firebaseDb.collection('hikes').doc();
        var hike = {
            trailName: trail.trailName,
            location: trail.location,
            distance: trail.distance,
            elevation: trail.elevation,
            difficulty: trail.difficulty,
            type: trail.type || 'Hike',
            rating: trail.rating,
            notes: trail.notes,
            date: getRandomDate(),
            duration: getEstimatedDuration(trail.distance),
            weather: "Clear, 65°F",
            gear: "Hiking boots, water, snacks",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        batch.set(hikeRef, hike);
        count++;
    });
    
    batch.commit().then(function() {
        console.log("Sample data seeded:", count);
    }).catch(function(err) {
        console.error("Error seeding data:", err);
    });
}

// Stats Calculations
function calculateStats(hikesData) {
    var totalHikes = hikesData.length;
    var totalMiles = hikesData.reduce(function(sum, h) { 
        return sum + (parseFloat(h.data ? h.data.distance : h.distance) || 0); 
    }, 0);
    var totalElevation = hikesData.reduce(function(sum, h) { 
        return sum + (parseInt(h.data ? h.data.elevation : h.elevation) || 0); 
    }, 0);
    var streak = calculateStreak(hikesData);
    
    return { totalHikes: totalHikes, totalMiles: totalMiles, totalElevation: totalElevation, streak: streak };
}

function calculateStreak(hikesData) {
    if (hikesData.length === 0) return 0;
    
    var dates = hikesData.map(function(h) { return h.data ? h.data.date : h.date; });
    dates = dates.filter(function(d) { return d; });
    dates = [...new Set(dates)].sort().reverse();
    if (dates.length === 0) return 0;
    
    var today = new Date().toISOString().split('T')[0];
    var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    var streak = 1;
    for (var i = 1; i < dates.length; i++) {
        var current = new Date(dates[i - 1]);
        var prev = new Date(dates[i]);
        var diff = (current - prev) / 86400000;
        
        if (diff === 1) streak++;
        else break;
    }
    
    return streak;
}

// Goal Progress
function calculateGoals(hikesData) {
    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth();
    
    var yearHikes = hikesData.filter(function(h) { 
        var d = h.data ? h.data.date : h.date;
        return d && d.startsWith(currentYear);
    });
    var monthHikes = hikesData.filter(function(h) { 
        var d = h.data ? h.data.date : h.date;
        return d && d.startsWith(currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    });
    
    var yearMiles = yearHikes.reduce(function(sum, h) { 
        return sum + (parseFloat(h.data ? h.data.distance : h.distance) || 0); 
    }, 0);
    var monthMiles = monthHikes.reduce(function(sum, h) { 
        return sum + (parseFloat(h.data ? h.data.distance : h.distance) || 0); 
    }, 0);
    
    return { yearMiles: yearMiles, monthMiles: monthMiles };
}

// Render Functions
function renderAll() {
    renderStats();
    renderGoals();
    renderHikes();
}

function renderStats() {
    var stats = calculateStats(hikes);
    
    document.getElementById('totalHikes').textContent = stats.totalHikes;
    document.getElementById('totalMiles').textContent = stats.totalMiles.toFixed(1);
    document.getElementById('totalElevation').textContent = stats.totalElevation.toLocaleString();
    document.getElementById('currentStreak').textContent = stats.streak;
}

function renderGoals() {
    var goals = calculateGoals(hikes);
    var yearGoal = 100;
    var monthGoal = 20;
    
    document.getElementById('yearMiles').textContent = goals.yearMiles.toFixed(1) + ' / ' + yearGoal;
    document.getElementById('yearProgress').style.width = Math.min((goals.yearMiles / yearGoal) * 100, 100) + '%';
    
    document.getElementById('monthMiles').textContent = goals.monthMiles.toFixed(1) + ' / ' + monthGoal;
    document.getElementById('monthProgress').style.width = Math.min((goals.monthMiles / monthGoal) * 100, 100) + '%';
}

function renderHikes() {
    var search = document.getElementById('search').value.toLowerCase();
    var filterType = document.getElementById('filterDifficulty').value;
    var sortBy = document.getElementById('sortBy').value;
    
    var filtered = hikes.filter(function(h) {
        var data = h.data || h;
        var matchSearch = !search || 
            (data.trailName && data.trailName.toLowerCase().includes(search)) || 
            (data.location && data.location.toLowerCase().includes(search));
        var matchType = !filterType || data.type === filterType;
        return matchSearch && matchType;
    });
    
    // Sort
    filtered.sort(function(a, b) {
        var aData = a.data || a;
        var bData = b.data || b;
        if (sortBy === 'date') return new Date(bData.date) - new Date(aData.date);
        if (sortBy === 'miles') return (parseFloat(bData.distance) || 0) - (parseFloat(aData.distance) || 0);
        if (sortBy === 'rating') return (parseInt(bData.rating) || 0) - (parseInt(aData.rating) || 0);
        return 0;
    });
    
    var container = document.getElementById('hikesList');
    container.innerHTML = filtered.map(function(h) {
        var d = h.data || h;
        return '<div class="hike-card">' +
            '<div class="hike-header">' +
                '<h3>' + (d.trailName || '') + '</h3>' +
                '<div class="hike-rating">' + '⭐'.repeat(parseInt(d.rating) || 0) + '</div>' +
            '</div>' +
            '<div class="hike-meta">' +
                '<span>📍 ' + (d.location || 'Unknown') + '</span>' +
                '<span>📅 ' + (d.date || 'N/A') + '</span>' +
                '<span>' + (d.type || 'Hike') + '</span>' +
            '</div>' +
            '<div class="hike-stats">' +
                '<span>🥾 ' + (d.distance || '?') + ' mi</span>' +
                '<span>⛰️ ' + (d.elevation || '?') + ' ft</span>' +
                '<span>⏱️ ' + (d.duration || '?') + '</span>' +
                '<span class="difficulty-' + (d.difficulty || '').toLowerCase() + '">' + (d.difficulty || '?') + '</span>' +
            '</div>' +
            (d.weather ? '<div class="hike-weather">🌤️ ' + d.weather + '</div>' : '') +
            (d.gear ? '<div class="hike-gear">🎒 ' + d.gear + '</div>' : '') +
            (d.notes ? '<div class="hike-notes">📝 ' + d.notes + '</div>' : '') +
            '<div class="hike-actions">' +
                '<button onclick="editHike(\'' + h.id + '\')" class="btn-small">Edit</button>' +
                '<button onclick="deleteHike(\'' + h.id + '\')" class="btn-small btn-danger">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', function() { openModal(); });
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('hikeForm').addEventListener('submit', handleSubmit);
    
    document.getElementById('search').addEventListener('input', renderHikes);
    document.getElementById('filterDifficulty').addEventListener('change', renderHikes);
    document.getElementById('sortBy').addEventListener('change', renderHikes);
}

// Modal Functions
function openModal(hikeId) {
    var modal = document.getElementById('hikeModal');
    var title = document.getElementById('modalTitle');
    var form = document.getElementById('hikeForm');
    
    form.reset();
    document.getElementById('hikeId').value = '';
    
    if (hikeId) {
        var hike = hikes.find(function(h) { return h.id === hikeId; });
        if (hike) {
            var d = hike.data || hike;
            title.textContent = 'Edit Activity';
            document.getElementById('hikeId').value = hike.id;
            document.getElementById('trailName').value = d.trailName || '';
            document.getElementById('activityType').value = d.type || 'Hike';
            document.getElementById('location').value = d.location || '';
            document.getElementById('date').value = d.date || '';
            document.getElementById('distance').value = d.distance || '';
            document.getElementById('elevation').value = d.elevation || '';
            document.getElementById('duration').value = d.duration || '';
            document.getElementById('difficulty').value = d.difficulty || 'Easy';
            document.getElementById('weather').value = d.weather || '';
            document.getElementById('gear').value = d.gear || '';
            document.getElementById('notes').value = d.notes || '';
            
            var rating = parseInt(d.rating) || 5;
            document.querySelectorAll('input[name="rating"]').forEach(function(r) {
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

function handleSubmit(e) {
    e.preventDefault();
    
    var id = document.getElementById('hikeId').value;
    var hike = {
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
        rating: parseInt(document.querySelector('input[name="rating"]:checked') ? document.querySelector('input[name="rating"]:checked').value : 5) || 5
    };
    
    if (id) {
        window.firebaseDb.collection('hikes').doc(id).update({
            trailName: hike.trailName,
            type: hike.type,
            location: hike.location,
            date: hike.date,
            distance: hike.distance,
            elevation: hike.elevation,
            duration: hike.duration,
            difficulty: hike.difficulty,
            weather: hike.weather,
            gear: hike.gear,
            notes: hike.notes,
            rating: hike.rating,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        window.firebaseDb.collection('hikes').add({
            trailName: hike.trailName,
            type: hike.type,
            location: hike.location,
            date: hike.date,
            distance: hike.distance,
            elevation: hike.elevation,
            duration: hike.duration,
            difficulty: hike.difficulty,
            weather: hike.weather,
            gear: hike.gear,
            notes: hike.notes,
            rating: hike.rating,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    closeModal();
}

function deleteHike(id) {
    if (confirm('Delete this activity?')) {
        window.firebaseDb.collection('hikes').doc(id).delete();
    }
}

window.editHike = openHike;
window.deleteHike = deleteHike;

function openHike(id) {
    openModal(id);
}

// Helpers
function getRandomDate() {
    var start = new Date('2025-01-01');
    var end = new Date();
    var date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function getEstimatedDuration(miles) {
    var hours = miles / 2;
    var h = Math.floor(hours);
    var m = Math.round((hours - h) * 60);
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
}

// Start
alert("app.js loaded!");
try {
    initApp();
} catch(e) {
    alert("Error: " + e.message);
}
