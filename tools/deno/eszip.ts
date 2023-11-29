#!/usr/bin/env -S deno run --allow-run=deno --allow-read --allow-write --allow-net=deno.land --no-check

import { build, Parser } from 'https://deno.land/x/eszip@v0.55.4/mod.ts'
import { dirname, join } from 'https://deno.land/std@0.127.0/path/mod.ts'
import { assertStrictEquals } from 'https://deno.land/std@0.127.0/testing/asserts.ts'

interface ESZIP {
  extract(dest: string): Promise<void>
  list(): string[]
}

class V2 {
  parser: Parser
  specifiers: string[]

  constructor(parser: Parser, specifiers: string[]) {
    this.parser = parser
    this.specifiers = specifiers
  }

  static async load(bytes: Uint8Array) {
    const parser = await Parser.createInstance()
    const specifiers = await parser.parseBytes(bytes)
    await parser.load()
    return new V2(parser, specifiers as string[])
  }

  async extract(dest: string) {
    const imports: Record<string, string> = {}

    for (const specifier of this.specifiers) {
      const module = await this.parser.getModuleSource(specifier)
      await write(join(dest, 'source', url2path(specifier)), module)
      // Track import
      imports[specifier] = `./${url2path(specifier)}`
    }
    // Write import map
    const importMap = JSON.stringify({ imports }, null, 2)
    await Deno.writeTextFile(join(dest, 'source', 'import_map.json'), importMap)
  }

  list() {
    return this.specifiers
  }
}

async function loadESZIP(filename: string): Promise<ESZIP> {
  const bytes = await Deno.readFile(filename)
  return await V2.load(bytes)
}

function url2path(url: string) {
  return join(...new URL(url).pathname.split('/').filter(Boolean))
}

async function write(path: string, content: string) {
  await Deno.mkdir(dirname(path), { recursive: true })
  await Deno.writeTextFile(path, content)
}

async function run(eszip: ESZIP, specifier: string) {
  // Extract to tmp directory
  const tmpDir = await Deno.makeTempDir({ prefix: 'esz' })
  try {
    // Extract
    await eszip.extract(tmpDir)
    const importMap = join(tmpDir, 'source', 'import_map.json')
    // Run
    const p = new Deno.Command('deno', {
      args: ['run', '-A', '--no-check', '--import-map', importMap, specifier],
    })
    await p.output()
  } finally {
    // Cleanup
    await Deno.remove(tmpDir, { recursive: true })
  }
}

// Main
async function main() {
  const args = Deno.args
  const [subcmd, filename, ...rest] = args

  if (subcmd === 'help') {
    return console.log('TODO')
  }

  switch (subcmd) {
    case 'build':
    case 'b': {
      const eszip = await build([filename])
      let out = rest[0]
      if (!out) {
        // Create outfile name from url filename
        out = new URL(filename).pathname.split('/').pop() || 'out'
      }
      console.log(`${out}.eszip: ${eszip.length} bytes`)
      await Deno.writeFile(`${out}.eszip`, eszip)
      return
    }
    case 'x':
    case 'extract': {
      const eszip = await loadESZIP(filename)
      return await eszip.extract(rest[0] ?? Deno.cwd())
    }
    case 'l':
    case 'ls':
    case 'list': {
      const eszip = await loadESZIP(filename)
      return console.log(eszip.list().join('\n'))
    }
    case 'r':
    case 'run': {
      const eszip = await loadESZIP(filename)
      const specifier = rest[0]
      if (!specifier) {
        return console.error('Please provide a specifier to run')
      }
      return await run(eszip, specifier)
    }
  }
}

await main()
