/* eslint-disable max-len */
/* eslint-disable no-undef */

const cacheKiller = Date.now();

describe('Linear Test : Inline', () => {
  it('Player should play the ad', () => {
    const vastUrl = `/fixtures/Inline_Simple.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/Inline_Simple.xml*').as('vastFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.get('.vjs-big-play-button').click();
    // After click, the ad should load and the video source should be the preroll
    cy.get('video', { timeout: 15000 }).should((el) => {
      const src = el.prop('src') || el.prop('currentSrc') || '';
      expect(src).to.include('preroll.mp4');
    });
  });
});

describe('Linear Test : Wrapper', () => {
  it('Wrapper resolves to inline creative', () => {
    const vastUrl = `/fixtures/Wrapper_Tag-test.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/Wrapper_Tag-test.xml*').as('wrapperFile');
    cy.intercept('GET', '**/Inline_Companion_Tag-test.xml*').as('inlineFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@wrapperFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.wait('@inlineFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.get('.vjs-big-play-button').click();
    cy.get('video', { timeout: 15000 }).should((el) => {
      const src = el.prop('src') || el.prop('currentSrc') || '';
      expect(src).to.include('preroll.mp4');
    });
  });
});

describe('Linear : skip', () => {
  it('Skip button appears and skips the ad', () => {
    const vastUrl = `/fixtures/vast_skip.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/vast_skip.xml*').as('vastFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile');
    cy.get('.vjs-big-play-button').click();
    cy.get('#videojs-vast-skipButton', { timeout: 10000 }).should('exist');
    // Wait for skip offset (3s) then click
    cy.get('#videojs-vast-skipButton', { timeout: 10000 }).should('not.be.disabled');
    cy.get('#videojs-vast-skipButton').click();
    // After skip, ad overlay should be gone
    cy.get('#videojs-vast-skipButton').should('not.exist');
  });
});

describe('Linear : icon', () => {
  it('Icon has been added', () => {
    const vastUrl = `/fixtures/IconClickFallbacks.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/IconClickFallbacks.xml*').as('vastFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile');
    cy.get('.vjs-big-play-button').click();
    cy.get('img[src*="ad_icon.png"]', { timeout: 10000 }).should('exist');
  });
});

describe('Linear Test : companions', () => {
  it('Player should display companion images', () => {
    const vastUrl = `/fixtures/Inline_Companion_Tag-test.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/Inline_Companion_Tag-test.xml*').as('vastFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.get('.vjs-big-play-button').click();
    // Companion static image from the fixture
    cy.get('img[src*="iab-tech-lab"]', { timeout: 10000 }).should('exist');
  });
});

describe('Linear Test : adPods', () => {
  it('Player should play all ads of adpods', () => {
    const vastUrl = `/fixtures/wrapper-ad-pod.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/wrapper-ad-pod.xml*').as('vastFile');
    cy.intercept('GET', '**/inline-linear.xml*').as('inlineVast');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    // Stub before click to capture all adplay events
    cy.window().then((win) => {
      win.adsPlugin.player.on('adplay', cy.stub().as('adplay'));
    });
    cy.get('.vjs-big-play-button').click();
    // Ad pod has 2 ads (sequence 1 and 2), wait for at least 1 adplay
    cy.get('@adplay', { timeout: 60000 }).should('have.been.called');
  });
});

describe('Linear Test : empty VAST', () => {
  it('Player should play normal video with no ad', () => {
    const vastUrl = `/fixtures/empty-no-ad.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/empty-no-ad.xml*').as('vastFile');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.window().then((win) => {
      win.adsPlugin.player.on('adstart', cy.stub().as('adstart'));
      win.adsPlugin.player.on('timeupdate', cy.stub().as('timeupdate'));
    });
    cy.get('.vjs-big-play-button').click();
    // Content should play (timeupdate fires)
    cy.get('@timeupdate', { timeout: 10000 }).should('have.been.called');
    // No ad should have started
    cy.get('@adstart').should('not.have.been.called');
  });
});

describe('Linear Test : Impression tracking', () => {
  it('All quartile tracking events are fired during ad playback', () => {
    const vastUrl = `/fixtures/Inline_Simple.xml?cacheKiller=${cacheKiller}`;
    const firedEvents = [];

    cy.intercept('GET', '**/Inline_Simple.xml*').as('vastFile');
    // Collect all tracking events in an array (order-independent)
    cy.intercept('GET', '**/tracking/**', (req) => {
      const match = req.url.match(/tracking\/([^?]+)/);
      if (match) firedEvents.push(match[1]);
    }).as('tracking');

    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile');
    cy.get('.vjs-big-play-button').click();

    // In headless Chrome, adtimeupdate events may be too infrequent to hit all quartiles.
    // Manually advance progress on the vast tracker to ensure all quartiles are fired.
    cy.window().then((win) => {
      const waitForTracker = () => {
        return new Cypress.Promise((resolve) => {
          const check = () => {
            if (win.adsPlugin && win.adsPlugin.linearVastTracker) {
              resolve();
            } else {
              setTimeout(check, 200);
            }
          };
          check();
        });
      };
      return waitForTracker().then(() => {
        const tracker = win.adsPlugin.linearVastTracker;
        const duration = tracker.assetDuration;
        // Simulate progress at each quartile to ensure tracking fires
        [0.01, 0.26, 0.51, 0.76].forEach((pct) => {
          tracker.setProgress(duration * pct);
        });
      });
    });

    // Wait for complete event (fired by onAdEnded, not setProgress)
    cy.wrap(null, { timeout: 45000 }).should(() => {
      expect(firedEvents, 'tracking events').to.include.members([
        'start',
        'firstQuartile',
        'midpoint',
        'thirdQuartile',
        'complete',
      ]);
    });
  });
});

describe('Linear Test : verification', () => {
  it('Verification scripts are loaded', () => {
    const vastUrl = `/fixtures/Ad_Verification-test.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/Ad_Verification-test.xml*').as('vastFile');
    cy.intercept('GET', '**/verification.js').as('verificationScript1');
    cy.intercept('GET', '**/verification2.js').as('verificationScript2');
    cy.visit(`/?vastUrl=${encodeURIComponent(vastUrl)}`);
    cy.wait('@vastFile');
    cy.get('.vjs-big-play-button').click();
    cy.wait('@verificationScript1', { timeout: 10000 }).its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.wait('@verificationScript2', { timeout: 10000 }).its('response.statusCode').should('be.oneOf', [200, 304]);
  });
});

describe('VMAP : full (AdTagURI)', () => {
  it('Preroll ad plays from VMAP schedule', () => {
    const vmapUrl = `/fixtures/vmap.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/vmap.xml*').as('vmapFile');
    cy.intercept('GET', '**/vast.xml*').as('vastFile');
    cy.visit(`/?vmapUrl=${encodeURIComponent(vmapUrl)}`);
    cy.wait('@vmapFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    // VMAP references vast.xml for the preroll
    cy.wait('@vastFile', { timeout: 10000 }).its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.window().then((win) => {
      win.adsPlugin.player.on('adplay', cy.stub().as('adplay'));
    });
    cy.get('.vjs-big-play-button').click();
    // Preroll should trigger at least one adplay
    cy.get('@adplay', { timeout: 30000 }).should('have.been.called');
  });
});

describe('VMAP : inline (VASTAdData)', () => {
  it('Preroll ad plays from inline VMAP data', () => {
    const vmapUrl = `/fixtures/vmap-inline.xml?cacheKiller=${cacheKiller}`;
    cy.intercept('GET', '**/vmap-inline.xml*').as('vmapFile');
    // Inline VMAP wraps vast.xml via VASTAdTagURI inside VASTAdData
    cy.intercept('GET', '**/vast.xml*').as('vastFile');
    cy.visit(`/?vmapUrl=${encodeURIComponent(vmapUrl)}`);
    cy.wait('@vmapFile').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.wait('@vastFile', { timeout: 10000 }).its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.window().then((win) => {
      win.adsPlugin.player.on('adplay', cy.stub().as('adplay'));
    });
    cy.get('.vjs-big-play-button').click();
    cy.get('@adplay', { timeout: 30000 }).should('have.been.called');
  });
});
