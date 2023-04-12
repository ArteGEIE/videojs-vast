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
