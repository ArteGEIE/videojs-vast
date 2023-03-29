import videojs from 'video.js';
import './index';

videojs('my-video').vast({
  vastUrl : 'https://cdnzone.nuevodevel.com/pub/5.0/e-n-1/nonlinear_sample_01.xml',
  debug: true,
});