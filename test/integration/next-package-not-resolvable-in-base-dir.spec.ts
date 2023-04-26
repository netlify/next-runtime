import execa from 'execa'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import waitOn from 'wait-on'
import fetch from 'node-fetch'

let destroy = () => {}

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `isolated-test-`))

  // copy fixture to isolated tmp directory
  const siteSrcDir = path.join(__dirname, 'fixtures', 'next-package-not-resolvable-in-base-dir')
  const siteDestDir = path.join(tmpDir, 'next-package-not-resolvable-in-base-dir')

  console.log(`copying fixture site "${siteSrcDir}" to "${siteDestDir}"`)
  fs.copySync(siteSrcDir, siteDestDir)

  // bump version so no npm cache tries to use what's in npm registry
  const runtimeSrcDir = path.join(__dirname, '..', '..', 'packages', 'runtime')
  await execa(`npm`, [`version`, `prerelease`, `--no-git-tag-version`], { cwd: runtimeSrcDir, stdio: `inherit` })

  // create package tarball
  const o = await execa(`npm`, [`pack`, `--json`], { cwd: runtimeSrcDir })
  const tgzName = JSON.parse(o.stdout)[0].filename
  const tgzPath = path.join(runtimeSrcDir, tgzName)

  // install runtime from tarball
  await execa(`npm`, [`install`, tgzPath], { cwd: siteDestDir, stdio: `inherit` })

  return new Promise<void>(async (resolve, reject) => {
    try {
      // run
      let isServeRunning = true
      const serveProcess = execa('netlify', ['serve', `-p`, `8888`], { cwd: siteDestDir, stdio: `inherit` })

      let shouldRejectOnNonZeroProcessExit = true
      serveProcess.catch((e) => {
        isServeRunning = false
        if (shouldRejectOnNonZeroProcessExit) {
          reject(e)
        }
        return null
      })

      await waitOn({
        resources: [`http://localhost:8888/`],
        timeout: 3 * 60 * 1000,
      })

      if (!isServeRunning) {
        return reject(new Error(`serve process exited`))
      }

      destroy = () => {
        shouldRejectOnNonZeroProcessExit = false
        serveProcess.kill()
      }

      // ensure we can't resolve "next" from either base dir or app dir
      // this is done to ensure that functions packaging worked correctly and doesn't rely on
      // leftover node_modules that wouldn't be available when functions are deployed to lambdas
      expect(() => require.resolve(`next`, { paths: [siteDestDir] })).toThrow()
      expect(() => require.resolve(`next`, { paths: [path.join(siteDestDir, `next-app`)] })).toThrow()

      return resolve()
    } catch (e) {
      reject(e)
    }
  })
}, 3 * 60 * 1000)

afterAll(() => destroy())

it(`page route executes correctly`, async () => {
  const htmlResponse = await fetch(`http://localhost:8888/`)
  // ensure we got a 200
  expect(htmlResponse.ok).toBe(true)
  // ensure we use ssr handler
  expect(htmlResponse.headers.get(`x-nf-render-mode`)).toEqual(`ssr`)
  const t = expect(await htmlResponse.text()).toMatch(/Hello world/)
})

it(`api route executes correctly`, async () => {
  const apiResponse = await fetch(`http://localhost:8888/api/hello`)
  // ensure we got a 200
  expect(apiResponse.ok).toBe(true)
  // ensure we use ssr handler
  expect(apiResponse.headers.get(`x-nf-render-mode`)).toEqual(`ssr`)
  expect(await apiResponse.json()).toEqual({ name: 'John Doe' })
})
