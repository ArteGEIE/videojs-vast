/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker } from '@dailymotion/vast-client';

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
    const defaultOptions = {
      vastUrl: false,
      verificationTimeout: 2000,
      addCtaClickZone: true,
    }

    // Assign options that were passed in by the consumer
    this.options = Object.assign(defaultOptions, options);

    this.macros = {
      LIMITADTRACKING: options.isLimitedTracking !== undefined ? options.isLimitedTracking : false, // defaults to false
    }

    this.listenToPlay = () => {
      if(this.options.debug) console.info('play');
      if(this.isAdPlaying) {
        this.adToRun.linear.tracker.setPaused(false, this.macros);
      }
    }
    this.listenToPause = () => {
      if(this.options.debug) console.info('pause');
      // don't track pause before complete
      if (player.duration() - player.currentTime() > 0.2) {
        this.adToRun.linear.tracker.setPaused(true, this.macros);
      }
    }
    // Track timeupdate-related events
    this.quartileTracked = false;
    this.halfTracked = false;
    this.listenToTimeUpdate = () => {
      if(!this.adToRun) {
        return false;
      }
      // Track the first quartile event
      if (!this.quartileTracked && player.currentTime() > player.duration() / 4) {
        this.adToRun.linear.tracker.track('firstQuartile', this.macros);
        this.quartileTracked = true;
      }
      // Track the midpoint event
      if (!this.halfTracked && player.currentTime() > player.duration() / 2) {
        this.adToRun.linear.tracker.track('midpoint', this.macros);
        this.halfTracked = true;
      }
      // Set progress to track automated trackign events
      this.adToRun.linear.tracker.setProgress(player.currentTime(), this.macros);

      player.trigger('vast.time', { position: player.currentTime(), currentTime: player.currentTime(), duration: player.duration() });
    }
    this.listenToTimeUpdateOnce = () => {
      if(!this.adToRun) {
        return false;
      }
      // Track the first timeupdate event - used for impression tracking
      this.adToRun.linear.tracker.trackImpression(this.macros);
      this.adToRun.linear.tracker.overlayViewDuration(player.currentTime(), this.macros);
    }
    this.listenToVolumeChange = () => {
      if(this.options.debug) console.info('volume');
      // Track the user muting or unmuting the video
      this.adToRun.linear.tracker.setMuted(player.muted(), this.macros);
    }
    this.listenToFullScreen = (evt, data) => {
      if(this.options.debug) console.info('fullscreen');
      // Track skip event
      this.adToRun.linear.tracker.setFullscreen(data.state)
    }

    // Track when user closes the video
    this.listenToUnload = () => {
      this.adToRun.linear.tracker.close(this.macros);
      return null;
    }

    this.addEventsListeners();

    // Notify the player if we reach a timeout while trying to load the ad
    player.on('adtimeout', () => {
      this.isAdPlaying = false;
      console.error('VastVjs: Timeout');
      player.trigger('vast.error', {
        message: 'VastVjs: Timeout',
      });
      this.removeEventsListeners();
    });

    player.on('adserror', (evt) => {
      // Finish ad mode so that regular content can resume
      player.ads.endLinearAdMode();
      // Trigger an event when the ad is finished to notify the player consumer
      this.isAdPlaying = false;
      console.error(evt);
      player.trigger('vast.error', {
        message: evt,
        tag: options.vastUrl,
      });
      this.removeEventsListeners();
    });

    // send event when ad is playing to remove loading spinner
    player.one('adplaying', () => {
      if(this.options.debug) console.info('adplaying');
      // Trigger an event to notify the player consumer that the ad is playing
      player.trigger('vast.play', {
        ctaUrl: this.ctaUrl,
        skipDelay: this.adToRun.linear.tracker.skipDelay,
        adClickCallback: this.ctaUrl ? () => this.adClickCallback(this.ctaUrl) : false,
      });
      // Track the impression of an ad
      this.adToRun.linear.tracker.load(this.macros);
      this.isAdPlaying = true;

       // make timeline not clickable
       this.player.controlBar.progressControl.disable();

      if(this.options.addCtaClickZone) {
        // ad the cta click
        this.ctaDiv = document.createElement('div');
        this.ctaDiv.style.cssText = "position: absolute; bottom: 3em; left: 0;right: 0;top: 0;";
        this.ctaDiv.addEventListener('click', () => {
          this.player.pause();
          this.adClickCallback(this.ctaUrl);
        });
        player.el().appendChild(this.ctaDiv);
      }
    });

    // resume content when all your linear ads have finished
    player.one('adended', () => {
      if(this.options.debug) console.info('adended');
      // Finish ad mode so that regular content can resume
      player.ads.endLinearAdMode();
      // Trigger an event when the ad is finished to notify the player consumer
      this.isAdPlaying = false;
      player.trigger('vast.complete');
      this.removeEventsListeners();

      // Track the end of an ad
      this.adToRun.linear.tracker.complete(this.macros);

      // reactivate controlbar
      this.player.controlBar.progressControl.enable();

      if(this.options.addCtaClickZone) {
        // remove cta
        this.ctaDiv.remove();
      }
    });

    // send event when ad is skipped to resume content
    player.one('skip', () => {
      if(this.options.debug) console.info('skip');
      // Finish ad mode so that regular content can resume
      player.ads.endLinearAdMode();
      // Trigger an event when the ad is finished to notify the player consumer
      this.isAdPlaying = false;
      player.trigger('vast.skip');
      this.removeEventsListeners();
      // Track skip event
      this.adToRun.linear.tracker.skip(this.macros);

      // reactivate controlbar
      this.player.controlBar.progressControl.enable();

      if(this.options.addCtaClickZone) {
        // remove cta
        this.ctaDiv.remove();
      }
    });
      

    player.on('readyforpreroll', () => {
      if(this.options.debug) console.info('readyforpreroll');

      const adToRun = this.getNextAd();
      this.adToRun = adToRun;

      if (adToRun) {
        // Retrieve the CTA URl to render
        this.ctaUrl = false;
        if(adToRun.linear) {
          this.ctaUrl = Vast.getBestCtaUrl(adToRun.linear);
        }
        
        // We now check if verification is needed or not, if it is, then we import the
        // verification script with a timeout trigger. If it is not, then we simply display the ad
        // by calling playAd
        if ('verification' in adToRun && adToRun.verification.length > 0) {
          // Set a timeout for the verification script - accortding to the IAB spec, we should do
          // a best effort to load the verification script before the actual ad, but it should not
          // block the ad nor the video playback
          const verificationTimeout = setTimeout(() => {
            this.playAd(adToRun);
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
              this.playAd(adToRun);
            }
          };
          injectScriptTag(adToRun.verification[index].resource, scriptTagCallback, scriptTagCallback);
        } else {
          // No verification to import, just run the add
          this.playAd(adToRun);
        }
      }
    });
    
    // Init an empty array that will later contain the ads metadata
    this.ads = [];

    // id used for some events to separate multiple instances in a same page
    this.id = Vast.getRandomId()

    const videojsContribAdsOptions = {
      debug: options.debug !== undefined ? options.debug : false,
      timeout: options.timeout !== undefined ? options.timeout : 5000,
    };
    player.ads(videojsContribAdsOptions); // initialize videojs-contrib-ads

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
        this.isAdPlaying = false;
        // Deal with the error
        const message = 'VastVjs: Empty VAST XML';
        player.trigger('vast.error', {
          message,
          tag: options.vastUrl,
        });
        this.removeEventsListeners();
      }
    })
    .catch((err) => {
      console.error(err);
      player.ads.skipLinearAdMode();
      this.isAdPlaying = false;
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      player.trigger('vast.error', {
        message,
        tag: options.vastUrl,
      });
      this.removeEventsListeners();
    });
  }

  addEventsListeners() {
    this.player.on('playing', this.listenToPlay);
    this.player.on('pause', this.listenToPause);
    this.player.on('timeupdate', this.listenToTimeUpdate);
    this.player.one('timeupdate', this.listenToTimeUpdateOnce);
    this.player.on('volumechange', this.listenToVolumeChange);
    this.player.on('fullscreen', this.listenToFullScreen);
    window.addEventListener('beforeunload', this.listenToUnload);
  }

  removeEventsListeners() {
    this.player.off('playing', this.listenToPlay);
    this.player.off('pause', this.listenToPause);
    this.player.off('timeupdate', this.listenToTimeUpdate);
    this.player.off('timeupdate', this.listenToTimeUpdateOnce);
    this.player.off('volumechange', this.listenToVolumeChange);
    this.player.off('fullscreen', this.listenToFullScreen);
    window.removeEventListener('beforeunload', this.listenToUnload);
  }

  /*
  * This method is responsible for dealing with the click on the ad
  */
  adClickCallback(ctaUrl) {
    this.player.trigger('vast.click');
    window.open(ctaUrl, '_blank');
    // Track when a user clicks on an ad
    this.adToRun.linear.tracker.click(null, this.macros);
  }

   // Declare a function that simply plays an ad, we will call it once we check if
  // verification is needed or not
  playAd(adToRun) {
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

  /*
  * This method is responsible for rendering a linear ad
  */
  playLinearAd(adToRun) {
    // Retrieve the media file from the VAST manifest
    const mediaFile = Vast.getBestMediaFile(adToRun.linear.mediaFiles);
    // case no media file available
    if(mediaFile.fileURL === '') {
      this.player.ads.skipLinearAdMode();
      return false;
    }
    

    // Start ad mode
    this.player.ads.startLinearAdMode();

    // Trigger an event when the ad starts playing
    this.player.trigger('vast.playAttempt');

    // Set a property in the player object to indicate that an ad is playing
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
    if (
      adToRun.videoClickThroughURLTemplate
      && adToRun.videoClickThroughURLTemplate.url) {
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
