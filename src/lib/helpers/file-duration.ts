import * as musicMeta from 'music-metadata';

function fileDuration(path: string): Promise<number> {
  return musicMeta.parseFile(path, { duration: true })
    .then((info) => {
      return Math.ceil((info.format.duration ?? 0) * 1000);
    });
}

export default fileDuration;
