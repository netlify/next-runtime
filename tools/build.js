import { resolve } from 'node:path'
import { build, context } from 'esbuild'
import { execaCommand } from 'execa'
import glob from 'fast-glob'
import { rm } from 'node:fs/promises'

const OUT_DIR = 'dist'
await rm(OUT_DIR, { force: true, recursive: true })

const entryPointsESM = await glob('src/**/*.ts', { ignore: ['**/*.test.ts'] })
const entryPointsCJS = await glob('src/**/*.cts')

/**
 *
 * @param {string[]} entryPoints
 * @param {'esm' | 'cjs'} format
 * @param {boolean=} watch
 * @returns
 */
async function bundle(entryPoints, format, watch) {
  /** @type {import('esbuild').BuildOptions} */
  const options = {
    entryPoints: entryPoints,
    entryNames: '[dir]/[name]',
    bundle: true,
    platform: 'node',
    target: 'node18',
    format,
    external: ['next', '*.cjs'], // don't try to bundle the cjs files as we are providing them separately
    allowOverwrite: watch,
  }

  if (format === 'esm') {
    options.outdir = OUT_DIR
    options.chunkNames = 'esm-chunks/[name]-[hash]'
    options.splitting = true
    options.banner = {
      // this shim is needed for cjs modules that are imported in ESM :(
      js: `
      const require = await (async () => {
        const { createRequire } = await import("node:module");
        return createRequire(import.meta.url);
      })();
    `,
    }
  } else {
    options.outfile = entryPoints[0].replace('src', OUT_DIR).replace('cts', 'cjs')
  }

  if (!watch) {
    return build(options)
  }
  const ctx = await context(options)
  await ctx.watch()

  process.on('SIGINT', function () {
    ctx.dispose().then(() => {
      process.exit()
    })
  })
}

async function vendorDeno() {
  const vendorSource = resolve('edge-runtime/vendor.ts')
  const vendorDest = resolve('edge-runtime/vendor')

  try {
    await execaCommand('deno --version')
  } catch {
    throw new Error('Could not check the version of Deno. Is it installed on your system?')
  }

  console.log(`🧹 Deleting '${vendorDest}'...`)

  await rm(vendorDest, { force: true, recursive: true })

  console.log(`📦 Vendoring Deno modules into '${vendorDest}'...`)

  await execaCommand(`deno vendor ${vendorSource} --output=${vendorDest}`)
}

const args = new Set(process.argv.slice(2))
const watch = args.has('--watch') || args.has('-w')

await Promise.all([
  vendorDeno(),
  bundle(entryPointsESM, 'esm', watch),
  ...entryPointsCJS.map((entry) => bundle([entry], 'cjs', watch)),
])

if (watch) {
  console.log('Starting compilation in watch mode...')
} else {
  console.log('Finished building 🎉')
}
