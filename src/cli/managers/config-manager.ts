import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export class ConfigManager {
    private envPath: string;
    private config: Record<string, string> = {};

    constructor(envPath: string = path.resolve(process.cwd(), '.env')) {
        this.envPath = envPath;
        this.load();
    }

    public load() {
        if (fs.existsSync(this.envPath)) {
            const envConfig = dotenv.parse(fs.readFileSync(this.envPath));
            this.config = envConfig;
        }
    }

    public get(key: string): string | undefined {
        return this.config[key];
    }

    public set(key: string, value: string) {
        this.config[key] = value;
        this.saveOne(key, value);
    }

    private saveOne(key: string, value: string) {
        let content = '';
        if (fs.existsSync(this.envPath)) {
            content = fs.readFileSync(this.envPath, 'utf-8');
        }

        const lines = content.split('\n');
        let found = false;

        const newLines = lines.map(line => {
            // Match key=value, handling potential surrounding spaces or quotes
            if (line.trim().startsWith(`${key}=`)) {
                found = true;
                return `${key}=${value}`;
            }
            return line;
        });

        if (!found) {
            // Append if not found (ensure newline)
            if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
                newLines.push('');
            }
            newLines.push(`${key}=${value}`);
        }

        fs.writeFileSync(this.envPath, newLines.join('\n'));
    }

    public getAll(): Record<string, string> {
        return { ...this.config };
    }
}

export const configManager = new ConfigManager();
