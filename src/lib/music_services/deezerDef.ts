import type { Player, DeezerServiceDef, URIAndMetadata, TracksResult, ServiceHeaders, QueueTrack } from './types.js';

interface DeezerTrack {
  id: number;
  title: string;
  artist: { id: number; name: string };
  album: { id: number; title: string };
}

interface DeezerSearchResult {
  data: DeezerTrack[];
}

let sid = '';
let serviceType = '';
let accountId = '';
let accountSN = '';
let country = '';

function getServiceToken(): string {
  return `SA_RINCON${serviceType}_${accountId}`;
}

function getURI(type: string, id: string): string {
  if (type === 'album') {
    return `x-rincon-cpcontainer:0004006calbum-${id}`;
  } else if (type === 'song') {
    return `x-sonos-http:tr%3a${id}.mp3?sid=${sid}&flags=8224&sn=${accountSN}`;
  } else if (type === 'station') {
    return `x-sonosapi-radio:radio-artist-${id}?sid=${sid}&flags=104&sn=${accountSN}`;
  }
  return '';
}

function setService(player: Player, p_accountId: string, p_accountSN: string, p_country: string): void {
  sid = player.system.getServiceId('Deezer');
  serviceType = player.system.getServiceType('Deezer');
  accountId = p_accountId;
  accountSN = p_accountSN;
  country = p_country;
}

function getSearchTerm(type: string, term: string, artist: string, album: string, track: string): string {
  let newTerm = '';

  if (album !== '') {
    newTerm = album + ' ';
  }
  if (artist !== '') {
    newTerm += 'artist:' + artist + ((track !== '') ? ' ' : '');
  }
  if (track !== '') {
    newTerm += 'track:' + track;
  }
  newTerm = encodeURIComponent(newTerm);

  return newTerm;
}

function getMetadata(type: string, id: string, name: string, title?: string): string {
  const token = getServiceToken();
  const parentUri = deezerDef.parent[type] + name;
  const objectType = deezerDef.object[type];

  const displayTitle = (type !== 'station') ? '' : (title ?? '');

  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
          xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
          <item id="${id}" parentID="${parentUri}" restricted="true"><dc:title>${displayTitle}</dc:title><upnp:class>object.${objectType}</upnp:class>
          <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${token}</desc></item></DIDL-Lite>`;
}

function getURIandMetadata(type: string, resList: unknown): URIAndMetadata {
  const results = resList as DeezerSearchResult;

  const Id = (type === 'album') ? results.data[0].album.id : results.data[0].artist.id;
  const Title = (type === 'album') ? results.data[0].album.title : (results.data[0].artist.name + ' Radio');
  const Name = Title.toLowerCase().replace(/ radio/g, '').replace(/radio /g, '').replace(/'/g, "&apos;");
  const MetadataID = deezerDef.metastart[type] + encodeURIComponent(String(Id));

  const metadata = getMetadata(type, MetadataID, String(Id), Title);
  const uri = getURI(type, encodeURIComponent(String(Id)));

  return { uri, metadata };
}

function loadTracks(type: string, tracksJson: unknown): TracksResult {
  const results = tracksJson as DeezerSearchResult;
  const tracks: TracksResult = {
    count: 0,
    isArtist: false,
    queueTracks: []
  };

  if (results.data.length > 0) {
    tracks.queueTracks = results.data.reduce((tracksArray: QueueTrack[], track) => {
      let skip = false;

      for (let j = 0; (j < tracksArray.length) && !skip; j++) {
        skip = (track.title === tracksArray[j].trackName);
      }

      if (!skip) {
        const metadataID = deezerDef.metastart['song'] + encodeURIComponent(String(track.id));
        const metadata = getMetadata('song', metadataID, track.title.toLowerCase(), track.title);
        const uri = getURI('song', encodeURIComponent(String(track.id)));

        tracksArray.push({ trackName: track.title, artistName: track.artist.name, uri, metadata });
        tracks.count++;
      }
      return tracksArray;
    }, []);
  }

  return tracks;
}

function isEmpty(type: string, resList: unknown): boolean {
  const results = resList as DeezerSearchResult;
  return (results.data.length === 0);
}

function getTokenHeaders(): ServiceHeaders {
  return null;
}

function authenticateService(): Promise<void> {
  return Promise.resolve();
}

const deezerDef: DeezerServiceDef = {
  country: '',
  search: {
    album: 'https://api.deezer.com/search?limit=1&q=album:',
    song: 'https://api.deezer.com/search?limit=50&q=',
    station: 'https://api.deezer.com/search?limit=1&q=artist:'
  },
  metastart: {
    album: '0004006calbum-',
    song: '00032020tr%3a',
    station: '000c0068radio-artist-'
  },
  parent: {
    album: '00020000search-album:',
    song: '00020000search-track:',
    station: '00050064artist-'
  },
  object: {
    album: 'container.album.musicAlbum.#DEFAULT',
    song: 'item.audioItem.musicTrack.#DEFAULT',
    station: 'item.audioItem.audioBroadcast.#DEFAULT'
  },

  init(flacOn: boolean): DeezerServiceDef {
    this.metastart.song = flacOn ? '00032020tr-flac%3a' : '00032020tr%3a';
    return this;
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

export default deezerDef;
