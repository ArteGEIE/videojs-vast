import { applyNonLinearCommonDomStyle, getCloseButton, sanitizeHtml } from '../lib/utils';

/*
* This method is responsible for rendering a nonlinear ad
*/
export function playNonLinearAd(creative) {
  creative.variations.forEach((variation) => {
    this.nonLinearVastTracker.trackImpression(this.macros);

    // image
    if (variation.staticResource) {
      const resourceContainer = document.createElement('div');
      this.domElements.push(resourceContainer);
      applyNonLinearCommonDomStyle(resourceContainer);

      const resource = document.createElement('img');
      resource.addEventListener('click', () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });
      resourceContainer.style.maxWidth = variation.expandedWidth;
      resourceContainer.style.maxHeight = variation.expandedHeight;
      resource.src = variation.staticResource;

      // add close button
      const closeButton = getCloseButton(() => resourceContainer.remove());
      closeButton.style.display = variation.minSuggestedDuration ? 'none' : 'block';

      if (variation.minSuggestedDuration) {
        setTimeout(() => {
          closeButton.style.display = 'block';
          resourceContainer.appendChild(closeButton);
        }, variation.minSuggestedDuration * 1000);
      }
      resourceContainer.appendChild(resource);
      if (variation.adSlotID) {
        const adSlot = document.querySelector(`#${variation.adSlotID}`);
        if (adSlot) {
          adSlot.appendChild(resourceContainer);
        } else {
          console.warn(`VastVjs: adSlotID #${variation.adSlotID} not found in DOM`);
        }
      } else {
        this.player.el().appendChild(resourceContainer);
      }
    }

    // html
    if (variation.htmlResource) {
      const resourceContainer = document.createElement('div');
      this.domElements.push(resourceContainer);
      applyNonLinearCommonDomStyle(resourceContainer);
      resourceContainer.addEventListener('click', () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });

      resourceContainer.style.maxWidth = variation.expandedWidth;
      resourceContainer.style.maxHeight = variation.expandedHeight;
      resourceContainer.innerHTML = sanitizeHtml(variation.htmlResource);

      if (variation.adSlotID) {
        const adSlot = document.querySelector(`#${variation.adSlotID}`);
        if (adSlot) {
          adSlot.appendChild(resourceContainer);
        } else {
          console.warn(`VastVjs: adSlotID #${variation.adSlotID} not found in DOM`);
        }
      } else {
        this.player.el().appendChild(resourceContainer);
      }
      if (variation.minSuggestedDuration) {
        setTimeout(() => {
          resourceContainer.remove();
        }, variation.minSuggestedDuration * 1000);
      }
    }

    // iframe
    if (variation.iframeResource) {
      const resourceContainer = document.createElement('iframe');
      this.domElements.push(resourceContainer);
      applyNonLinearCommonDomStyle(resourceContainer);
      resourceContainer.addEventListener('click', () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });

      resourceContainer.style.maxWidth = variation.expandedWidth;
      resourceContainer.style.maxHeight = variation.expandedHeight;

      resourceContainer.src = variation.iframeResource;
      if (variation.adSlotID) {
        const adSlot = document.querySelector(`#${variation.adSlotID}`);
        if (adSlot) {
          adSlot.appendChild(resourceContainer);
        } else {
          console.warn(`VastVjs: adSlotID #${variation.adSlotID} not found in DOM`);
        }
      } else {
        this.player.el().appendChild(resourceContainer);
      }
      if (variation.minSuggestedDuration) {
        setTimeout(() => {
          resourceContainer.remove();
        }, variation.minSuggestedDuration * 1000);
      }
    }
  });
}
