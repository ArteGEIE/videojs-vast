import videojs from 'video.js';
import Vast from './index.js';
const regeneratorRuntime = require('regenerator-runtime/runtime');
import { EventEmitter } from 'events';

test('Plugin must be registered', () => {
  const player = {
    ads: jest.fn(),
    on: jest.fn(),
    trigger: jest.fn(),
  };
  const options = {};

  const vastInstance = new Vast(player, options);

  expect(videojs.registerPlugin).toHaveBeenCalled();
});

test('Plugin must be able to fetch a VAST manifest', async () => {
  const player = {
    ads: jest.fn(),
    on: jest.fn(),
    trigger: jest.fn(),
  };
  const options = {
    vastUrl: 'https://static-cdn.arte.tv/static/artevpv7/vast/vast.xml',
  };

  const vastInstance = new Vast(player, options);
  
  await new Promise((r) => setTimeout(r, 4000));
  expect(player.trigger).toHaveBeenCalledWith('adsready');
});

test('Plugin must have attached the necessary event listeners', async () => {
  const player = {
    ads: jest.fn(),
    on: jest.fn(),
    trigger: jest.fn(),
  };
  const options = {
    vastUrl: 'https://static-cdn.arte.tv/static/artevpv7/vast/vast.xml',
  };

  const vastInstance = new Vast(player, options);
  
  expect(player.on).toHaveBeenCalledTimes(7);
});

test('Plugin must init linear ad mode and update the videojs source URL with the ad copy', async () => {
  const eventBus = new EventEmitter()
  const player = {
    src: jest.fn(),
    ads: () => {
      player.ads = {
        startLinearAdMode: jest.fn()
      }
    },
    on: (name, callback) => eventBus.on(name, callback),
    one: (name, callback) => eventBus.on(name, callback),
    trigger: jest.fn(),
  };
  const options = {
    vastUrl: 'https://static-cdn.arte.tv/static/artevpv7/vast/vast.xml',
  };

  const vastInstance = new Vast(player, options);
  
  await new Promise((r) => setTimeout(r, 4000));
  eventBus.emit('readyforpreroll');
  await new Promise((r) => setTimeout(r, 2400));
  expect(player.ads.startLinearAdMode).toHaveBeenCalled();
  expect(player.src).toHaveBeenCalledWith('https://static-cdn.arte.tv/static/artevpv7/vast/preroll.mp4');
  expect(player.trigger).toHaveBeenCalledWith('vast.playAttempt');
});

test('Plugin must initilize tracker when preparing ad', async () => {
  const eventBus = new EventEmitter()
  const player = {
    src: jest.fn(),
    ads: () => {
      player.ads = {
        startLinearAdMode: jest.fn()
      }
    },
    on: (name, callback) => eventBus.on(name, callback),
    one: (name, callback) => eventBus.on(name, callback),
    trigger: jest.fn(),
  };
  const options = {
    vastUrl: 'https://static-cdn.arte.tv/static/artevpv7/vast/vast.xml',
  };

  const vastInstance = new Vast(player, options);
  
  await new Promise((r) => setTimeout(r, 4000));
  const nextAd = vastInstance.getNextAd();
  expect(nextAd.linear.tracker).toBeTruthy();
});
