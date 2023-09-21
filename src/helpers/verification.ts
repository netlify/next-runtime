import { existsSync } from 'fs'
import path from 'path'

import type { NetlifyPluginUtils } from '@netlify/build'
// eslint-disable-next-line import/no-extraneous-dependencies
import { outdent } from 'outdent'


type FailBuild = NetlifyPluginUtils['build']['failBuild']

export const checkNextSiteHasBuilt = ({
    publish,
    failBuild,
  }: {
    publish: string
    failBuild: FailBuild
  }): void | never => {
    if (!existsSync(path.join(publish, 'BUILD_ID'))) {
      let outWarning
  
      if (path.basename(publish) === 'out') {
        outWarning = `Your publish directory is set to "out", but in most cases it should be ".next".`
      } else if (path.basename(publish) !== '.next' && existsSync(path.join('.next', 'BUILD_ID'))) {
        outWarning = outdent`
          However, a '.next' directory was found with a production build.
          Consider changing your 'publish' directory to '.next'
        `
      } else {
        outWarning = `In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config.`
      }
  
      return failBuild(outdent`
        The directory "${publish}" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory.
        ${outWarning}
        If you are using "next export" then you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
      `)
    }
    if (existsSync(path.join(publish, 'export-detail.json'))) {
      return failBuild(outdent`
        Detected that "next export" was run, but site is incorrectly publishing the ".next" directory.
        The publish directory should be set to "out", and you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
      `)
    }
  }