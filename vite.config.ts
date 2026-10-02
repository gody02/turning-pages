import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import {startupWorkerJsonAssets} from './scripts/lib/startup-worker-json';
export default defineConfig({ plugins: [react()], worker: {format:'es',plugins:()=>[startupWorkerJsonAssets()]}, test: { exclude: [...configDefaults.exclude, 'tests/browser/**'] } });
