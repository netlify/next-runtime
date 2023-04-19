import path from "path"
import { dirname } from "path"
import cpy from "cpy"
import {
  writeJSON,
  existsSync,
  ensureDir,
  readJson,
  copy,
} from "fs-extra"
import { dir as getTmpDir } from "tmp-promise"

const FIXTURES_DIR = `${__dirname}/fixtures`
const SAMPLE_PROJECT_DIR = `${__dirname}/../demos/default`

// Temporary switch cwd
export const changeCwd = function (cwd) {
  const originalCwd = process.cwd()
  process.chdir(cwd)
  return () => {
    process.chdir(originalCwd)
  }
}

const rewriteAppDir = async function (dir = '.next') {
  const manifest = path.join(dir, 'required-server-files.json')
  const manifestContent = await readJson(manifest)
  manifestContent.appDir = process.cwd()

  await writeJSON(manifest, manifestContent)
}

// Move .next from sample project to current directory
export const moveNextDist = async function (dir = '.next', copyMods = false) {
  if (copyMods) {
    await copyModules(['next', 'sharp'])
  } else {
    await stubModules(['next', 'sharp'])
  }
  await ensureDir(dirname(dir))
  await copy(path.join(SAMPLE_PROJECT_DIR, '.next'), path.join(process.cwd(), dir))

  for (const file of ['pages', 'app', 'src', 'components', 'public', 'components', 'hello.txt', 'package.json']) {
    const source = path.join(SAMPLE_PROJECT_DIR, file)
    if (existsSync(source)) {
      await copy(source, path.join(process.cwd(), file))
    }
  }

  await rewriteAppDir(dir)
}

export const copyModules = async function (modules) {
  for (const mod of modules) {
    const source = dirname(require.resolve(`${mod}/package.json`))
    const dest = path.join(process.cwd(), 'node_modules', mod)
    await copy(source, dest)
  }
}

export const stubModules = async function (modules) {
  for (const mod of modules) {
    const dir = path.join(process.cwd(), 'node_modules', mod)
    await ensureDir(dir)
    await writeJSON(path.join(dir, 'package.json'), { name: mod })
  }
}

// Copy fixture files to the current directory
export const useFixture = async function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  await cpy('**', process.cwd(), { cwd: fixtureDir, parents: true, overwrite: true, dot: true })
}

// Change current cwd() to a temporary directory
export const describeCwdTmpDir = (name: string, fn: () => void): void => {
  describe(name, () => {
    let restoreCwd
    let cleanup

    beforeEach(async () => {
      const tmpDir = await getTmpDir({ unsafeCleanup: true })
      restoreCwd = changeCwd(tmpDir.path)
      cleanup = tmpDir.cleanup
    })

    afterEach(async () => {
      restoreCwd()
      await cleanup()
    })

    fn()
  })
}