/**
 * Common interfaces for music service definitions.
 * All music services (Apple, Spotify, Deezer, Library) implement MusicServiceDef.
 */

/**
 * Minimal Player interface for music service definitions.
 * Mirrors the relevant parts of the Player type from sonos-discovery.
 */
export interface Player {
  uuid: string;
  roomName: string;
  baseUrl: string;
  coordinator: Player;
  state: {
    volume: number;
    trackNo: number;
    playbackState: string;
    playMode: { repeat: string; shuffle: boolean; crossfade: boolean };
    [key: string]: unknown;
  };
  system: {
    getServiceId(serviceName: string): string;
    getServiceType(serviceName: string): string;
    [key: string]: unknown;
  };
  browse(objectId: string, startIndex?: number, limit?: number): Promise<unknown>;
  [key: string]: unknown;
}

/** The types of music content that can be searched/played */
export type MusicType = 'album' | 'song' | 'station' | 'playlist';

/** URI and metadata pair returned by urimeta() */
export interface URIAndMetadata {
  uri: string;
  metadata: string;
}

/** Track info for queue operations */
export interface QueueTrack {
  trackName: string;
  artistName: string;
  uri: string;
  metadata: string;
  albumTrackNumber?: number;
}

/** Result of loadTracks() */
export interface TracksResult {
  count: number;
  isArtist: boolean;
  queueTracks: QueueTrack[];
}

/** HTTP headers for authenticated requests (or null if none needed) */
export type ServiceHeaders = Record<string, string> | null;

/** Search URL definitions per music type */
export interface SearchUrls {
  album: string;
  song: string;
  station: string;
  [key: string]: string;
}

/** Metadata start prefixes per music type */
export interface MetaStartMap {
  album: string;
  song: string;
  station: string;
  [key: string]: string;
}

/** Parent URI prefixes per music type */
export interface ParentMap {
  album: string;
  song: string;
  station: string;
  [key: string]: string;
}

/** Object type identifiers per music type */
export interface ObjectMap {
  album: string;
  song: string;
  station: string;
  [key: string]: string;
}

/**
 * Common interface for all music service definitions.
 * Each service provides search URLs, metadata templates, and methods
 * for searching, loading tracks, and generating Sonos-compatible URIs.
 */
export interface MusicServiceDef {
  country: string;
  search: SearchUrls;
  metastart: MetaStartMap;
  parent: ParentMap;
  object: ObjectMap;

  /** Initialize the service with player context and account info */
  service(player: Player, accountId: string, accountSN: string, country: string): void;

  /** Build a search term from parsed components */
  term(type: string, term: string, artist: string, album: string, track: string): string;

  /** Load tracks from search results JSON */
  tracks(type: string, tracksJson: unknown): TracksResult;

  /** Check if search results are empty */
  empty(type: string, resList: unknown): boolean;

  /** Generate DIDL-Lite metadata XML */
  metadata(type: string, id: string, name: string, title?: string): string;

  /** Get URI and metadata from search results */
  urimeta(type: string, resList: unknown): URIAndMetadata;

  /** Get authorization headers for API requests */
  headers(): ServiceHeaders;

  /** Authenticate with the service (resolve when ready) */
  authenticate(): Promise<void>;
}

/**
 * Extended interface for the library service which has additional methods.
 */
export interface LibraryServiceDef extends MusicServiceDef {
  token: string;

  /** Check if the music library is not loaded */
  nolib(): boolean;

  /** Read the library from disk */
  read(): void;

  /** Load or reload the library search index */
  load(player: Player | null, load: boolean): Promise<string>;

  /** Search the local library */
  searchlib(type: string, term: string): unknown[];
}

/**
 * Extended interface for Deezer which has an init method for FLAC mode.
 */
export interface DeezerServiceDef extends MusicServiceDef {
  init(flacOn: boolean): DeezerServiceDef;
}
