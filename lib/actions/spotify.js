'use strict';

function getSpotifyMetadata(id, upnpClass, serviceType) {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="${id}" restricted="true"><upnp:class>${upnpClass}</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token</desc></item></DIDL-Lite>`;
}

function spotify(player, values) {
  const action = values[0];
  const spotifyUri = values[1];
  const encodedSpotifyUri = encodeURIComponent(spotifyUri);
  const sid = player.system.getServiceId('Spotify');
  const serviceType = player.system.getServiceType('Spotify');

  let uri;
  let metadata;

  if (spotifyUri.startsWith('spotify:track:')) {
    uri = `x-sonos-spotify:${encodedSpotifyUri}?sid=${sid}&flags=8224&sn=1`;
    metadata = getSpotifyMetadata(`00032020${encodedSpotifyUri}`, 'object.item.audioItem.musicTrack', serviceType);
  } else if (spotifyUri.startsWith('spotify:album:')) {
    uri = `x-rincon-cpcontainer:0004206c${encodedSpotifyUri}`;
    metadata = getSpotifyMetadata(`0004206c${encodedSpotifyUri}`, 'object.container.album.musicAlbum', serviceType);
  } else if (spotifyUri.startsWith('spotify:episode:')) {
    uri = `x-sonos-spotify:${encodedSpotifyUri}?sid=${sid}&flags=8224&sn=1`;
    metadata = getSpotifyMetadata(`00032020${encodedSpotifyUri}`, 'object.item.audioItem.musicTrack', serviceType);
  } else if (spotifyUri.startsWith('spotify:show:')) {
    uri = `x-rincon-cpcontainer:0006206c${encodedSpotifyUri}`;
    metadata = getSpotifyMetadata(`0006206c${encodedSpotifyUri}`, 'object.container.playlistContainer', serviceType);
  } else if (spotifyUri.startsWith('spotify:artist:')) {
    uri = `x-rincon-cpcontainer:000c206c${encodedSpotifyUri}`;
    metadata = getSpotifyMetadata(`000c206c${encodedSpotifyUri}`, 'object.container.person.musicArtist', serviceType);
  } else {
    // Default: treat as playlist (spotify:playlist: or spotify:user:...:playlist:)
    uri = `x-rincon-cpcontainer:0006206c${encodedSpotifyUri}`;
    metadata = getSpotifyMetadata(`0006206c${encodedSpotifyUri}`, 'object.container.playlistContainer', serviceType);
  }

  if (action == 'queue') {
    return player.coordinator.addURIToQueue(uri, metadata);
  } else if (action == 'now') {
    var nextTrackNo = player.coordinator.state.trackNo + 1;
    let promise = Promise.resolve();
    return promise.then(() => player.coordinator.setAVTransport(`x-rincon-queue:${player.coordinator.uuid}#0`))
    .then(() => player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo))
    .then((addToQueueStatus) => player.coordinator.trackSeek(addToQueueStatus.firsttracknumberenqueued))
    .then(() => player.coordinator.play());

  } else if (action == 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }
}

export default function (api) {
  api.registerAction('spotify', spotify);
}
