/**
 * Type declarations for the sonos-discovery module.
 * This module is a CJS package used via createRequire interop.
 */

declare module 'sonos-discovery' {
  import { EventEmitter } from 'events';

  interface PlayerState {
    volume: number;
    mute: boolean;
    currentTrack: TrackInfo;
    nextTrack: TrackInfo;
    trackNo: number;
    elapsedTime: number;
    elapsedTimeFormatted: string;
    playbackState: string;
    playMode: PlayMode;
    crossfade: boolean;
  }

  interface TrackInfo {
    artist: string;
    title: string;
    album: string;
    albumArtUri: string;
    duration: number;
    uri: string;
    type: string;
    stationName?: string;
    absoluteAlbumArtUri?: string;
  }

  interface PlayMode {
    repeat: string;
    shuffle: boolean;
    crossfade: boolean;
  }

  interface Player {
    uuid: string;
    roomName: string;
    baseUrl: string;
    coordinator: Player;
    state: PlayerState;
    hasSub: boolean;

    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    mute(): Promise<void>;
    unMute(): Promise<void>;
    muteGroup(): Promise<void>;
    unMuteGroup(): Promise<void>;
    setVolume(level: number): Promise<void>;
    setBass(level: number): Promise<void>;
    timeSeek(seconds: number): Promise<void>;
    trackSeek(trackNo: number): Promise<void>;
    clearQueue(): Promise<void>;
    removeTrackFromQueue(index: number): Promise<void>;
    removeTrackRangeFromQueue(startIndex: number, numberOfTracks: number): Promise<void>;
    reorderTracksInQueue(startIndex: number, numberOfTracks: number, insertBefore: number): Promise<void>;
    saveQueue(title: string): Promise<void>;
    addURIToQueue(uri: string, metadata?: string, enqueueAsNext?: boolean, desiredFirstTrackNumberEnqueued?: number): Promise<void>;
    setPlayMode(newPlayMode: PlayMode): Promise<void>;
    repeat(mode: string): Promise<void>;
    shuffle(enabled: boolean): Promise<void>;
    crossfade(enabled: boolean): Promise<void>;
    sleep(seconds: number): Promise<void>;
    setAVTransport(uri: string, metadata?: string): Promise<void>;
    becomeCoordinatorOfStandaloneGroup(): Promise<void>;
    refreshShareIndex(): Promise<void>;
    browse(objectId: string, startIndex?: number, limit?: number): Promise<unknown>;
    browseAll(objectId: string): Promise<unknown[]>;
    getQueue(limit?: number, offset?: number): Promise<unknown>;
    setNightMode(enabled: boolean): Promise<void>;
    setSpeechEnhancement(enabled: boolean): Promise<void>;
    setGroupVolume(level: number): Promise<void>;
    toJSON(): object;
  }

  interface Zone {
    coordinator: Player;
    members: Player[];
    uuid: string;
    id: string;
  }

  interface AvailableService {
    id: string;
    type: string;
  }

  interface SonosSystemSettings {
    household?: string;
    [key: string]: unknown;
  }

  class SonosSystem extends EventEmitter {
    constructor(settings?: SonosSystemSettings);

    zones: Zone[];
    players: Player[];
    localEndpoint: string;
    availableServices: Record<string, AvailableService>;

    getPlayer(name: string): Player | undefined;
    getPlayerByUUID(uuid: string): Player | undefined;
    getAnyPlayer(): Player;
    dispose(): void;
    getServiceId(serviceName: string): string;
    getServiceType(serviceName: string): string;
    applyPreset(preset: object): Promise<void>;
    getFavorites(): Promise<unknown>;
    getPlaylists(): Promise<unknown>;
    refreshShareIndex(): Promise<void>;
  }

  export = SonosSystem;
}

declare module 'sonos-discovery/lib/helpers/logger' {
  interface Logger {
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  const logger: Logger;
  export = logger;
}

declare module 'sonos-discovery/lib/helpers/request' {
  interface RequestOptions {
    uri: string;
    method?: string;
    type?: 'stream' | 'json' | string;
    headers?: Record<string, string | number>;
    body?: string | Buffer;
    timeout?: number;
  }

  function request(options: RequestOptions): Promise<unknown>;
  export = request;
}
