import { parseFile } from 'music-metadata';

function fileDuration(path) {
  return parseFile(path, { duration: true })
      .then((info) => {
        return Math.ceil(info.format.duration * 1000);
      });
}

export default fileDuration;
