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
  state: string;
  uri: string;
  metadata: string;
  playMode: { repeat: string };
  trackNo?: number;
  elapsedTime?: number;
}

interface Player {
  uuid: string;
  roomName: string;
  coordinator: Player;
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

function saveAll(system: SonosSystem): BackupPreset[] {
  const backupPresets: BackupPreset[] = system.zones.map((zone) => {
    const coordinator = zone.coordinator;
    const state = coordinator.state;
    const preset: BackupPreset = {
      players: [
        { roomName: coordinator.roomName, volume: state.volume }
      ],
      state: state.playbackState,
      uri: coordinator.avTransportUri,
      metadata: coordinator.avTransportUriMetadata,
      playMode: {
        repeat: state.playMode.repeat
      }
    };

    if (!isRadioOrLineIn(preset.uri)) {
      preset.trackNo = state.trackNo;
      preset.elapsedTime = state.elapsedTime;
    }

    zone.members.forEach(function (player) {
      if (coordinator.uuid != player.uuid)
        preset.players.push({ roomName: player.roomName, volume: player.state.volume });
    });

    return preset;
  });

  logger.trace('backup presets', backupPresets);
  return backupPresets.sort((a, b) => {
    return b.players.length - a.players.length;
  });
}

function announceAll(system: SonosSystem, uri: string, volume: number, duration: number): Promise<void> {
  let abortTimer: ReturnType<typeof setTimeout>;

  // Save all players
  const backupPresets = saveAll(system);

  // find biggest group and all players
  const allPlayers: PlayerPresetEntry[] = [];
  let biggestZone: Partial<Zone> = {};
  system.zones.forEach(function (zone) {
    if (!biggestZone.members || zone.members.length > biggestZone.members.length) {
      biggestZone = zone;
    }
  });

  const coordinator = (biggestZone as Zone).coordinator;

  allPlayers.push({ roomName: coordinator.roomName, volume });

  system.players.forEach(player => {
    if (player.uuid == coordinator.uuid) return;
    allPlayers.push({ roomName: player.roomName, volume });
  });

  const preset = {
    uri,
    players: allPlayers,
    playMode: {
      repeat: false
    },
    pauseOthers: true,
    state: 'STOPPED'
  };

  const oneGroupPromise = new Promise<void>((resolve) => {
    const onTopologyChanged = (...args: unknown[]) => {
      const topology = args[0] as Zone[];
      if (topology.length === 1) {
        return resolve();
      }
      // Not one group yet, continue listening
      system.once('topology-change', onTopologyChanged);
    };

    system.once('topology-change', onTopologyChanged);
  });

  const restoreTimeout = duration + 2000;
  return system.applyPreset(preset)
    .then(() => {
      if (system.zones.length === 1) return;
      return oneGroupPromise;
    })
    .then(() => {
      coordinator.play();
      return new Promise<void>((resolve) => {
        const transportChange = (...args: unknown[]) => {
          const state = args[0] as { playbackState: string };
          logger.debug(`Player changed to state ${state.playbackState}`);
          if (state.playbackState === 'STOPPED') {
            return resolve();
          }

          coordinator.once('transport-state', transportChange);
        };
        setTimeout(() => {
          coordinator.once('transport-state', transportChange);
        }, duration / 2);

        logger.debug(`Setting restore timer for ${restoreTimeout} ms`);
        abortTimer = setTimeout(resolve, restoreTimeout);
      });
    })
    .then(() => {
      clearTimeout(abortTimer);
    })
    .then(() => {
      return backupPresets.reduce((promise, preset) => {
        logger.trace('Restoring preset', preset);
        return promise.then(() => system.applyPreset(preset));
      }, Promise.resolve());
    })
    .catch((err: Error) => {
      logger.error(err.stack);
      throw err;
    });
}

export default announceAll;
