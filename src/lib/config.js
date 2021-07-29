const { join } = require('path')

const getNextSrcDirs = require('./helpers/getNextSrcDir')

// This is where next-on-netlify will place all static files.
// The publish key in netlify.toml should point to this folder.
const NETLIFY_PUBLISH_PATH = join('.', 'out_publish')

// This is where next-on-netlify will place all Netlify Functions.
// The functions key in netlify.toml should point to this folder.
const NETLIFY_FUNCTIONS_PATH = join('.', 'out_functions')

// This is where static assets, such as images, can be placed. They will be
// copied as-is to the Netlify publish folder.
const PUBLIC_PATH = join('.', 'public')

// This is the file where NextJS can be configured
const NEXT_CONFIG_PATH = join('.', 'next.config.js')

const NEXT_SRC_DIRS = getNextSrcDirs()

// This is the folder with templates for Netlify Functions
const TEMPLATES_DIR = join(__dirname, 'templates')

// This is the Netlify Function template that wraps all SSR pages
const FUNCTION_TEMPLATE_PATH = join(TEMPLATES_DIR, 'netlifyFunction.ts')

// This is the Netlify Builder template that wraps ISR pages
const BUILDER_TEMPLATE_PATH = join(TEMPLATES_DIR, 'netlifyOnDemandBuilder.ts')

// This is the file where custom redirects can be configured
const CUSTOM_REDIRECTS_PATH = join('.', '_redirects')

// This is the file where custom headers can be configured
const CUSTOM_HEADERS_PATH = join('.', '_headers')

// This is the name used for copying our imageFunction template and for
// creating the next/image redirect
const NEXT_IMAGE_FUNCTION_NAME = 'next_image'

const PREVIEW_MODE_COOKIES = ['Cookie=__prerender_bypass,__next_preview_data']

const SRC_FILES = [PUBLIC_PATH, NEXT_CONFIG_PATH, CUSTOM_REDIRECTS_PATH, CUSTOM_HEADERS_PATH, ...NEXT_SRC_DIRS]

module.exports = {
  NETLIFY_PUBLISH_PATH,
  NETLIFY_FUNCTIONS_PATH,
  PUBLIC_PATH,
  NEXT_CONFIG_PATH,
  TEMPLATES_DIR,
  FUNCTION_TEMPLATE_PATH,
  BUILDER_TEMPLATE_PATH,
  CUSTOM_REDIRECTS_PATH,
  CUSTOM_HEADERS_PATH,
  NEXT_IMAGE_FUNCTION_NAME,
  SRC_FILES,
  PREVIEW_MODE_COOKIES,
}
