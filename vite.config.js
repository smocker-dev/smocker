import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pluginRewriteAll from 'vite-plugin-rewrite-all';

export default defineConfig({
  root: './client/',
  server: {
    base: '/',
    proxy: {
      '/version': 'http://localhost:8081/',
      '/reset': 'http://localhost:8081/',
      '/mocks': 'http://localhost:8081/',
      '/history': 'http://localhost:8081/',
      '/sessions': 'http://localhost:8081/',
    },
  },
  base: './',
  build: {
    outDir: '../build',
  },
  plugins: [
    react({
      include: ['./client/**/*.{jsx,tsx}'],
    }),
    // Used to fix when dot is present in dynamic path
    pluginRewriteAll(),
  ],
  rewrites: [{ source: '/(.*)', destination: '/' }],
});
