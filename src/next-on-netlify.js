#!/usr/bin/env node
const { program } = require('commander')

const nextOnNetlify = require('./index')

program.option('--max-log-lines [number]', 'lines of build output to show for each section', 50)

program
  .command('watch')
  .description('re-runs next-on-netlify on changes')
  .action(async () => {
    await nextOnNetlify({ watch: true })
  })

program
  .command('build', { isDefault: true })
  .description('runs next-on-netlify')
  .action(async () => {
    await nextOnNetlify()
  })

program.parse(process.argv)
