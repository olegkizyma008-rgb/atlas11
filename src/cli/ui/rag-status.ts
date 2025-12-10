import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HOME = process.env.HOME || '/Users/dev';
const RAG_DB_PATH = path.join(HOME, 'mac_assistant_rag/chroma_mac/chroma.sqlite3');
const KNOWLEDGE_BASE_PATH = path.join(HOME, 'mac_assistant_rag/knowledge_base/large_corpus');

/**
 * Get RAG indexing status
 */
export async function getRagIndexStatus(): Promise<{
    indexed: boolean;
    documentCount: number;
    lastUpdated: string;
    dbSize: string;
    repositories: string[];
}> {
    const status = {
        indexed: false,
        documentCount: 0,
        lastUpdated: 'Never',
        dbSize: '0 B',
        repositories: [] as string[]
    };

    try {
        // Check if database exists
        if (!fs.existsSync(RAG_DB_PATH)) {
            return status;
        }

        status.indexed = true;

        // Get document count using Python
        try {
            const pythonScript = `
import sqlite3
conn = sqlite3.connect('${RAG_DB_PATH}')
cur = conn.cursor()
try:
    cur.execute('SELECT COUNT(*) FROM embeddings')
    print(cur.fetchone()[0])
except:
    print(0)
conn.close()
`;
            const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            status.documentCount = parseInt(result) || 0;
        } catch (e) {
            status.documentCount = 0;
        }

        // Get database size
        const stats = fs.statSync(RAG_DB_PATH);
        status.dbSize = formatBytes(stats.size);

        // Get last modified time
        const mtime = new Date(stats.mtime);
        status.lastUpdated = mtime.toLocaleString('uk-UA');

        // Get repositories
        if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
            const items = fs.readdirSync(KNOWLEDGE_BASE_PATH);
            status.repositories = items.filter(item => {
                const fullPath = path.join(KNOWLEDGE_BASE_PATH, item);
                try {
                    return fs.statSync(fullPath).isDirectory();
                } catch {
                    return false;
                }
            });
        }
    } catch (error) {
        // Return default status on error
    }

    return status;
}

/**
 * Search RAG database
 */
export async function searchRag(query: string, limit: number = 3): Promise<Array<{
    source: string;
    content: string;
    similarity?: number;
}>> {
    const results: Array<{ source: string; content: string; similarity?: number }> = [];

    try {
        if (!fs.existsSync(RAG_DB_PATH)) {
            return results;
        }

        // Use Python to search RAG database
        try {
            const pythonScript = `
import sqlite3
import json

conn = sqlite3.connect('${RAG_DB_PATH}')
cur = conn.cursor()

try:
    # Try searching in documents table
    cur.execute('''
        SELECT id, document, metadata FROM documents 
        WHERE document LIKE ? 
        LIMIT ?
    ''', ('%${query}%', ${limit}))
    
    rows = cur.fetchall()
    for row in rows:
        try:
            metadata = json.loads(row[2] or '{}')
            print(json.dumps({
                'source': metadata.get('source', 'Unknown'),
                'content': row[1][:300] if row[1] else '',
                'similarity': 0.8
            }))
        except:
            pass
except:
    # Fallback: search in all tables
    pass

conn.close()
`;
            const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore']
            });

            const lines = result.trim().split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    results.push(parsed);
                } catch (e) {
                    // Skip invalid JSON lines
                }
            }
        } catch (e) {
            // Return empty results on error
        }
    } catch (error) {
        // Return empty results on error
    }

    return results;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Display RAG status in CLI
 */
export async function displayRagStatus(): Promise<void> {
    console.clear();
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(chalk.cyan(`  │ ${chalk.green('●')} RAG Database Status              ${chalk.green('●')} │`));
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log('');

    const status = await getRagIndexStatus();

    console.log(chalk.cyan('  📊 Indexing Status'));
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(`  ${chalk.green('●')} Indexed             ${status.indexed ? chalk.green('✓ YES') : chalk.red('✗ NO')}`);
    console.log(`  ${chalk.green('●')} Documents           ${chalk.cyan(status.documentCount.toString())}`);
    console.log(`  ${chalk.green('●')} Database Size       ${chalk.cyan(status.dbSize)}`);
    console.log(`  ${chalk.green('●')} Last Updated        ${chalk.cyan(status.lastUpdated)}`);
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log('');

    if (status.repositories.length > 0) {
        console.log(chalk.cyan('  📚 Indexed Repositories'));
        console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
        for (const repo of status.repositories) {
            console.log(`  ${chalk.green('●')} ${repo}`);
        }
        console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
        console.log('');
    }

    console.log(chalk.gray('  Press Enter to continue...'));
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
}

/**
 * Display RAG search results
 */
export async function displayRagSearch(query: string): Promise<void> {
    console.clear();
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(chalk.cyan(`  │ ${chalk.green('●')} RAG Search Results               ${chalk.green('●')} │`));
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log('');

    console.log(chalk.gray(`  Query: "${query}"\n`));

    const results = await searchRag(query, 5);

    if (results.length === 0) {
        console.log(chalk.yellow('  ⚠ No results found'));
    } else {
        console.log(chalk.green(`  ✓ Found ${results.length} results\n`));
        
        for (let i = 0; i < results.length; i++) {
            console.log(chalk.cyan(`  ◆─────────────────────────────────────────◆`));
            console.log(chalk.cyan(`  │ Result ${i + 1}`));
            console.log(chalk.cyan(`  ◆─────────────────────────────────────────◆`));
            console.log(`  ${chalk.green('●')} Source: ${chalk.gray(results[i].source)}`);
            console.log(`  ${chalk.green('●')} Content:`);
            console.log(`  ${chalk.gray(results[i].content.split('\n').join('\n  '))}`);
            console.log('');
        }
    }

    console.log(chalk.gray('  Press Enter to continue...'));
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
}
