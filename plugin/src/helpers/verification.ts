/* eslint-disable max-lines */
import { existsSync, promises } from 'fs'
import path, { relative, join } from 'path'

import type { NetlifyConfig, NetlifyPluginUtils } from '@netlify/build'
import { yellowBright, greenBright, blueBright, redBright, reset } from 'chalk'
import { async as StreamZip } from 'node-stream-zip'
import { outdent } from 'outdent'
import prettyBytes from 'pretty-bytes'
import { satisfies } from 'semver'

import { LAMBDA_MAX_SIZE } from '../constants'

// This is when nft support was added
const REQUIRED_BUILD_VERSION = '>=18.16.0'

type FailBuild = NetlifyPluginUtils['build']['failBuild']

export const verifyNetlifyBuildVersion = ({
  IS_LOCAL,
  NETLIFY_BUILD_VERSION,
  failBuild,
}: {
  IS_LOCAL: boolean
  NETLIFY_BUILD_VERSION: string
  failBuild: FailBuild
}): void | never => {
  // We check for build version because that's what's available to us, but prompt about the cli because that's what they can upgrade
  if (IS_LOCAL && !satisfies(NETLIFY_BUILD_VERSION, REQUIRED_BUILD_VERSION, { includePrerelease: true })) {
    return failBuild(outdent`
      This version of the Essential Next.js plugin requires netlify-cli@6.12.4 or higher. Please upgrade and try again.
      You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"
    `)
  }
}

export const checkForOldFunctions = async ({ functions }: Pick<NetlifyPluginUtils, 'functions'>): Promise<void> => {
  const allOldFunctions = await functions.list()
  const oldFunctions = allOldFunctions.filter(({ name }) => name.startsWith('next_'))
  if (oldFunctions.length !== 0) {
    console.log(
      yellowBright(outdent`
        We have found the following functions in your site that seem to be left over from the old Next.js plugin (v3). We have guessed this because the name starts with "next_".

        ${reset(oldFunctions.map(({ name }) => `- ${name}`).join('\n'))}

        If they were created by the old plugin, these functions are likely to cause errors so should be removed. You can do this by deleting the following directories:

        ${reset(
          oldFunctions.map(({ mainFile }) => `- ${path.relative(process.cwd(), path.dirname(mainFile))}`).join('\n'),
        )}
      `),
    )
  }
}

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

export const checkForRootPublish = ({
  publish,
  failBuild,
}: {
  publish: string
  failBuild: FailBuild
}): void | never => {
  if (path.resolve(publish) === path.resolve('.')) {
    failBuild(outdent`
      Your publish directory is pointing to the base directory of your site. This is not supported for Next.js sites, and is probably a mistake.
      In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config, or the Next site is in a subdirectory.
    `)
  }
}

export const checkZipSize = async (file: string, maxSize: number = LAMBDA_MAX_SIZE): Promise<void> => {
  if (!existsSync(file)) {
    console.warn(`Could not check zip size because ${file} does not exist`)
    return
  }
  const fileSize = await promises.stat(file).then(({ size }) => size)
  if (fileSize < maxSize) {
    return
  }
  // We don't fail the build, because the actual hard max size is larger so it might still succeed
  console.log(
    redBright(outdent`
      The function zip ${yellowBright(relative(process.cwd(), file))} size is ${prettyBytes(
      fileSize,
    )}, which is larger than the maximum supported size of ${prettyBytes(maxSize)}.
      There are a few reasons this could happen. You may have accidentally bundled a large dependency, or you might have a
      large number of pre-rendered pages included.
    `),
  )
  const zip = new StreamZip({ file })
  console.log(`Contains ${await zip.entriesCount} files`)
  const sortedFiles = Object.values(await zip.entries()).sort((a, b) => b.size - a.size)

  const largest = {}
  for (let i = 0; i < 10 && i < sortedFiles.length; i++) {
    largest[`${i + 1}`] = {
      File: sortedFiles[i].name,
      'Compressed Size': prettyBytes(sortedFiles[i].compressedSize),
      'Uncompressed Size': prettyBytes(sortedFiles[i].size),
    }
  }
  console.log(yellowBright`\n\nThese are the largest files in the zip:`)
  console.table(largest)
  console.log(
    greenBright`\n\nFor more information on fixing this, see ${blueBright`https://ntl.fyi/large-next-functions`}`,
  )
}

export const getProblematicUserRewrites = ({
  redirects,
  basePath,
}: {
  redirects: NetlifyConfig['redirects']
  basePath: string
}) => {
  const userRewrites: NetlifyConfig['redirects'] = []
  for (const redirect of redirects) {
    // This is the first of the plugin-generated redirects so we can stop checking
    if (redirect.from === `${basePath}/_next/static/*` && redirect.to === `/static/:splat` && redirect.status === 200) {
      break
    }
    if (
      // Redirects are fine
      (redirect.status === 200 || redirect.status === 404) &&
      // Rewriting to a function is also fine
      !redirect.to.startsWith('/.netlify/') &&
      // ...so is proxying
      !redirect.to.startsWith('http')
    ) {
      userRewrites.push(redirect)
    }
  }
  return userRewrites
}

export const warnForProblematicUserRewrites = ({
  redirects,
  basePath,
}: {
  redirects: NetlifyConfig['redirects']
  basePath: string
}) => {
  const userRewrites = getProblematicUserRewrites({ redirects, basePath })
  if (userRewrites.length === 0) {
    return
  }
  console.log(
    yellowBright(outdent`
      You have the following Netlify rewrite${
        userRewrites.length === 1 ? '' : 's'
      } that might cause conflicts with the Next.js plugin:

      ${reset(userRewrites.map(({ from, to, status }) => `- ${from} ${to} ${status}`).join('\n'))}

      For more information, see https://ntl.fyi/next-rewrites
    `),
  )
}

export const warnForRootRedirects = ({ appDir }: { appDir: string }) => {
  if (existsSync(join(appDir, '_redirects'))) {
    console.log(
      yellowBright(
        `You have a "_redirects" file in your root directory, which is not deployed and will be ignored. If you want it to be used, please move it into "public".`,
      ),
    )
  }
}
/* eslint-enable max-lines */
