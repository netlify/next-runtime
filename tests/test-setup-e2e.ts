import { execaCommand } from 'execa'

// build the runtime before running tests
export default async () => {
  console.log(`🔨 Building runtime...`, process.cwd())
  await execaCommand('npm run build')
}
