import { applyNonLinearCommonDomStyle, sanitizeHtml, appendToSlotOrPlayer } from '../lib/utils';

/*
* This method is responsible for rendering a companion ad
*/
export function playCompanionAd(creative) {
  creative.variations.forEach((variation) => {
    this.companionVastTracker.trackImpression(this.macros);

    const clickHandler = () => {
      window.open(variation.companionClickThroughURLTemplate, '_blank');
      this.companionVastTracker.click(null, this.macros);
    };

    // image
    if (variation.staticResources && variation.staticResources.length > 0) {
      variation.staticResources.forEach((staticResource) => {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        const { width, height } = variation.staticResources;
        resourceContainer.width = width > 0 ? width : 100;
        resourceContainer.height = height > 0 ? height : 100;
        resourceContainer.style.maxWidth = variation.staticResources.expandedWidth;
        resourceContainer.style.maxHeight = variation.staticResources.expandedHeight;
        applyNonLinearCommonDomStyle(resourceContainer);

        const resource = document.createElement('img');
        resource.addEventListener('click', clickHandler);
        resource.src = staticResource.url;
        resourceContainer.appendChild(resource);
        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
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
        resourceContainer.addEventListener('click', clickHandler);
        resourceContainer.innerHTML = sanitizeHtml(htmlResource);
        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
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
        resourceContainer.addEventListener('click', clickHandler);
        resourceContainer.src = iframeResource;
        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
      });
    }
  });
}
