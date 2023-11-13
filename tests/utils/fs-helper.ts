import { readdirSync, existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs'
import { type cp, type rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function fsCpHelper(...args: Parameters<typeof cp>): Promise<void> {
  const [source, destination, options] = args

  if (!existsSync(destination)) {
    mkdirSync(destination)
  }

  const files = readdirSync(source)

  for (const file of files) {
    const sourceFilePath = join(typeof source === 'string' ? source : fileURLToPath(source), file)
    const targetFilePath = join(
      typeof destination === 'string' ? destination : fileURLToPath(destination),
      file,
    )

    if (statSync(sourceFilePath).isDirectory()) {
      fsCpHelper(sourceFilePath, targetFilePath, options)
    } else {
      copyFileSync(sourceFilePath, targetFilePath)
    }
  }
}

export async function rmHelper(...args: Parameters<typeof rm>): Promise<void> {
  const { readdir, unlink, rmdir } = await import('node:fs/promises')
  const [source, options] = args

  try {
    const files = await readdir(source, { withFileTypes: true })

    // Iterate over each item in the directory
    for (const file of files) {
      const fullPath = join(source as string, file.name)

      if (file.isDirectory()) {
        // If the item is a directory, recurse
        await rmHelper(fullPath)
      } else {
        // If the item is a file, delete it
        await unlink(fullPath)
      }
    }

    // After all contents are deleted, delete the directory itself
    await rmdir(source)
  } catch (error) {
    if (!options?.force) {
      throw error
    }
  }
}
