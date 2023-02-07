/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker } from '@dailymotion/vast-client';
import { EventEmitter } from 'events';

// Inject script tag in the DOM and callback when ready
function injectScriptTag(src, onLoadCallback, onErrorCallback) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = src;
  script.async = true;
  script.onload = onLoadCallback;
  script.onerror = onErrorCallback;
  document.body.appendChild(script);
}

const Plugin = videojs.getPlugin('plugin');

export default class Vast extends Plugin {
  constructor(player, options) {
    super(player, options);

    this.player = player;

    // Load the options with default values
    this.options = {
      vastUrl: false,
      verificationTimeout: 2000,
    }

    // Assign options that were passed in by the consumer
    Object.assign(this.options, options);

    this.macros = {
      LIMITADTRACKING: options.isLimitedTracking !== undefined ? options.isLimitedTracking : false, // defaults to false
    }

    this.internalEventBus = new EventEmitter();
    this.throttleTimeout = false;

    // Bind events that will be triggered by the player and that we cannot subscribe to later (bug on vjs side)
    player.on('play', () => { this.internalEventBus.emit('play'); });
    player.on('pause', () => { this.internalEventBus.emit('pause'); });
    player.on('skip', (evt, data) => {
      this.internalEventBus.emit('skip');
    });
    player.on('timeupdate', (evt, data) => {
      this.internalEventBus.emit('timeupdate', { currentTime: player.currentTime() });
    });

    // Track the user muting or unmuting the video
    player.on('volumechange', (evt, data) => {
      this.internalEventBus.emit('mute', { state: this.player.muted() });
    });

    // Init a property in the player object to keep track of the ad state
    player.isAd = true;

    // Init an empty array that will later contain the ads metadata
    this.ads = [];

    // id used for some events to separate multiple instances in a same page
    this.id = Vast.getRandomId()

    const videojsContribAdsOptions = {
      debug: options.debug !== undefined ? options.debug : false,
      timeout: options.timeout !== undefined ? options.timeout : 5000,
    };
    player.ads(videojsContribAdsOptions); // initialize videojs-contrib-ads

    player.on('readyforpreroll', () => {
      const adToRun = this.getNextAd();

      if (adToRun) {
        // Retrieve the CTA URl to render
        let ctaUrl = false;
        if(adToRun.linear) {
          ctaUrl = Vast.getBestCtaUrl(adToRun.linear);
        }

        player.on('adserror', (evt) => {
          // Finish ad mode so that regular content can resume
          player.ads.endLinearAdMode();
          // Trigger an event when the ad is finished to notify the player consumer
          player.isAd = false;
          console.error(evt);
          player.trigger('vast.error', {
            message: evt,
            tag: options.vastUrl,
          });
        });

        // send event when ad is playing to remove loading spinner
        player.one('adplaying', () => {
          // Trigger an event to notify the player consumer that the ad is playing
          player.trigger('vast.play', {
            ctaUrl,
            skipDelay: adToRun.linear.tracker.skipDelay,
            adClickCallback: ctaUrl ? () => this.adClickCallback(ctaUrl) : false,
          });

          // manually trigger time event as native timeupdate is not triggered enough
          clearInterval(global[`vastTimeUpdateInterval_${this.id}`]);
          global[`vastTimeUpdateInterval_${this.id}`] = setInterval(() => {
              player.trigger('vast.time', { position: player.currentTime(), currentTime: player.currentTime(), duration: player.duration() });
          }, 100);
        });

        // resume content when all your linear ads have finished
        player.one('adended', () => {
          // Finish ad mode so that regular content can resume
          player.ads.endLinearAdMode();
          // Trigger an event when the ad is finished to notify the player consumer
          player.isAd = false;
          // stop emitting vast.time
          clearInterval(global[`vastTimeUpdateInterval_${this.id}`]);
          player.trigger('vast.complete');
        });

        // send event when ad is skipped to resume content
        player.one('skip', () => {
          // Finish ad mode so that regular content can resume
          player.ads.endLinearAdMode();
          // Trigger an event when the ad is finished to notify the player consumer
          player.isAd = false;
          // stop emitting vast.time
          clearInterval(global[`vastTimeUpdateInterval_${this.id}`]);
          player.trigger('vast.skip');
        });

        // Declare a function that simply plays an ad, we will call it once we check if
        // verification is needed or not
        const playAd = (adToRun) => {
          // If ad has a linear copy, then execute this
          if(adToRun.linear) {
            this.playLinearAd(adToRun);
          }

          // Other types of ads should come here....
          // Please be aware that a single ad can have multple types of creatives
          // A linear add for example can come with a companion ad and both can should be displayed. Example:
          // if(adToRun.comanionAd) {
          //   renderCompanionBannerSomewhere();
          // }
        }
        
        // We now check if verification is needed or not, if it is, then we import the
        // verification script with a timeout trigger. If it is not, then we simply display the ad
        // by calling playAd
        if ('verification' in adToRun && adToRun.verification.length > 0) {
          // Set a timeout for the verification script - accortding to the IAB spec, we should do
          // a best effort to load the verification script before the actual ad, but it should not
          // block the ad nor the video playback
          const verificationTimeout = setTimeout(() => {
            playAd(adToRun);
          }, this.options.verificationTimeout);

          // Now for each verification script, we need to inject a script tag in the DOM and wait
          // for it to load
          let index = 0;
          const scriptTagCallback = () => {
            index = index + 1;
            if (index < adToRun.verification.length) {
              injectScriptTag(adToRun.verification[index].resource, scriptTagCallback, scriptTagCallback);    
            } else {
              // Once we are done with all verification tags, clear the timeout timer and play the ad
              clearTimeout(verificationTimeout);
              playAd(adToRun);
            }
          };
          injectScriptTag(adToRun.verification[index].resource, scriptTagCallback, scriptTagCallback);
        } else {
          // No verification to import, just run the add
          playAd(adToRun);
        }

      }
    });

    // Notify the player if we reach a timeout while trying to load the ad
    player.on('adtimeout', () => {
      if (!this.throttleTimeout) {
        console.error('VastVjs: Timeout');
        player.trigger('vast.error', {
          message: 'VastVjs: Timeout',
        });
      }
      this.throttleTimeout = false;
    });

    // Now let's fetch some ads
    this.vastClient = new VASTClient();
    this.vastClient.get(options.vastUrl)
    .then((res) => {
      if ('ads' in res && res.ads.length) {
        // Once we are done, trigger adsready event so that we can render a preroll
        this.ads = res.ads;
        player.trigger('adsready');
      } else {
        player.ads.skipLinearAdMode();
        // Deal with the error
        this.throttleTimeout = true;
        const message = 'VastVjs: Empty VAST XML';
        player.trigger('vast.error', {
          message,
          tag: options.vastUrl,
        });
      }
    })
    .catch((err) => {
      player.ads.skipLinearAdMode();
      this.throttleTimeout = true;
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      player.trigger('vast.error', {
        message,
        tag: options.vastUrl,
      });
    });
  }

  /*
  * This method is responsible for dealing with the click on the ad
  */
  adClickCallback(ctaUrl) {
    this.player.trigger('vast.click');
    window.open(ctaUrl, '_blank');
  }

  /*
  * This method is responsible for rendering a linear ad
  */
  playLinearAd(adToRun) {
    // Track the impression of an ad
    this.player.one('adplaying', () => {
      adToRun.linear.tracker.load(this.macros);
    });

    // Track the end of an ad
    this.player.one('adended', () => {
      adToRun.linear.tracker.complete(this.macros);
    });

    // Track when a user clicks on an ad
    this.player.one('vast.click', () => {
      adToRun.linear.tracker.click(null, this.macros);
    });

    // Track skip event
    this.internalEventBus.on('vast.skip', () => {
      adToRun.linear.tracker.skip(this.macros);
    });

    // Track the video entering or leaving fullscreen
    this.player.one('fullscreen', (evt, data) => {
      adToRun.linear.tracker.setFullscreen(data.state, this.macros);
    });

    // Track the user muting or unmuting the video
    this.internalEventBus.on('mute', (data) => {
      adToRun.linear.tracker.setMuted(data.state, this.macros);
    });

    // Track play event
    this.internalEventBus.on('play', () => {
      adToRun.linear.tracker.setPaused(false, this.macros);
    });

    // Track pause event
    this.internalEventBus.on('pause', () => {
      adToRun.linear.tracker.setPaused(true, this.macros);
    });

    // Track timeupdate-related events
    this.quartileTracked = false;
    this.halfTracked = false;
    this.internalEventBus.on('timeupdate', (data) => {
      // Track the first quartile event
      if (!this.quartileTracked && data.currentTime > this.player.duration() / 4) {
        adToRun.linear.tracker.track('firstQuartile', this.macros);
        this.quartileTracked = true;
      }
      // Track the midpoint event
      if (!this.halfTracked && data.currentTime > this.player.duration() / 2) {
        adToRun.linear.tracker.track('midpoint', this.macros);
        this.halfTracked = true;
      }
      // Set progress to track automated trackign events
      adToRun.linear.tracker.setProgress(data.currentTime, this.macros);
    });

    // Track the first timeupdate event - used for impression tracking
    this.internalEventBus.once('timeupdate', (data) => {
      adToRun.linear.tracker.trackImpression(this.macros);
      adToRun.linear.tracker.overlayViewDuration(data.currentTime, this.macros);
    });

    // Track when user closes the video
    window.onbeforeunload = () => {
      adToRun.linear.tracker.close(this.macros);
      return null;
    };

    // Retrieve the media file from the VAST manifest
    const mediaFile = Vast.getBestMediaFile(adToRun.linear.mediaFiles);

    // Start ad mode
    this.player.ads.startLinearAdMode();

    // Trigger an event when the ad starts playing
    this.player.trigger('vast.playAttempt');

    // Set a property in the player object to indicate that an ad is playing
    this.player.isAd = true;

    // play linear ad content
    this.player.src(mediaFile.fileURL);
  }

  /*
  * This method is responsible for choosing the best media file to play according to the user's
  * screen resolution and internet connection speed
  */
  static getBestMediaFile(mediaFilesAvailable) {
    // select the best media file based on internet bandwidth and screen size/resolution
    const videojsVhs = localStorage.getItem('videojs-vhs')
    const bandwidth = videojsVhs ? JSON.parse(videojsVhs).bandwidth : undefined

    let bestMediaFile = mediaFilesAvailable[0];

    if (mediaFilesAvailable && bandwidth) {
      const height = window.screen.height;
      const width = window.screen.width;

      const result = mediaFilesAvailable
        .sort((a, b) => ((Math.abs(a.bitrate - bandwidth) - Math.abs(b.bitrate - bandwidth))
          || (Math.abs(a.width - width) - Math.abs(b.width - width))
          || (Math.abs(a.height - height) - Math.abs(b.height - height))))

      bestMediaFile = result[0]
    }

    return bestMediaFile;
  }

  /*
  * This method is responsible for choosing the best URl to redirect the user to when he clicks
  * on the ad
  */
  static getBestCtaUrl(adToRun){
    if (adToRun.videoClickThroughURLTemplate.url) {
      return adToRun.videoClickThroughURLTemplate.url;
    }
    return false;
  }

  /*
  * This method simply generate a randomId
  */
  static getRandomId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
  }

  /*
  * This method is responsible for retrieving the next ad to play from all the ads present in the
  * VAST manifest.
  * Please be aware that a single ad can have multple types of creatives.
  * A linear add for example can come with a companion ad and both can should be displayed.
  */
  getNextAd() {
    // Initilize empty ad object
    const nextAd = {
      linear: false,
      companion: false,
      verification: [],
    };

    // Pop an ad from array of ads available
    const adToPlay = this.ads.pop();
    // Separate the kinds of creatives we have in the ad to play
    if (adToPlay && adToPlay.creatives && adToPlay.creatives.length > 0) {
      if ('adVerifications' in adToPlay) {
        nextAd.verification = adToPlay.adVerifications;
      }

      for (let index = 0; index < adToPlay.creatives.length; index += 1) {
        const creative = adToPlay.creatives[index];
        switch (creative.type) {
          case 'linear':
            nextAd.linear = creative;
            nextAd.linear.tracker = new VASTTracker(this.vastClient, adToPlay, creative);
            break;
          case 'companion':
            nextAd.companion = creative;
            nextAd.companion.tracker = new VASTTracker(this.vastClient, adToPlay, creative);
            break;
          default:
            break;
        }
      }
      // Return the formatted ad metadata
      return nextAd;
    }
    // Id there's no more ads to run, return false
    return false;
  }

  /*
  * This method is responsible disposing the plugin once it is not needed anymore
  */
  dispose() {
    super.dispose();
  }
}

// Register the plugin with video.js
// The or statemente is necessary to deal with old versions of video.js
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin('vast', Vast);
