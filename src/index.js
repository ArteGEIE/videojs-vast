/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient } from '@dailymotion/vast-client';

const Plugin = videojs.getPlugin('plugin');

class Vast extends Plugin {
  constructor(player, options) {
    super(player, options);

    this.player = player;
    this.options = options;

    // Init a property in the player object to keep track of the ad state
    player.isAd = true;

    // Init an empty array that will later contain the ads metadata
    this.ads = [];

    const videojsContribAdsOptions = {
      timeout: 5000, // TO BE DONE - This should be an option
      debug: true, // TO BE DONE - This should be environment specific and/or an option
    };
    player.ads(videojsContribAdsOptions); // initialize videojs-contrib-ads


    player.on('readyforpreroll', () => {
      const adToRun = this.getNextAd();

      if (adToRun) {
        // Retrieve the CTA URl to render
        const ctaUrl = Vast.getBestCtaUrl(adToRun.linear);

        player.on('adserror', (evt) => {
          console.error(evt);
          player.trigger('vast.error');
        });

        // send event when ad is playing to remove loading spinner
        player.one('adplaying', () => {
          // Trigger an event to notify the player consumer that the ad is playing
          player.trigger('vast.play', {
            ctaUrl,
          });
        });

        // resume content when all your linear ads have finished
        player.one('adended', () => {
          // Finish ad mode so that regular content can resume
          player.ads.endLinearAdMode();
          // Trigger an event when the ad is finished to notify the player consumer
          player.isAd = false;
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

    // Now let's fetch some ads shall we?
    const vastClient = new VASTClient();
    vastClient.get(options.vastUrl)
    .then((res) => {
      // Once we are done, trigger adsready event so that we can render a preroll
      this.ads = res.ads;
      player.trigger('adsready');
    })
    .catch((err) => {
      // Deal with the error
      console.error('VastVjs: Error while fetching VAST XML');
      console.error(err);
    });
  }

  /*
  * This method is responsible for rendering a linear ad
  */
  playLinearAd(adToRun) {
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
            break;
          case 'companion':
            nextAd.companion = creative;
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
