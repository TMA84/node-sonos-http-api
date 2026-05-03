import isRadioOrLineIn from '../helpers/is-radio-or-line-in.js';
import appleDef from '../music_services/appleDef.js';
import spotifyDef from '../music_services/spotifyDef.js';
import deezerDef from '../music_services/deezerDef.js';
import libraryDef from '../music_services/libraryDef.js';
import type { Player, ActionApi } from './types.js';

const eliteDef = (deezerDef as any).init(true);

const musicServices = ['apple', 'spotify', 'deezer', 'elite', 'library'];
const serviceNames: Record<string, string> = { apple: 'Apple Music', spotify: 'Spotify', deezer: 'Deezer', elite: 'Deezer', library: 'Library' };
const musicTypes = ['album', 'song', 'station', 'load', 'playlist'];

let country = '';
let accountId = '';
let accountSN = '';
let searchType = 0;

function getService(service: string): any {
  if (service == 'apple') {
    return appleDef;
  } else if (service == 'spotify') {
    return spotifyDef;
  } else if (service == 'deezer') {
    return deezerDef;
  } else if (service == 'elite') {
    return eliteDef;
  } else if (service == 'library') {
    return libraryDef;
  }
}

function getAccountId(player: Player, service: string): Promise<void> {
  accountId = '';

  if (service != 'library') {
    return fetch(player.baseUrl + '/status/accounts').then(r => r.text())
      .then((res) => {
        const actLoc = res.indexOf((player.system as any).getServiceType(serviceNames[service]));

        if (actLoc != -1) {
          const idLoc = res.indexOf('<UN>', actLoc) + 4;
          const snLoc = res.indexOf('SerialNum="', actLoc) + 11;

          accountId = res.substring(idLoc, res.indexOf('</UN>', idLoc));
          accountSN = res.substring(snLoc, res.indexOf('"', snLoc));
        }

        return Promise.resolve();
      });
  } else {
    return Promise.resolve();
  }
}

function doSearch(service: string, type: string, term: string): Promise<any> {
  const serviceDef = getService(service);
  let url = serviceDef.search[type];
  const authenticate = serviceDef.authenticate;

  term = decodeURIComponent(term);

  let newTerm = '';

  // Check for search type specifiers
  if (term.indexOf(':') > -1) {
    const artistPos = term.indexOf('artist:');
    const albumPos = term.indexOf('album:');
    const trackPos = term.indexOf('track:');
    let nextPos = -1;
    let artist = '';
    let album = '';
    let track = '';

    if (artistPos > -1) {
      nextPos = (albumPos < trackPos) ? albumPos : trackPos;
      artist = term.substring(artistPos + 7, (artistPos < nextPos) ? nextPos : term.length);
    }
    if (albumPos > -1) {
      nextPos = (trackPos < artistPos) ? trackPos : artistPos;
      album = term.substring(albumPos + 6, (albumPos < nextPos) ? nextPos : term.length);
    }
    if (trackPos > -1) {
      nextPos = (albumPos < artistPos) ? albumPos : artistPos;
      track = term.substring(trackPos + 6, (trackPos < nextPos) ? nextPos : term.length);
    }

    newTerm = serviceDef.term(type, term, artist, album, track);
  } else {
    newTerm = (service == 'library') ? term : encodeURIComponent(term);
  }

  if (type == 'song') {
    searchType = (term.indexOf('track:') > -1) ? 1 : ((term.indexOf('artist:') > -1) ? 2 : 0);
  }
  url += newTerm;

  if (service == 'library') {
    return Promise.resolve(libraryDef.searchlib(type, newTerm));
  } else if ((serviceDef.country != '') && (country == '')) {
    return fetch('https://ipinfo.io').then(r => r.json())
      .then((res: any) => {
        country = res.country;
        url += serviceDef.country + country;
        return authenticate().then(() => fetch(url, { headers: serviceDef.headers() }).then(r => r.json()));
      });
  } else {
    if (serviceDef.country != '') {
      url += serviceDef.country + country;
    }

    return authenticate().then(() => fetch(url, { headers: serviceDef.headers() }).then(r => r.json()));
  }
}

function shuffleArray(arr: any[]): any[] {
  let len = arr.length;
  let temp: any;
  let i: number;
  while (len) {
    i = Math.random() * len-- >>> 0;
    temp = arr[len];
    arr[len] = arr[i];
    arr[i] = temp;
  }
  return arr;
}

function loadTracks(player: Player, service: string, type: string, tracksJson: any): any {
  const tracks = getService(service).tracks(type, tracksJson);

  if ((service == 'library') && (type == 'album')) {
    tracks.isArtist = true;
  } else if (type != 'album') {
    if (searchType == 0) {
      // Determine if the request was for a specific song or for many songs by a specific artist
      if (tracks.count > 1) {
        let artistCount = 1;
        let trackCount = 1;
        const artists = tracks.queueTracks.map(function (track: any) {
          return track.artistName.toLowerCase();
        }).sort();
        const songs = tracks.queueTracks.map(function (track: any) {
          return track.trackName.toLowerCase();
        }).sort();

        let prevArtist = artists[0];
        let prevTrack = songs[0];

        for (let i = 1; i < tracks.count; i++) {
          if (artists[i] != prevArtist) {
            artistCount++;
            prevArtist = artists[i];
          }
          if (songs[i] != prevTrack) {
            trackCount++;
            prevTrack = songs[i];
          }
        }
        tracks.isArtist = (trackCount / artistCount > 2);
      }
    } else {
      tracks.isArtist = (searchType == 2);
    }
  }

  // To avoid playing the same song first in a list of artist tracks when shuffle is on
  if (tracks.isArtist && player.coordinator.state.playMode.shuffle) {
    shuffleArray(tracks.queueTracks);
  }

  return tracks;
}

function musicSearch(player: Player, values: string[]): Promise<any> {
  const service = values[0];
  const type = values[1];
  const term = values[2];
  const queueURI = 'x-rincon-queue:' + player.coordinator.uuid + '#0';

  if (musicServices.indexOf(service) == -1) {
    return Promise.reject('Invalid music service');
  }

  if (musicTypes.indexOf(type) == -1) {
    return Promise.reject('Invalid type ' + type);
  }

  if ((service == 'library') && ((type == 'load') || (libraryDef as any).nolib())) {
    return (libraryDef as any).load(player, (type == 'load'));
  }

  return getAccountId(player, service)
    .then(() => {
      return doSearch(service, type, term);
    })
    .then((resList) => {
      const serviceDef = getService(service);
      serviceDef.service(player, accountId, accountSN, country);
      if (serviceDef.empty(type, resList)) {
        return Promise.reject('No matches were found');
      } else {
        let UaM: any = null;

        if (type == 'station') {
          UaM = serviceDef.urimeta(type, resList);

          return player.coordinator.setAVTransport(UaM.uri, UaM.metadata)
            .then(() => player.coordinator.play());
        } else if ((type == 'album' || type == 'playlist') && (service != 'library')) {
          UaM = serviceDef.urimeta(type, resList);

          return player.coordinator.clearQueue()
            .then(() => player.coordinator.setAVTransport(queueURI, ''))
            .then(() => player.coordinator.addURIToQueue(UaM.uri, UaM.metadata, true, 1))
            .then(() => player.coordinator.play());
        } else { // Play songs
          const tracks = loadTracks(player, service, type, resList);

          if (tracks.count == 0) {
            return Promise.reject('No matches were found');
          } else {
            if (tracks.isArtist) { // Play numerous songs by the specified artist
              return player.coordinator.clearQueue()
                .then(() => player.coordinator.setAVTransport(queueURI, ''))
                .then(() => player.coordinator.addURIToQueue(tracks.queueTracks[0].uri, tracks.queueTracks[0].metadata, true, 1))
                .then(() => player.coordinator.play())
                .then(() => {
                  // Do not return promise since we want to be considered done from the calling context
                  tracks.queueTracks.slice(1).reduce((promise: Promise<any>, track: any, index: number) => {
                    return promise.then(() => player.coordinator.addURIToQueue(track.uri, track.metadata, true, index + 2));
                  }, Promise.resolve());
                });
            } else { // Play the one specified song
              let empty = false;
              let nextTrackNo = 0;

              return ((player.coordinator as any).getQueue(0, 1) as Promise<any[]>)
                .then((queue) => {
                  empty = (queue.length == 0);
                  nextTrackNo = (empty) ? 1 : player.coordinator.state.trackNo + 1;
                })
                .then(() => player.coordinator.addURIToQueue(tracks.queueTracks[0].uri, tracks.queueTracks[0].metadata, true, nextTrackNo))
                .then(() => player.coordinator.setAVTransport(queueURI, ''))
                .then(() => {
                  if (!empty) {
                    return player.coordinator.nextTrack();
                  }
                })
                .then(() => player.coordinator.play());
            }
          }
        }
      }
    });
}

export default function (api: ActionApi): void {
  api.registerAction('musicsearch', musicSearch);
  (libraryDef as any).read();
}
