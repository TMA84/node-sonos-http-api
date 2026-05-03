import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importDir } from './import-dir.js';
import type { TtsResult } from '../tts-providers/aws-polly.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type TtsProvider = (phrase: string, language: string) => Promise<TtsResult | undefined>;

const providers: TtsProvider[] = [];

await importDir<TtsProvider>(join(__dirname, '../tts-providers'), (provider) => {
  providers.push(provider);
});

const googleModule = await import('../tts-providers/default/google.js');
providers.push(googleModule.default as TtsProvider);

function tryDownloadTTS(phrase: string, language: string): Promise<TtsResult | undefined> {
  let result: TtsResult | undefined;
  return providers.reduce((promise, provider) => {
    return promise.then(() => {
      if (result) return result;
      return provider(phrase, language)
        .then((_result) => {
          result = _result;
          return result;
        });
    });
  }, Promise.resolve<TtsResult | undefined>(undefined));
}

export default tryDownloadTTS;
