/* eslint-disable max-len */
/* eslint-disable array-callback-return */
/* eslint-disable no-undef */
import { VASTParser } from '@dailymotion/vast-client';

describe('Linear Test : Inline', () => {
  it('Player source is ad source', () => {
    const vastUrl = '/fixtures/Inline_Simple.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then((req) => {
      const vastXml = (new window.DOMParser()).parseFromString(req.response.body, 'text/xml');
      const vastParser = new VASTParser();
      vastParser.parseVAST(vastXml)
        .then((parsedVAST) => {
          const linearAd = parsedVAST.ads[0].creatives.filter((creative) => creative.type === 'linear')[0];
          cy.window().then((win) => {
            win.adsPlugin.player.on('play', (data) => {
              cy.get('video').should('have.prop', 'src', linearAd.mediaFiles[0].fileURL);
            });
            cy.get('.vjs-big-play-button').click();
          });
          expect(req.state).to.eq('Complete');
        });
    });
  });
});

describe('Linear Test : Wrapper', () => {
  it('Creative is reachable', () => {
    const vastUrl = '/fixtures/Wrapper_Tag-test.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.intercept('GET', vastUrl).as('subVastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then((req) => {
      cy.wait(100);
      expect(req.state).to.eq('Complete');
    });
    cy.wait('@subVastFile').then((req) => {
      cy.wait(100);
      expect(req.state).to.eq('Complete');
    });
  });
});

describe('Linear : skip', () => {
  it('Skip button should be present', () => {
    const vastUrl = 'http://localhost:3000/fixtures/vast_skip.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then(() => {
      cy.get('.vjs-big-play-button').click();
      cy.get('#videojs-vast-skipButton').should('exist');
    });
  });
});

describe('Linear : icon', () => {
  it('Icon has been added', () => {
    let linearAd;
    const vastUrl = '/fixtures/IconClickFallbacks.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then((req) => {
      cy.wait(100);
      const vastXml = (new window.DOMParser()).parseFromString(req.response.body, 'text/xml');
      const vastParser = new VASTParser();
      vastParser.parseVAST(vastXml)
        .then((parsedVAST) => {
          cy.get('.vjs-big-play-button').click();
          linearAd = parsedVAST.ads[0].creatives.filter((creative) => creative.type === 'linear')[0];
          cy.get(`img[src="${linearAd.icons[0].staticResource}"]`, { timeout: 5000 }).should('exist');
          cy.get(`img[src="${linearAd.icons[0].staticResource}"]`, { timeout: 5000 }).should('have.attr', 'width', linearAd.icons[0].width > 0 ? linearAd.icons[0].width : 100);
        });
    });
  });
});

describe('Linear Test : companions', () => {
  it('Player should display companions', () => {
    const vastUrl = '/fixtures/Inline_Companion_Tag-test.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then((req) => {
      cy.wait(100);
      const vastXml = (new window.DOMParser()).parseFromString(req.response.body, 'text/xml');
      const vastParser = new VASTParser();
      vastParser.parseVAST(vastXml)
        .then((parsedVAST) => {
          const linearAd = parsedVAST.ads[0].creatives.filter((creative) => creative.type === 'companion')[0];
          cy.window().then((win) => {
            cy.get('.vjs-big-play-button').click();
            win.adsPlugin.player.on('play', (data) => {
              linearAd.variations.map((variation) => {
                // image
                if (variation.staticResources && variation.staticResources.length > 0) {
                  variation.staticResources.map((staticResource) => {
                    cy.get(`img[src="${staticResource.url}"]`).should('exist');
                  });
                }
                // html
                if (variation.htmlResources) {
                  variation.htmlResources.map((htmlResource) => {
                    const textArea = document.createElement('textarea');
                    textArea.innerText = htmlResource;
                    // cy.get('.video-js').invoke('html').contains(textArea.innerHTML);
                  });
                }
                // iframe
                if (variation.iframeResources) {
                  variation.iframeResources.map((iframeResource) => {
                    cy.get(`iframe[src="${iframeResource}"]`).should('exist');
                  });
                }
              });
            });
          });
        });
    });
  });
});

describe('Linear Test : adPods', () => {
  it('Player should play all ads of adpods', () => {
    const vastUrl = '/fixtures/wrapper-ad-pod.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').then((req) => {
      cy.get('.vjs-big-play-button').click();
      cy.window().then((win) => {
        win.adsPlugin.player.on('adplay', cy.stub().as('adplay'));
      });
      cy.get('@adplay', { timeout: 60000 }).should('have.callCount', 1);
      expect(req.state).to.eq('Complete');
    });
  });
});

describe('Linear Test : empty VAST', () => {
  it('Player should play normal video and no vast event', () => {
    const vastUrl = '/fixtures/empty-no-ad.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    // cy.intercept('GET', videoFile).as('videoFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    // cy.wait('@videoFile');
    cy.wait('@vastFile').then((req) => {
      cy.window().then((win) => {
        win.adsPlugin.player.on('timeupdate', cy.stub().as('timeupdate'));
        cy.get('.vjs-big-play-button').click();
        cy.get('@timeupdate').should('have.been.called');
      });
    });
  });
});

describe('Linear Test : Impression', () => {
  it.skip('Impression are tracked', () => {
    const vastUrl = '/fixtures/wrapper-ad-pod.xml';
    // intercept final vast
    cy.intercept('GET', 'inline-linear.xml').as('vastFile');
    // cy.intercept('GET', videoFile).as('videoFile');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    // cy.intercept('GET', videoFile).as('videoFile');
    cy.wait('@vastFile').then((req) => {
      const vastXml = (new window.DOMParser()).parseFromString(req.response.body, 'text/xml');
      const vastParser = new VASTParser();
      vastParser.parseVAST(vastXml)
        .then((parsedVAST) => {
          const linearAd = parsedVAST.ads[0].creatives.filter((creative) => creative.type === 'linear')[0];
          cy.intercept('GET', linearAd.trackingEvents.firstQuartile[0]).as('firstQuartile');
          cy.intercept('GET', linearAd.trackingEvents.midpoint[0]).as('midpoint');
          cy.intercept('GET', linearAd.trackingEvents.thirdQuartile[0]).as('thirdQuartile');
          cy.intercept('GET', linearAd.trackingEvents.complete[0]).as('complete');
          cy.wait(5000);
          cy.window().then((win) => {
            cy.get('.vjs-big-play-button').click();
            cy.wait('@firstQuartile').then((req) => {
              cy.log(req);
              expect(req.state).to.eq('Complete');
            });
            cy.wait(3000);
            cy.wait('@midpoint').then((req) => {
              cy.log(req);
              expect(req.state).to.eq('Complete');
            });
            cy.wait(3000);
            cy.wait('@thirdQuartile').then((req) => {
              cy.log(req);
              expect(req.state).to.eq('Complete');
            });
            cy.wait(5000);
            cy.wait('@complete').then((req) => {
              cy.log(req);
              expect(req.state).to.eq('Complete');
            });
          });
        });
      expect(req.state).to.eq('Complete');
    });
  });
});

describe('Linear Test : verification', () => {
  it('Verification script are loaded', () => {
    const vastUrl = '/fixtures/Ad_Verification-test.xml';
    cy.intercept('GET', vastUrl).as('vastFile');
    cy.intercept('GET', '/fixtures/verification.js').as('verificationScript1');
    cy.intercept('GET', '/fixtures/verification2.js').as('verificationScript2');
    cy.visit(`http://localhost:3000/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile');
    cy.get('.vjs-big-play-button').click();
    cy.wait('@verificationScript1').then((req) => {
      cy.wait(100);
      expect(req.state).to.eq('Complete');
    });
    cy.wait('@verificationScript2').then((req) => {
      cy.wait(100);
      expect(req.state).to.eq('Complete');
    });
  });
});
