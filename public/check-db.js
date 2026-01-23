const resultsDiv = document.getElementById('results');

async function checkDatabase() {
    resultsDiv.innerHTML = '<p>Loading...</p>';

    try {
        // Check colleges
        const collegesResponse = await fetch('http://localhost:3001/api/colleges');
        const collegesData = await collegesResponse.json();

        // Check courses
        const coursesResponse = await fetch('http://localhost:3001/api/courses');
        const coursesData = await coursesResponse.json();

        const collegesCount = collegesData.total || collegesData.data?.length || 0;
        const coursesCount = coursesData.total || coursesData.data?.length || 0;

        resultsDiv.innerHTML = `
            <h2> Database Status</h2>
            <p style="font-size: 20px;"><strong>Colleges:</strong> <span style="color: #667eea; font-size: 24px;">${collegesCount}</span> records loaded</p>
            <p style="font-size: 20px;"><strong>Courses:</strong> <span style="color: #667eea; font-size: 24px;">${coursesCount}</span> records loaded</p>
            
            <h3>Sample College:</h3>
            <pre style="background: #f7fafc; padding: 15px; border-radius: 8px; overflow: auto;">${JSON.stringify(collegesData.data?.[0], null, 2)}</pre>
            
            <h3>Sample Course:</h3>
            <pre style="background: #f7fafc; padding: 15px; border-radius: 8px; overflow: auto;">${JSON.stringify(coursesData.data?.[0], null, 2)}</pre>
            
            <h3>Full Response:</h3>
            <details>
                <summary style="cursor: pointer; padding: 10px; background: #e6f2ff; border-radius: 6px; margin: 10px 0;">Colleges API Response (click to expand)</summary>
                <pre style="background: #f7fafc; padding: 15px; border-radius: 8px; overflow: auto; max-height: 400px;">${JSON.stringify(collegesData, null, 2)}</pre>
            </details>
            <details>
                <summary style="cursor: pointer; padding: 10px; background: #e6f2ff; border-radius: 6px; margin: 10px 0;">Courses API Response (click to expand)</summary>
                <pre style="background: #f7fafc; padding: 15px; border-radius: 8px; overflow: auto; max-height: 400px;">${JSON.stringify(coursesData, null, 2)}</pre>
            </details>
        `;

        // Log to console as well
        console.log(` Colleges: ${collegesCount}`);
        console.log(` Courses: ${coursesCount}`);

    } catch (error) {
        resultsDiv.innerHTML = `
            <h2> Error</h2>
            <p style="color: red;">${error.message}</p>
            <pre style="background: #fff5f5; padding: 15px; border-radius: 8px;">${error.stack}</pre>
        `;
        console.error(error);
    }
}

// Run on page load
checkDatabase();
