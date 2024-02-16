import { platform } from 'node:os'
import fs from 'node:fs'
import { join } from 'node:path'

import { Volume } from 'memfs'
import { vi } from 'vitest'

export const osHomeDir = platform() === 'win32' ? 'C:\\Users\\test-user' : '/home/test-user'

/**
 * Creates a mocked file system
 * @param fileSystem The object of the files
 * @param folder Optional folder where it should be placed inside the osHomeDir
 * @returns The cwd where all files are placed in
 */
export const mockFileSystem = (
  fileSystem: Record<string, string>,
  folder = 'test',
  overlay = true,
) => {
  ;(fs as any).reset?.()
  const vol = Volume.fromJSON(
    Object.entries(fileSystem).reduce(
      (prev, [key, value]) => ({
        ...prev,
        [folder ? join(osHomeDir, folder, key) : key]: value,
      }),
      {},
    ),
  )
  // in this case we don't want to have the actual underlying fs so we clear them
  // we only have the fs from the volume now.
  if (!overlay) {
    ;(fs as any).fss = []
  }
  ;(fs as any).use?.(vol)

  const cwd = folder ? join(osHomeDir, folder) : process.cwd()
  vi.spyOn(process, 'cwd').mockReturnValue(cwd)
  return { cwd, vol }
}
