import videojs from 'video.js';
import './index';

videojs('my-video').vast({
  vastUrl : 'https://www.arte.tv/static/artevpv7/vast/vast_skip.xml',
  debug: true,
});