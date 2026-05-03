import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Player, LibraryServiceDef, URIAndMetadata, TracksResult, ServiceHeaders, QueueTrack } from './types.js';
import settings from '../../settings.js';

const require = createRequire(import.meta.url);
const Fuse = require('fuse.js') as typeof import('fuse.js').default;
const logger: typeof import('sonos-discovery/lib/helpers/logger') = require('sonos-discovery/lib/helpers/logger');

const libraryPath = path.join(settings.cacheDir, 'library.json');

interface LibrarySettings {
  library?: {
    randomQueueLimit?: number;
  };
}

const libSettings = settings as unknown as LibrarySettings;
const randomQueueLimit = (libSettings.library && libSettings.library.randomQueueLimit !== undefined)
  ? libSettings.library.randomQueueLimit
  : 50;

interface LibraryTrackItem {
  artistTrackSearch: string;
  artistAlbumSearch: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumTrackNumber: number;
  uri: string;
  metadata: string;
}

interface LibraryData {
  version?: number;
  tracks: {
    items: LibraryTrackItem[];
    startIndex: number;
    numberReturned: number;
    totalMatches: number;
  };
}

interface BrowseChunk {
  items: Array<{
    uri?: string;
    artist?: string;
    album?: string;
    title?: string;
    albumTrackNumber?: number;
  }>;
  startIndex: number;
  numberReturned: number;
  totalMatches: number;
}

interface FuseSearchResult {
  item: LibraryTrackItem;
}

let musicLibrary: LibraryData | null = null;
const currentLibVersion = 1.4;
let fuzzyTracks: InstanceType<typeof Fuse<LibraryTrackItem>> | null = null;
let fuzzyAlbums: InstanceType<typeof Fuse<LibraryTrackItem>> | null = null;
let isLoading = false;

function getTokenHeaders(): ServiceHeaders {
  return null;
}

function authenticateService(): Promise<void> {
  return Promise.resolve();
}

function setService(_player: Player, _accountId: string, _accountSN: string, _country: string): void {
  // Library doesn't need external service setup
}

function getSearchTerm(type: string, _term: string, artist: string, album: string, track: string): string {
  let newTerm = artist;

  if ((newTerm !== '') && ((artist !== '') || (track !== ''))) {
    newTerm += ' ';
  }
  newTerm += (type === 'album') ? album : track;

  return newTerm;
}

function getMetadata(type: string, id: string, name: string): string {
  const token = libraryDef.token;
  const parentUri = libraryDef.parent[type] + name;
  const objectType = libraryDef.object[type];

  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
          xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
          <item id="${id}" parentID="${parentUri}" restricted="true"><dc:title></dc:title><upnp:class>object.${objectType}</upnp:class>
          <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${token}</desc></item></DIDL-Lite>`;
}

function getURIandMetadata(_type: string, resList: unknown): URIAndMetadata {
  const results = resList as FuseSearchResult[];
  return { uri: results[0].item.uri, metadata: results[0].item.metadata };
}

function loadTracks(type: string, tracksJson: unknown): TracksResult {
  const results = tracksJson as FuseSearchResult[];
  const tracks: TracksResult = {
    count: 0,
    isArtist: false,
    queueTracks: []
  };

  if (results.length > 0) {
    const albumName = results[0].item.albumName;

    tracks.queueTracks = results.reduce((tracksArray: QueueTrack[], trackResult) => {
      const track = trackResult.item;
      if (tracks.count < randomQueueLimit) {
        let skip = false;

        if (type === 'song') {
          for (let j = 0; (j < tracksArray.length) && !skip; j++) {
            skip = (track.trackName === tracksArray[j].trackName);
          }
        } else {
          skip = (track.albumName !== albumName);
        }

        if (!skip) {
          tracksArray.push({
            trackName: track.trackName,
            artistName: track.artistName,
            albumTrackNumber: track.albumTrackNumber,
            uri: track.uri,
            metadata: track.metadata
          });
          tracks.count++;
        }
      }
      return tracksArray;
    }, []);
  }

  if (type === 'album') {
    tracks.queueTracks.sort((a, b) => {
      if (a.artistName !== b.artistName) {
        return (a.artistName > b.artistName) ? 1 : -1;
      } else {
        return (a.albumTrackNumber ?? 0) - (b.albumTrackNumber ?? 0);
      }
    });
  }

  return tracks;
}

function libIsEmpty(): boolean {
  return (musicLibrary == null);
}

function loadFuse(items: LibraryTrackItem[], fuzzyKeys: string[]): Promise<InstanceType<typeof Fuse<LibraryTrackItem>>> {
  return Promise.resolve(new Fuse(items, { keys: fuzzyKeys, threshold: 0.2, maxPatternLength: 100, ignoreLocation: true } as any));
}

function isFinished(chunk: BrowseChunk): boolean {
  return chunk.startIndex + chunk.numberReturned >= chunk.totalMatches;
}

function loadLibrary(player: Player): Promise<LibraryData | string | void> {
  if (isLoading) {
    return Promise.resolve('Loading');
  }
  logger.info('Loading Library');
  isLoading = true;

  const library: LibraryData = {
    version: currentLibVersion,
    tracks: {
      items: [],
      startIndex: 0,
      numberReturned: 0,
      totalMatches: 1
    }
  };

  const result = library.tracks;

  const getChunk = (chunk: BrowseChunk): Promise<LibraryData | void> => {
    chunk.items.forEach((item) => {
      if ((item.uri !== undefined) && (item.artist !== undefined) && (item.album !== undefined)) {
        const metadataID = libraryDef.metastart['song'] + item.uri.substring(item.uri.indexOf(':') + 1);
        const metadata = getMetadata('song', metadataID, encodeURIComponent(item.artist) + '/' + encodeURIComponent(item.album));
        result.items.push({
          artistTrackSearch: item.artist + ' ' + (item.title ?? ''),
          artistAlbumSearch: item.artist + ' ' + item.album,
          trackName: item.title ?? '',
          artistName: item.artist,
          albumName: item.album,
          albumTrackNumber: item.albumTrackNumber ?? 0,
          uri: item.uri,
          metadata: metadata
        });
      }
    });

    result.numberReturned += chunk.numberReturned;
    result.totalMatches = chunk.totalMatches;
    logger.info(`Tracks returned: ${result.numberReturned}, Total matches: ${result.totalMatches}`);

    if (isFinished(chunk)) {
      return new Promise<LibraryData>((resolve, reject) => {
        fs.writeFile(libraryPath, JSON.stringify(library), (err) => {
          isLoading = false;
          if (err) {
            console.log("ERROR: " + JSON.stringify(err));
            return reject(err);
          } else {
            return resolve(library);
          }
        });
      });
    }

    // Recursive promise chain
    return (player.browse('A:TRACKS', result.startIndex + result.numberReturned, 0) as Promise<BrowseChunk>)
      .then(getChunk);
  };

  return Promise.resolve(result as unknown as BrowseChunk)
    .then(getChunk)
    .catch((err: unknown) => {
      logger.error('Error when recursively trying to load library using browse()', err);
    });
}

function shuffleArray<T>(arr: T[]): T[] {
  let len = arr.length;
  while (len) {
    const i = Math.random() * len-- >>> 0;
    const temp = arr[len];
    arr[len] = arr[i];
    arr[i] = temp;
  }
  return arr;
}

function loadLibrarySearch(player: Player | null, load: boolean): Promise<string> {
  if (load || (musicLibrary == null)) {
    return loadLibrary(player!)
      .then((result) => {
        musicLibrary = result as LibraryData;
      })
      .then(() => loadFuse(musicLibrary!.tracks.items, ["artistTrackSearch", "artistName", "trackName"]))
      .then((result) => {
        fuzzyTracks = result;
      })
      .then(() => loadFuse(musicLibrary!.tracks.items, ["artistAlbumSearch", "albumName", "artistName"]))
      .then((result) => {
        fuzzyAlbums = result;
        return "Library and search loaded";
      });
  } else {
    return loadFuse(musicLibrary.tracks.items, ["artistTrackSearch", "artistName", "trackName"])
      .then((result) => {
        fuzzyTracks = result;
      })
      .then(() => loadFuse(musicLibrary!.tracks.items, ["artistAlbumSearch", "albumName", "artistName"]))
      .then((result) => {
        fuzzyAlbums = result;
        return "Library search loaded";
      });
  }
}

function searchLibrary(type: string, term: string): FuseSearchResult[] {
  term = decodeURIComponent(term);

  if (type === 'album') {
    return fuzzyAlbums!.search(term) as unknown as FuseSearchResult[];
  }
  return shuffleArray(fuzzyTracks!.search(term) as unknown as FuseSearchResult[]).slice(0, randomQueueLimit);
}

function isEmpty(_type: string, resList: unknown): boolean {
  return ((resList as unknown[]).length === 0);
}

function handleLibrary(err: NodeJS.ErrnoException | null, data: string): void {
  if (!err) {
    musicLibrary = JSON.parse(data) as LibraryData;
    if ((musicLibrary.version == undefined) || (musicLibrary.version < currentLibVersion)) {
      musicLibrary = null;
    }
    if (musicLibrary != null) {
      loadLibrarySearch(null, false);
    }
  }
}

function readLibrary(): void {
  fs.readFile(libraryPath, 'utf-8', handleLibrary);
}

const libraryDef: LibraryServiceDef = {
  country: '',
  search: {
    album: '',
    song: '',
    station: ''
  },
  metastart: {
    album: 'S:',
    song: 'S:',
    station: ''
  },
  parent: {
    album: 'A:ALBUMARTIST/',
    song: 'A:ALBUMARTIST/',
    station: ''
  },
  object: {
    album: 'item.audioItem.musicTrack',
    song: 'item.audioItem.musicTrack',
    station: ''
  },
  token: 'RINCON_AssociatedZPUDN',

  service: setService,
  term: getSearchTerm,
  tracks: loadTracks,
  nolib: libIsEmpty,
  read: readLibrary,
  load: loadLibrarySearch,
  searchlib: searchLibrary,
  empty: isEmpty,
  metadata: getMetadata,
  urimeta: getURIandMetadata,
  headers: getTokenHeaders,
  authenticate: authenticateService
};

export default libraryDef;
