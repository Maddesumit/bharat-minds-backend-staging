
const http = require('http');

const rankData = JSON.stringify({
    userId: 'user123',
    counsellingType: 'UGCET',
    courseCategory: 'Farm Science',
    generalMeritRank: 15000,
    theoryRank: 15000,
    practicalRank: 15000,
    baseCategory: 'GM'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/options/ranks',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': rankData.length
    }
};

console.log('Testing /api/options/ranks...');
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`BODY: ${data}`);

        if (res.statusCode === 200 || res.statusCode === 201) {
            testGenerate();
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with saveRank: ${e.message}`);
});

req.write(rankData);
req.end();

function testGenerate() {
    const genOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/options/generate/user123',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': 0
        }
    };

    console.log('\nTesting /api/options/generate/user123...');
    const genReq = http.request(genOptions, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`BODY: ${data}`);
        });
    });

    genReq.on('error', (e) => {
        console.error(`problem with generateOptions: ${e.message}`);
    });

    genReq.end();
}
