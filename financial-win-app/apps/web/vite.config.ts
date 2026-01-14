import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Nota: Hay una incompatibilidad conocida de tipos entre Vite 7 y @vitejs/plugin-react.
// Esto no afecta la funcionalidad, solo es un problema de tipos de TypeScript.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig({
  plugins: [react()] as any,
  resolve: {
    alias: {
      '@': '/src',
    },
    // Configuración para resolver módulos ES correctamente
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      mainFields: ['module', 'main'],
    },
  },
  build: {
    outDir: 'dist',
    // Sourcemaps solo en desarrollo (reducir tamaño del build en producción)
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        // Agregar hash a los archivos para evitar caché
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: id => {
          // Separar React Query en su propio chunk
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          // Separar React Router en su propio chunk
          if (id.includes('react-router')) {
            return 'react-router';
          }
          // Separar otras dependencias grandes de node_modules
          if (id.includes('node_modules')) {
            // Agrupar librerías grandes
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('axios') || id.includes('zustand')) {
              return 'utils';
            }
            // Resto de node_modules
            return 'vendor';
          }
        },
      },
    },
    // Configuración para evitar problemas de caché en producción
    assetsInlineLimit: 4096,
  },
  server: {
    port: 3003,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://api:6006',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  // Configuración para manejar TypeScript
  esbuild: {
    target: 'es2020',
  },
  // Configuración para evitar problemas de dependencias
  define: {
    global: 'globalThis',
  },
});
