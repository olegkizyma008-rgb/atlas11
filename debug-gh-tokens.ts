
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

async function scanTokens() {
    console.log('Scanning tokens...');

    // Check files existence
    const appsPath = path.join(os.homedir(), '.config', 'github-copilot', 'apps.json');
    const hostsPath = path.join(os.homedir(), '.config', 'github-copilot', 'hosts.json');

    console.log(`Checking apps.json at: ${appsPath}`);
    if (fs.existsSync(appsPath)) {
        console.log('✅ apps.json found!');
        try {
            const content = JSON.parse(fs.readFileSync(appsPath, 'utf-8'));
            console.log('Content keys:', Object.keys(content));
            for (const key in content) {
                const entry = content[key];
                if (entry.user) {
                    console.log(`Found user: ${entry.user}, Token prefix: ${entry.oauth_token?.substring(0, 4)}`);
                }
            }
        } catch (e) {
            console.error('Error reading apps.json:', e);
        }
    } else {
        console.error('❌ apps.json NOT found');
    }

    console.log(`Checking hosts.json at: ${hostsPath}`);
    if (fs.existsSync(hostsPath)) {
        console.log('✅ hosts.json found!');
        const content = JSON.parse(fs.readFileSync(hostsPath, 'utf-8'));
        console.log(content);
    } else {
        console.error('❌ hosts.json NOT found');
    }
}

scanTokens();
