import { createRequire } from 'node:module';
import isRadioOrLineIn from './is-radio-or-line-in.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

interface PlayerPresetEntry {
  roomName: string;
  volume: number;
}

interface BackupPreset {
  players: PlayerPresetEntry[];
  state?: string;
  uri?: string;
  metadata?: string;
  playMode?: { repeat: string };
  trackNo?: number;
  elapsedTime?: number;
  group?: string;
}

interface Player {
  uuid: string;
  roomName: string;
  coordinator: Player;
  system: SonosSystem;
  state: {
    volume: number;
    playbackState: string;
    trackNo: number;
    elapsedTime: number;
    playMode: { repeat: string };
  };
  avTransportUri: string;
  avTransportUriMetadata: string;
  play(): Promise<void>;
  pause(): Promise<void>;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

interface Zone {
  coordinator: Player;
  members: Player[];
  uuid: string;
  id: string;
}

interface SonosSystem {
  zones: Zone[];
  players: Player[];
  applyPreset(preset: object): Promise<void>;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

const backupPresets: Record<string, BackupPreset[]> = {};

function singlePlayerAnnouncement(player: Player, uri: string, volume: number, duration: number): Promise<void> {
  // Create backup preset to restore this player
  const state = player.state;
  const system = player.system;

  let groupToRejoin: string | undefined;

  const backupPreset: BackupPreset = {
    players: [
      { roomName: player.roomName, volume: state.volume }
    ]
  };

  if (player.coordinator.uuid == player.uuid) {
    // This one is coordinator, you will need to rejoin
    // remember which group you were part of.
    const group = system.zones.find(zone => zone.coordinator.uuid === player.coordinator.uuid);
    if (group && group.members.length > 1) {
      logger.debug('Think its coordinator, will find uri later');
      groupToRejoin = group.id;
      backupPreset.group = group.id;
    } else {
      // was stand-alone, so keep state
      backupPreset.state = state.playbackState;
      backupPreset.uri = player.avTransportUri;
      backupPreset.metadata = player.avTransportUriMetadata;
      backupPreset.playMode = {
        repeat: state.playMode.repeat
      };

      if (!isRadioOrLineIn(backupPreset.uri!)) {
        backupPreset.trackNo = state.trackNo;
        backupPreset.elapsedTime = state.elapsedTime;
      }
    }
  } else {
    // Was grouped, so we use the group uri here directly.
    backupPreset.uri = `x-rincon:${player.coordinator.uuid}`;
  }

  logger.debug('backup state was', backupPreset);

  // Use the preset action to play the tts file
  const ttsPreset = {
    players: [
      { roomName: player.roomName, volume }
    ],
    playMode: {
      repeat: false
    },
    uri
  };

  let abortTimer: ReturnType<typeof setTimeout>;

  if (!backupPresets[player.roomName]) {
    backupPresets[player.roomName] = [];
  }

  backupPresets[player.roomName].unshift(backupPreset);
  logger.debug('backup presets array', backupPresets[player.roomName]);

  const prepareBackupPreset = (): Promise<void> => {
    if (backupPresets[player.roomName].length > 1) {
      backupPresets[player.roomName].shift();
      logger.debug('more than 1 backup presets during prepare', backupPresets[player.roomName]);
      return Promise.resolve();
    }

    if (backupPresets[player.roomName].length < 1) {
      return Promise.resolve();
    }

    const relevantBackupPreset = backupPresets[player.roomName][0];

    logger.debug('exactly 1 preset left', relevantBackupPreset);

    if (relevantBackupPreset.group) {
      const zone = system.zones.find(zone => zone.id === relevantBackupPreset.group);
      if (zone) {
        relevantBackupPreset.uri = `x-rincon:${zone.uuid}`;
      }
    }

    logger.debug('applying preset', relevantBackupPreset);
    return system.applyPreset(relevantBackupPreset)
      .then(() => {
        backupPresets[player.roomName].shift();
        logger.debug('after backup preset applied', backupPresets[player.roomName]);
      });
  };

  let timer: number;
  const restoreTimeout = duration + 2000;
  return system.applyPreset(ttsPreset)
    .then(() => {
      return new Promise<void>((resolve) => {
        const transportChange = (...args: unknown[]) => {
          const state = args[0] as { playbackState: string };
          logger.debug(`Player changed to state ${state.playbackState}`);
          if (state.playbackState === 'STOPPED') {
            return resolve();
          }

          player.once('transport-state', transportChange);
        };
        setTimeout(() => {
          player.once('transport-state', transportChange);
        }, duration / 2);

        logger.debug(`Setting restore timer for ${restoreTimeout} ms`);
        timer = Date.now();
        abortTimer = setTimeout(resolve, restoreTimeout);
      });
    })
    .then(() => {
      const elapsed = Date.now() - timer;
      logger.debug(`${elapsed} elapsed with ${restoreTimeout - elapsed} to spare`);
      clearTimeout(abortTimer);
    })
    .then(prepareBackupPreset)
    .catch((err: Error) => {
      logger.error(err);
      return prepareBackupPreset()
        .then(() => {
          throw err;
        });
    });
}

export default singlePlayerAnnouncement;
