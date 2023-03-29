/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker } from '@dailymotion/vast-client';
import { injectScriptTag } from './lib/injectScriptTag';

const Plugin = videojs.getPlugin('plugin');

// TODO: remove injected verification javascript ?
// TODO: destructure in methods
// TODO: use common events name cf https://github.com/videojs/videojs-contrib-ads/blob/main/docs/integrator/common-interface.md ?
// TODO: implement macros
// TODO: implement multiple ads chaining

export default class Vast extends Plugin {
  constructor(player, options) {
    super(player, options);
    this.player = player;

    // Load the options with default values
    const defaultOptions = {
      vastUrl: false,
      vmapUrl: false,
      verificationTimeout: 2000,
      addCtaClickZone: true,
    }

    // Assign options that were passed in by the consumer
    this.options = Object.assign(defaultOptions, options);

    this.setMacros();
    this.addEventsListeners();

    // Init an empty array that will later contain the ads metadata
    this.adsArray = [];

    const videojsContribAdsOptions = {
      debug: options.debug !== undefined ? options.debug : false,
      timeout: options.timeout !== undefined ? options.timeout : 5000,
    };
    // initialize videojs-contrib-ads
    this.player.ads(videojsContribAdsOptions);

    if(options.vmapUrl) {
      this.handleVMAP(options.vmapUrl);
    } else {
      this.handleVAST(options.vastUrl);
    }
    
  }

  setMacros(newMacros = undefined) {
    const { options } = this;
    if(!newMacros) {
      this.macros = {
        LIMITADTRACKING: options.isLimitedTracking !== undefined ? options.isLimitedTracking : false, // defaults to false
      }
    } else {
      this.macros = {
        ...this.macros,
        ...newMacros,
      }
    } 
  }

  handleVMAP(vmapUrl) {
    // TODO:
    console.error('vmapUrl not handled yet')
  }

  handleVAST(vastUrl) {
    // Now let's fetch some ads
    this.vastClient = new VASTClient();
    this.vastClient.get(vastUrl)
    .then((res) => {
        // Once we are done, trigger adsready event so that we can render a preroll
        this.adsArray = res.ads ? res.ads : [];
        if(this.adsArray.length > 0) {
          this.readAd();
        } else {
          this.player.ads.skipLinearAdMode();
          // TODO: track the error
          // Deal with the error
          const message = 'VastVjs: Empty VAST XML';
          this.player.trigger('vast.error', {
            message,
            tag: vastUrl,
          });
          this.removeEventsListeners();
        }
    })
    .catch((err) => {
      console.error(err);
      this.player.ads.skipLinearAdMode();
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      this.player.trigger('vast.error', {
        message,
        tag: vastUrl,
      });
      this.removeEventsListeners();
    });
  }

  readAd() {
    this.adToRun = this.getNextAd();
    if (this.adToRun.hasLinearCreative()) {
      this.vastTracker = new VASTTracker(this.vastClient, this.adToRun.ad, this.adToRun.linearCreative());
      this.vastTracker.on('firstQuartile', () => {
        this.debug('firstQuartile');
      });
      this.vastTracker.on('midpoint', () => {
        this.debug('midpoint');
      });
      // add ad events listeners only if it's a linear ad
      this.addAdEventsListeners();
      // trigger adsready which trigger readyforpreroll event
      this.player.trigger('adsready');
    } else {
      // no more ad to play; return to regular content
      this.player.ads.endLinearAdMode();
      // remove ad events listeners
      this.removeAdEventsListeners();
      return false;
    }
  }

      /*
  * This method is responsible for retrieving the next ad to play from all the ads present in the
  * VAST manifest.
  * Please be aware that a single ad can have multple types of creatives.
  * A linear add for example can come with a companion ad and both can should be displayed.
  */
  getNextAd() {
    const nextAd = this.adsArray.shift();
    return {
      ad: nextAd,
      hasLinearCreative: () => nextAd.creatives.find((creative) => creative.type === 'linear') !== undefined,
      linearCreative: () => nextAd.creatives.filter((creative) => creative.type === 'linear')[0],
      hasCompanionCreative: () => nextAd.creatives.find((creative) => creative.type === 'companion') !== undefined,
      companionCreative: () => nextAd.creatives.filter((creative) => creative.type === 'companion')[0],
      hasNonlinearCreative: () => nextAd.creatives.find((creative) => creative.type === 'nonlinear') !== undefined,
      nonlinearCreative: () => nextAd.creatives.filter((creative) => creative.type === 'nonlinear')[0]
    }
  }

  onPlay = () => {
    this.debug('play');
    // player is currently playing an ad break
    if(this.player.ads.inAdBreak()) {
      this.vastTracker.setPaused(false, this.macros);
    }
  }
  onPause = () => {
    this.debug('pause');
    // don't track pause before complete
    if (this.player.duration() - this.player.currentTime() > 0.2) {
      this.vastTracker.setPaused(true, this.macros);
    }
  }
  // Track timeupdate-related events
  onTimeUpdate = () => {
    // Set progress to track automated trackign events
    this.vastTracker.setProgress(this.player.currentTime(), this.macros);

    this.player.trigger('vast.time', { position: this.player.currentTime(), currentTime: this.player.currentTime(), duration: this.player.duration() });
  }

  onCanPlay = () => {
    this.debug('can play');
    // Track the first timeupdate event - used for impression tracking
    this.vastTracker.trackImpression(this.macros);
    this.vastTracker.overlayViewDuration(this.vastTracker.convertToTimecode(this.player.currentTime()), this.macros);
  }

  onVolumeChange = () => {
    this.debug('volume');
    // Track the user muting or unmuting the video
    this.vastTracker.setMuted(this.player.muted(), this.macros);
  }

  onFullScreen = (evt, data) => {
    this.debug('fullscreen');
    // Track skip event
    this.vastTracker.setFullscreen(data.state);
  }

  // Track when user closes the video
  onUnload = () => {
    this.vastTracker.close(this.macros);
    this.removeAdEventsListeners();
    return null;
  }

  // Notify the player if we reach a timeout while trying to load the ad
  onAdTimeout = () => {
    //trigger a tracker error
    this.vastTracker.error({
      ...this.macros,
      ERRORCODE: 301 // timeout of VAST URI
    });
    console.error('VastVjs: Timeout');
    this.player.trigger('vast.error', {
      message: 'VastVjs: Timeout',
    });
    this.removeEventsListeners();
  }

  // send event when ad is playing to remove loading spinner
  onAdStart = () => {
    this.debug('adstart');
    // Trigger an event to notify the player consumer that the ad is playing
    this.player.trigger('vast.play', {
      ctaUrl: this.ctaUrl,
      skipDelay: this.vastTracker.skipDelay,
      adClickCallback: this.ctaUrl ? () => this.adClickCallback(this.ctaUrl) : false,
    });
    // Track the impression of an ad
    this.vastTracker.load(this.macros);

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
      this.player.el().appendChild(this.ctaDiv);
    }
  }

  onAdError = (evt) => {
    this.debug('aderror');
    const error = this.player.error();
    //trigger a tracker error
    this.vastTracker.error({
      ...this.macros,
      ERRORCODE: 900 // undefined error, to be improved
    });
    // Finish ad mode so that regular content can resume
    this.player.ads.endLinearAdMode();
    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.error', {
      message: evt,
      tag: options.vastUrl,
    });
    this.removeEventsListeners();
  }


  onReadyForPreroll = () => {
    this.debug('readyforpreroll');

    // Retrieve the CTA URl to render
    this.ctaUrl = false;
    if(this.adToRun.hasLinearCreative()) {
      this.ctaUrl = Vast.getBestCtaUrl(this.adToRun.linearCreative());
      this.debug('ctaUrl', this.ctaUrl);
    }
    
    // We now check if verification is needed or not, if it is, then we import the
    // verification script with a timeout trigger. If it is not, then we simply display the ad
    // by calling playAd
    if ('verification' in this.adToRun.ad && this.adToRun.ad.verification.length > 0) {
      // Set a timeout for the verification script - accortding to the IAB spec, we should do
      // a best effort to load the verification script before the actual ad, but it should not
      // block the ad nor the video playback
      const verificationTimeout = setTimeout(() => {
        this.playAd(this.adToRun);
      }, this.options.verificationTimeout);

      // Now for each verification script, we need to inject a script tag in the DOM and wait
      // for it to load
      let index = 0;
      const scriptTagCallback = () => {
        index = index + 1;
        if (index < this.adToRun.ad.verification.length) {
          injectScriptTag(this.adToRun.ad.verification[index].resource, scriptTagCallback, scriptTagCallback);
        } else {
          // Once we are done with all verification tags, clear the timeout timer and play the ad
          clearTimeout(verificationTimeout);
          this.playAd(this.adToRun);
        }
      };
      injectScriptTag(this.adToRun.ad.verification[index].resource, scriptTagCallback, scriptTagCallback);
    } else {
      // No verification to import, just run the add
      this.playAd(this.adToRun);
    }
  }

  onSkip = () => {
    this.debug('skip');
    // Finish ad mode so that regular content can resume
    this.player.ads.endLinearAdMode();
    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.skip');
    this.removeEventsListeners();
    // Track skip event
    this.vastTracker.skip(this.macros);

    // reactivate controlbar
    this.player.controlBar.progressControl.enable();

    if(this.options.addCtaClickZone) {
      // remove cta
      this.ctaDiv.remove();
    }
  }

  onAdEnded = () => {
    this.debug('adended');
    // Finish ad mode so that regular content can resume
    this.player.ads.endLinearAdMode();
    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.complete');
    this.removeEventsListeners();

    // Track the end of an ad
    this.vastTracker.complete(this.macros);

    // reactivate controlbar
    this.player.controlBar.progressControl.enable();

    if(this.options.addCtaClickZone) {
      // remove cta
      this.ctaDiv.remove();
    }
  }

  addAdEventsListeners() {
    // ad events
    this.player.on('adtimeout', this.onAdTimeout);
    this.player.on('adstart', this.onAdStart);
    this.player.on('aderror', this.onAdError);
    this.player.on('readyforpreroll', this.onReadyForPreroll);
    this.player.on('skip', this.onSkip);
    this.player.on('adended', this.onAdEnded);
  }
  
  addEventsListeners() {
    // regular player events
    this.player.on('playing', this.onPlay);
    this.player.on('pause', this.onPause);
    this.player.on('timeupdate', this.onTimeUpdate);
    this.player.on('canplay', this.onCanPlay);
    this.player.on('volumechange', this.onVolumeChange);
    this.player.on('fullscreen', this.onFullScreen);
    window.addEventListener('beforeunload', this.onUnload);
  }

  removeAdEventsListeners() {
    // ad events
    this.player.off('adtimeout', this.onAdTimeout);
    this.player.off('adstart', this.onAdStart);
    this.player.off('aderror', this.onAdError);
    this.player.off('readyforpreroll', this.onReadyForPreroll);
    this.player.off('skip', this.onSkip);
    this.player.off('adended', this.onAdEnded);
  }

  removeEventsListeners() {
    // regular player events
    this.player.off('playing', this.onPlay);
    this.player.off('pause', this.onPause);
    this.player.off('timeupdate', this.onTimeUpdate);
    this.player.off('canplay', this.onCanPlay);
    this.player.off('volumechange', this.onVolumeChange);
    this.player.off('fullscreen', this.onFullScreen);
    window.removeEventListener('beforeunload', this.onUnload);
  }

  /*
  * This method is responsible for dealing with the click on the ad
  */
  adClickCallback = (ctaUrl) => {
    this.player.trigger('vast.click');
    window.open(ctaUrl, '_blank');
    // Track when a user clicks on an ad
    this.vastTracker.click(null, this.macros);
  }

   // Declare a function that simply plays an ad, we will call it once we check if
  // verification is needed or not
  playAd = (adToRun) => {
    // If ad has a linear copy, then execute this
    if(adToRun.hasLinearCreative()) {
      this.playLinearAd(adToRun.linearCreative());
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
  playLinearAd = (creative) => {
    this.debug('playLinearAd', creative);
    // Retrieve the media file from the VAST manifest
    const mediaFile = Vast.getBestMediaFile(creative.mediaFiles);

    // Start ad mode
    this.player.ads.startLinearAdMode();

    // Trigger an event when the ad starts playing
    this.player.trigger('vast.playAttempt');

    // Set a property in the player object to indicate that an ad is playing
    // play linear ad content
    this.player.src(mediaFile.fileURL);
    this.setMacros({
      ASSETURI: mediaFile.fileURL,
      CONTENTPLAYHEAD: this.vastTracker.convertToTimecode(this.player.currentTime()),
      MEDIAPLAYHEAD: this.vastTracker.convertToTimecode(this.player.currentTime())
    })
  }

  /*
  * This method is responsible for choosing the best media file to play according to the user's
  * screen resolution and internet connection speed
  */
  static getBestMediaFile = (mediaFilesAvailable) => {
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
  static getBestCtaUrl = (creative) => {
    if (
      creative.videoClickThroughURLTemplate
      && creative.videoClickThroughURLTemplate.url) {
      return creative.videoClickThroughURLTemplate.url;
    }
    return false;
  }

  debug = (msg, data = undefined) => {
    if(!this.options.debug) {
      return
    }
    console.info('videojs-vast ---', msg, data ?? '');
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
