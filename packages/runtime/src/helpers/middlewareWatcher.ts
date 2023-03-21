import { resolve } from 'path'

import { watchForMiddlewareChanges } from './compiler'

const run = async () => {
  const { isReady, watcher } = watchForMiddlewareChanges(resolve(process.argv[2]))
  await isReady
  if (process.argv[3] === '--once') {
    watcher.close()
  }
}

run()
