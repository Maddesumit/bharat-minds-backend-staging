
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'updated_FoodSc_file(in).csv');
console.log('Reading file:', filePath);

try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n');
    if (lines.length > 0) {
        console.log('Line 1 length:', lines[0].length);
        console.log('Line 1 content (1-200 chars):', lines[0].substring(0, 200));
        if (lines.length > 1) {
            console.log('Line 2 content (1-100 chars):', lines[1].substring(0, 100));
        }
    }
} catch (err) {
    console.error('Error:', err);
}
