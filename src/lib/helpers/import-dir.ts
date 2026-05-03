import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function importDir<T>(
  dir: string,
  callback: (module: T) => void
): Promise<void> {
  const files = await readdir(dir);
  for (const name of files) {
    const fullPath = join(dir, name);
    const fileStat = await stat(fullPath);
    if (!fileStat.isDirectory() && !name.startsWith('.') && /\.[jt]s$/.test(name)) {
      const mod = await import(fullPath);
      callback(mod.default ?? mod);
    }
  }
}
