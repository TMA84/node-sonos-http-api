/**
 * Common types for action handlers.
 */
import type SonosSystem from 'sonos-discovery';

/** Player type from sonos-discovery */
export interface Player {
  uuid: string;
  roomName: string;
  baseUrl: string;
  coordinator: Player;
  state: {
    volume: number;
    mute: boolean;
    trackNo: number;
    playbackState: string;
    elapsedTime: number;
    playMode: { repeat: string; shuffle: boolean; crossfade: boolean };
    equalizer?: { nightMode: boolean; speechEnhancement: boolean };
    [key: string]: unknown;
  };
  system: SonosSystem;
  avTransportUri: string;
  avTransportUriMetadata: string;
  hasSub: boolean;
  _state: unknown;
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
  setTreble(level: number): Promise<void>;
  timeSeek(seconds: number): Promise<void>;
  trackSeek(trackNo: number): Promise<void>;
  clearQueue(): Promise<void>;
  addURIToQueue(uri: string, metadata?: string, enqueueAsNext?: boolean, desiredFirstTrackNumberEnqueued?: number): Promise<any>;
  setAVTransport(uri: string, metadata?: string): Promise<void>;
  becomeCoordinatorOfStandaloneGroup(): Promise<void>;
  replaceWithFavorite(name: string): Promise<void>;
  nightMode(enabled: boolean): Promise<unknown>;
  speechEnhancement(enabled: boolean): Promise<unknown>;
  setGroupVolume(level: number): Promise<void>;
  once(event: string, handler: (...args: unknown[]) => void): void;
  [key: string]: unknown;
}

/** Standard response from an action handler */
export interface ActionResponse {
  status?: string;
  [key: string]: unknown;
}

/** Action handler function signature */
export type ActionHandler = (player: Player, values: string[]) => Promise<ActionResponse | void | unknown>;

/** API object passed to action module default export */
export interface ActionApi {
  registerAction(name: string, handler: ActionHandler): void;
  discovery: SonosSystem;
  getPort(): number;
  getWebRoot(): string;
}
