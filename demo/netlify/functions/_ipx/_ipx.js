const { builder } = require('@netlify/functions');
const { createIPXHandler } = require('@netlify/ipx');
// Injected at build time
const { basePath, domains } = require('./imageconfig.json');
// const ipxHandler = createIPXHandler({
//     basePath,
//     domains,
// })
exports.handler = builder((event, context) => {
    console.log({ event })
    return {
        statusCode: 200,
        body: JSON.stringify(event),
    }

}
)