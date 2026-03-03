 VideoJS VAST Plugin
=======================

The goal of this plugin is to allow videojs consumers to display VAST-based ads with the very same video element created by VideoJS.

Contrary to the commonly used Google IMA for VideoJS, this plugin is not opinionated regarding the UI - i.e. it leaves to the consumer to manage changes in the UI to satisfy user needs.

This plugin is based on [video-contrib-ads](https://github.com/videojs/videojs-contrib-ads) to provide common functionality needed by video advertisement libraries like this very plugin. It is also based on Daily Motion's [VAST Client JS](https://github.com/dailymotion/vast-client-js) for fetching and parsing VAST XML resources as well as managing the tracking protocols described in the VAST [documentation](https://www.iab.com/guidelines/vast/) by [Interactive Advertising Bureau (IAB)](https://www.iab.com/). The plugin was tested with VAST manifests of versions 3.0 and newer, but should work with older versions as well.

#### Benefits

* Full control over the player UI while playing an ad
* Ad is played inline in the same video element as the regular video which avoid visual and auditory glitches
* Full support for basic ad types described by the VAST protocol as well satellite features like tracking and verification code
* Ad timeouts are implemented by default. If ads take too long to load, content automatically plays.
* Player state is automatically restored after ad playback, even if the ad played back in the content's video element.

Table of contents

* [Getting Started](#getting-started)
* [Implementing a CTA](#implementing-a-cta)
* [Options](#options)
* [Events](#events)
* [Running locally](#running-locally)
* [Testing](#testing)
* [Credits](#credits)
* [License](#license)

#### Getting Started

In order to start using the VAST Plugin you are supposed to have started a project that consumes VideosJS and have some basic knowledge of its basic concepts and API. To get started, install and include this package in your project's dependencies using npm or yarn:

First, configure your `.npmrc` to use GitHub Packages for the `@artegeie` scope:

```
@artegeie:registry=https://npm.pkg.github.com
```

Then install the package:

```
npm install --save @artegeie/videojs-vast
yarn add @artegeie/videojs-vast
```

Now, import the plugin package and initialize it right after initializing your VideoJS instance. Here's a small snipet that of what it could look like:

```
// Import the necessary packages
import videojs from 'video.js';
import '@artegeie/videojs-vast';

// Create VideoJS instance
const videoJsInstance = videojs('my-player', {
  controls: true,
  autoplay: false,
  preload: 'auto'
});

// Set up the VAST options
const vastVjsOptions = {
  vastUrl: 'https://points-to-vast-manifest.com/',
};

// Initialize the VAST plugin
videoJsInstance.vast(vastVjsOptions);

// Do something with Ads events
videoJsInstance.on('vast.play', (event, data) => {
    console.log('Ad is playing');
});
```

See demo here

https://artegeie.github.io/videojs-vast/

#### Implementing a CTA

The "vast.play" event contains data letting you handle cta clickzone as you want
```
{
  ctaUrl // the url the click should point to
  skipDelay // the time in seconds the skip button should be displayed
  adClickCallback // call this callback on click on your optional clickzone
}
```
By default the plugin handle the cta clickzone. You can disable this default behavior by setting the "addCtaClickZone" to false

#### Options

This plugin currently supports a handful of options that might help you customize it to your needs. Below you can find a description of the options supported to this date. Please bear in mind this is a work in progress and more options should be available in the future, especially if requested through this repository.

* **vastUrl** (string) - The URL where the plugin will fetch the VAST manifest from
* **vmapUrl** (string) - The URL where the plugin will fetch the VMAP manifest from
* **isLimitedTracking** (boolean) - According to the Vast [documentation](https://interactiveadvertisingbureau.github.io/vast/vast4macros/vast4-macros-latest.html#macro-spec-limitadtracking), relates to the LIMITADTRACKING macro. ***Default : false***
* **timeout** (milliseconds - int) - Max amount of time the plugin should wait for the manifest URL to respond and the assets to load. Will throw an error if this value is exceeded. ***Default: 5000***
* **verificationTimeout** (milliseconds - int) - Max amount of time the plugin should wait for the OMID verification URLs to respond and the assets to load. ***Default: 2000***
* **debug** (boolean) - Display detailed logging in the browser console. ***Default: false***
* **addCtaClickZone** (boolean) - Add or not a clickzone for the cta url. ***Default: true***
* **addSkipButton** (boolean) - Add or not a skip button for skippable ads. ***Default: true***
* **skipButtonOptions** (object) - Customize skip button text and style. Warning: ***inlineStyle*** option extends the default value, unless ***resetStyle*** is set to `true`.
***Defaults:***
```
{
  text: "skip >>",
  inlineStyle: "bottom: 90px; cursor: default; padding: 15px; position: absolute; right: 0; z-index: 3; background: rgba(0, 0, 0, 0.8); min-width: 30px; pointer-events: none; display:block;",
  resetStyle: false,
}
```

#### Events

The plugin communicates with the consumer through default event bus built into VideoJS. Here's an example of how one could attach a listener to a vast event using the VideoJS' event bus:

```
// Do something when there is an ad time update
videoJsInstance.on('vast.time', (event, data) => {
    console.log('Ad is playing');
    console.log('Current position - ' + data.position);
    console.log('Total Duration - ' + data.duration);
});
```

Below you can find a list of the events currently supported. Just like the plugin options, this is a work in progress and more events should be available in the future, especially if requested through this repository.

* **vast.playAttempt** - The plugin will try and play a creative of an ad. It might be the case that the creative fails to load, in which case **vast.play** will never be fired
* **vast.play** - The plugin started playing a creative. Contains `ctaUrl`, `skipDelay`, `adClickCallback` and `duration`
* **vast.metadata** - Fired when ad metadata is available. Contains `duration`, `id`, `adId` and `type`
* **vast.time** - Called on each time update during ad playback. Contains `position`, `currentTime` and `duration`
* **vast.skip** - Called when the user skips the current ad
* **vast.complete** - Called once the current ad pod (set of ads) is done playing
* **vast.click** - Called once the plugin successfully registers a click in the call to action element associated with an ad - check the [Implementing a CTA](#implementing-a-cta) section for more details
* **vast.error** - Called if the plugin fails at some point in the process. Contains `message` and optionally `tag`

#### Running locally

The plugin includes a self-contained development environment with a demo page.

* Clone the repository with ```git clone https://github.com/ArteGEIE/videojs-vast.git```
* Install dependencies with ```npm install```
* Run ```npm start``` to start the dev environment (serves the demo on http://localhost:3333, watches for changes and rebuilds automatically)

If you prefer using [**yalc**](https://www.npmjs.com/package/yalc) to test the plugin within your own project:

* Install Yalc globally with ```npm i yalc -g```
* Run ```npm run build:local``` to build and push to the local yalc registry
* In your project, run ```yalc add @artegeie/videojs-vast```

#### Testing

* ```npm test``` - Run all tests (unit + E2E)
* ```npm run test:unit``` - Run unit tests (Vitest)
* ```npm run test:e2e``` - Run E2E tests (Cypress, requires the dev server on port 3333)
* ```npm run test:open``` - Open Cypress interactive runner

#### Credits

This plugin was developed by the Arte web player team from Strasbourg, France. We are open to external contributions and suggestions so feel free to reach us via the discussion section in this repo.

Current contributors and maintainers:
[Coralielm](https://github.com/Coralielm)
[privaloops](https://github.com/privaloops)
[fafaschiavo](https://github.com/fafaschiavo)
[kachanovskyi](https://github.com/kachanovskyi)
[kasty](https://github.com/kasty)

#### License
This plugin, just like Video.js, is licensed under the Apache License, Version 2.0.
