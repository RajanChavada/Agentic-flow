import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolves @/ imports from tsconfig.json
    react(),          // Enables JSX/TSX transformation
  ],
  test: {
    environment: 'happy-dom',  // happy-dom avoids jsdom ESM compat issue (see AGENT_MEMORY)
    globals: true,         // No need to import describe/test/expect
    setupFiles: ['./vitest.setup.ts'],
  },
});
