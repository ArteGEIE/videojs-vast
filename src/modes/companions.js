/* eslint-disable max-len */
import { applyNonLinearCommonDomStyle, sanitizeHtml } from '../lib/utils';

/*
* This method is responsible for rendering a nonlinear ad
*/
export function playCompanionAd(creative) {
  creative.variations.forEach((variation) => {
    this.companionVastTracker.trackImpression(this.macros);

    // image
    if (variation.staticResources && variation.staticResources.length > 0) {
      variation.staticResources.forEach((staticResource) => {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        resourceContainer.width = variation.staticResources.width > 0 ? variation.staticResources.width : 100;
        resourceContainer.height = variation.staticResources.height > 0 ? variation.staticResources.height : 100;
        resourceContainer.style.maxWidth = variation.staticResources.expandedWidth;
        resourceContainer.style.maxHeight = variation.staticResources.expandedHeight;
        applyNonLinearCommonDomStyle(resourceContainer);

        const resource = document.createElement('img');
        this.domElements.push(resourceContainer);
        resource.addEventListener('click', () => {
          window.open(variation.companionClickThroughURLTemplate, '_blank');
          this.companionVastTracker.click(null, this.macros);
        });
        resource.src = staticResource.url;
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
      });
    }

    // html
    if (variation.htmlResources) {
      variation.htmlResources.forEach((htmlResource) => {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        resourceContainer.width = variation.htmlResources.width;
        resourceContainer.height = variation.htmlResources.height;
        resourceContainer.style.maxWidth = variation.htmlResources.expandedWidth;
        resourceContainer.style.maxHeight = variation.htmlResources.expandedHeight;
        applyNonLinearCommonDomStyle(resourceContainer);
        resourceContainer.addEventListener('click', () => {
          window.open(variation.companionClickThroughURLTemplate, '_blank');
          this.companionVastTracker.click(null, this.macros);
        });
        resourceContainer.innerHTML = sanitizeHtml(htmlResource);
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
      });
    }

    // iframe
    if (variation.iframeResources) {
      variation.iframeResources.forEach((iframeResource) => {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        resourceContainer.width = variation.iframeResources.width;
        resourceContainer.height = variation.iframeResources.height;
        resourceContainer.style.maxWidth = variation.iframeResources.expandedWidth;
        resourceContainer.style.maxHeight = variation.iframeResources.expandedHeight;
        applyNonLinearCommonDomStyle(resourceContainer);
        resourceContainer.addEventListener('click', () => {
          window.open(variation.companionClickThroughURLTemplate, '_blank');
          this.companionVastTracker.click(null, this.macros);
        });
        resourceContainer.src = iframeResource;
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
      });
    }
  });
}
