 /*
  * This method is responsible for rendering a nonlinear ad
  */
export function playNonLinearAd(creative) {
  for (const variation of creative.variations) {

    this.nonLinearVastTracker.trackImpression(this.macros);

    // image
    if(!!variation.staticResource) {
      const ressourceContainer = document.createElement('div');
      this.domElements.push(ressourceContainer);
      this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);

      const ressource = document.createElement('img');
      ressource.addEventListener('click', () => {
        console.info("ressource clicked");
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });
      ressourceContainer.style.maxWidth = variation.expandedWidth;
      ressourceContainer.style.maxHeight = variation.expandedHeight;
      ressource.src = variation.staticResource;

      // add close button
      const closeButton = this.getCloseButton(() => ressourceContainer.remove());
      closeButton.style.display = variation.minSuggestedDuration ? 'none' : 'block';

      if(variation.minSuggestedDuration) {
        setTimeout(() => {
          closeButton.style.display = 'block';
          ressourceContainer.appendChild(closeButton);
        }, variation.minSuggestedDuration * 1000);
      }
      ressourceContainer.appendChild(ressource)
      this.player.el().appendChild(ressourceContainer)
    }

    // html
    if(!!variation.htmlResource) {
      const ressourceContainer = document.createElement('div');
      this.domElements.push(ressourceContainer);
      this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);
      ressourceContainer.addEventListener('click', () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });

      ressourceContainer.style.maxWidth = variation.expandedWidth;
      ressourceContainer.style.maxHeight = variation.expandedHeight;
      ressourceContainer.innerHTML = variation.htmlResource;

      this.player.el().appendChild(ressourceContainer);
      if(variation.minSuggestedDuration) {
        setTimeout(() => {
          ressourceContainer.remove();
        }, variation.minSuggestedDuration * 1000);
      }
    }

    // iframe
    if(!!variation.iframeResource) {
      const ressourceContainer = document.createElement('iframe');
      this.domElements.push(ressourceContainer);
      this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);
      ressourceContainer.addEventListener('click', () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      });

      ressourceContainer.style.maxWidth = variation.expandedWidth;
      ressourceContainer.style.maxHeight = variation.expandedHeight;

      ressourceContainer.src = variation.iframeResource;
      this.player.el().appendChild(ressourceContainer);
      if(variation.minSuggestedDuration) {
        setTimeout(() => {
          ressourceContainer.remove();
        }, variation.minSuggestedDuration * 1000);
      }
    }
  }
}