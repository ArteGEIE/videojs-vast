/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker } from '@dailymotion/vast-client';
import { EventEmitter } from 'events';

const Plugin = videojs.getPlugin('plugin');

class Vast extends Plugin {
  constructor(player, options) {
    super(player, options);

    this.player = player;
    this.options = options;

    this.macros = {
      LIMITADTRACKING: options.isLimitedTracking !== undefined ? options.isLimitedTracking : false, // defaults to false
    }

    this.internalEventBus = new EventEmitter();

    // Bind events that will be triggered by the player and that we cannot subscribe to later (bug on vjs side)
    player.on('play', () => { this.internalEventBus.emit('play'); });
    player.on('pause', () => { this.internalEventBus.emit('pause'); });
    player.on('timeupdate', (evt, data) => {
      this.internalEventBus.emit('timeupdate', { currentTime: player.currentTime() });
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
            adClickCallback: ctaUrl ? () => this.adClickCallback(ctaUrl) : false,
          });

          // manually trigger time event as native timeupdate is not triggered enough
          clearInterval(global[`vastTimeUpdateInterval_${this.id}`]);
          global[`timeUpdateInterval_${this.id}`] = setInterval(() => {
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
    });

    // If we reach the timeout while trying to load the VAST, then we trigger an error event
    player.on('adtimeout', () => {
      const message = 'VastVjs: Timeout';
      console.error(message);
      console.error(err);
      player.trigger('vast.error', {
        message
      });
    });

    // Now let's fetch some ads shall we?
    this.vastClient = new VASTClient();
    this.vastClient.get(options.vastUrl)
    .then((res) => {
      // Once we are done, trigger adsready event so that we can render a preroll
      this.ads = res.ads;
      player.trigger('adsready');
    })
    .catch((err) => {
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      console.error(message);
      console.error(err);
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

    // Track the video entering or leaving fullscreen
    this.player.one('fullscreen', (evt, data) => {
      adToRun.linear.tracker.setFullscreen(data.state, this.macros);
    });

    // Track the user muting or unmuting the video
    this.player.one('mute', (evt, data) => {
      adToRun.linear.tracker.setFullscreen(data.state, this.macros);
    });
    
    // Track play event
    this.internalEventBus.on('play', () => {
      adToRun.linear.tracker.setPaused(false, this.macros);
    });

    // Track pause event
    this.internalEventBus.on('pause', () => {
      adToRun.linear.tracker.setPaused(true, this.macros);
    });

    // Track timeupdate event
    this.internalEventBus.on('timeupdate', (data) => {
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
    // TO BE DONE - select the best media file based on internet bandwidth and screen size/resolution
    return mediaFilesAvailable[0];
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
    };

    // Pop an ad from array of ads available
    const adToPlay = this.ads.pop();

    // Separate the kinds of creatives we have in the ad to play
    if (adToPlay && adToPlay.creatives && adToPlay.creatives.length > 0) {
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
