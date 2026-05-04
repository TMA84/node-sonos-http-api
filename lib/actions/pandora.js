'use strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Fuse = require('fuse.js');
import PandoraClient from '../helpers/pandora-client.js';
import settings from '../../settings.js';

function getPandoraMetadata(id, title, serviceType) {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="100c206cST%3a${id}" parentID="0" restricted="true"><dc:title>${title}</dc:title><upnp:class>object.item.audioItem.audioBroadcast.#station</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token</desc></item></DIDL-Lite>`;
}

function getPandoraUri(id, title, albumart) {
  return `x-sonosapi-radio:ST%3a${id}?sid=236&flags=8300&sn=1`;
}

function pandora(player, values) {
  const cmd = values[0];

  if (!settings || !settings.pandora) {
    console.log('Missing Pandora settings');
    return Promise.reject('Missing Pandora settings');
  }

  const pAPI = new PandoraClient(settings.pandora.username, settings.pandora.password);

  async function playPandora(player, name) {
    var uri = '';
    var metadata = '';
    var sid = player.system.getServiceId('Pandora');

    await pAPI.login();
    const stationList = await pAPI.request("user.getStationList", {"includeStationArtUrl": true});

    const searchResult = await pAPI.request("music.search", {"searchText": name});
    if (searchResult.artists != undefined) {
      searchResult.artists.forEach(function(artist) {
        if (artist.score > 90) {
          stationList.stations.push({"stationId": artist.musicToken, "stationName": artist.artistName, "type": "artist"});
        }
      });
    }
    if (searchResult.songs != undefined) {
      searchResult.songs.forEach(function(song) {
        if (song.score > 90) {
          stationList.stations.push({"stationId": song.musicToken, "stationName": song.songName, "type": "song"});
        }
      });
    }

    const genreResult = await pAPI.request("station.getGenreStations", {});
    genreResult.categories.forEach(function(category) {
      category.stations.forEach(function(genreStation) {
        stationList.stations.push({"stationId": genreStation.stationToken, "stationName": genreStation.stationName, "type": "song"});
      });
    });

    var fuzzy = new Fuse(stationList.stations, { keys: ["stationName"] });
    const results = fuzzy.search(name);

    if (results.length === 0) {
      throw new Error("No match was found");
    }

    const station = results[0];
    if (station.type == undefined) {
      uri = getPandoraUri(station.item.stationId, station.item.stationName, station.item.artUrl);
      metadata = getPandoraMetadata(station.item.stationId, station.item.stationName, player.system.getServiceType('Pandora'));
    } else {
      const stationInfo = await pAPI.request("station.createStation", {"musicToken": station.item.stationId, "musicType": station.item.type});
      uri = getPandoraUri(stationInfo.stationId);
      metadata = getPandoraMetadata(stationInfo.stationId, stationInfo.stationName, player.system.getServiceType('Pandora'));
    }

    await player.coordinator.setAVTransport(uri, metadata);
    await player.coordinator.play();
  }

  if (cmd == 'play') {
    return playPandora(player, values[1]);
  } else if ((cmd == 'thumbsup') || (cmd == 'thumbsdown')) {
    var sid = player.system.getServiceId('Pandora');
    const uri = player.state.currentTrack.uri;

    const queryString = uri.indexOf('?') !== -1 ? uri.substring(uri.indexOf('?') + 1) : '';
    const parameters = Object.fromEntries(new URLSearchParams(queryString));

    if (uri.startsWith('x-sonosapi-radio') && parameters.sid == sid && player.state.currentTrack.trackUri) {
      const trackUri = player.state.currentTrack.trackUri;
      const trackToken = trackUri.substring(trackUri.search('x-sonos-http:') + 13, trackUri.search('%3a%3aST%3a'));
      const stationToken = trackUri.substring(trackUri.search('%3a%3aST%3a') + 11, trackUri.search('%3a%3aRINCON'));
      const up = (cmd == 'thumbsup');

      return pAPI.login()
        .then(() => pAPI.request("station.addFeedback", {"stationToken": stationToken, "trackToken": trackToken, "isPositive": up}))
        .then(() => {
          if (cmd == 'thumbsdown') {
            return player.coordinator.nextTrack();
          }
        });
    } else {
      return Promise.reject('The music that is playing is not a Pandora station');
    }
  }
}


export default function (api) {
  api.registerAction('pandora', pandora);
}
