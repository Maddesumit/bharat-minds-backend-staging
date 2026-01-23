// ============================================================================
// COURSE SEARCH
// ============================================================================
function handleCourseSearch() {
    const query = courseSearch.value.trim().toLowerCase();

    if (query.length < 2) {
        courseResults.classList.remove('active');
        return;
    }

    console.log(`🔍 Searching courses for: "${query}"`);
    console.log(` Total courses: ${state.courses.length}`);

    // Show sample on first search
    if (state.courses.length > 0 && query.length === 2) {
        console.log('Sample course structure:', state.courses[0]);
    }

    const filtered = state.courses.filter(course => {
        // Handle all possible field variations
        const code = (course.branchCode || course.courseCode || course.courseType || '').toLowerCase();
        const name = (course.branchName || course.courseName || course.courseType || '').toLowerCase();
        const type = (course.courseType || '').toLowerCase();

        return code.includes(query) || name.includes(query) || type.includes(query);
    }).slice(0, 10);

    console.log(` Found ${filtered.length} matches`);

    displayCourseResults(filtered);
}

function displayCourseResults(courses) {
    if (courses.length === 0) {
        courseResults.innerHTML = '<div class="no-results">No courses found</div>';
        courseResults.classList.add('active');
        return;
    }

    courseResults.innerHTML = courses.map(course => {
        const code = course.branchCode || course.courseCode || course.courseType || 'N/A';
        const name = course.branchName || course.courseName || course.courseType || 'Unnamed Course';

        return `
        <div class="search-result-item" 
             data-type="course"
             data-id="${course.$id || course.branchCode || course.courseCode}"
             data-code="${escapeHtml(code)}"
             data-name="${escapeHtml(name)}">
            <div class="result-code">${code}</div>
            <div class="result-name">${name}</div>
        </div>
    `;
    }).join('');

    courseResults.classList.add('active');

    // Add click listeners to results
    courseResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            selectCourse(
                item.dataset.id,
                item.dataset.code,
                item.dataset.name
            );
        });
    });
}

function selectCourse(id, code, name) {
    const course = { id, code, name };

    if (state.selectedCourses.find(c => c.id === id)) {
        return;
    }

    state.selectedCourses.push(course);
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
