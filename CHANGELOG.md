## [1.7.4](https://github.com/ArteGEIE/videojs-vast/compare/v1.7.3...v1.7.4) (2026-08-26)

### Changed

- **VAST-94:** Drop `safari11` from the ESM build target. The target declared `['es2020', 'safari11']`, which is contradictory since Safari 11 predates ES2020. esbuild kept the most restrictive target and had to downlevel destructuring for Safari 11, which it cannot do below Safari 15: 0.27 stayed silent and emitted the code untransformed, while 0.28 fails the build outright
- Bump `esbuild` from 0.27.3 to 0.28.2, unblocked by the target fix above

### Bundle impact

`dist/mjs/index.js` drops from 38 KB to 36 KB. The only removed code is the `__spreadValues` helper set, which esbuild emitted to transpile object spread for Safari 11. Native object spread is supported from Safari 11.1, and web-front targets `safari >= 12`, so no supported browser relied on those helpers. `dist/cjs/index.js` is unchanged: the CommonJS build never declared a target.

Integrators supporting Safari 11.0 exactly would be affected. Note that destructuring was never transpiled for that target anyway, so the guarantee it implied was not actually produced.



## [1.7.3](https://github.com/ArteGEIE/videojs-vast/compare/v1.7.2...v1.7.3) (2026-08-21)

### Changed

- **VAST-89:** Vendor the Video.js stylesheet in the demo page. It was loaded from the `vjs.zencdn.net` CDN, which sat in the critical path of the Cypress e2e job since that page is its fixture. It is now bundled from the local `video.js` dependency, which also realigns it with the player version (the CDN served a pinned 8.0.4 against video.js 8.3.0)
- **VAST-89:** Run the demo bundler on `npm start`, so a fresh clone is served with its script and styles instead of waiting for the first change under `src/`
- **VAST-93:** Bump `@xmldom/xmldom` from 0.8.7 to 0.8.14, clearing all advisories reported by `npm audit`. The vulnerable code path (XML serialization) was never reached in this project
- Dependency maintenance: 16 Dependabot updates merged, including `cypress`, `axios`, `@babel/core`, `vite`, `postcss` and `lodash`

### Notes

No functional change for integrators: `dist/cjs` and `dist/mjs` are unchanged since 1.7.2, and the declared dependencies are identical. This release covers tooling, the demo page and transitive dependency hygiene.



## [1.7.2](https://github.com/ArteGEIE/videojs-vast/compare/v1.7.1...v1.7.2) (2026-06-23)


### Bug Fixes

* play content on empty/no-ad VAST (VAST-92) ([#120](https://github.com/ArteGEIE/videojs-vast/issues/120)) ([267e492](https://github.com/ArteGEIE/videojs-vast/commit/267e4923ad3a4ae0764d265d058ab6e3148922ff))



## [1.7.1](https://github.com/ArteGEIE/videojs-vast/compare/v1.7.0...v1.7.1) (2026-06-23)


### Bug Fixes

* emit vast.play (AD_STARTED) on real ad start instead of adstart (VAST-90) ([#119](https://github.com/ArteGEIE/videojs-vast/issues/119)) ([4cdcabf](https://github.com/ArteGEIE/videojs-vast/commit/4cdcabf37f9b74b1752e1dcd769787646291a729))



## [1.7.0](https://github.com/ArteGEIE/videojs-vast/compare/v1.6.0...v1.7.0) (2026-06-11)

### Changed

- **PLAYER-3664:** Forward the preroll media URL (`streamUrl`) in the `vast.play` event payload, consumed by arteVp SST for the `AD_STARTED` event

## [1.6.0](https://github.com/ArteGEIE/videojs-vast/compare/1.5.4...v1.6.0) (2026-03-03)

### Changed

- **VAST-73:** Migrate package from NPM to GitHub Packages (`@artegeie/videojs-vast`)
- Add GitHub Actions workflow for automated publishing on tag push

## [1.5.4](https://github.com/ArteGEIE/videojs-vast/compare/1.5.3...1.5.4) (2026-02-06)



## [1.5.3](https://github.com/ArteGEIE/videojs-vast/compare/1.5.2...1.5.3) (2025-06-24)


### Bug Fixes

* **VAST-70:** Fix suppressedTracks error on live streams ([#69](https://github.com/ArteGEIE/videojs-vast/issues/69)) ([3c06fdd](https://github.com/ArteGEIE/videojs-vast/commit/3c06fdd279051cb460521bf2ae54dede637d9ba8))



## [1.5.2](https://github.com/ArteGEIE/videojs-vast/compare/1.5.1...1.5.2) (2025-06-24)



## [1.5.1](https://github.com/ArteGEIE/videojs-vast/compare/1.4.0...1.5.1) (2024-12-05)


### Bug Fixes

* **VAST-68:** Fix demo url in readme ([#65](https://github.com/ArteGEIE/videojs-vast/issues/65)) ([18081b2](https://github.com/ArteGEIE/videojs-vast/commit/18081b2f71b47e3010bb50d4509acaa5e873aff5))
* **VAST-69:** Fix error this.player is null ([#66](https://github.com/ArteGEIE/videojs-vast/issues/66)) ([84cbab9](https://github.com/ArteGEIE/videojs-vast/commit/84cbab9abc2cff87bafa6c9c1f90f4cb1d252172))


### Features

* **VAST-67:** add keywords to be listed in official plugins list ([#62](https://github.com/ArteGEIE/videojs-vast/issues/62)) ([a6dc8ab](https://github.com/ArteGEIE/videojs-vast/commit/a6dc8abd2476c687d75b2604f5ce874c8508dd94))



# [1.4.0](https://github.com/ArteGEIE/videojs-vast/compare/1.3.0...1.4.0) (2024-02-07)


### Features

* **VAST-55:** Fix circular dependencies ([#59](https://github.com/ArteGEIE/videojs-vast/issues/59)) ([39d3e8f](https://github.com/ArteGEIE/videojs-vast/commit/39d3e8f30984ea843971acd5416dabd57f6afa17))
* **VAST-62:** Make the skip button label configurable ([#58](https://github.com/ArteGEIE/videojs-vast/issues/58)) ([1cf6d8c](https://github.com/ArteGEIE/videojs-vast/commit/1cf6d8cd62fd96477f65abc1d4ed85c2a7d1b156))



# [1.3.0](https://github.com/ArteGEIE/videojs-vast/compare/1.2.1...1.3.0) (2024-01-03)


### Features

* **VAST-59:** Add a watcher to build automatically during dev ([#53](https://github.com/ArteGEIE/videojs-vast/issues/53)) ([979b85d](https://github.com/ArteGEIE/videojs-vast/commit/979b85daa727207a7508cb54eab41db937301e3f))
* **VAST-60:** simpler changelog ([#54](https://github.com/ArteGEIE/videojs-vast/issues/54)) ([6432797](https://github.com/ArteGEIE/videojs-vast/commit/643279736402c7c994cba3d843ed0f588c93be63))
* **VAST-63:** send a metadata event ([#56](https://github.com/ArteGEIE/videojs-vast/issues/56)) ([3826695](https://github.com/ArteGEIE/videojs-vast/commit/38266958b0d10672d3cdf83066eaca956ece03d0))
* **VAST-64:** e2e tests randomly fails ([#57](https://github.com/ArteGEIE/videojs-vast/issues/57)) ([7478b4b](https://github.com/ArteGEIE/videojs-vast/commit/7478b4b46819ab4d5fd2b1cdc929689aa0906eb5))



## [1.2.1](https://github.com/ArteGEIE/videojs-vast/compare/1.2.0...1.2.1) (2023-10-27)


### Bug Fixes

* **VAST-46:** remove forgotten command ([#50](https://github.com/ArteGEIE/videojs-vast/issues/50)) ([fe6f695](https://github.com/ArteGEIE/videojs-vast/commit/fe6f695f439fd66d620a67d52718e838ed873314))



# [1.2.0](https://github.com/ArteGEIE/videojs-vast/compare/1.1.4...1.2.0) (2023-10-27)


### Features

* **VAST-46:** use github actions to generate releases ([#38](https://github.com/ArteGEIE/videojs-vast/issues/38)) ([32c4492](https://github.com/ArteGEIE/videojs-vast/commit/32c44922644a5f79d18f7abfaec439c485728070))
* **VAST-56:** set display block explicitly ([#47](https://github.com/ArteGEIE/videojs-vast/issues/47)) ([332714b](https://github.com/ArteGEIE/videojs-vast/commit/332714b578cfc717e36a42a1720f8d122f97ed54))
* **VAST-57:** Test progressBar existence before enable/disable ([#48](https://github.com/ArteGEIE/videojs-vast/issues/48)) ([7509835](https://github.com/ArteGEIE/videojs-vast/commit/7509835d653a8b5c834bcec485de61f689de47dd))



## [1.1.4](https://github.com/ArteGEIE/videojs-vast/compare/1.1.3...1.1.4) (2023-08-23)



## [1.1.2](https://github.com/ArteGEIE/videojs-vast/compare/1.1.1...1.1.2) (2023-07-04)


### Bug Fixes

* **VAST-47:** add target to es6 esbuild ([#39](https://github.com/ArteGEIE/videojs-vast/issues/39)) ([2888945](https://github.com/ArteGEIE/videojs-vast/commit/2888945ea3dc1b4455b1da95d9d91624d6e26a76))



## [1.1.1](https://github.com/ArteGEIE/videojs-vast/compare/1.1.0...1.1.1) (2023-07-03)



# [1.1.0](https://github.com/ArteGEIE/videojs-vast/compare/1.0.1...1.1.0) (2023-06-27)


### Bug Fixes

* **VAST-42:** add @babel/node dep ([#32](https://github.com/ArteGEIE/videojs-vast/issues/32)) ([8741b95](https://github.com/ArteGEIE/videojs-vast/commit/8741b95e9db2f30418f394be01e6af71ad36fafd))


### Features

* **VAST-41:** Add vmap combo in demo page ([#34](https://github.com/ArteGEIE/videojs-vast/issues/34)) ([a48a72b](https://github.com/ArteGEIE/videojs-vast/commit/a48a72b538f3cbadff50072d180e0aff9c0e51a1))
* **VAST-43:** update env var names ([#33](https://github.com/ArteGEIE/videojs-vast/issues/33)) ([0883803](https://github.com/ArteGEIE/videojs-vast/commit/0883803c370edfb16058fb35899960a3fc03edeb))



# [1.0.0](https://github.com/ArteGEIE/videojs-vast/compare/v0.5.0-beta.1...1.0.0) (2023-05-23)


### Features

* **VAST-35:** Add Complete VAST specs (4.3) ([#26](https://github.com/ArteGEIE/videojs-vast/issues/26)) ([24bad42](https://github.com/ArteGEIE/videojs-vast/commit/24bad422ca6befd670e702a9f18bf15d13e10819))
* **VAST-39:** Deploy demo on Github Pages ([#27](https://github.com/ArteGEIE/videojs-vast/issues/27)) ([bb63625](https://github.com/ArteGEIE/videojs-vast/commit/bb636255ba7a25a9782ebbd90c8bb81cf047114a))
