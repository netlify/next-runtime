import { platform } from 'node:os'
import { join } from 'node:path'

import { vol } from 'memfs'
import { vi } from 'vitest'

export const osHomeDir = platform() === 'win32' ? 'C:\\Users\\test-user' : '/home/test-user'

/**
 * Creates a mocked file system
 * @param fileSystem The object of the files
 * @param folder Optional folder where it should be placed inside the osHomeDir
 * @returns The cwd where all files are placed in
 */
export const mockFileSystem = (fileSystem: Record<string, string>, folder = 'test') => {
  vol.fromJSON(
    Object.entries(fileSystem).reduce(
      (prev, [key, value]) => ({
        ...prev,
        [folder ? join(osHomeDir, folder, key) : key]: value,
      }),
      {},
    ),
  )

  const cwd = folder ? join(osHomeDir, folder) : process.cwd()
  vi.spyOn(process, 'cwd').mockReturnValue(cwd)
  return cwd
}
