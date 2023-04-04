  /*
  * This method is responsible for rendering a nonlinear ad
  */
export function playCompanionAd(creative) {
    for (const variation of creative.variations) {
      this.companionVastTracker.trackImpression(this.macros);

      // image
      if(variation.staticResources && variation.staticResources.length > 0) {
        for (const staticResource of variation.staticResources) {
          const ressourceContainer = document.createElement('div');
          this.domElements.push(ressourceContainer);
          ressourceContainer.width = variation.staticResources.width;
          ressourceContainer.height = variation.staticResources.height;
          ressourceContainer.style.maxWidth = variation.staticResources.expandedWidth;
          ressourceContainer.style.maxHeight = variation.staticResources.expandedHeight;
          this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);

          const ressource = document.createElement('img');
          this.domElements.push(ressourceContainer);
          ressource.addEventListener('click', () => {
            console.info("ressource clicked");
            window.open(variation.companionClickThroughURLTemplate, '_blank');
            this.companionVastTracker.click(null, this.macros);
          });
          ressource.src = staticResource.url;
          ressourceContainer.appendChild(ressource);
          if(variation.adSlotID) {
            document.querySelector('#' + variation.adSlotID).appendChild(ressourceContainer);
          } else {
            this.player.el().appendChild(ressourceContainer);
          }
        }
      }

      // html
      if(variation.htmlResources) {
        for (const htmlResource of variation.htmlResources) {
          const ressourceContainer = document.createElement('div');
          this.domElements.push(ressourceContainer);
          ressourceContainer.width = variation.htmlResources.width;
          ressourceContainer.height = variation.htmlResources.height;
          ressourceContainer.style.maxWidth = variation.htmlResources.expandedWidth;
          ressourceContainer.style.maxHeight = variation.htmlResources.expandedHeight;
          this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);
          ressourceContainer.addEventListener('click', () => {
            window.open(variation.companionClickThroughURLTemplate, '_blank');
            this.companionVastTracker.click(null, this.macros);
          });
          ressourceContainer.innerHTML = htmlResource;
          if(variation.adSlotID) {
            document.querySelector('#' + variation.adSlotID).appendChild(ressourceContainer);
          } else {
            this.player.el().appendChild(ressourceContainer);
          }
        }
      }

      // iframe
      if(variation.iframeResources) {
        for (const iframeResource of variation.iframeResources) {
          const ressourceContainer = document.createElement('div');
          this.domElements.push(ressourceContainer);
          ressourceContainer.width = variation.iframeResources.width;
          ressourceContainer.height = variation.iframeResources.height;
          ressourceContainer.style.maxWidth = variation.iframeResources.expandedWidth;
          ressourceContainer.style.maxHeight = variation.iframeResources.expandedHeight;
          this.constructor.applyNonLinearCommonDomStyle(ressourceContainer);
          ressourceContainer.addEventListener('click', () => {
            window.open(variation.companionClickThroughURLTemplate, '_blank');
            this.companionVastTracker.click(null, this.macros);
          });
          ressourceContainer.src = iframeResource;
          if(variation.adSlotID) {
            document.querySelector('#' + variation.adSlotID).appendChild(ressourceContainer);
          } else {
            this.player.el().appendChild(ressourceContainer);
          }
        }
      }
    }
  }