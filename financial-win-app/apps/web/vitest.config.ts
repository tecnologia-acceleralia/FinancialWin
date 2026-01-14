import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitest.dev/config/
// Nota: defineConfig de vite es compatible con vitest, pero hay una incompatibilidad
// conocida de tipos entre Vite 7 y los tipos de Vitest. Esto no afecta la funcionalidad.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles se puede agregar cuando se necesite configuración de tests
    // setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
} as any);
