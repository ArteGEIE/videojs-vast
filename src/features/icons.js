import { isNumeric } from '../lib';

export function addIcons(ad) {
  const { icons } = ad.linearCreative();
  // is there some icons ?
  if (icons && icons.length > 0) {
    icons.forEach((icon) => {
      const {
        height, width, staticResource,
        htmlResource, iframeResource, xPosition, yPosition, iconClickThroughURLTemplate, duration,
      } = icon;
      let iconContainer = null;
      if (staticResource) {
        iconContainer = document.createElement('img');
        iconContainer.src = staticResource;
        iconContainer.height = height > 0 ? height : 100;
        iconContainer.width = width > 0 ? width : 100;
      } else if (htmlResource) {
        iconContainer = document.createElement('div');
        iconContainer.innerHTML = icon.htmlResource;
      } else if (iframeResource) {
        iconContainer = document.createElement('iframe');
        iconContainer.src = iframeResource;
        iconContainer.height = height > 0 ? height : 100;
        iconContainer.width = width > 0 ? width : 100;
      }

      iconContainer.style.zIndex = '1';
      iconContainer.style.position = 'absolute';
      // positioning (Y)
      if (isNumeric(yPosition)) {
        iconContainer.style.top = `${yPosition}px`;
      } else {
        iconContainer.style[['top', 'bottom'].includes(yPosition) ? yPosition : 'top'] = '3em';
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
      if (duration !== -1) {
        const durationInSeconds = duration.split(':').reverse().reduce((prev, curr, i) => prev + curr * 60 ** i, 0);
        setTimeout(() => {
          this.player.el().removeChild(iconContainer);
        }, durationInSeconds * 1000);
      }
    });
  }
}
