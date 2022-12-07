import { resolve } from 'path'

import { startWatching } from './compiler'

const run = async () => {
  const { isReady, watcher } = startWatching(resolve(process.argv[2]))
  await isReady
  if (process.argv[3] === '--once') {
    watcher.close()
  }
}

run()
