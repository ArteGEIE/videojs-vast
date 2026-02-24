import VMAP from '@dailymotion/vmap';

export const fetchVmapUrl = async (url, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`VastVjs: VMAP fetch failed with status ${response.status}`);
    }

    const text = await response.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    return new VMAP(xml);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`VastVjs: VMAP fetch timed out after ${timeout}ms`);
    }
    throw err;
  }
};
