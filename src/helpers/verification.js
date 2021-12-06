const { existsSync, promises } = require('fs')
const path = require('path')
const { relative } = require('path')

const { yellowBright, greenBright, blueBright, redBright, reset } = require('chalk')
const { async: StreamZip } = require('node-stream-zip')
const outdent = require('outdent')
const prettyBytes = require('pretty-bytes')
const { satisfies } = require('semver')

// This is when nft support was added
const REQUIRED_BUILD_VERSION = '>=18.16.0'

exports.verifyNetlifyBuildVersion = ({ IS_LOCAL, NETLIFY_BUILD_VERSION, failBuild }) => {
  // We check for build version because that's what's available to us, but prompt about the cli because that's what they can upgrade
  if (IS_LOCAL && !satisfies(NETLIFY_BUILD_VERSION, REQUIRED_BUILD_VERSION, { includePrerelease: true })) {
    return failBuild(outdent`
      This version of the Essential Next.js plugin requires netlify-cli@6.12.4 or higher. Please upgrade and try again.
      You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"
    `)
  }
}

exports.checkForOldFunctions = async ({ functions }) => {
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

exports.checkNextSiteHasBuilt = ({ publish, failBuild }) => {
  if (!existsSync(path.join(publish, 'BUILD_ID'))) {
    return failBuild(outdent`
      The directory "${path.relative(
        process.cwd(),
        publish,
      )}" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory. 
      In most cases it should be set to the site's ".next" directory path, unless you have chosen a custom "distDir" in your Next config. 
      If you are using "next export" then the Essential Next.js plugin should be removed. See https://ntl.fyi/remove-plugin for details.
    `)
  }
  if (existsSync(path.join(publish, 'export-detail.json'))) {
    failBuild(outdent`
      Detected that "next export" was run, but site is incorrectly publishing the ".next" directory.
      This plugin is not needed for "next export" so should be removed, and publish directory set to "out".
      See https://ntl.fyi/remove-plugin for more details on how to remove this plugin.
    `)
  }
}

exports.checkForRootPublish = ({ publish, failBuild }) => {
  if (path.resolve(publish) === path.resolve('.')) {
    failBuild(outdent`
      Your publish directory is pointing to the base directory of your site. This is not supported for Next.js sites, and is probably a mistake. 
      In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config, or the Next site is in a subdirectory.
    `)
  }
}

// 50MB, which is the documented max, though the hard max seems to be higher
const LAMBDA_MAX_SIZE = 1024 * 1024 * 50

exports.checkZipSize = async (file, maxSize = LAMBDA_MAX_SIZE) => {
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

exports.logBetaMessage = () =>
  console.log(
    greenBright(
      outdent`
        Thank you for trying the Essential Next.js beta plugin. 
        Please share feedback (both good and bad) at ${blueBright`https://ntl.fyi/next-beta-feedback`}
      `,
    ),
  )
