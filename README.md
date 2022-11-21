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
* [Runnning locally](#runnning-locally)
* [Credits](#credits)
* [License](#license)

#### Getting Started

In order to start using the VAST Plugin you are supposed to have started a project that consumes VideosJS and have some basic knowledge of its basica concepts and API. To get started, install and include this package in your project's dependencies using npm or yarn:

```
npm install --save @arte/videojs-vast-plugin
yarn add @arte/videojs-vast-plugin
```

Now, import the plugin package and initialize it right after initializing your VideoJS instance. Here's a small snipet that of what it could look like:

```
// Import the necessary packages
import videojs from 'video.js';
import 'videojs-vast';

// Create VideoJS instance
const videoJsInstance = videojs('my-player', {
  controls: true,
  autoplay: false,
  preload: 'auto'
});

// Set up the VAST options
const vastVjsOptions = {
  vastUrl: 'https://points-to-vast-manifest.com/'
};

// Initialize the VAST plugin
videoJsInstance.vast(vastVjsOptions);

// Do something with Ads events
videojsInstance.on('vast.play', (event, data) => {
    console.log('Ad is playing');
});
```

#### Implementing a CTA

Since the basic philosophy of this plugin is to give the consumer full control over the UI of the player, it does not implement any call to action (CTA) element by default. We do have plans to implement an optional parameter that would render a default clickzone in case you don't want to manage that yourself, but for now it is expected from the consumer that a clickzone is present to capture user clicks in ads.

Assuming that you have a clickzone implemented, you can easily trigger a click by firing an **adClicked** event in the built in VideoJS event bus as shown in the command below. The plugin will then take care of finding the correct CTA URL in the VAST manifest and redirecting the user to that URL.

```
// Trigger an ad click callback
videojsInstance.trigger('adClicked');
```

#### Options

This plugin currently supports a handful of options that might help you customize it to your needs. Below you can find a description of the options supported to this date. Please bear in mind this is a work in progress and more options should be available in the future, especially if requested through this repository.

* **vastURL** (string - required) - The URL where the plugin will fetch the VAST manifest from. The 
* **isLimitedTracking** (boolean) - ACcording to the Vast [documentation](https://interactiveadvertisingbureau.github.io/vast/vast4macros/vast4-macros-latest.html#macro-spec-limitadtracking), relates to the LIMITADTRACKING macro
* **timeout** (milliseconds - int) - Max amount of time the plugin should wait for the manifest URL to respond and the assets to load. Will throw an error if this value is exceeded.
* **debug** (boolean) - Display detailed logging in the browser console.

#### Events

The plugin communicates with the consumer through default event bus built into VideoJS. Here's an example of how one could attach a listener to a vast event using the VideoJS' event bus:

```
// Do something when there is an ad time update
videojsInstance.on('vast.time', (event, data) => {
    console.log('Ad is playing');
    console.log('Current position - ' + data.position);
    console.log('Total Duration - ' + data.duration);
});
```

Below you can find a list of the events currently supported. Just like the plugin options, this is a work in progress and more events should be available in the future, especially if requested through this repository.

* **vast.canplay** - The plugin successfully parsed the VAST manifest and is capable of playing an ad
* **vast.playAttempt** - The plugin will try and play a creative of an ad. It might be the case that the creative fails to load, in which case **vast.play** will never be fired
* **vast.play** - The plugin started playing a creative
* **vast.time** - Called every 100ms or so, this event gives the consumer an update of the current position within a creative
* **vast.complete** - Called once the current ad pod (set of ads) is done playing
* **vast.error** - Called if the plugin fails at some point in the process
* **vast.click** - Called once the plugin succeffully registers a click in the call to action element associated with an ad - check the [Implementing a CTA](#implementing-a-cta) section for more details

#### Runnning locally

Running the plugin locally to further develop it is quite simple. Since the plugin repository does not contain any self contained development environment, we recommend using [**yalc**](https://www.npmjs.com/package/yalc) to publish the package in a local repository and then use [**yalc**](https://www.npmjs.com/package/yalc) again to install the plugin from the same local repository in in a dedicated development environment or even within the project you are working on.

Here's a small step-by-step to run the plugin locally.

* Install Yalc globally with ```npm i yalc -g``` or, using yarn: ```yarn global add yalc```
* Clone the repository with ```git clone https://github.com/ArteGEIE/videojs-vast.git```
* Install the plugin dependencies with ```npm install``` or ```yarn```
* Run the plugin in watch mode with ```npm start``` or ```yarn start```, leave this terminal open while you are working on the plugin's code
* In your local project, run ```yalc add videojs-vast``` to install the plugin from your local repository
* Run your project normally, it will consume the local version of the plugin

#### Credits

This plugin was developed by the Arte web player team from Strasbourg, France. We are open to external contributions and suggestions so feel free to reach us via the discussion section in this repo.

Current contributors and maintainers:
[Coralielm](https://github.com/Coralielm)
[privaloops](https://github.com/privaloops)
[fafaschiavo](https://github.com/fafaschiavo)
[kachanovskyi](https://github.com/kachanovskyi)

#### License
This plugin, just like Video.js, is licensed under the Apache License, Version 2.0.
