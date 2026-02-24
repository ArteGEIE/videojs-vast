/* eslint-disable max-len */
import { applyNonLinearCommonDomStyle } from '../lib/utils';

/*
* This method is responsible for rendering a nonlinear ad
*/
export function playCompanionAd(creative) {
  creative.variations.map((variation) => {
    this.companionVastTracker.trackImpression(this.macros);

    // image
    if (variation.staticResources && variation.staticResources.length > 0) {
      variation.staticResources.map((staticResource) => {
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
          document.querySelector(`#${variation.adSlotID}`).appendChild(resourceContainer);
        } else {
          this.player.el().appendChild(resourceContainer);
        }
        return staticResource;
      });
    }

    // html
    if (variation.htmlResources) {
      variation.htmlResources.map((htmlResource) => {
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
        resourceContainer.innerHTML = htmlResource;
        if (variation.adSlotID) {
          document.querySelector(`#${variation.adSlotID}`).appendChild(resourceContainer);
        } else {
          this.player.el().appendChild(resourceContainer);
        }
        return htmlResource;
      });
    }

    // iframe
    if (variation.iframeResources) {
      variation.iframeResources.map((iframeResource) => {
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
          document.querySelector(`#${variation.adSlotID}`).appendChild(resourceContainer);
        } else {
          this.player.el().appendChild(resourceContainer);
        }
        return iframeResource;
      });
    }
    return variation;
  });
}
