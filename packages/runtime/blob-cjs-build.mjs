import * as esbuild from '@netlify/esbuild'

// https://github.com/evanw/esbuild/issues/1760#issuecomment-964900401
const stripNodeColonPlugin = {
  name: 'strip-node-colon',
  setup({ onResolve, onLoad }) {
    onResolve({ filter: /^node:/ }, (args) => {
      return { path: args.path.slice('node:'.length), external: true }
    })
  },
}

await esbuild.build({
  entryPoints: ['src/templates/netliblob.mts'],
  format: 'cjs',
  bundle: true,
  outfile: 'src/templates/blob.js',
  platform: 'node',
  plugins: [stripNodeColonPlugin],
})
