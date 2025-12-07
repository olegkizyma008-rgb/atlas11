import { resolve, join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { cpSync, mkdirSync, existsSync } from 'fs'

// Plugin to copy Python organs after build
function copyPythonOrgans() {
    return {
        name: 'copy-python-organs',
        closeBundle() {
            const srcOrgans = resolve(__dirname, 'src/kontur/organs');
            const srcAg = resolve(__dirname, 'src/kontur/ag');
            const destOrgans = resolve(__dirname, 'out/kontur/organs');
            const destAg = resolve(__dirname, 'out/kontur/ag');

            try {
                mkdirSync(destOrgans, { recursive: true });
                mkdirSync(destAg, { recursive: true });

                // Copy all .py files from organs
                if (existsSync(srcOrgans)) {
                    cpSync(srcOrgans, destOrgans, {
                        recursive: true,
                        filter: (src) => src.endsWith('.py') || !src.includes('.')
                    });
                    console.log('[PLUGIN] Copied Python organs to out/kontur/organs/');
                }

                // Copy all .py files from ag
                if (existsSync(srcAg)) {
                    cpSync(srcAg, destAg, {
                        recursive: true,
                        filter: (src) => src.endsWith('.py') || !src.includes('.')
                    });
                    console.log('[PLUGIN] Copied AG modules to out/kontur/ag/');
                }
            } catch (e) {
                console.error('[PLUGIN] Failed to copy Python files:', e);
            }
        }
    };
}

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin(), copyPythonOrgans()],
        resolve: {
            alias: {
                '@kontur': resolve('src/kontur'),
                '@modules': resolve('src/modules'),
                '@shared': resolve('src/shared')
            }
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
                '@shared': resolve('src/shared')
            }
        },
        plugins: [react()]
    }
})
