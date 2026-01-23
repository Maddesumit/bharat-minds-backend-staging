async function inspectCourses() {
    const response = await fetch('http://localhost:3001/api/courses');
    const data = await response.json();

    const infoDiv = document.getElementById('info');

    const fieldNames = data.data && data.data.length > 0 ? Object.keys(data.data[0]) : [];

    infoDiv.innerHTML = `
        <h2>API Response:</h2>
        <p><strong>Success:</strong> ${data.success}</p>
        <p><strong>Total:</strong> ${data.total}</p>
        <p><strong>Courses Loaded:</strong> ${data.data?.length || 0}</p>
        
        <h2>First 3 Courses (Full Structure):</h2>
        <pre>${JSON.stringify(data.data?.slice(0, 3), null, 2)}</pre>
        
        <h2>Field Names Present:</h2>
        <pre>${fieldNames.join('\n')}</pre>
        
        <h2>Search Test:</h2>
        <p>Type 'cs' or 'computer' or 'engineering' to test:</p>
        <input type="text" id="testSearch" placeholder="Type to search..." style="width: 300px; padding: 10px; font-size: 16px;">
        <div id="testResults" style="margin-top: 10px;"></div>
    `;

    // Add search test
    const courses = data.data || [];
    const testSearch = document.getElementById('testSearch');
    const testResults = document.getElementById('testResults');

    testSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            testResults.innerHTML = '';
            return;
        }

        console.log(`🔍 Testing search for: "${query}"`);

        // Filter courses
        const matches = courses.filter(course => {
            const code = (course.branchCode || course.courseCode || course.courseType || '').toLowerCase();
            const name = (course.branchName || course.courseName || course.courseType || '').toLowerCase();
            const type = (course.courseType || '').toLowerCase();

            return code.includes(query) || name.includes(query) || type.includes(query);
        });

        console.log(` Total matches: ${matches.length}`);
        if (matches.length > 0) {
            console.log('Sample matches:', matches.slice(0, 3));
        }

        testResults.innerHTML = `
            <h3 style="color: ${matches.length > 0 ? 'green' : 'red'};">
                ${matches.length > 0 ? '' : ''} Matches found: ${matches.length}
            </h3>
            <pre>${JSON.stringify(matches.slice(0, 5), null, 2)}</pre>
        `;
    });

    console.log(' Course inspector loaded');
    console.log('Total courses:', courses.length);
    console.log('Field names:', fieldNames);
    if (courses.length > 0) {
        console.log('Sample course:', courses[0]);
    }
}

inspectCourses();
