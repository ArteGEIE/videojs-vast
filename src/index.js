import videojs from 'video.js';
import 'videojs-contrib-ads';
import { VASTClient, VASTTracker, VASTParser } from '@dailymotion/vast-client';
import { addIcons } from './features/icons';
import { playLinearAd } from './modes/linear';
import { playCompanionAd } from './modes/companions';
import { playNonLinearAd } from './modes/nonlinear';
import {
  injectScriptTag, getLocalISOString, convertTimeOffsetToSeconds, fetchVmapUrl,
} from './lib';
import {
  getMidrolls, getPostroll, getPreroll, getBestCtaUrl,
} from './lib/utils';

const Plugin = videojs.getPlugin('plugin');

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
      addSkipButton: true,
      skipButtonOptions: {
        text: 'skip >>',
        inlineStyle: 'bottom: 90px; cursor: default; padding: 15px; position: absolute; right: 0; z-index: 3; background: rgba(0, 0, 0, 0.8); min-width: 30px; pointer-events: none; display:block',
        resetStyle: false,
      },
      debug: false,
      timeout: 5000,
      isLimitedTracking: false,
    };

    // Assign options that were passed in by the consumer
    this.options = {
      ...defaultOptions,
      ...options,
      skipButtonOptions: {
        ...defaultOptions.skipButtonOptions,
        ...options.skipButtonOptions,
      },
    };

    this.setMacros();

    // Init an empty array that will later contain the ads metadata
    this.adsArray = [];

    // array of nonlinear or companions dom element
    this.domElements = [];
    // array of icons dom containers
    this.iconContainers = [];

    const videojsContribAdsOptions = {
      debug: this.options.debug,
      timeout: this.options.timeout,
    };

    // initialize videojs-contrib-ads
    if (!this.player.ads) return;
    try {
      this.player.ads(videojsContribAdsOptions);
    } catch (e) {
      console.error(e);
    }

    if (options.vmapUrl) {
      this.handleVMAP(options.vmapUrl);
    } else {
      this.disablePostroll();
      (async () => {
        await this.handleVAST(options.vastUrl, () => {
          this.disablePreroll();
        });
        if (this.adsArray.length > 0) {
          this.addEventsListeners();
          // has to be done outside of handleVAST because not done at the same moment for VMAP case
          this.player.trigger('adsready');
        }
      })();
    }
  }

  disablePreroll() {
    this.player.trigger('nopreroll');
  }

  disablePostroll() {
    this.player.on('readyforpostroll', () => {
      this.player.trigger('nopostroll');
    });
  }

  setMacros(newMacros = undefined) {
    const { options } = this;
    if (!newMacros) {
      // generate unique int from current timestamp
      const cacheBuster = parseInt(Date.now().toString().slice(-8), 10);
      const ts = getLocalISOString(new Date());
      this.macros = {
        CACHEBUSTING: cacheBuster,
        TIMESTAMP: ts,
        PAGEURL: (window.location !== window.parent.location)
          ? document.referrer
          : document.location.href,
        // PODSEQUENCE: '',
        // UNIVERSALADID: '',
        // ADTYPE: '',
        // ADSERVINGID: '',
        // ADCATEGORIES: '',
        LIMITADTRACKING: options.isLimitedTracking,
      };
    } else {
      this.macros = {
        ...this.macros,
        ...newMacros,
      };
    }
  }

  async handleVAST(vastUrl, onError = null) {
    // Now let's fetch some adsonp
    this.vastClient = new VASTClient();
    try {
      const response = await this.vastClient.get(vastUrl, {
        allowMultipleAds: true,
        resolveAll: true,
      });
      this.adsArray = response.ads ?? [];
      if (this.adsArray.length === 0) {
        onError?.();
        // Deal with the error
        const message = 'VastVjs: Empty VAST XML';
        this.player.trigger('vast.error', {
          message,
          tag: vastUrl,
        });
      }
    } catch (err) {
      console.error(err);
      onError?.();
      // Deal with the error
      const message = 'VastVjs: Error while fetching VAST XML';
      this.player.trigger('vast.error', {
        message,
        tag: vastUrl,
      });
    }
  }

  removeDomElements() {
    // remove icons
    this.domElements.forEach((domElement) => {
      domElement.remove();
    });
  }

  readAd() {
    const currentAd = this.getNextAd();
    const linearCreative = currentAd.linearCreative();
    // Retrieve the CTA URl to render
    this.ctaUrl = getBestCtaUrl(currentAd.linearCreative());
    this.debug('ctaUrl', this.ctaUrl);

    if (currentAd.hasLinearCreative()) {
      this.player.trigger('vast.metadata', {
        duration: linearCreative.duration,
        id: linearCreative.id,
        adId: linearCreative.adId,
        type: linearCreative.type,
      });
      this.linearVastTracker = new VASTTracker(
        this.vastClient,
        currentAd.ad,
        linearCreative,
      );
      this.linearVastTracker.on('firstQuartile', () => {
        this.debug('firstQuartile');
      });
      this.linearVastTracker.on('midpoint', () => {
        this.debug('midpoint');
      });
      this.addIcons(currentAd);
      this.addSkipButton(linearCreative);
      // We now check if verification is needed or not, if it is, then we import the
      // verification script with a timeout trigger. If it is not, then we simply display the ad
      // by calling playAd
      if ('adVerifications' in currentAd.ad && currentAd.ad.adVerifications.length > 0) {
        // Set a timeout for the verification script - accortding to the IAB spec, we should do
        // a best effort to load the verification script before the actual ad, but it should not
        // block the ad nor the video playback
        const verificationTimeout = setTimeout(() => {
          this.playLinearAd(linearCreative);
        }, this.options.verificationTimeout);

        // Now for each verification script, we need to inject a script tag in the DOM and wait
        // for it to load
        let index = 0;
        this.setMacros({
          OMIDPARTNER: `${currentAd.ad.adVerifications[index].vendor ?? 'unknown'}`,
        });
        const scriptTagCallback = () => {
          index += 1;
          if (index < currentAd.ad.adVerifications.length) {
            injectScriptTag(
              currentAd.ad.adVerifications[index].resource,
              scriptTagCallback,
              // eslint-disable-next-line no-use-before-define
              scriptTagErrorCallback,
            );
          } else {
            // Once we are done with all verification tags, clear the timeout timer and play the ad
            clearTimeout(verificationTimeout);
            this.playLinearAd(linearCreative);
          }
        };
        const scriptTagErrorCallback = () => {
          // track error
          this.linearVastTracker.verificationNotExecuted(
            currentAd.ad.adVerifications[index].vendor,
            { REASON: 3 },
          );
          // load next script
          scriptTagCallback();
        };
        injectScriptTag(
          currentAd.ad.adVerifications[index].resource,
          scriptTagCallback,
          scriptTagErrorCallback,
        );
      } else {
        // No verification to import, just run the add
        this.playLinearAd(linearCreative);
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
        this.playCompanionAd(currentAd.companionCreative());
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
    if (this.adsArray.length === 0) {
      return null;
    }
    const nextAd = this.adsArray.shift();
    return {
      ad: nextAd,
      hasLinearCreative: () => {
        // find linear content
        const linear = nextAd.creatives.find((creative) => creative.type === 'linear') !== undefined && nextAd.creatives.filter((creative) => creative.type === 'linear')[0];
        // check if at least one mediaFile is provided
        const hasMediaFile = linear.mediaFiles.length > 0 && linear.mediaFiles.some((mediaFile) => mediaFile.fileURL !== '');
        return linear && hasMediaFile;
      },
      linearCreative: () => nextAd.creatives.filter((creative) => creative.type === 'linear')[0],
      hasCompanionCreative: () => nextAd.creatives.find((creative) => creative.type === 'companion') !== undefined,
      companionCreative: () => nextAd.creatives.filter((creative) => creative.type === 'companion')[0],
      hasNonlinearCreative: () => nextAd.creatives.find((creative) => creative.type === 'nonlinear') !== undefined,
      nonlinearCreative: () => nextAd.creatives.filter((creative) => creative.type === 'nonlinear')[0],
    };
  }

  onAdPlay = () => {
    this.debug('adplay');
    // don't track the very first play to avoid sending resume tracker event
    if (parseInt(this.player.currentTime(), 10) > 0) {
      this.linearVastTracker.setPaused(false, {
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
      });
    }
  };

  onAdPause = () => {
    this.debug('adpause');
    // don't track the pause event triggered before complete
    if (this.player.duration() - this.player.currentTime() > 0.2) {
      this.linearVastTracker.setPaused(true, {
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
      });
    }
  };

  // Track timeupdate-related events
  onAdTimeUpdate = () => {
    // Set progress to track automated trackign events
    this.linearVastTracker.setProgress(this.player.currentTime(), this.macros);
    this.player.trigger('vast.time', { position: this.player.currentTime(), currentTime: this.player.currentTime(), duration: this.player.duration() });
  };

  // track on regular content progress
  onProgress = async () => {
    if (this.watchForProgress && this.watchForProgress.length > 0) {
      const { timeOffset } = this.watchForProgress[0];
      const timeOffsetInSeconds = convertTimeOffsetToSeconds(timeOffset, this.player.duration());
      if (this.player.currentTime() > timeOffsetInSeconds) {
        const nextAd = this.watchForProgress.shift();
        if (nextAd.vastUrl) {
          await this.handleVAST(nextAd.vastUrl);
          this.readAd();
        } else if (nextAd.vastData) {
          this.parseInlineVastData(nextAd.vastData, 'midroll');
        }
      }
    }
  };

  onFirstPlay = () => {
    this.debug('first play');
    // Track the first timeupdate event - used for impression tracking
  };

  onAdVolumeChange = () => {
    this.debug('volume');
    if (!this.linearVastTracker) {
      return false;
    }
    // Track the user muting or unmuting the video
    this.linearVastTracker.setMuted(this.player.muted(), {
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
    return true;
  };

  onAdFullScreen = (evt, data) => {
    this.debug('fullscreen');
    if (!this.linearVastTracker) {
      return false;
    }
    // Track skip event
    this.linearVastTracker.setFullscreen(data.state);
    return true;
  };

  // Track when user closes the video
  onUnload = () => {
    if (!this.linearVastTracker) {
      return false;
    }

    this.linearVastTracker.close({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
    this.removeEventsListeners();
    return null;
  };

  // Notify the player if we reach a timeout while trying to load the ad
  onAdTimeout = () => {
    this.debug('adtimeout');
    // trigger a tracker error
    if (this.linearVastTracker) {
      this.linearVastTracker.error({
        ...this.macros,
        ERRORCODE: 301, // timeout of VAST URI
      });
    }
    console.error('VastVjs: Timeout');
    this.player.trigger('vast.error', {
      message: 'VastVjs: Timeout',
    });
    this.removeEventsListeners();
  };

  // send event when ad is playing to remove loading spinner
  onAdStart = () => {
    this.debug('adstart');
    // Trigger an event to notify the player consumer that the ad is playing
    this.player.trigger('vast.play', {
      ctaUrl: this.ctaUrl,
      skipDelay: this.linearVastTracker.skipDelay,
      adClickCallback: this.ctaUrl ? () => this.adClickCallback(this.ctaUrl) : false,
      duration: this.player.duration(),
    });
    // Track the impression of an ad
    this.linearVastTracker.load({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    this.linearVastTracker.trackImpression({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });
    this.linearVastTracker.overlayViewDuration(
      this.linearVastTracker.convertToTimecode(this.player.currentTime()),
      this.macros,
    );

    // make timeline not clickable
    if (this.player.controlBar) {
      this.player.controlBar.progressControl.disable();
    }

    if (this.options.addCtaClickZone) {
      // add the cta click
      const ctaDiv = document.createElement('div');
      ctaDiv.style.cssText = 'position: absolute; bottom:3em; left: 0; right: 0;top: 0;';
      ctaDiv.addEventListener('click', () => {
        this.player.pause();
        this.adClickCallback(this.ctaUrl);
      });
      this.domElements.push(ctaDiv);
      this.player.el().appendChild(ctaDiv);
    }
  };

  addSkipButton(creative) {
    this.debug('addSkipButton');
    if (this.options.addSkipButton && creative.skipDelay > 0) {
      const { skipDelay } = creative;
      const { skipButtonOptions: { inlineStyle, text, resetStyle } } = this.options;
      let skipRemainingTime = Math.round(skipDelay - this.player.currentTime());
      let isSkippable = skipRemainingTime < 1;
      // add the skip button
      const skipButtonDiv = document.createElement('div');
      skipButtonDiv.id = 'videojs-vast-skipButton';
      skipButtonDiv.style.cssText = 'bottom: 90px; cursor: default; padding: 15px; position: absolute; right: 0; z-index: 3; background: rgba(0, 0, 0, 0.8); min-width: 30px; pointer-events: none; display:block;';
      if (inlineStyle && inlineStyle !== '') {
        if (resetStyle) {
          skipButtonDiv.style.cssText = inlineStyle;
        } else {
          skipButtonDiv.style.cssText += inlineStyle;
        }
      }
      skipButtonDiv.innerHTML = isSkippable ? text : skipRemainingTime.toFixed();
      this.domElements.push(skipButtonDiv);
      this.player.el().appendChild(skipButtonDiv);
      // update time
      this.skipInterval = setInterval(() => {
        skipRemainingTime = Math.round(skipDelay - this.player.currentTime());
        isSkippable = skipRemainingTime < 1;
        if (isSkippable) {
          skipButtonDiv.style.cursor = 'pointer';
          skipButtonDiv.style.pointerEvents = 'auto';
          skipButtonDiv.addEventListener('click', () => {
            this.player.trigger('skip');
          });
          this.clearSkipInterval();
        }
        skipButtonDiv.innerHTML = isSkippable
          ? text
          : skipRemainingTime.toFixed();
      }, 1000);
    }
  }

  clearSkipInterval = () => {
    clearInterval(this.skipInterval);
  };

  onAdError = (evt) => {
    this.debug('aderror');
    // const error = this.player.error();
    // trigger a tracker error
    this.linearVastTracker.error({
      ...this.macros,
      ERRORCODE: 900, // undefined error, to be improved
    });

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.error', {
      message: evt,
      tag: this.options.vastUrl,
    });

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else { // pods is not ended go ahead
      this.readAd();
    }
  };

  onReadyForPreroll = () => {
    this.debug('readyforpreroll');
    this.readAd();
  };

  onReadyForPostroll = async () => {
    this.debug('readyforpostroll');
    if (this.postRollUrl) {
      await this.handleVAST(this.postRollUrl);
      this.readAd();
    } else if (this.postRollData) {
      // handle inline data
      this.adsArray = this.postRollData;
      this.readAd();
    }
  };

  onEnded = () => {
    this.removeEventsListeners();
  };

  onSkip = () => {
    this.debug('skip');

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.skip');

    // Track skip event
    this.linearVastTracker.skip({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    // delete ctadiv, skip btn, icons, companions or nonlinear elements
    this.removeDomElements();

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else {
      this.readAd();
    }
  };

  onDispose = () => {
    this.clearSkipInterval();
  };

  onAdEnded = () => {
    this.debug('adended');

    // Track the end of an ad
    this.linearVastTracker.complete({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    // delete ctadiv, skip btn, icons, companions or nonlinear elements
    this.removeDomElements();

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else { // pods is not ended go ahead
      this.readAd();
    }
  };

  resetPlayer() {
    // clear skip button interval
    this.clearSkipInterval();

    // Finish ad mode so that regular content can resume
    this.player.ads.endLinearAdMode();

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.complete');

    // reactivate controlbar
    if (this.player.controlBar) {
      this.player.controlBar.progressControl.enable();
    }
  }

  addEventsListeners() {
    // ad events
    this.player.one('adplaying', this.onFirstPlay);
    this.player.on('adplaying', this.onAdPlay);
    this.player.on('adpause', this.onAdPause);
    this.player.on('adtimeupdate', this.onAdTimeUpdate);
    this.player.on('advolumechange', this.onAdVolumeChange);
    this.player.on('adfullscreen', this.onAdFullScreen);
    this.player.on('adtimeout', this.onAdTimeout);
    this.player.on('adstart', this.onAdStart);
    this.player.on('aderror', this.onAdError);
    this.player.on('readyforpreroll', this.onReadyForPreroll);
    this.player.on('readyforpostroll', this.onReadyForPostroll);
    this.player.on('skip', this.onSkip);
    this.player.on('adended', this.onAdEnded);
    this.player.on('ended', this.onEnded);
    this.player.on('dispose', this.onDispose);
    window.addEventListener('beforeunload', this.onUnload);
  }

  removeEventsListeners() {
    this.debug('removeEventsListeners');
    this.player.off('adplaying', this.onAdPlay);
    this.player.off('adplaying', this.onFirstPlay);
    this.player.off('adpause', this.onAdPause);
    this.player.off('adtimeupdate', this.onAdTimeUpdate);
    this.player.off('advolumechange', this.onAdVolumeChange);
    this.player.off('adfullscreen', this.onAdFullScreen);
    this.player.off('adtimeout', this.onAdTimeout);
    this.player.off('adstart', this.onAdStart);
    this.player.off('aderror', this.onAdError);
    // added only if some midrolls have been found, remove by security
    this.player.off('timeupdate', this.onProgress);
    this.player.off('readyforpreroll', this.onReadyForPreroll);
    this.player.off('readyforpostroll', this.onReadyForPostroll);
    this.player.off('skip', this.onSkip);
    this.player.off('adended', this.onAdEnded);
    this.player.off('ended', this.onEnded);
    this.player.off('dispose', this.onDispose);
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
  };

  debug(msg, data = undefined) {
    if (!this.options.debug) {
      return;
    }
    console.info('videojs-vast ---', msg, data ?? '');
  }

  /*
  * This method is responsible disposing the plugin once it is not needed anymore
  */
  dispose() {
    this.debug('dispose');
    this.removeEventsListeners();
    super.dispose();
  }

  async handleVMAP(vmapUrl) {
    try {
      const vmap = await fetchVmapUrl(vmapUrl);
      if (vmap.adBreaks && vmap.adBreaks.length > 0) {
        this.addEventsListeners();
        // handle preroll
        const preroll = getPreroll(vmap.adBreaks);
        if (!preroll) {
          this.disablePreroll();
        } else if (preroll.adSource?.adTagURI?.uri) {
          // load vast preroll url
          await this.handleVAST(preroll.adSource.adTagURI.uri);
          // a preroll has been found, trigger adsready
          this.player.trigger('adsready');
        } else if (preroll.adSource.vastAdData) {
          this.parseInlineVastData(preroll.adSource?.vastAdData, 'preroll');
        }
        // handle postroll
        const postroll = getPostroll(vmap.adBreaks);
        if (!postroll) {
          this.disablePostroll();
        } else if (postroll.adSource?.adTagURI?.uri) {
          this.postRollUrl = postroll.adSource.adTagURI.uri;
        } else if (postroll.adSource?.vastAdData) {
          this.parseInlineVastData(postroll.adSource?.vastAdData, 'postroll');
        }
        this.watchForProgress = getMidrolls(vmap.adBreaks);
        if (this.watchForProgress.length > 0) {
          // listen on regular content for midroll handling
          this.player.on('timeupdate', this.onProgress);
        }
      }
    } catch (err) {
      // could not fetch vmap
      console.error(err);
    }
  }

  parseInlineVastData(vastAdData, adType) {
    const xmlString = (new XMLSerializer()).serializeToString(vastAdData);
    const vastXml = (new window.DOMParser()).parseFromString(xmlString, 'text/xml');
    const vastParser = new VASTParser();
    vastParser.parseVAST(vastXml)
      .then((parsedVAST) => {
        if (adType === 'postroll') {
          // store for later use (in readyforpostroll event)
          this.postRollData = parsedVAST.ads ?? [];
        } else if (adType === 'preroll') {
          this.adsArray = parsedVAST.ads ?? [];
          this.player.trigger('adsready');
        } else if (adType === 'midroll') {
          // store for later use (in readyforpostroll event)
          this.adsArray = parsedVAST.ads ?? [];
          this.readAd();
        }
      })
      .catch((err) => {
        console.log('error', err);
        if (adType === 'postroll' || adType === 'midroll') {
          this.disablePostroll();
        } else if (adType === 'preroll') {
          // skip preroll, go ahaed to regular content
          this.player.ads.skipLinearAdMode();
        }
      });
  }
}
Vast.prototype.playLinearAd = playLinearAd;
Vast.prototype.playNonLinearAd = playNonLinearAd;
Vast.prototype.playCompanionAd = playCompanionAd;
Vast.prototype.addIcons = addIcons;

export default Vast;

// Register the plugin with video.js
// The or statemente is necessary to deal with old versions of video.js
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin('vast', Vast);
