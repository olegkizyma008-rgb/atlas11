/**
 * Extract GitHub Copilot token from current session
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Check various token locations
const locations = [
    // GitHub CLI
    path.join(os.homedir(), '.config', 'gh', 'hosts.yml'),
    // GitHub Copilot CLI
    path.join(os.homedir(), '.config', 'github-copilot', 'hosts.json'),
    path.join(os.homedir(), '.config', 'github-copilot', 'apps.json'),
];

console.log('🔍 Searching for GitHub tokens...\n');

for (const location of locations) {
    if (fs.existsSync(location)) {
        console.log(`✅ Found: ${location}`);
        const content = fs.readFileSync(location, 'utf-8');
        
        // Try to extract token
        if (location.endsWith('.yml')) {
            const match = content.match(/oauth_token:\s+(gh[op]_[A-Za-z0-9_]+)/);
            if (match) {
                console.log(`\n🎯 Token: ${match[1]}`);
                console.log(`📋 Copied to clipboard!`);
                try {
                    execSync(`echo "${match[1]}" | pbcopy`);
                } catch (e) {}
            }
        } else if (location.endsWith('.json')) {
            try {
                const data = JSON.parse(content);
                console.log('\n📄 Content:');
                console.log(JSON.stringify(data, null, 2));
                
                // Try to find token
                const findToken = (obj) => {
                    for (const key in obj) {
                        if (key === 'oauth_token' || key === 'token') {
                            return obj[key];
                        }
                        if (typeof obj[key] === 'object') {
                            const found = findToken(obj[key]);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                const token = findToken(data);
                if (token) {
                    console.log(`\n🎯 Token: ${token}`);
                    console.log(`📋 Copied to clipboard!`);
                    try {
                        execSync(`echo "${token}" | pbcopy`);
                    } catch (e) {}
                }
            } catch (e) {
                console.log('Failed to parse:', e.message);
            }
        }
        console.log('\n' + '='.repeat(60) + '\n');
    }
}

console.log('\n💡 To use this token in Atlas, set:');
console.log('export COPILOT_API_KEY="<token>"');
