'use strict';

function services(player, values) {
  if (values[0] === 'all') {
    return Promise.resolve(player.system.availableServices);
  }

  return Promise.resolve();
}

export default function (api) {
  api.registerAction('services', services);
}
