// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_BASE_URL = 'http://localhost:3001/api';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
    selectedColleges: [],
    selectedCourses: [],
    selectedLocations: [],
    colleges: [],
    courses: []
};

// Karnataka cities
const karnatakaCities = [
    'Bangalore', 'Mysore', 'Mangalore', 'Belgaum', 'Hubli', 'Dharwad',
    'Tumkur', 'Shimoga', 'Davangere', 'Hassan', 'Mandya', 'Bellary',
    'Bijapur', 'Raichur', 'Gulbarga', 'Bidar', 'Udupi', 'Chikmagalur',
    'Kolar', 'Chitradurga', 'Bagalkot', 'Gadag', 'Haveri', 'Koppal',
    'Yadgir', 'Chamarajanagar', 'Chickballapur', 'Dakshina Kannada',
    'Kodagu', 'Ramanagara', 'Vijayapura'
].sort();

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const collegeSearch = document.getElementById('collegeSearch');
const collegeResults = document.getElementById('collegeResults');
const selectedCollegesDiv = document.getElementById('selectedColleges');

const courseSearch = document.getElementById('courseSearch');
const courseResults = document.getElementById('courseResults');
const selectedCoursesDiv = document.getElementById('selectedCourses');

const locationSearch = document.getElementById('locationSearch');
const selectedLocationsDiv = document.getElementById('selectedLocations');
const citiesDatalist = document.getElementById('cities');

const form = document.getElementById('preferencesForm');
const clearBtn = document.getElementById('clearBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const successCard = document.getElementById('successCard');

// ============================================================================
// INITIALIZATION
// ============================================================================
async function initialize() {
    await loadColleges();
    await loadCourses();
    populateCities();
    setupEventListeners();
}

// ============================================================================
// LOAD DATA FROM API
// ============================================================================
async function loadColleges() {
    try {
        console.log('Loading colleges from API...');
        const response = await fetch(`${API_BASE_URL}/colleges`);
        const data = await response.json();

        if (data.success && data.data) {
            state.colleges = data.data;
            console.log(` Loaded ${state.colleges.length} colleges from Appwrite`);
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error(' Failed to load colleges:', error);
        alert('Could not load colleges from database.');
        state.colleges = [];
    }
}

async function loadCourses() {
    try {
        console.log('Loading courses from API...');
        const response = await fetch(`${API_BASE_URL}/courses`);
        const data = await response.json();

        if (data.success && data.data) {
            state.courses = data.data;
            console.log(` Loaded ${state.courses.length} courses from Appwrite`);

            // Show sample course structure for debugging
            if (state.courses.length > 0) {
                console.log('Sample course structure:', state.courses[0]);
                console.log('Available fields:', Object.keys(state.courses[0]));
            }
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error(' Failed to load courses:', error);
        alert('Could not load courses from database.');
        state.courses = [];
    }
}

function populateCities() {
    karnatakaCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        citiesDatalist.appendChild(option);
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    collegeSearch.addEventListener('input', handleCollegeSearch);
    collegeSearch.addEventListener('focus', handleCollegeSearch);

    courseSearch.addEventListener('input', handleCourseSearch);
    courseSearch.addEventListener('focus', handleCourseSearch);

    locationSearch.addEventListener('keypress', handleLocationKeypress);

    clearBtn.addEventListener('click', clearAllPreferences);
    form.addEventListener('submit', handleFormSubmit);

    selectedCollegesDiv.addEventListener('click', handleRemoveClick);
    selectedCoursesDiv.addEventListener('click', handleRemoveClick);
    selectedLocationsDiv.addEventListener('click', handleRemoveClick);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            collegeResults.classList.remove('active');
            courseResults.classList.remove('active');
        }
    });

    // New preference button (reload page)
    const newPrefBtn = document.getElementById('newPreferenceBtn');
    if (newPrefBtn) {
        newPrefBtn.addEventListener('click', () => {
            location.reload();
        });
    }
}

function handleRemoveClick(e) {
    if (e.target.classList.contains('remove-item')) {
        const type = e.target.dataset.type;
        const value = e.target.dataset.value;

        if (type === 'college') {
            removeCollege(value);
        } else if (type === 'course') {
            removeCourse(value);
        } else if (type === 'location') {
            removeLocation(value);
        }
    }
}

// ============================================================================
// COLLEGE SEARCH
// ============================================================================
function handleCollegeSearch() {
    const query = collegeSearch.value.trim().toLowerCase();

    if (query.length < 2) {
        collegeResults.classList.remove('active');
        return;
    }

    const filtered = state.colleges.filter(college => {
        const code = (college.collegeCode || '').toLowerCase();
        const name = (college.collegeName || '').toLowerCase();
        return code.includes(query) || name.includes(query);
    }).slice(0, 10);

    displayCollegeResults(filtered);
}

function displayCollegeResults(colleges) {
    if (colleges.length === 0) {
        collegeResults.innerHTML = '<div class="no-results">No colleges found</div>';
        collegeResults.classList.add('active');
        return;
    }

    collegeResults.innerHTML = colleges.map(college => `
        <div class="search-result-item" 
             data-type="college"
             data-id="${college.$id || college.collegeCode}"
             data-code="${escapeHtml(college.collegeCode)}"
             data-name="${escapeHtml(college.collegeName)}">
            <div class="result-code">${college.collegeCode}</div>
            <div class="result-name">${college.collegeName}</div>
        </div>
    `).join('');

    collegeResults.classList.add('active');

    collegeResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            selectCollege(item.dataset.id, item.dataset.code, item.dataset.name);
        });
    });
}

function selectCollege(id, code, name) {
    if (state.selectedColleges.find(c => c.id === id)) return;

    state.selectedColleges.push({ id, code, name });
    renderSelectedColleges();

    collegeSearch.value = '';
    collegeResults.classList.remove('active');
}

function removeCollege(id) {
    state.selectedColleges = state.selectedColleges.filter(c => c.id !== id);
    renderSelectedColleges();
}

function renderSelectedColleges() {
    if (state.selectedColleges.length === 0) {
        selectedCollegesDiv.innerHTML = '<small style="color: #718096;">Selected colleges will appear here</small>';
        return;
    }

    selectedCollegesDiv.innerHTML = state.selectedColleges.map(college => `
        <div class="selected-item">
            <span><strong>${college.code}</strong> - ${college.name}</span>
            <span class="remove-item" data-type="college" data-value="${college.id}">×</span>
        </div>
    `).join('');
}

// ============================================================================
// COURSE SEARCH - FIXED VERSION
// ============================================================================
function handleCourseSearch() {
    const query = courseSearch.value.trim().toLowerCase();

    if (query.length < 2) {
        courseResults.classList.remove('active');
        return;
    }

    console.log(`🔍 Searching courses for: "${query}"`);

    const filtered = state.courses.filter(course => {
        // Try ALL possible field names to be flexible
        const code = String(course.branchCode || course.courseCode || course.courseType || '').toLowerCase();
        const name = String(course.branchName || course.courseName || course.courseType || '').toLowerCase();
        const type = String(course.courseType || '').toLowerCase();
        const collegeName = String(course.collegeName || '').toLowerCase();

        const matches = code.includes(query) || name.includes(query) || type.includes(query) || collegeName.includes(query);
        return matches;
    }).slice(0, 10);

    console.log(` Found ${filtered.length} matching courses`);

    displayCourseResults(filtered);
}

function displayCourseResults(courses) {
    if (courses.length === 0) {
        courseResults.innerHTML = '<div class="no-results">No courses found. Try different keywords.</div>';
        courseResults.classList.add('active');
        return;
    }

    courseResults.innerHTML = courses.map(course => {
        // Flexible field extraction
        const code = course.branchCode || course.courseCode || course.courseType || 'N/A';
        const name = course.branchName || course.courseName || course.courseType || 'Unnamed Course';

        return `
        <div class="search-result-item" 
             data-type="course"
             data-id="${course.$id || course.branchCode || course.courseCode || Math.random()}"
             data-code="${escapeHtml(String(code))}"
             data-name="${escapeHtml(String(name))}">
            <div class="result-code">${escapeHtml(String(code))}</div>
            <div class="result-name">${escapeHtml(String(name))}</div>
        </div>
    `;
    }).join('');

    courseResults.classList.add('active');

    courseResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            selectCourse(item.dataset.id, item.dataset.code, item.dataset.name);
        });
    });
}

function selectCourse(id, code, name) {
    if (state.selectedCourses.find(c => c.id === id)) return;

    state.selectedCourses.push({ id, code, name });
    renderSelectedCourses();

    courseSearch.value = '';
    courseResults.classList.remove('active');
}

function removeCourse(id) {
    state.selectedCourses = state.selectedCourses.filter(c => c.id !== id);
    renderSelectedCourses();
}

function renderSelectedCourses() {
    if (state.selectedCourses.length === 0) {
        selectedCoursesDiv.innerHTML = '<small style="color: #718096;">Selected courses will appear here</small>';
        return;
    }

    selectedCoursesDiv.innerHTML = state.selectedCourses.map(course => `
        <div class="selected-item">
            <span><strong>${course.code}</strong> - ${course.name}</span>
            <span class="remove-item" data-type="course" data-value="${course.id}">×</span>
        </div>
    `).join('');
}

// ============================================================================
// LOCATION SELECTION
// ============================================================================
function handleLocationKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const location = locationSearch.value.trim();

        if (location && karnatakaCities.includes(location)) {
            selectLocation(location);
        }
    }
}

function selectLocation(location) {
    if (state.selectedLocations.includes(location)) return;

    state.selectedLocations.push(location);
    renderSelectedLocations();
    locationSearch.value = '';
}

function removeLocation(location) {
    state.selectedLocations = state.selectedLocations.filter(l => l !== location);
    renderSelectedLocations();
}

function renderSelectedLocations() {
    if (state.selectedLocations.length === 0) {
        selectedLocationsDiv.innerHTML = '<small style="color: #718096;">Selected locations will appear here</small>';
        return;
    }

    selectedLocationsDiv.innerHTML = state.selectedLocations.map(location => `
        <div class="selected-item">
            <span>📍 ${location}</span>
            <span class="remove-item" data-type="location" data-value="${location}">×</span>
        </div>
    `).join('');
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================
async function handleFormSubmit(e) {
    e.preventDefault();

    if (
        state.selectedColleges.length === 0 &&
        state.selectedCourses.length === 0
    ) {
        alert('Please select at least one college or course');
        return;
    }

    const preferences = {
        colleges: state.selectedColleges.map(c => ({
            id: c.id,      // Include Appwrite document ID
            code: c.code,
            name: c.name
        })),
        courses: state.selectedCourses.map(c => ({
            id: c.id,      // Include Appwrite document ID
            code: c.code,
            name: c.name
        })),
        locations: state.selectedLocations,
        collegeTypes: getSelectedCheckboxes(['typeGovt', 'typeVTU', 'typeAuton', 'typePrivateUniv', 'typeDeemed']),
        // For UGCET, we strictly interpret seat type as Government
        seatTypes: ['G']
    };

    console.log('📤 PAYLOAD SENT →', preferences);

    loadingOverlay.classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences)
        });

        const raw = await response.text();
        let result;

        try {
            result = JSON.parse(raw);
        } catch {
            result = { raw };
        }

        console.log('📥 BACKEND RESPONSE →', result);

        if (!response.ok) {
            throw new Error(
                result.error ||
                result.message ||
                JSON.stringify(result)
            );
        }

        document.querySelector('.form-card').style.display = 'none';
        successCard.style.display = 'block';
        document.getElementById('preferenceId').textContent = result.data.$id;

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('FINAL ERROR →', error.message);
        alert(`Failed to save preferences:\n\n${error.message}`);
    } finally {
        loadingOverlay.classList.remove('active');
    }
}


function getSelectedCheckboxes(ids) {
    return ids
        .map(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked ? checkbox.value : null;
        })
        .filter(v => v !== null);
}

function clearAllPreferences() {
    if (confirm('Are you sure you want to clear all preferences?')) {
        state.selectedColleges = [];
        state.selectedCourses = [];
        state.selectedLocations = [];

        renderSelectedColleges();
        renderSelectedCourses();
        renderSelectedLocations();

        form.reset();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// INITIALIZE ON LOAD
// ============================================================================
initialize();
