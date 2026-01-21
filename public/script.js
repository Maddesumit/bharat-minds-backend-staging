// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_BASE_URL = 'http://localhost:3001/api';

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const form = document.getElementById('optionForm');
const counsellingType = document.getElementById('counsellingType');
const courseCategory = document.getElementById('courseCategory');
const branch = document.getElementById('branch');
const branchGroup = document.getElementById('branchGroup');

const standardRankGroup = document.getElementById('standardRankGroup');
const dualRankGroup = document.getElementById('dualRankGroup');
const generalMeritRank = document.getElementById('generalMeritRank');
const theoryRank = document.getElementById('theoryRank');
const practicalRank = document.getElementById('practicalRank');

const attendedPracticalYes = document.getElementById('attendedPracticalYes');
const attendedPracticalNo = document.getElementById('attendedPracticalNo');
const practicalRankGroup = document.getElementById('practicalRankGroup');
const practicalNotAttendedMsg = document.getElementById('practicalNotAttendedMsg');

const baseCategory = document.getElementById('baseCategory');
const kannadaReservation = document.getElementById('kannadaReservation');
const ruralReservation = document.getElementById('ruralReservation');
const hkReservation = document.getElementById('hkReservation');

const snqSection = document.getElementById('snqSection');
const claimSNQYes = document.getElementById('claimSNQYes');
const claimSNQNo = document.getElementById('claimSNQNo');
const snqIncomeSlabGroup = document.getElementById('snqIncomeSlabGroup');
const snqIncomeSlab = document.getElementById('snqIncomeSlab');

const eligibleCategoriesBox = document.getElementById('eligibleCategoriesBox');
const eligibleCategoriesList = document.getElementById('eligibleCategoriesList');

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

const resultsCard = document.getElementById('resultsCard');
const resultsSummary = document.getElementById('resultsSummary');
const resultsList = document.getElementById('resultsList');
const loadingOverlay = document.getElementById('loadingOverlay');

let currentStep = 1;
const totalSteps = 3;

// ============================================================================
// COURSE CATEGORIES DATA
// ============================================================================
const courseCategoriesMap = {
    UGCET: ['Engineering', 'Farm Science', 'Veterinary'],
    UGNEET: ['Medical', 'Dental', 'Ayurveda', 'Homeopathy']
};

const engineeringBranches = [
    'Computer Science Engineering',
    'Information Science Engineering',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Artificial Intelligence & Data Science',
    'Artificial Intelligence & Machine Learning',
    'Chemical Engineering',
    'Biotechnology'
];

// Categories that require dual ranks
const dualRankCategories = ['Farm Science', 'Veterinary'];

// ============================================================================
// EVENT LISTENERS
// ============================================================================
counsellingType.addEventListener('change', handleCounsellingTypeChange);
courseCategory.addEventListener('change', handleCourseCategoryChange);
baseCategory.addEventListener('change', updateEligibleCategories);
kannadaReservation.addEventListener('change', updateEligibleCategories);
ruralReservation.addEventListener('change', updateEligibleCategories);
hkReservation.addEventListener('change', updateEligibleCategories);

// Practical exam attendance handlers
attendedPracticalYes.addEventListener('change', handlePracticalAttendance);
attendedPracticalNo.addEventListener('change', handlePracticalAttendance);

// SNQ quota handlers
claimSNQYes.addEventListener('change', handleSNQClaim);
claimSNQNo.addEventListener('change', handleSNQClaim);
snqIncomeSlab.addEventListener('change', updateEligibleCategories);

prevBtn.addEventListener('click', previousStep);
nextBtn.addEventListener('click', nextStep);
form.addEventListener('submit', handleFormSubmit);
resetBtn.addEventListener('click', resetForm);

// ============================================================================
// COUNSELLING TYPE CHANGE
// ============================================================================
function handleCounsellingTypeChange() {
    const selectedType = counsellingType.value;

    courseCategory.disabled = false;
    courseCategory.innerHTML = '<option value="">Select Course Category</option>';

    if (selectedType && courseCategoriesMap[selectedType]) {
        courseCategoriesMap[selectedType].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            courseCategory.appendChild(option);
        });
    }

    // Reset downstream fields
    courseCategory.value = '';
    handleCourseCategoryChange();
}

// ============================================================================
// COURSE CATEGORY CHANGE
// ============================================================================
function handleCourseCategoryChange() {
    const selected = courseCategory.value;

    // Show/hide branch selection for Engineering
    if (selected === 'Engineering') {
        branchGroup.style.display = 'block';
        populateEngineeringBranches();

        // Show SNQ section for Engineering
        snqSection.style.display = 'block';
    } else {
        branchGroup.style.display = 'none';
        branch.value = '';

        // Hide SNQ section for non-Engineering
        snqSection.style.display = 'none';
        claimSNQYes.checked = false;
        claimSNQNo.checked = false;
        snqIncomeSlabGroup.style.display = 'none';
        snqIncomeSlab.value = '';
    }

    // Show/hide rank inputs based on category
    if (dualRankCategories.includes(selected)) {
        standardRankGroup.style.display = 'none';
        dualRankGroup.style.display = 'block';
        generalMeritRank.value = '';
    } else {
        standardRankGroup.style.display = 'block';
        dualRankGroup.style.display = 'none';
        theoryRank.value = '';
        practicalRank.value = '';
    }
}

// ============================================================================
// POPULATE ENGINEERING BRANCHES
// ============================================================================
function populateEngineeringBranches() {
    branch.innerHTML = '<option value="">All Branches</option>';

    engineeringBranches.forEach(branchName => {
        const option = document.createElement('option');
        option.value = branchName;
        option.textContent = branchName;
        branch.appendChild(option);
    });
}

// ============================================================================
// PRACTICAL EXAM ATTENDANCE
// ============================================================================
function handlePracticalAttendance() {
    if (attendedPracticalYes.checked) {
        // Show practical rank field
        practicalRankGroup.style.display = 'block';
        practicalNotAttendedMsg.style.display = 'none';
        practicalRank.required = true;
    } else if (attendedPracticalNo.checked) {
        // Hide practical rank field and show message
        practicalRankGroup.style.display = 'none';
        practicalNotAttendedMsg.style.display = 'block';
        practicalRank.required = false;
        practicalRank.value = ''; // Clear value
    }
}

// ============================================================================
// SNQ CLAIM HANDLING
// ============================================================================
function handleSNQClaim() {
    if (claimSNQYes.checked) {
        // Show income slab selection
        snqIncomeSlabGroup.style.display = 'block';
        snqIncomeSlab.required = true;
    } else if (claimSNQNo.checked) {
        // Hide income slab and clear selection
        snqIncomeSlabGroup.style.display = 'none';
        snqIncomeSlab.required = false;
        snqIncomeSlab.value = '';
    }
    // Update eligible categories whenever SNQ status changes
    updateEligibleCategories();
}

// ============================================================================
// UPDATE ELIGIBLE CATEGORIES
// ============================================================================
function updateEligibleCategories() {
    if (!baseCategory.value) {
        eligibleCategoriesBox.style.display = 'none';
        return;
    }

    // Get SNQ slab if claimed
    const snqSlab = (claimSNQYes.checked && snqIncomeSlab.value) ? snqIncomeSlab.value : null;

    const categories = generateEligibleCategories({
        baseCategory: baseCategory.value,
        reservations: {
            kannada: kannadaReservation.checked,
            rural: ruralReservation.checked,
            hyderabadKarnataka: hkReservation.checked
        },
        snqSlab: snqSlab
    });

    eligibleCategoriesList.innerHTML = '';
    categories.forEach(cat => {
        const tag = document.createElement('span');
        tag.className = 'category-tag';
        tag.textContent = cat;
        eligibleCategoriesList.appendChild(tag);
    });

    eligibleCategoriesBox.style.display = 'block';
}

// ============================================================================
// GENERATE ELIGIBLE CATEGORIES (Karnataka Rules)
// ============================================================================
function generateEligibleCategories({ baseCategory, reservations, snqSlab }) {
    const categories = new Set();

    // EVERYONE is eligible for GM (General Merit) based on rank!
    // GM also has reservation variants
    categories.add('GM');

    // Add GM reservation variants based on user's reservations
    if (reservations.rural) {
        categories.add('GMR');
    }

    if (reservations.kannada) {
        categories.add('GMK');

        if (reservations.rural) {
            categories.add('GMKR');
        }

        if (reservations.hyderabadKarnataka) {
            categories.add('GMKH');
        }

        if (reservations.rural && reservations.hyderabadKarnataka) {
            categories.add('GMKRH');
        }
    }

    if (reservations.hyderabadKarnataka) {
        categories.add('GMH');

        if (reservations.rural) {
            categories.add('GMRH');
        }
    }

    // Add their base category and its reservations (if not GM)
    if (baseCategory !== 'GM') {
        categories.add(baseCategory);

        if (reservations.hyderabadKarnataka) {
            categories.add(baseCategory + 'H');
        }

        if (reservations.kannada) {
            categories.add(baseCategory + 'K');

            if (reservations.hyderabadKarnataka) {
                categories.add(baseCategory + 'KH');
            }

            if (reservations.rural) {
                categories.add(baseCategory + 'KR');

                if (reservations.hyderabadKarnataka) {
                    categories.add(baseCategory + 'KRH');
                }
            }
        }

        if (reservations.rural) {
            categories.add(baseCategory + 'R');

            if (reservations.hyderabadKarnataka) {
                categories.add(baseCategory + 'RH');
            }
        }
    }

    // Add SNQ category if applicable (Engineering only)
    if (snqSlab) {
        categories.add(snqSlab); // SNQ1, SNQ2, or SNQ3
    }

    return Array.from(categories).sort();
}

// ============================================================================
// STEP NAVIGATION
// ============================================================================
function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep < totalSteps) {
        currentStep++;
        updateSteps();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateSteps();
    }
}

function updateSteps() {
    // Hide all sections
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show current section
    const currentSection = document.querySelector(`[data-step="${currentStep}"]`);
    currentSection.classList.add('active');

    // Update button visibility
    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'block';
    submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// VALIDATION
// ============================================================================
function validateCurrentStep() {
    let valid = true;

    if (currentStep === 1) {
        if (!counsellingType.value || !courseCategory.value) {
            alert('Please fill all required fields');
            valid = false;
        }
    }

    if (currentStep === 2) {
        if (dualRankCategories.includes(courseCategory.value)) {
            // Theory rank is always required
            if (!theoryRank.value) {
                alert('Please enter your Theory rank');
                valid = false;
            }
            // Check if they answered the practical attendance question
            else if (!attendedPracticalYes.checked && !attendedPracticalNo.checked) {
                alert('Please indicate if you attended the Practical exam');
                valid = false;
            }
            // If they attended, practical rank is required
            else if (attendedPracticalYes.checked && !practicalRank.value) {
                alert('Please enter your Practical rank');
                valid = false;
            }
        } else {
            if (!generalMeritRank.value) {
                alert('Please enter your rank');
                valid = false;
            }
        }
    }

    if (currentStep === 3) {
        if (!baseCategory.value) {
            alert('Please select your category');
            valid = false;
        }
    }

    return valid;
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    const formData = {
        counsellingType: counsellingType.value,
        courseCategory: courseCategory.value,
        branch: branch.value || null,
        baseCategory: baseCategory.value,
        reservations: {
            kannada: kannadaReservation.checked,
            rural: ruralReservation.checked,
            hyderabadKarnataka: hkReservation.checked
        }
    };

    // Add rank data
    if (dualRankCategories.includes(courseCategory.value)) {
        formData.theoryRank = parseInt(theoryRank.value);
        if (attendedPracticalYes.checked && practicalRank.value) {
            formData.practicalRank = parseInt(practicalRank.value);
        }
    } else {
        formData.generalMeritRank = parseInt(generalMeritRank.value);
    }

    // Show loading
    loadingOverlay.classList.add('active');

    try {
        // Simulate API call (replace with actual API)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For now, show mock results
        displayResults(formData);

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate options. Please try again.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// ============================================================================
// DISPLAY RESULTS
// ============================================================================
function displayResults(formData) {
    const eligibleCategories = generateEligibleCategories({
        baseCategory: formData.baseCategory,
        reservations: formData.reservations
    });

    // Hide form, show results
    document.querySelector('.form-card').style.display = 'none';
    resultsCard.style.display = 'block';

    // Summary
    resultsSummary.innerHTML = `
        <h3 style="color: #2d3748; margin-bottom: 15px;">Search Criteria</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div>
                <strong style="color: #4a5568;">Counselling:</strong>
                <p style="color: #2d3748; margin-top: 5px;">${formData.counsellingType}</p>
            </div>
            <div>
                <strong style="color: #4a5568;">Category:</strong>
                <p style="color: #2d3748; margin-top: 5px;">${formData.courseCategory}</p>
            </div>
            <div>
                <strong style="color: #4a5568;">Your Rank:</strong>
                <p style="color: #2d3748; margin-top: 5px;">${formData.generalMeritRank || `T: ${formData.theoryRank}${formData.practicalRank ? ', P: ' + formData.practicalRank : ' (No Practical)'}`}</p>
            </div>
            <div>
                <strong style="color: #4a5568;">Eligible Categories:</strong>
                <p style="color: #2d3748; margin-top: 5px;">${eligibleCategories.join(', ')}</p>
            </div>
        </div>
    `;

    // Mock results
    resultsList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #718096;">
            <div style="font-size: 48px; margin-bottom: 20px;">🎓</div>
            <h3 style="color: #2d3748; margin-bottom: 10px;">Option Generation Complete!</h3>
            <p>Your personalized college options would appear here.</p>
            <p style="margin-top: 10px;"><small>Note: Full integration with cutoff data is pending.</small></p>
        </div>
    `;

    // Scroll to results
    resultsCard.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// RESET FORM
// ============================================================================
function resetForm() {
    form.reset();
    currentStep = 1;
    updateSteps();
    eligibleCategoriesBox.style.display = 'none';
    document.querySelector('.form-card').style.display = 'block';
    resultsCard.style.display = 'none';
    courseCategory.disabled = true;
    branchGroup.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
updateSteps();
