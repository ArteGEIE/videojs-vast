const { defineConfig } = require('cypress')

module.exports = defineConfig({
  chromeWebSecurity: false,
  e2e: {
    baseUrl: 'http://localhost:3333',
    video: false,
    experimentalWebKitSupport: true,
  },
});
