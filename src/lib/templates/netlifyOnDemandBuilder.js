// TEMPLATE: This file will be copied to the Netlify functions directory when
//           running next-on-netlify

// Render on demand builder for the Next.js page
const { builder } = require('@netlify/functions')
const renderNextPage = require('./renderNextPage')
const functionBase = require('./functionBase')

exports.handler = builder(functionBase)
