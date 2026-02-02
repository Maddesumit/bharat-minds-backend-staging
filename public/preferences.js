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
// OPTION GENERATOR LOGIC
// ============================================================================
function setupGenerationLogic() {
    const generateBtn = document.getElementById('generateBtn');
    const studentRankInput = document.getElementById('studentRank');
    const studentCategoryInput = document.getElementById('studentCategory');
    const generatedResults = document.getElementById('generatedResults');
    const generatedList = document.getElementById('generatedList');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', async () => {
        const rank = studentRankInput.value;
        const category = studentCategoryInput.value;

        if (!rank) {
            alert('Please enter your CET Rank first.');
            studentRankInput.focus();
            return;
        }
        if (!category) {
            alert('Please select your Category first.');
            studentCategoryInput.focus();
            return;
        }

        // Prepare request
        const courseCodes = state.selectedCourses.map(c => c.code);
        const collegeCodes = state.selectedColleges.map(c => c.code);

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        generatedResults.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/preferences/generate-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rank: parseInt(rank),
                    category,
                    courseCodes,
                    collegeCodes,
                    seatType: 'Government' // Default for now
                })
            });

            const data = await response.json();

            if (data.success) {
                renderGeneratedOptions(data.data);
                generatedResults.style.display = 'block';
            } else {
                throw new Error(data.error || 'Failed to generate options');
            }

        } catch (error) {
            console.error('Generation Error:', error);
            alert('Error generating options: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '✨ Generate Option Entry List';
        }
    });

    // ADD ALL BUTTON LOGIC
    const addAllBtn = document.getElementById('addAllBtn');
    let currentOptions = []; // Store options here

    if (addAllBtn) {
        addAllBtn.addEventListener('click', () => {
            if (currentOptions.length === 0) return;

            let addedColleges = 0;
            let addedCourses = 0;

            currentOptions.forEach(opt => {
                // 1. Add College if not exists
                // Find complete college object from state to get the ID
                const collegeObj = state.colleges.find(c => c.collegeCode === opt.collegeCode);

                if (collegeObj) {
                    const alreadySelected = state.selectedColleges.some(c => c.code === opt.collegeCode);
                    if (!alreadySelected) {
                        selectCollege(collegeObj.$id, collegeObj.collegeCode, collegeObj.collegeName);
                        addedColleges++;
                    }
                }

                // 2. Add Course if not exists
                // Try to find course by code
                const courseObj = state.courses.find(c => c.branchCode === opt.branchCode || c.courseCode === opt.branchCode);

                if (courseObj) {
                    const code = courseObj.branchCode || courseObj.courseCode;
                    const alreadySelected = state.selectedCourses.some(c => c.code === code);

                    if (!alreadySelected) {
                        const name = courseObj.branchName || courseObj.courseName;
                        // Use selectCourse existing function? 
                        // No, selectCourse expects click event usually or just ID. 
                        // Looking at selectCourse(id, code, name): it pushes to state and calls render.
                        selectCourse(courseObj.$id, code, name);
                        addedCourses++;
                    }
                }
            });

            if (addedColleges > 0 || addedCourses > 0) {
                alert(`Successfully added ${addedColleges} colleges and ${addedCourses} courses to your selection!`);
                // Scroll to top
                document.querySelector('.filter-section').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('All these items are already in your selection.');
            }
        });
    }

    function renderGeneratedOptions(options) {
        currentOptions = options; // Update current options state

        if (!options || options.length === 0) {
            generatedList.innerHTML = '<div style="padding: 20px; text-align: center; color: #718096;">No options found matching your criteria. Try loosening your filters or checking your rank.</div>';
            return;
        }

        generatedList.innerHTML = options.map((opt, index) => {
            // Helper to generate round badge
            const renderRound = (roundName, data) => {
                if (!data) return `<div style="color: #cbd5e0; font-size: 12px; margin-top: 5px;">${roundName}: N/A</div>`;

                const probColor =
                    data.probabilityLabel === 'High' ? '#48bb78' :
                        data.probabilityLabel === 'Medium' ? '#ecc94b' :
                            '#f56565';

                return `
                    <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                        <span style="color: #4a5568; font-weight: 500;">${roundName} Cutoff: <strong>${data.cutoff}</strong></span>
                        <span style="
                            padding: 2px 8px; 
                            border-radius: 6px; 
                            background: ${probColor}; 
                            color: white; 
                            font-weight: 600; 
                            font-size: 11px;
                        ">${data.probability}%</span>
                    </div>
                `;
            };

            const overallProb = opt.r1 ? opt.r1.probabilityLabel : (opt.r2 ? opt.r2.probabilityLabel : 'Low');
            const bg = overallProb === 'High' ? '#f0fff4' : overallProb === 'Medium' ? '#fffff0' : '#fff5f5';

            return `
            <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; background: ${bg};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: 600; color: #2d3748; font-size: 15px;">
                            ${index + 1}. [${opt.collegeCode}] ${opt.collegeName}
                        </div>
                        <div style="color: #4a5568; font-size: 14px; margin-top: 2px;">
                            Branch: <strong>${opt.branchCode}</strong> - ${opt.branchName}
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #a0aec0;">
                         ${opt.year}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                    <div>${renderRound('Round 1', opt.r1)}</div>
                    <div style="border-left: 1px dashed #e2e8f0; padding-left: 15px;">${renderRound('Round 2', opt.r2)}</div>
                </div>
            </div>
            `;
        }).join('');
    }
}

// ============================================================================
// INITIALIZE ON LOAD
// ============================================================================
async function initialize() {
    await loadColleges();
    await loadCourses();
    populateCities();
    setupEventListeners();
    setupGenerationLogic();
}

initialize();
