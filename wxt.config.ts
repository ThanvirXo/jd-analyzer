import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JD Match Analyzer',
    version: '1.0.0',
    description:
      'Instantly score how well your resume matches any job description on LinkedIn, Naukri, and Indeed.',
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      '*://*.linkedin.com/*',
      '*://*.naukri.com/*',
      '*://*.indeed.com/*',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
