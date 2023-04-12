import Vast from '../index';
/*
* This method is responsible for rendering a linear ad
*/
export function playLinearAd(creative) {
  this.debug('playLinearAd', creative);
  // Retrieve the media file from the VAST manifest
  const mediaFile = Vast.getBestMediaFile(creative.mediaFiles);

  // Start ad mode
  if (!this.player.ads.inAdBreak()) {
    this.player.ads.startLinearAdMode();
  }

  // Trigger an event when the ad starts playing
  this.player.trigger('vast.playAttempt');

  // Set a property in the player object to indicate that an ad is playing
  // play linear ad content
  this.player.src(mediaFile.fileURL);
  this.setMacros({
    ASSETURI: mediaFile.fileURL,
    ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    CONTENTPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
  });
}
