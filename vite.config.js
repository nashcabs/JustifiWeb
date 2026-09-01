import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const basePath = process.env.BASE_PATH || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  function rewritePublicAssetPaths() {
    return {
      name: 'rewrite-public-asset-paths',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/src/') && !id.endsWith('/index.html') && !id.endsWith('index.html')) {
          return null;
        }

        if (!code.includes('/assets/')) {
          return null;
        }

        return code.replace(/\/assets\//g, `${normalizedBasePath}assets/`);
      }
    };
  }

  return {
    base: normalizedBasePath,
    plugins: [rewritePublicAssetPaths(), react()],
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['chart.js/auto']
          }
        }
      }
    },
    server: {
      port: 3000,
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com https://i.ytimg.com https://*.googleusercontent.com https://*.firebaseapp.com; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://apis.google.com https://storage.googleapis.com https://firebase.googleapis.com; frame-src 'self' https://*.firebaseapp.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
      }
    },
    preview: {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com https://i.ytimg.com https://*.googleusercontent.com https://*.firebaseapp.com; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://apis.google.com https://storage.googleapis.com https://firebase.googleapis.com; frame-src 'self' https://*.firebaseapp.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
      }
    }
  };
});