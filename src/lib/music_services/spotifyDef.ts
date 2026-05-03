import type { Player, MusicServiceDef, URIAndMetadata, TracksResult, ServiceHeaders, QueueTrack } from './types.js';
import settings from '../../settings.js';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface SpotifyAlbumItem {
  id: string;
  name: string;
  uri: string;
}

interface SpotifyArtistItem {
  id: string;
  name: string;
  uri: string;
}

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  uri: string;
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  uri: string;
  artists: Array<{ name: string }>;
  available_markets?: string[] | null;
}

interface SpotifySearchResult {
  albums?: { items: SpotifyAlbumItem[] };
  artists?: { items: SpotifyArtistItem[] };
  tracks?: { items: SpotifyTrackItem[] };
  playlists?: { items: SpotifyPlaylistItem[] };
}

let clientId = '';
let clientSecret = '';

const spotifySettings = (settings as unknown as Record<string, unknown>).spotify as
  { clientId?: string; clientSecret?: string } | undefined;

if (spotifySettings) {
  clientId = spotifySettings.clientId ?? '';
  clientSecret = spotifySettings.clientSecret ?? '';
}

let clientToken: string | null = null;

let sid = '';
let serviceType = '';
let accountId = '';
let accountSN = '';
let country = '';

const toBase64 = (str: string): string => Buffer.from(str).toString('base64');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const mapResponse = (response: SpotifyTokenResponse): SpotifyAuthResult => ({
  accessToken: response.access_token,
  tokenType: response.token_type,
  expiresIn: response.expires_in,
});

const getAuthHeaders = (): Record<string, string> => {
  if (!clientId || !clientSecret) {
    throw new Error('You are missing spotify clientId and secret in settings.json! Please read the README for instructions on how to generate and add them');
  }
  const authString = `${clientId}:${clientSecret}`;
  return {
    Authorization: `Basic ${toBase64(authString)}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
};

const auth = (): Promise<SpotifyAuthResult> => {
  return fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })
    .then((r) => r.json() as Promise<SpotifyTokenResponse>)
    .then((response) => mapResponse(response))
    .catch(() => {
      throw new Error(`Unable to authenticate Spotify with client id: ${clientId}`);
    });
};

function getServiceToken(): string {
  return `SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token`;
}

function getURI(type: string, id: string): string {
  if (type === 'album') {
    return `x-rincon-cpcontainer:0004206c${id}`;
  } else if (type === 'song') {
    return `x-sonos-spotify:spotify%3atrack%3a${id}?sid=${sid}&flags=8224&sn=${accountSN}`;
  } else if (type === 'station') {
    return `x-sonosapi-radio:spotify%3aartistRadio%3a${id}?sid=${sid}&flags=8300&sn=${accountSN}`;
  } else if (type === 'playlist') {
    return `x-rincon-cpcontainer:0006206c${id}`;
  }
  return '';
}

function setService(player: Player, p_accountId: string, p_accountSN: string, p_country: string): void {
  sid = player.system.getServiceId('Spotify');
  serviceType = player.system.getServiceType('Spotify');
  accountId = p_accountId;
  accountSN = '14'; // GACALD: Hack to fix Spotify p_accountSN
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
  const parentUri = spotifyDef.parent[type] + name;
  const objectType = spotifyDef.object[type];

  const displayTitle = (type !== 'station') ? '' : (title ?? '');

  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
          xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
          <item id="${id}" parentID="${parentUri}" restricted="true"><dc:title>${displayTitle}</dc:title><upnp:class>object.${objectType}</upnp:class>
          <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${token}</desc></item></DIDL-Lite>`;
}

function getURIandMetadata(type: string, resList: unknown): URIAndMetadata {
  const results = resList as SpotifySearchResult;
  let items: Array<{ id: string; name: string; uri?: string }> = [];

  if (type === 'album') {
    items = results.albums!.items;
  } else if (type === 'station') {
    items = results.artists!.items;
  } else if (type === 'playlist') {
    items = results.playlists!.items;
  }

  const Id = items[0].id;
  const Title = items[0].name + ((type === 'station') ? ' Radio' : '');
  const Name = Title.toLowerCase().replace(' radio', '').replace('radio ', '');
  const MetadataID = spotifyDef.metastart[type] + encodeURIComponent(Id);

  const metadata = getMetadata(
    type,
    MetadataID,
    (type === 'album' || type === 'playlist') ? Title.toLowerCase() : Id,
    Title
  );
  const uri = getURI(
    type,
    encodeURIComponent((type === 'station') ? items[0].id : (items[0] as { uri: string }).uri)
  );

  return { uri, metadata };
}

function loadTracks(type: string, tracksJson: unknown): TracksResult {
  const results = tracksJson as SpotifySearchResult;
  const tracks: TracksResult = {
    count: 0,
    isArtist: false,
    queueTracks: []
  };

  if (results.tracks!.items.length > 0) {
    tracks.queueTracks = results.tracks!.items.reduce((tracksArray: QueueTrack[], track) => {
      if (track.available_markets == null || track.available_markets.indexOf(country) !== -1) {
        let skip = false;

        for (let j = 0; (j < tracksArray.length) && !skip; j++) {
          skip = (track.name === tracksArray[j].trackName);
        }

        if (!skip) {
          const metadataID = spotifyDef.metastart['song'] + encodeURIComponent(track.id);
          const metadata = getMetadata('song', metadataID, track.id, track.name);
          const uri = getURI('song', encodeURIComponent(track.id));

          tracksArray.push({
            trackName: track.name,
            artistName: (track.artists.length > 0) ? track.artists[0].name : '',
            uri,
            metadata
          });
          tracks.count++;
        }
      }
      return tracksArray;
    }, []);
  }

  return tracks;
}

function isEmpty(type: string, resList: unknown): boolean {
  const results = resList as SpotifySearchResult;
  let count = 0;

  if (type === 'album') {
    count = results.albums!.items.length;
  } else if (type === 'song') {
    count = results.tracks!.items.length;
  } else if (type === 'station') {
    count = results.artists!.items.length;
  } else if (type === 'playlist') {
    count = results.playlists!.items.length;
  }

  return (count === 0);
}

function getTokenHeaders(): ServiceHeaders {
  if (clientToken == null) {
    return null;
  }
  return {
    Authorization: `Bearer ${clientToken}`
  };
}

function authenticateService(): Promise<void> {
  return new Promise((resolve, reject) => {
    auth().then((response) => {
      clientToken = response.accessToken;
      resolve();
    }).catch(reject);
  });
}

const spotifyDef: MusicServiceDef & { search: { playlist: string }; metastart: { playlist: string }; parent: { playlist: string }; object: { playlist: string } } = {
  country: '&market=',
  search: {
    album: 'https://api.spotify.com/v1/search?type=album&limit=1&q=album:',
    song: 'https://api.spotify.com/v1/search?type=track&limit=50&q=',
    station: 'https://api.spotify.com/v1/search?type=artist&limit=1&q=',
    playlist: 'https://api.spotify.com/v1/search?type=playlist&q='
  },
  metastart: {
    album: '0004206cspotify%3aalbum%3a',
    song: '00032020spotify%3atrack%3a',
    station: '000c206cspotify:artistRadio%3a',
    playlist: '0004206cspotify%3aplaylist%3a'
  },
  parent: {
    album: '00020000album:',
    song: '00020000track:',
    station: '00052064spotify%3aartist%3a',
    playlist: '00020000playlist:'
  },
  object: {
    album: 'container.album.musicAlbum',
    song: 'item.audioItem.musicTrack',
    station: 'item.audioItem.audioBroadcast.#artistRadio',
    playlist: 'container.playlistContainer'
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

export default spotifyDef;
