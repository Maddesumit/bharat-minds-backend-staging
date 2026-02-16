const dns = require('node:dns');

// Apply the same fix as in index.ts
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

console.log('Resolving cloud.appwrite.io...');
dns.lookup('cloud.appwrite.io', { all: true }, (err, addresses) => {
    if (err) {
        console.error('Lookup failed:', err);
    } else {
        console.log('Addresses:', addresses);
    }
});
