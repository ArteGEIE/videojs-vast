import { describe, it, expect } from 'vitest';
import {
  isNumeric,
  getLocalISOString,
  convertTimeOffsetToSeconds,
  getBestCtaUrl,
  getMidrolls,
  getPreroll,
  getPostroll,
} from './utils';

describe('isNumeric', () => {
  it('returns true for numbers', () => {
    expect(isNumeric(42)).toBe(true);
    expect(isNumeric(0)).toBe(true);
    expect(isNumeric(-3.14)).toBe(true);
  });

  it('returns true for numeric strings', () => {
    expect(isNumeric('42')).toBe(true);
    expect(isNumeric('3.14')).toBe(true);
    expect(isNumeric('-10')).toBe(true);
  });

  it('returns false for non-numeric strings', () => {
    expect(isNumeric('abc')).toBe(false);
    expect(isNumeric('')).toBe(false);
  });

  it('returns true for strings starting with digits (parseFloat behavior)', () => {
    // isNumeric uses parseFloat which parses leading digits
    expect(isNumeric('12px')).toBe(true);
  });

  it('returns true for NaN (typeof NaN is number)', () => {
    // isNumeric checks typeof first, and typeof NaN === 'number'
    expect(isNumeric(NaN)).toBe(true);
  });
});

describe('getLocalISOString', () => {
  it('returns a string with timezone offset', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = getLocalISOString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}$/);
  });

  it('does not end with Z', () => {
    const date = new Date();
    const result = getLocalISOString(date);
    expect(result).not.toMatch(/Z$/);
  });
});

describe('convertTimeOffsetToSeconds', () => {
  it('converts percentage offset', () => {
    const result = convertTimeOffsetToSeconds('50%', 120);
    expect(result).toBe(60);
  });

  it('converts hash-prefixed seconds', () => {
    const result = convertTimeOffsetToSeconds('#45');
    expect(result).toBe('45');
  });

  it('converts HH:MM:SS timecode', () => {
    const result = convertTimeOffsetToSeconds('00:01:30.000');
    expect(result).toBe(90);
  });

  it('converts timecode with hours', () => {
    const result = convertTimeOffsetToSeconds('01:00:00.000');
    expect(result).toBe(3600);
  });

  it('converts timecode with milliseconds', () => {
    const result = convertTimeOffsetToSeconds('00:00:10.500');
    expect(result).toBe(10.5);
  });
});

describe('getBestCtaUrl', () => {
  it('returns URL when videoClickThroughURLTemplate exists', () => {
    const creative = {
      videoClickThroughURLTemplate: { url: 'https://example.com' },
    };
    expect(getBestCtaUrl(creative)).toBe('https://example.com');
  });

  it('returns false when no template exists', () => {
    const creative = {};
    expect(getBestCtaUrl(creative)).toBe(false);
  });

  it('returns false when template has no url', () => {
    const creative = { videoClickThroughURLTemplate: {} };
    expect(getBestCtaUrl(creative)).toBe(false);
  });
});

describe('getMidrolls', () => {
  const makeAdBreak = (timeOffset) => ({
    timeOffset,
    adSource: { adTagURI: { uri: `https://ads.example.com/${timeOffset}` } },
  });

  it('returns empty array when no adBreaks', () => {
    expect(getMidrolls(null)).toEqual([]);
    expect(getMidrolls(undefined)).toEqual([]);
  });

  it('filters out preroll and postroll offsets', () => {
    const adBreaks = [
      makeAdBreak('start'),
      makeAdBreak('00:00:30'),
      makeAdBreak('end'),
    ];
    const result = getMidrolls(adBreaks);
    expect(result).toHaveLength(1);
    expect(result[0].timeOffset).toBe('00:00:30');
  });

  it('filters out percentage preroll/postroll', () => {
    const adBreaks = [
      makeAdBreak('0%'),
      makeAdBreak('50%'),
      makeAdBreak('100%'),
    ];
    const result = getMidrolls(adBreaks);
    expect(result).toHaveLength(1);
    expect(result[0].timeOffset).toBe('50%');
  });

  it('extracts vastUrl from adSource', () => {
    const adBreaks = [makeAdBreak('00:01:00')];
    const result = getMidrolls(adBreaks);
    expect(result[0].vastUrl).toBe('https://ads.example.com/00:01:00');
  });
});

describe('getPreroll', () => {
  const makeAdBreak = (timeOffset) => ({ timeOffset });

  it('returns false when no adBreaks', () => {
    expect(getPreroll(null)).toBe(false);
    expect(getPreroll(undefined)).toBe(false);
  });

  it('finds preroll with "start" offset', () => {
    const adBreaks = [makeAdBreak('start'), makeAdBreak('00:01:00')];
    expect(getPreroll(adBreaks)).toEqual({ timeOffset: 'start' });
  });

  it('finds preroll with "0%" offset', () => {
    const adBreaks = [makeAdBreak('0%')];
    expect(getPreroll(adBreaks)).toEqual({ timeOffset: '0%' });
  });

  it('finds preroll with "00:00:00" offset', () => {
    const adBreaks = [makeAdBreak('00:00:00')];
    expect(getPreroll(adBreaks)).toEqual({ timeOffset: '00:00:00' });
  });

  it('returns undefined when no preroll found', () => {
    const adBreaks = [makeAdBreak('00:01:00')];
    expect(getPreroll(adBreaks)).toBeUndefined();
  });
});

describe('getPostroll', () => {
  const makeAdBreak = (timeOffset) => ({ timeOffset });

  it('returns false when no adBreaks', () => {
    expect(getPostroll(null)).toBe(false);
    expect(getPostroll(undefined)).toBe(false);
  });

  it('finds postroll with "end" offset', () => {
    const adBreaks = [makeAdBreak('start'), makeAdBreak('end')];
    expect(getPostroll(adBreaks)).toEqual({ timeOffset: 'end' });
  });

  it('finds postroll with "100%" offset', () => {
    const adBreaks = [makeAdBreak('100%')];
    expect(getPostroll(adBreaks)).toEqual({ timeOffset: '100%' });
  });

  it('returns undefined when no postroll found', () => {
    const adBreaks = [makeAdBreak('00:01:00')];
    expect(getPostroll(adBreaks)).toBeUndefined();
  });
});
