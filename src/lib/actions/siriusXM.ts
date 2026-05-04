import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const Fuse = require('fuse.js');
const channels: any[] = require('../sirius-channels.json');

function getSiriusXmMetadata(id: string, parent: string, title: string, serviceType: string): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="00092120r%3a${id}" parentID="${parent}" restricted="true"><dc:title>${title}</dc:title><upnp:class>object.item.audioItem.audioBroadcast</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token</desc></item></DIDL-Lite>`;
}

function getSiriusXmUri(id: string, sid: string): string {
  return `x-sonosapi-hls:r%3a${id}?sid=${sid}&flags=8480&sn=11`;
}

const replaceArray = ['ñ|n', 'á|a', 'ó|o', 'è|e', 'ë|e', '/| ', '-| ', 'siriusxm|sirius XM', 'sxm|SXM', 'cnn|CNN', 'hln|HLN', 'msnbc|MSNBC', 'bbc|BBC',
  'ici|ICI', 'prx|PRX', 'cbc|CBC', 'npr|NPR', 'espn|ESPN', ' ny| NY', 'kiis|KIIS', '&|and', 'ami|AMI', 'z1|Z1', '2k|2K', 'bb |BB '];

function adjustStation(name: string): string {
  name = name.toLowerCase();
  for (let i = 0; i < replaceArray.length; i++)
    name = name.replace(replaceArray[i].split('|')[0], replaceArray[i].split('|')[1]);

  return name;
}

function siriusXM(player: Player, values: string[]): Promise<any> {
  // Used to generate channel data for the channels array
  if (values[0] == 'data') {
    return (player.system.getFavorites() as Promise<any[]>)
      .then((favorites) => {
        return favorites.reduce(function (promise: Promise<any>, item: any) {
          if (item.uri.startsWith('x-sonosapi-hls:')) {
            const title = item.title.replace(/'/g, '');

            console.log("{fullTitle:'" + title +
              "', channelNum:'" + title.substring(0, title.search(' - ')) +
              "', title:'" + title.substring(title.search(' - ') + 3, title.length) +
              "', id:'" + item.uri.substring(item.uri.search('r%3a') + 4, item.uri.search('sid=') - 1) +
              "', parentID:'" + item.metadata.substring(item.metadata.search('parentID=') + 10, item.metadata.search(' restricted') - 1) + "'},");
          }
          return promise;
        }, Promise.resolve("success"));
      });
  } else if (values[0] == 'channels') {
    // Used to send a list of channel numbers
    const cList = channels.map(function (channel: any) {
      return channel.channelNum;
    });
    cList.sort(function (a: any, b: any) { return a - b; }).map(function (channel: any) {
      console.log(channel);
    });

    return Promise.resolve("success");
  } else if (values[0] == 'stations') {
    // Used to send a list of station titles
    channels.map(function (channel: any) {
      console.log(adjustStation(channel.title));
    });
    return Promise.resolve("success");
  } else {
    // Play the specified SiriusXM channel or station
    const searchVal = values[0];
    const fuzzy = new Fuse(channels, { keys: ["channelNum", "title"] });

    const results = fuzzy.search(searchVal);
    if (results.length > 0) {
      const channel = results[0];
      const sid = (player.system as any).getServiceId('SiriusXM');
      const serviceType = (player.system as any).getServiceType('SiriusXM');
      const uri = getSiriusXmUri(channel.item.id, sid);
      const metadata = getSiriusXmMetadata(channel.item.id, channel.item.parentID, channel.item.fullTitle, serviceType);

      return player.coordinator.setAVTransport(uri, metadata)
        .then(() => player.coordinator.play());
    } else {
      return Promise.reject('No matching SiriusXM station found');
    }
  }
}

export default function (api: ActionApi): void {
  api.registerAction('siriusxm', siriusXM);
}
