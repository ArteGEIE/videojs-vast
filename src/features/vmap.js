import { VASTParser } from '@dailymotion/vast-client';
import Vast from '../index';
import { fetchVmapUrl } from '../lib';

export function parseInlineVastData(vastAdData, adType) {
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

export async function handleVMAP(vmapUrl) {
  try {
    const vmap = await fetchVmapUrl(vmapUrl);
    if (vmap.adBreaks && vmap.adBreaks.length > 0) {
      this.addEventsListeners();
      // handle preroll
      const preroll = Vast.getPreroll(vmap.adBreaks);
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
      const postroll = Vast.getPostroll(vmap.adBreaks);
      if (!postroll) {
        this.disablePostroll();
      } else if (postroll.adSource?.adTagURI?.uri) {
        this.postRollUrl = postroll.adSource.adTagURI.uri;
      } else if (postroll.adSource?.vastAdData) {
        this.parseInlineVastData(postroll.adSource?.vastAdData, 'postroll');
      }
      this.watchForProgress = Vast.getMidrolls(vmap.adBreaks);
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
