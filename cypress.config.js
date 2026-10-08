const { defineConfig } = require('cypress')

// `npm run dev` allocates this port so that several worktrees can serve the demo at once. Falling
// back to 3333 keeps the CI and a plain `npm start` unchanged — the same `${PORT_WEB:-3333}` the
// `serve` script uses, so both ends agree, empty value included.
//
// Validated rather than interpolated as-is: a non-numeric value would take over the host, since
// `PORT_WEB='@evil.example'` turns `localhost:` into userinfo and points the suite elsewhere.
const raw = process.env.PORT_WEB;
const port = raw ? Number(raw) : 3333;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT_WEB=${raw} is not a valid port (integer from 1 to 65535)`);
}

module.exports = defineConfig({
  chromeWebSecurity: false,
  e2e: {
    baseUrl: `http://localhost:${port}`,
    video: false,
    experimentalWebKitSupport: true,
  },
});
