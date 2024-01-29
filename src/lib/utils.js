export const isNumeric = (str) => {
  if (typeof str === 'number') {
    return true;
  }
  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str));
};

export const getLocalISOString = (date) => {
  const offset = date.getTimezoneOffset();
  const offsetAbs = Math.abs(offset);
  const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
  return `${isoString.slice(0, -1)}${offset > 0 ? '-' : '+'}${String(Math.floor(offsetAbs / 60)).padStart(2, '0')}`;
};

export const convertTimeOffsetToSeconds = (timecode, duration = null) => {
  // convert timeoffset in percent
  if (duration && timecode.includes('%')) {
    const percent = timecode.replace('%', '');
    return (duration / 100) * percent;
  }
  // convert timeoffset in seconds from the start
  if (timecode.includes('#')) {
    return timecode.replace('#', '');
  }
  // convert timeoffset in timecode
  const [time, ms] = timecode.split('.');
  const [hours, minutes, seconds] = time.split(':');
  return Number(`${parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10)}.${ms}`);
};

/*
  * This method is responsible for choosing the best media file to play according to the user's
  * screen resolution and internet connection speed
  */
export const getBestMediaFile = (mediaFilesAvailable) => {
  // select the best media file based on internet bandwidth and screen size/resolution
  const videojsVhs = localStorage.getItem('videojs-vhs');
  const bandwidth = videojsVhs ? JSON.parse(videojsVhs).bandwidth : undefined;

  let bestMediaFile = mediaFilesAvailable[0];

  if (mediaFilesAvailable && bandwidth) {
    const { height } = window.screen;
    const { width } = window.screen;

    const result = mediaFilesAvailable
      .sort((a, b) => ((Math.abs(a.bitrate - bandwidth) - Math.abs(b.bitrate - bandwidth))
        || (Math.abs(a.width - width) - Math.abs(b.width - width))
        || (Math.abs(a.height - height) - Math.abs(b.height - height))));

    [bestMediaFile] = result;
  }

  return bestMediaFile;
};

export const applyNonLinearCommonDomStyle = (domElement) => {
  domElement.style.cursor = 'pointer';
  domElement.style.left = '50%';
  domElement.style.position = 'absolute';
  domElement.style.transform = 'translateX(-50%)';
  domElement.style.bottom = '80px';
  domElement.style.display = 'block';
  domElement.style.zIndex = '2';
};

export const getCloseButton = (clickCallback) => {
  const closeButton = document.createElement('button');
  closeButton.addEventListener('click', clickCallback);
  closeButton.style.width = '20px';
  closeButton.style.height = '20px';
  closeButton.style.position = 'absolute';
  closeButton.style.right = '5px';
  closeButton.style.top = '5px';
  closeButton.style.zIndex = '3';
  closeButton.style.background = '#CCC';
  closeButton.style.color = '#000';
  closeButton.style.fontSize = '12px';
  closeButton.style.cursor = 'pointer';
  closeButton.textContent = 'X';
  return closeButton;
};

/*
* This method is responsible for choosing the best URl to redirect the user to when he clicks
* on the ad
*/
export const getBestCtaUrl = (creative) => {
  if (
    creative.videoClickThroughURLTemplate
    && creative.videoClickThroughURLTemplate.url) {
    return creative.videoClickThroughURLTemplate.url;
  }
  return false;
};

export const getMidrolls = (adBreaks) => {
  const midrolls = [];
  if (adBreaks) {
    return adBreaks
      .filter((adBreak) => !['start', '0%', '00:00:00', 'end', '100%'].includes(adBreak.timeOffset))
      .reduce((prev, current) => ([
        ...prev,
        {
          timeOffset: current.timeOffset,
          vastUrl: current.adSource.adTagURI?.uri,
          vastData: current.adSource.vastAdData,
        },
      ]), []);
  }
  return midrolls;
};

export const getPreroll = (adBreaks) => {
  if (adBreaks) {
    return adBreaks.filter((adBreak) => ['start', '0%', '00:00:00'].includes(adBreak.timeOffset))[0];
  }
  return false;
};

export const getPostroll = (adBreaks) => {
  if (adBreaks) {
    return adBreaks.filter((adBreak) => ['end', '100%'].includes(adBreak.timeOffset))[0];
  }
  return false;
};
