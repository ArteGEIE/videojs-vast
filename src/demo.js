import videojs from 'video.js';
import './index';

/**
 * Search a param value in the current query string
 */
const getURLParameter = (param) => {
  const result = window.location.search.match(new RegExp(`(\\?|&)${param}(\\[\\])?=([^&]*)`));
  return result ? decodeURIComponent(result[3]) : undefined;
};

// eslint-disable-next-line no-unused-vars
const vmapCollection = {
  full: '/fixtures/vmap.xml',
  inline: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpostoptimizedpodbumper&cmsid=496&vid=short_onecue&vpi=1',
  inlineSmart: '/fixtures/vmap-inline.xml',
};
globalThis.getURLParameter = getURLParameter;
globalThis.adsPlugin = videojs('my-video', { autoplay: false, muted: true }).vast({
  vastUrl: getURLParameter('vastUrl') ? getURLParameter('vastUrl') : 'https://www.arte.tv/static/artevpv7/vast/vast_skip.xml',
  // vmapUrl: getURLParameter('vmapType') ? getURLParameter('vmapType') : vmapCollection.full,
  debug: true,
});
