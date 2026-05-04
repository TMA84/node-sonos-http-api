import type { Player, MusicServiceDef, URIAndMetadata, TracksResult, ServiceHeaders, QueueTrack } from './types.js';

interface AppleSearchResult {
  resultCount: number;
  results: Array<{
    collectionId?: number;
    collectionName?: string;
    artistId?: number;
    artistName?: string;
    trackId?: number;
    trackName?: string;
    id?: number;
    name?: string;
    isStreamable?: boolean;
  }>;
}

let sid = '';
let serviceType = '';
let accountId = '';
let accountSN = '';
let country = '';

function getServiceToken(): string {
  return `SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token`;
}

function getURI(type: string, id: string): string {
  if (type === 'album') {
    return `x-rincon-cpcontainer:0004206calbum%3a${id}`;
  } else if (type === 'song') {
    return `x-sonos-http:song%3a${id}.mp4?sid=${sid}&flags=8224&sn=${accountSN}`;
  } else if (type === 'station') {
    return `x-sonosapi-radio:radio%3ara.${id}?sid=${sid}&flags=8300&sn=${accountSN}`;
  }
  return '';
}

function setService(player: Player, p_accountId: string, p_accountSN: string, p_country: string): void {
  sid = player.system.getServiceId('Apple Music');
  serviceType = player.system.getServiceType('Apple Music');
  accountId = p_accountId;
  accountSN = p_accountSN;
  country = p_country;
}

function getSearchTerm(type: string, term: string, artist: string, album: string, track: string): string {
  let newTerm = artist;

  if ((newTerm !== '') && ((artist !== '') || (track !== ''))) {
    newTerm += ' ';
  }
  newTerm += (type === 'album') ? album : track;
  newTerm = encodeURIComponent(newTerm);
  if (artist !== '') {
    newTerm += '&attribute=artistTerm';
  }
  if (track !== '') {
    newTerm += '&attribute=songTerm';
  }

  return newTerm;
}

function getMetadata(type: string, id: string, name: string, title?: string): string {
  const token = getServiceToken();
  const parentUri = appleDef.parent[type] + name;
  const objectType = appleDef.object[type];

  let displayTitle = title ?? '';
  if (type === 'station') {
    displayTitle = (title ?? '') + ' Radio';
  } else {
    displayTitle = '';
  }

  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
          xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
          <item id="${id}" parentID="${parentUri}" restricted="true"><dc:title>${displayTitle}</dc:title><upnp:class>object.${objectType}</upnp:class>
          <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${token}</desc></item></DIDL-Lite>`;
}

function getURIandMetadata(type: string, resList: unknown): URIAndMetadata {
  const results = resList as AppleSearchResult;
  let Id: string | number = '';
  let Title = '';

  if (type === 'album') {
    Id = results.results[0].collectionId!;
    Title = results.results[0].collectionName!;
  } else if (type === 'station') {
    Id = results.results[0].artistId!;
    Title = results.results[0].artistName!;
  } else {
    Id = results.results[0].id!;
    Title = results.results[0].name!;
  }

  const Name = Title.toLowerCase().replace(/ radio/g, '').replace(/radio /g, '').replace(/'/g, "&apos;");
  const MetadataID = appleDef.metastart[type] + encodeURIComponent(String(Id));

  const metadata = getMetadata(type, MetadataID, Name, Title);
  const uri = getURI(type, encodeURIComponent(String(Id)));

  return { uri, metadata };
}

function loadTracks(type: string, tracksJson: unknown): TracksResult {
  const results = tracksJson as AppleSearchResult;
  const tracks: TracksResult = {
    count: 0,
    isArtist: false,
    queueTracks: []
  };

  if (results.resultCount > 0) {
    tracks.queueTracks = results.results.reduce((tracksArray: QueueTrack[], track) => {
      if (track.isStreamable) {
        let skip = false;

        for (let j = 0; (j < tracksArray.length) && !skip; j++) {
          skip = (track.trackName === tracksArray[j].trackName);
        }

        if (!skip) {
          const metadataID = appleDef.metastart['song'] + encodeURIComponent(String(track.trackId));
          const metadata = getMetadata('song', metadataID, String(track.trackId), track.trackName);
          const uri = getURI('song', encodeURIComponent(String(track.trackId)));

          tracksArray.push({ trackName: track.trackName!, artistName: track.artistName!, uri, metadata });
          tracks.count++;
        }
      }
      return tracksArray;
    }, []);
  }

  return tracks;
}

function isEmpty(type: string, resList: unknown): boolean {
  const results = resList as AppleSearchResult;
  return (results.resultCount === 0);
}

function getTokenHeaders(): ServiceHeaders {
  return null;
}

function authenticateService(): Promise<void> {
  return Promise.resolve();
}

const appleDef: MusicServiceDef = {
  country: '&country=',
  search: {
    album: 'https://itunes.apple.com/search?media=music&limit=1&entity=album&attribute=albumTerm&term=',
    song: 'https://itunes.apple.com/search?media=music&limit=50&entity=song&term=',
    station: 'https://itunes.apple.com/search?media=music&limit=50&entity=musicArtist&term='
  },
  metastart: {
    album: '0004206calbum%3a',
    song: '00032020song%3a',
    station: '000c206cradio%3ara.'
  },
  parent: {
    album: '00020000album:',
    song: '00020000song:',
    station: '00020000radio:'
  },
  object: {
    album: 'container.album.musicAlbum.#AlbumView',
    song: 'item.audioItem.musicTrack.#SongTitleWithArtistAndAlbum',
    station: 'item.audioItem.audioBroadcast'
  },

  service: setService,
  term: getSearchTerm,
  tracks: loadTracks,
  empty: isEmpty,
  metadata: getMetadata,
  urimeta: getURIandMetadata,
  headers: getTokenHeaders,
  authenticate: authenticateService
};

export default appleDef;
