/*
* Event binding configuration for the Vast plugin.
* Each entry maps an event name to its handler method name on the plugin instance.
* 'once' entries use player.one() instead of player.on().
*/
const playerEvents = [
  { event: 'adplaying', handler: 'onAdPlay' },
  { event: 'adpause', handler: 'onAdPause' },
  { event: 'adtimeupdate', handler: 'onAdTimeUpdate' },
  { event: 'advolumechange', handler: 'onAdVolumeChange' },
  { event: 'adfullscreen', handler: 'onAdFullScreen' },
  { event: 'adtimeout', handler: 'onAdTimeout' },
  { event: 'adstart', handler: 'onAdStart' },
  { event: 'aderror', handler: 'onAdError' },
  { event: 'readyforpreroll', handler: 'onReadyForPreroll' },
  { event: 'readyforpostroll', handler: 'onReadyForPostroll' },
  { event: 'skip', handler: 'onSkip' },
  { event: 'adended', handler: 'onAdEnded' },
  { event: 'ended', handler: 'onEnded' },
  { event: 'dispose', handler: 'onDispose' },
];

export function addEventsListeners() {
  this.player.one('adplaying', this.onFirstPlay);
  playerEvents.forEach(({ event, handler }) => {
    this.player.on(event, this[handler]);
  });
  window.addEventListener('beforeunload', this.onUnload);
}

export function cleanupReadAdListeners() {
  if (this.onNonLinearReady) {
    this.player.off('adplaying', this.onNonLinearReady);
    this.player.off('playing', this.onNonLinearReady);
    this.onNonLinearReady = null;
  }
  if (this.onCompanionReady) {
    this.player.off('adplaying', this.onCompanionReady);
    this.player.off('playing', this.onCompanionReady);
    this.onCompanionReady = null;
  }
}

export function removeEventsListeners() {
  this.debug('removeEventsListeners');
  this.cleanupReadAdListeners();
  this.player.off('adplaying', this.onFirstPlay);
  playerEvents.forEach(({ event, handler }) => {
    this.player.off(event, this[handler]);
  });
  // added only if some midrolls have been found, remove by security
  this.player.off('timeupdate', this.onProgress);
  window.removeEventListener('beforeunload', this.onUnload);
}
