import {
  describe, it, expect, vi,
} from 'vitest';

// video.js (and its plugin registration) is mocked so index.js can be imported in a
// node environment without a real player. We only exercise the prototype methods.
vi.mock('video.js', () => {
  // base "plugin" must be a constructor (Vast extends it); never instantiated here
  function Plugin() {}
  const videojs = Object.assign(() => {}, {
    getPlugin: () => Plugin,
    registerPlugin: () => {},
    plugin: () => {},
  });
  return { default: videojs };
});
vi.mock('videojs-contrib-ads', () => ({ default: {} }));
vi.mock('@dailymotion/vast-client', () => ({
  VASTClient: () => {},
  VASTParser: () => {},
  VASTTracker: () => {},
}));

const Vast = (await import('./index')).default;

function createContext({ currentTime = 0 } = {}) {
  const trigger = vi.fn();
  const setPaused = vi.fn();
  const ctx = {
    debug: vi.fn(),
    ctaUrl: 'https://cta.example.com',
    currentAdStreamUrl: 'https://ads.example.com/preroll.mp4',
    adClickCallback: vi.fn(),
    macros: {},
    notifyAdStarted: vi.fn(),
    linearVastTracker: {
      skipDelay: 5,
      setPaused,
      convertToTimecode: (t) => t,
    },
    player: {
      trigger,
      duration: () => 12,
      currentTime: () => currentTime,
    },
  };
  return { ctx, trigger, setPaused };
}

describe('notifyAdStarted', () => {
  it('triggers vast.play with the preroll streamUrl and ad metadata', () => {
    const { ctx, trigger } = createContext();
    Vast.prototype.notifyAdStarted.call(ctx);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith(
      'vast.play',
      expect.objectContaining({
        streamUrl: 'https://ads.example.com/preroll.mp4',
        duration: 12,
        skipDelay: 5,
        ctaUrl: 'https://cta.example.com',
      }),
    );
  });
});

describe('handleAdPlay', () => {
  it('notifies the ad start on the real first play (currentTime ~0)', () => {
    const { ctx, setPaused } = createContext({ currentTime: 0 });
    Vast.prototype.handleAdPlay.call(ctx);
    expect(ctx.notifyAdStarted).toHaveBeenCalledTimes(1);
    expect(setPaused).not.toHaveBeenCalled();
  });

  it('does not re-notify on resume (currentTime > 0) but tracks the resume', () => {
    const { ctx, setPaused } = createContext({ currentTime: 10 });
    Vast.prototype.handleAdPlay.call(ctx);
    expect(ctx.notifyAdStarted).not.toHaveBeenCalled();
    expect(setPaused).toHaveBeenCalledWith(false, expect.anything());
  });
});
