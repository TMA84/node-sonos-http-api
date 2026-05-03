import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');
const presets: Record<string, any> = require('../../lib/presets-loader.js');

function presetsAction(player: Player, values: string[]): Promise<any> {
  const value = decodeURIComponent(values[0]);
  let preset;
  if (value.startsWith('{')) {
    preset = JSON.parse(value);
  } else {
    preset = (presets as any)[value];
  }

  if (preset) {
    return player.system.applyPreset(preset);
  } else {
    const simplePresets = Object.keys(presets);
    return Promise.resolve(simplePresets);
  }
}

export default function (api: ActionApi): void {
  api.registerAction('preset', presetsAction);
}
