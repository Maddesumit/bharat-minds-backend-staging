/**
 * Simple utility to convert JSON objects to CSV string
 */
export function jsonToCsv(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(fieldName => {
                const value = row[fieldName];
                // Escape commas and wrap in quotes if string
                if (typeof value === 'string') {
                    const escaped = value.replace(/"/g, '""');
                    return `"${escaped}"`;
                }
                return value ?? '';
            }).join(',')
        )
    ];

    return csvRows.join('\n');
}
