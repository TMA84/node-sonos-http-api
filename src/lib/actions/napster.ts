import type { Player, ActionApi } from './types.js';

function getMetadata(id: string, parentUri: string, type: string, title: string): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
  xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
  <item id="${id}" parentID="${parentUri}" restricted="true"><dc:title>"${title}"</dc:title><upnp:class>${type}</upnp:class>
  <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON51975_X_#Svc51975-0-Token</desc></item></DIDL-Lite>`;
}

function getUri(id: string, type: string): string {
  const uri: Record<string, string> = {
    song: `x-sonos-http:ondemand_track%3a%3atra.${id}%7cv1%7cALBUM%7calb.mp4?sid=203&flags=8224&sn=13`,
    album: `x-rincon-cpcontainer:100420ecexplore%3aalbum%3a%3aAlb.${id}`
  };

  return uri[type];
}

const CLASSES: Record<string, string> = {
  song: 'object.item.audioItem.musicTrack',
  album: 'object.container.album.musicAlbum'
};

const METADATA_URI_STARTERS: Record<string, string> = {
  song: '10032020ondemand_track%3a%3atra.',
  album: '100420ec'
};

const PARENTS: Record<string, string> = {
  song: '100420ecexplore%3a',
  album: '100420ecexplore%3aalbum%3a'
};

function napster(player: Player, values: string[]): Promise<any> {
  const action = values[0];
  const trackID = values[1].split(':')[1];
  const type = values[1].split(':')[0];
  let nextTrackNo = 0;

  const metadataID = METADATA_URI_STARTERS[type] + encodeURIComponent(trackID);
  const metadata = getMetadata(metadataID, PARENTS[type], CLASSES[type], '');
  const uri = getUri(encodeURIComponent(trackID), type);

  if (action == 'queue') {
    return player.coordinator.addURIToQueue(uri, metadata);
  } else if (action == 'now') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    let promise = Promise.resolve();
    if (player.coordinator.avTransportUri.startsWith('x-rincon-queue') === false) {
      promise = promise.then(() => player.coordinator.setAVTransport(`x-rincon-queue:${player.coordinator.uuid}#0`));
    }

    return promise.then(() => {
      return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo)
        .then((addToQueueStatus: any) => player.coordinator.trackSeek(addToQueueStatus.firsttracknumberenqueued))
        .then(() => player.coordinator.play());
    });
  } else if (action == 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }

  return Promise.resolve();
}

export default function (api: ActionApi): void {
  api.registerAction('napster', napster);
}
