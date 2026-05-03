import type { Player, ActionApi } from './types.js';

function getMetadata(id: string, parentUri: string, type: string, title: string): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
<item id="${id}" parentID="${parentUri}" restricted="true">
  <dc:title>"${title}"</dc:title>
  <upnp:class>${type}</upnp:class>
  <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON51463_X_#Svc51463-0-Token</desc>
</item>
</DIDL-Lite>`;
}

function getSongUri(id: string): string {
  return `x-sonosapi-hls-static:catalog%2ftracks%2f${id}%2f%3falbumAsin%3dB01JDKZWK0?sid=201&flags=0&sn=4`;
}

function getAlbumUri(id: string): string {
  return `x-rincon-cpcontainer:1004206ccatalog%2falbums%2f${id}%2f%23album_desc?sid=201&flags=8300&sn=4`;
}

function getPlaylistUri(id: string): string {
  return `x-rincon-cpcontainer:1006206ccatalog%2fplaylists%2f${id}%2f%23702_playlistDesc?sid=201&flags=8300&sn=4`;
}

const uriTemplates: Record<string, (id: string) => string> = {
  song: getSongUri,
  album: getAlbumUri,
  playlist: getPlaylistUri
};

const CLASSES: Record<string, string> = {
  song: 'object.container.album.musicAlbum.#AlbumView',
  album: 'object.container.album.musicAlbum',
  playlist: 'object.container.playlistContainer'
};

const METADATA_URI_STARTERS: Record<string, string> = {
  song: '10030000catalog%2ftracks%2f',
  album: '1004206ccatalog',
  playlist: '1006206ccatalog%2fplaylists%2f'
};

const METADATA_URI_ENDINGS: Record<string, string> = {
  song: '%2f%3falbumAsin%3d',
  album: '%2f%23album_desc',
  playlist: '%2f%23702_playlistDesc'
};

const PARENTS: Record<string, string> = {
  song: '1004206ccatalog%2falbums%2f',
  album: '10052064catalog%2fartists%2f',
  playlist: '10052064catalog%2fartists%2f'
};

function amazonMusic(player: Player, values: string[]): Promise<unknown> {
  const action = values[0];
  const track = values[1];
  const type = track.split(':')[0];
  const trackID = track.split(':')[1];

  if (!uriTemplates[type]) {
    return Promise.reject(`Unsupported Amazon Music type: ${type}. Supported types: song, album, playlist`);
  }

  let nextTrackNo = 0;

  const metadataID = METADATA_URI_STARTERS[type] + encodeURIComponent(trackID) + METADATA_URI_ENDINGS[type];

  const metadata = getMetadata(metadataID, PARENTS[type], CLASSES[type], '');
  const uri = uriTemplates[type](encodeURIComponent(trackID));

  if (action == 'queue') {
    return player.coordinator.addURIToQueue(uri, metadata);
  } else if (action == 'now') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    let promise = Promise.resolve();
    if (player.coordinator.avTransportUri.startsWith('x-rincon-queue') === false) {
      promise = promise.then(() => player.coordinator.setAVTransport(`x-rincon-queue:${player.coordinator.uuid}#0`));
    }

    return promise.then(() => player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo))
      .then(() => { if (nextTrackNo != 1) player.coordinator.nextTrack(); })
      .then(() => player.coordinator.play());
  } else if (action == 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }

  return Promise.resolve();
}

export default function (api: ActionApi): void {
  api.registerAction('amazonmusic', amazonMusic);
}
