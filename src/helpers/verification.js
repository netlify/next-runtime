const path = require('path')

const { yellowBright, greenBright, blueBright } = require('chalk')
const { existsSync } = require('fs-extra')
const outdent = require('outdent')
const { satisfies } = require('semver')

exports.verifyBuildTarget = (target) => {
  if (target !== 'server') {
    console.log(
      yellowBright`Setting target to ${target} is no longer required. You should check if target=server works for you.`,
    )
  }
}

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
      See https://ntl.fyi/remove-plugin for more details on how to remove this plugin.`)
  }
}

exports.checkForRootPublish = ({ publish, failBuild }) => {
  if (path.resolve(publish) === path.resolve('.')) {
    failBuild(outdent`
      Your publish directory is pointing to the base directory of your site. This is not supported for Next.js sites, and is probably a mistake. 
      In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config, or the Next site is in a subdirectory.`)
  }
}

exports.logBetaMessage = () =>
  console.log(
    greenBright(
      outdent`
        Thank you for trying the Essential Next.js beta plugin. 
        Please share feedback at ${blueBright`https://ntl.fyi/next-beta-feedback`}
      `,
    ),
  )
