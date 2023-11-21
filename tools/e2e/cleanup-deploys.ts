import { exec } from 'child_process'
import { SITE_ID, deleteDeploy } from '../../tests/utils/create-e2e-fixture.js'

const runCommand = (cmd: string) =>
  new Promise<string>((resolve, reject) =>
    exec(cmd, (err, stdout) => (err ? reject(err) : resolve(stdout))),
  )

const output = await runCommand(`ntl api listSiteDeploys --data='{"site_id":"${SITE_ID}"}'`)
const deploys = JSON.parse(output)

await Promise.allSettled(deploys.map((deploy) => deleteDeploy(deploy.id)))
