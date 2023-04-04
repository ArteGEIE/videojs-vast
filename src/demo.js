import videojs from 'video.js';
import './index';

const vastCollection = {
  skip: 'https://www.arte.tv/static/artevpv7/vast/vast_skip.xml',
  icon: 'https://opencdn.b-cdn.net/pub/5.0/e-i-1/icon_sample_02.xml',
  icons: 'https://opencdn.b-cdn.net/pub/5.0/e-i-1/icon_sample_03.xml',
  companions: 'https://opencdn.b-cdn.net/pub/5.0/e-c-1/companion_sample_05.xml',
  adpods: 'https://cdnzone.nuevodevel.com/pub/5.0/e-a-1/vast_adpods_sample2.xml',
  empty: 'https://www14.smartadserver.com/ac?siteid=307555&pgid=1115590&fmtid=81409&ab=1&tgt=cat%3DARS_ADS%3Blang%3Dfr%3Bplatform%3DARTE_NEXT&oc=1&out=vast4&ps=1&pb=0&visit=S&vcn=s&ctid=110339-002-A&ctd=523&lang=fr&ctt=web&ssar=1&ctc=ARS_ADS&ctk=RC-023763&tmstp=1680516826827',
  wrapper: 'https://raw.githubusercontent.com/dailymotion/vast-client-js/b5a72b04226a6880da1e00191033edb150f6b956/test/vastfiles/wrapper-ad-pod.xml',
  playing: 'https://www14.smartadserver.com/ac?siteid=307555&pgid=1115590&fmtid=81409&ab=1&tgt=cat%3dSER_CHU%3blang%3dfr%3bplatform%3dARTE_NEXT&oc=1&out=vast4&ps=1&pb=0&visit=S&vcn=s&ctid=104710-001-A&ctd=734&lang=fr&ctt=web&ssar=1&ctc=SER_CHU&ctk=RC-023563&tmstp=1679984219110&cklb=1'
}

videojs('my-video', { autoplay: true, muted: true }).vast({
  vastUrl: vastCollection.playing,
  debug: true,
});