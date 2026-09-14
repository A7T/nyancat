import { defineConfig } from '@playwright/test';
const port=Number(process.env.NYAN10CHAN_TEST_PORT || 5174);
export default defineConfig({
  testDir:'./tests/browser',
  use:{baseURL:`http://127.0.0.1:${port}`,channel:'chrome',viewport:{width:1440,height:1050}},
  webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:!process.env.CI},
});
