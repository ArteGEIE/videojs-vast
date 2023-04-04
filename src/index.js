/* eslint-disable no-param-reassign */
import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker } from '@dailymotion/vast-client';
import { injectScriptTag, isNumeric, getLocalISOString } from './lib';
import { playLinearAd, playNonLinearAd, playCompanionAd } from './modes';

const Plugin = videojs.getPlugin('plugin');

// TODO: remove injected verification javascript ?
// TODO: destructure in methods
// TODO: use common events name cf https://github.com/videojs/videojs-contrib-ads/blob/main/docs/integrator/common-interface.md ?
// TODO: implement macros
// TODO: implement multiple ads chaining

class Vast extends Plugin {
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

    // Init an empty array that will later contain the ads metadata
    this.adsArray = [];

    // array of nonlinear or companions dom element
    this.domElements = [];
    // array of icons dom containers
    this.iconContainers = [];

    const videojsContribAdsOptions = {
      debug: options.debug !== undefined ? options.debug : false,
      timeout: options.timeout !== undefined ? options.timeout : 5000,
    };

    // initialize videojs-contrib-ads
    if(!this.player.ads) return;
    this.player.ads(videojsContribAdsOptions);

    if(options.vmapUrl) {
      this.handleVMAP(options.vmapUrl);
    } else {
      this.player.on('readyforpostroll', () => {
        // disable postroll to avoid adTimeout error, to be improved later
        this.player.trigger('nopostroll');
      });
      this.handleVAST(options.vastUrl);
    }
    
  }

  setMacros(newMacros = undefined) {
    const { options } = this;
    if(!newMacros) {
      // generate unique int from current timestamp
      const cacheBuster = parseInt(Date.now().toString().slice(-8));
      const ts = getLocalISOString(new Date());
      this.macros = {
        CACHEBUSTING: cacheBuster,
        TIMESTAMP: ts,
        // PODSEQUENCE: '',
        // UNIVERSALADID: '',
        // ADTYPE: '',
        // ADSERVINGID: '',
        // ADCATEGORIES: '',
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
    this.vastClient.get(vastUrl, {
      allowMultipleAds: true,
      resolveAll: true,
    })
    .then((res) => {
        // Once we are done, trigger adsready event so that we can render a preroll
        this.adsArray = res.ads ? res.ads : [];
        if(this.adsArray.length > 0) {
          // trigger adsready which will trigger readyforpreroll event on play normal video
          this.addEventsListeners();
          this.player.trigger('adsready');
        } else {
          // TODO: track the error
          // Deal with the error
          const message = 'VastVjs: Empty VAST XML';
          this.player.trigger('vast.error', {
            message,
            tag: vastUrl,
          });
        }
    })
    .catch((err) => {
      console.error(err);
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      this.player.trigger('vast.error', {
        message,
        tag: vastUrl,
      });
    });
  }

  addIcons(ad) {
    const { icons } = ad.linearCreative();
    // is there some icons ?
    if(icons && icons.length > 0) {
      icons.map((icon) => {
        console.log(icon)
        const { height, width, staticResource, htmlResource, iframeResource, xPosition, yPosition, iconClickThroughURLTemplate, duration } = icon;
        let iconContainer = null;
        if(staticResource) {
          iconContainer = document.createElement('img');
          iconContainer.src = staticResource;
          iconContainer.height = height;
          iconContainer.width = width;
        } else if(htmlResource) {
          iconContainer = document.createElement('div');
          iconContainer.innerHTML = icon.htmlResource;
        } else if (iframeResource) {
          iconContainer = document.createElement('iframe');
          iconContainer.src = iframeResource;
          iconContainer.height = height;
          iconContainer.width = width;
        }
        
        iconContainer.style.zIndex = "1";
        iconContainer.style.position = "absolute";
        // positioning (Y)
        if (isNumeric(yPosition)) {
          iconContainer.style.top = `${yPosition}px`;
        } else {
          iconContainer.style[['top', 'bottom'].includes(yPosition) ? yPosition : 'top'] = "3em";
        }
        // positioning (X)
        if (isNumeric(xPosition)) {
          iconContainer.style.left = `${xPosition}px`;
        } else {
          iconContainer.style[['right', 'left'].includes(xPosition) ? xPosition : 'left'] = 0;
        }
        // on click icon
        if (iconClickThroughURLTemplate) {
          iconContainer.style.cursor = 'pointer';
          iconContainer.addEventListener('click', () => {
            window.open(iconClickThroughURLTemplate, '_blank');
            this.linearVastTracker.click(iconClickThroughURLTemplate, this.macros);
          });
        }
        this.domElements.push(iconContainer);
        this.player.el().appendChild(iconContainer);
        // remove icon after the given duration
        if(duration !== -1) {
          const durationInSeconds = duration.split(':').reverse().reduce((prev, curr, i) => prev + curr*Math.pow(60, i), 0);
          setTimeout(() => {
            this.player.el().removeChild(iconContainer);
          }, durationInSeconds * 1000);
        }
      })
    }
  }

  removeDomElements() {
    // remove icons
    for (const domElement of this.domElements) {
      domElement.remove();
    }
  }

  readAd() {
    const currentAd = this.getNextAd();

    // Retrieve the CTA URl to render
    this.ctaUrl = Vast.getBestCtaUrl(currentAd.linearCreative());
    this.debug('ctaUrl', this.ctaUrl);

    if (currentAd.hasLinearCreative()) {
      this.linearVastTracker = new VASTTracker(this.vastClient, currentAd.ad, currentAd.linearCreative());
      this.linearVastTracker.on('firstQuartile', () => {
        this.debug('firstQuartile');
      });
      this.linearVastTracker.on('midpoint', () => {
        this.debug('midpoint');
      });
      this.addIcons(currentAd);
      // We now check if verification is needed or not, if it is, then we import the
      // verification script with a timeout trigger. If it is not, then we simply display the ad
      // by calling playAd
      if ('adVerifications' in currentAd.ad && currentAd.ad.adVerifications.length > 0) {
        // Set a timeout for the verification script - accortding to the IAB spec, we should do
        // a best effort to load the verification script before the actual ad, but it should not
        // block the ad nor the video playback
        const verificationTimeout = setTimeout(() => {
          this.playLinearAd(currentAd.linearCreative());
        }, this.options.verificationTimeout);

        // Now for each verification script, we need to inject a script tag in the DOM and wait
        // for it to load
        let index = 0;
        const scriptTagErrorCallback = () => {s
           // track error
           this.linearVastTracker.verificationNotExecuted(currentAd.ad.adVerifications[index].vendor, { REASON: 3 });
           // load next script
           scriptTagCallback();
        }
        const scriptTagCallback = () => {
          index = index + 1;
          if (index < currentAd.ad.adVerifications.length) {
            injectScriptTag(currentAd.ad.adVerifications[index].resource, scriptTagCallback, scriptTagErrorCallback);
          } else {
            // Once we are done with all verification tags, clear the timeout timer and play the ad
            clearTimeout(verificationTimeout);
            this.playLinearAd(currentAd.linearCreative());
          }
        };
        injectScriptTag(currentAd.ad.adVerifications[index].resource, scriptTagCallback, scriptTagErrorCallback);
      } else {
        // No verification to import, just run the add
        this.playLinearAd(currentAd.linearCreative());
      }
    } else {
      this.player.ads.skipLinearAdMode();
    }
    if (currentAd.hasNonlinearCreative()) {
      // TODO: remove those listeners
      this.player.one(currentAd.hasLinearCreative() ? 'adplaying' : 'playing', () => {
        this.nonLinearVastTracker = new VASTTracker(this.vastClient, currentAd.ad, currentAd.nonlinearCreative(), 'NonLinearAd');
        this.playNonLinearAd(currentAd.nonlinearCreative());
      });
    }
    if (currentAd.hasCompanionCreative()) {
      // TODO: remove those listeners
      this.player.one(currentAd.hasLinearCreative() ? 'adplaying' : 'playing', () => {
        this.companionVastTracker = new VASTTracker(this.vastClient, currentAd.ad, currentAd.companionCreative(), 'CompanionAd');
        this.playCompanionAd(currentAd.companionCreative())
      });
    }
  }

  /*
  * This method is responsible for retrieving the next ad to play from all the ads present in the
  * VAST manifest.
  * Please be aware that a single ad can have multple types of creatives.
  * A linear add for example can come with a companion ad and both can should be displayed.
  */
  getNextAd() {
    if(this.adsArray.length === 0) {
      return null;
    }
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
    // don't track the very first play to avoid sending resume tracker event
    if(parseInt(this.player.currentTime(), 10) > 0) {
      this.linearVastTracker.setPaused(false, { 
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
      });
    }
  }
  onPause = () => {
    this.debug('pause');
    // don't track the pause event triggered before complete
    if (this.player.duration() - this.player.currentTime() > 0.2) {
      this.linearVastTracker.setPaused(true, { 
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
      });
    }
  }
  // Track timeupdate-related events
  onTimeUpdate = () => {
    // Set progress to track automated trackign events
    this.linearVastTracker.setProgress(this.player.currentTime(), this.macros);
    this.player.trigger('vast.time', { position: this.player.currentTime(), currentTime: this.player.currentTime(), duration: this.player.duration() });
  }

  onFirstPlay = () => {
    this.debug('first play');
    // Track the first timeupdate event - used for impression tracking
    this.linearVastTracker.trackImpression({ 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
    this.linearVastTracker.overlayViewDuration(this.linearVastTracker.convertToTimecode(this.player.currentTime()), this.macros);
  }

  onVolumeChange = () => {
    this.debug('volume');
    if(!this.linearVastTracker){
      return false;
    }
    // Track the user muting or unmuting the video
    this.linearVastTracker.setMuted(this.player.muted(), { 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
  }

  onFullScreen = (evt, data) => {
    this.debug('fullscreen');
    // Track skip event
    this.linearVastTracker.setFullscreen(data.state);
  }

  // Track when user closes the video
  onUnload = () => {
    this.linearVastTracker.close({ 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
    this.removeEventsListeners();
    return null;
  }

  // Notify the player if we reach a timeout while trying to load the ad
  onAdTimeout = () => {
    this.debug('adstart');
    //trigger a tracker error
    if(this.linearVastTracker) {
      this.linearVastTracker.error({
        ...this.macros,
        ERRORCODE: 301 // timeout of VAST URI
      });
    }
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
      skipDelay: this.linearVastTracker.skipDelay,
      adClickCallback: this.ctaUrl ? () => this.adClickCallback(this.ctaUrl) : false,
    });
    // Track the impression of an ad
    this.linearVastTracker.load({ 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

     // make timeline not clickable
     this.player.controlBar.progressControl.disable();

    if(this.options.addCtaClickZone) {
      // ad the cta click
      this.ctaDiv = document.createElement('div');
      this.ctaDiv.style.cssText = "position: absolute; bottom:3em; left: 0; right: 0;top: 0;";
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
    this.linearVastTracker.error({
      ...this.macros,
      ERRORCODE: 900 // undefined error, to be improved
    });

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.error', {
      message: evt,
      tag: options.vastUrl,
    });

    // pods is not ended go ahead
    if(this.adsArray.length === 0 ) {
      this.resetPlayer();
    } else {
      this.readAd();
    }
  }


  onReadyForPreroll = () => {
    this.debug('readyforpreroll');
    this.readAd();
  }

  onSkip = () => {
    this.debug('skip');
    
    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.skip');
    
    // Track skip event
    this.linearVastTracker.skip({ 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    if(this.options.addCtaClickZone) {
      // remove cta
      this.ctaDiv.remove();
    }

    // delete icons, companions or nonlinear elements
    this.removeDomElements();
    
    // pods is not ended go ahead
    if(this.adsArray.length === 0 ) {
      this.resetPlayer();
    }
  }

  onAdEnded = () => {
    this.debug('adended');

    if(this.options.addCtaClickZone) {
      // remove cta
      this.ctaDiv.remove();
    }

    // Track the end of an ad
    this.linearVastTracker.complete({ 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    // delete icons, companions or nonlinear elements
    this.removeDomElements();

    // pods is not ended go ahead
    if(this.adsArray.length === 0 ) {
      this.resetPlayer();
    } else {
      this.readAd();
    }
  }

  resetPlayer() {
    // Finish ad mode so that regular content can resume
    this.player.ads.endLinearAdMode();

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.complete');

    this.removeEventsListeners();

    // reactivate controlbar
    this.player.controlBar.progressControl.enable();
  }

  addEventsListeners() {
    // ad events
    this.player.one('adplaying', this.onFirstPlay);
    this.player.on('adplaying', this.onPlay);
    this.player.on('adpause', this.onPause);
    this.player.on('adtimeupdate', this.onTimeUpdate);
    this.player.on('advolumechange', this.onVolumeChange);
    this.player.on('adfullscreen', this.onFullScreen);
    this.player.on('adtimeout', this.onAdTimeout);
    this.player.on('adstart', this.onAdStart);
    this.player.on('aderror', this.onAdError);
    this.player.on('readyforpreroll', this.onReadyForPreroll);
    this.player.on('skip', this.onSkip);
    this.player.on('adended', this.onAdEnded);
    window.addEventListener('beforeunload', this.onUnload);
  }

  removeEventsListeners() {
    // regular player events
    this.player.off('adplaying', this.onPlay);
    this.player.off('adplaying', this.onFirstPlay);
    this.player.off('adpause', this.onPause);
    this.player.off('adtimeupdate', this.onTimeUpdate);
    this.player.off('advolumechange', this.onVolumeChange);
    this.player.off('adfullscreen', this.onFullScreen);
    this.player.off('adtimeout', this.onAdTimeout);
    this.player.off('adstart', this.onAdStart);
    this.player.off('aderror', this.onAdError);
    this.player.off('readyforpreroll', this.onReadyForPreroll);
    this.player.off('skip', this.onSkip);
    this.player.off('adended', this.onAdEnded);
    window.removeEventListener('beforeunload', this.onUnload);
  }

  /*
  * This method is responsible for dealing with the click on the ad
  */
  adClickCallback = (ctaUrl) => {
    this.player.trigger('vast.click');
    window.open(ctaUrl, '_blank');
    // Track when a user clicks on an ad
    this.linearVastTracker.click(null, { 
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
  }



  getCloseButton(clickCallback) {
    const closeButton  = document.createElement('button');
    closeButton.addEventListener('click', clickCallback);
    closeButton.style.width = '20px';
    closeButton.style.height = '20px';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '5px';
    closeButton.style.top = '5px';
    closeButton.style.zIndex = '3';
    closeButton.style.background = '#CCC';
    closeButton.style.color = '#000';
    closeButton.style.fontSize = '12px';
    closeButton.style.cursor = 'pointer';
    closeButton.textContent = 'X';
    return closeButton;
  }

  static applyNonLinearCommonDomStyle(domElement) {
    domElement.style.cursor = 'pointer';
    domElement.style.left = '50%';
    domElement.style.position = 'absolute';
    domElement.style.transform = 'translateX(-50%)';
    domElement.style.bottom = '80px';
    domElement.style.display = 'block';
    domElement.style.zIndex = '2';
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
    this.removeEventsListeners();
    super.dispose();
  }
}

Vast.prototype.playLinearAd = playLinearAd;
Vast.prototype.playNonLinearAd = playNonLinearAd;
Vast.prototype.playCompanionAd = playCompanionAd;

export default Vast;

// Register the plugin with video.js
// The or statemente is necessary to deal with old versions of video.js
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin('vast', Vast);
