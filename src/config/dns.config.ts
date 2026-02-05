import * as dns from 'node:dns';

// Force usage of IPv4 for DNS resolution to avoid connectivity issues with Appwrite Cloud (IPv6 timeouts)
try {
    if (dns.setDefaultResultOrder) {
        dns.setDefaultResultOrder('ipv4first');
        console.log('✅ DNS Resolution: Set to ipv4first');
    }
} catch (error) {
    console.warn('⚠️  Failed to set DNS result order:', error);
}

// Set DNS lookup timeout (5 seconds)
dns.setServers([
    '8.8.8.8',      // Google DNS
    '8.8.4.4',      // Google DNS Secondary
    '1.1.1.1',      // Cloudflare DNS
]);

console.log('✅ DNS Servers configured:', dns.getServers());
