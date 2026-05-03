import { createRequire } from 'node:module';
import settings from '../../settings.js';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const Anesidora = require('anesidora');
const Fuse = require('fuse.js');

function getPandoraMetadata(id: string, title: string, serviceType: string): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="100c206cST%3a${id}" parentID="0" restricted="true"><dc:title>${title}</dc:title><upnp:class>object.item.audioItem.audioBroadcast.#station</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token</desc></item></DIDL-Lite>`;
}

function getPandoraUri(id: string): string {
  return `x-sonosapi-radio:ST%3a${id}?sid=236&flags=8300&sn=1`;
}

function pandora(player: Player, values: string[]): Promise<any> {
  const cmd = values[0];

  let pAPI: any;

  function userLogin(): Promise<void> {
    return new Promise(function (resolve, reject) {
      pAPI.login(function (err: any) {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }

  function pandoraAPI(command: string, parameters: any): Promise<any> {
    return new Promise(function (resolve, reject) {
      pAPI.request(command, parameters, function (err: any, result: any) {
        if (!err) {
          resolve(result);
        } else {
          console.log("pandoraAPI " + command + " " + JSON.stringify(parameters));
          console.log("ERROR: " + JSON.stringify(err));
          reject(err);
        }
      });
    });
  }

  function playPandora(player: Player, name: string): Promise<any> {
    let uri = '';
    let metadata = '';

    return userLogin()
      .then(() => pandoraAPI("user.getStationList", { "includeStationArtUrl": true }))
      .then((stationList: any) => {
        return pandoraAPI("music.search", { "searchText": name })
          .then((result: any) => {
            if (result.artists != undefined) {
              result.artists.map(function (artist: any) {
                if (artist.score > 90) {
                  stationList.stations.push({ "stationId": artist.musicToken, "stationName": artist.artistName, "type": "artist" });
                }
              });
            }
            if (result.songs != undefined) {
              result.songs.map(function (song: any) {
                if (song.score > 90) {
                  stationList.stations.push({ "stationId": song.musicToken, "stationName": song.songName, "type": "song" });
                }
              });
            }
            return pandoraAPI("station.getGenreStations", {});
          })
          .then((result: any) => {
            result.categories.map(function (category: any) {
              category.stations.map(function (genreStation: any) {
                stationList.stations.push({ "stationId": genreStation.stationToken, "stationName": genreStation.stationName, "type": "song" });
              });
            });
            const fuzzy = new Fuse(stationList.stations, { keys: ["stationName"] });

            const results = fuzzy.search(name);
            if (results.length > 0) {
              const station = results[0];
              if (station.type == undefined) {
                uri = getPandoraUri(station.item.stationId);
                metadata = getPandoraMetadata(station.item.stationId, station.item.stationName, (player.system as any).getServiceType('Pandora'));
                return Promise.resolve();
              } else {
                return pandoraAPI("station.createStation", { "musicToken": station.item.stationId, "musicType": station.item.type })
                  .then((stationInfo: any) => {
                    uri = getPandoraUri(stationInfo.stationId);
                    metadata = getPandoraMetadata(stationInfo.stationId, stationInfo.stationName, (player.system as any).getServiceType('Pandora'));
                    return Promise.resolve();
                  });
              }
            } else {
              return Promise.reject("No match was found");
            }
          })
          .then(() => player.coordinator.setAVTransport(uri, metadata))
          .then(() => player.coordinator.play());
      });
  }

  if (settings && (settings as any).pandora) {
    pAPI = new Anesidora((settings as any).pandora.username, (settings as any).pandora.password);

    if (cmd == 'play') {
      return playPandora(player, values[1]);
    }
    if ((cmd == 'thumbsup') || (cmd == 'thumbsdown')) {
      const sid = (player.system as any).getServiceId('Pandora');
      const uri = (player.state as any).currentTrack.uri;

      const queryString = uri.indexOf('?') !== -1 ? uri.substring(uri.indexOf('?') + 1) : '';
      const parameters = Object.fromEntries(new URLSearchParams(queryString));

      if (uri.startsWith('x-sonosapi-radio') && parameters.sid == sid && (player.state as any).currentTrack.trackUri) {
        const trackUri = (player.state as any).currentTrack.trackUri;
        const trackToken = trackUri.substring(trackUri.search('x-sonos-http:') + 13, trackUri.search('%3a%3aST%3a'));
        const stationToken = trackUri.substring(trackUri.search('%3a%3aST%3a') + 11, trackUri.search('%3a%3aRINCON'));
        const up = (cmd == 'thumbsup');

        return userLogin()
          .then(() => pandoraAPI("station.addFeedback", { "stationToken": stationToken, "trackToken": trackToken, "isPositive": up }))
          .then(() => {
            if (cmd == 'thumbsdown') {
              return player.coordinator.nextTrack();
            }
          });
      } else {
        return Promise.reject('The music that is playing is not a Pandora station');
      }
    }
  } else {
    console.log('Missing Pandora settings');
    return Promise.reject('Missing Pandora settings');
  }

  return Promise.resolve();
}

export default function (api: ActionApi): void {
  api.registerAction('pandora', pandora);
}
