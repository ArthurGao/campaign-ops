import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The shared domain is consumed as TypeScript source, so the standalone build needs no core build step.
const core = path.resolve(__dirname, '../packages/core/src/index.ts');

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@campaign-ops\/core$/, replacement: core },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  server: { port: Number(process.env.PORT ?? 5400), strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5401, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
