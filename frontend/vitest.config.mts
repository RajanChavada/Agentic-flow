import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolves @/ imports from tsconfig.json
    react(),          // Enables JSX/TSX transformation
  ],
  test: {
    environment: 'jsdom',  // Browser-like environment for React
    globals: true,         // No need to import describe/test/expect
  },
});
