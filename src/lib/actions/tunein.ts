import type { Player, ActionApi } from './types.js';

function getTuneInMetadata(uri: string, serviceType: string): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="F00092020s${uri}" parentID="L" restricted="true"><dc:title>tunein</dc:title><upnp:class>object.item.audioItem.audioBroadcast</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_</desc></item></DIDL-Lite>`;
}

function tuneIn(player: Player, values: string[]): Promise<any> {
  const action = values[0];
  const tuneInUri = values[1];
  const encodedTuneInUri = encodeURIComponent(tuneInUri);
  const sid = (player.system as any).getServiceId('TuneIn');
  const metadata = getTuneInMetadata(encodedTuneInUri, (player.system as any).getServiceType('TuneIn'));
  const uri = `x-sonosapi-stream:s${encodedTuneInUri}?sid=${sid}&flags=8224&sn=0`;

  if (!tuneInUri) {
    return Promise.reject('Expected TuneIn station id');
  }

  if (action == 'play') {
    return player.coordinator.setAVTransport(uri, metadata)
      .then(() => player.coordinator.play());
  }
  if (action == 'set') {
    return player.coordinator.setAVTransport(uri, metadata);
  }

  return Promise.reject('TuneIn only handles the {play} & {set} action');
}

export default function (api: ActionApi): void {
  api.registerAction('tunein', tuneIn);
}
