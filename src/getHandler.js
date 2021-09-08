const { Server } = require("http");
const { Bridge } = require("@vercel/node/dist/bridge");
// This path is specific to next@canary. In a live version we'd resolve various versions of next
const NextServer = require("next/dist/server/next-server").default;
function makeHandler() {
  // We return a function and then call `toString()` on it to serialise it as the launcher function
  return (conf) => {
    const nextServer = new NextServer({
      conf,
      dir: ".",
      customServer: false,
    });
    const requestHandler = nextServer.getRequestHandler();
    const server = new Server(async (req, res) => {
      try {
        await requestHandler(req, res);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });
    const bridge = new Bridge(server);
    bridge.listen();

    return async (event, context) => {
      let result = await bridge.launcher(event, context);
      /** @type import("@netlify/functions").HandlerResponse */
      return {
        ...result,
        isBase64Encoded: result.encoding === "base64",
      };
    };
  };
}

exports.getHandler = async function (isODB = false) {
  return `
const { Server } = require("http");
// We copy the file here rather than requiring from the node module
const { Bridge } = require("./bridge");
// Specific to this Next version
const NextServer = require("next/dist/server/next-server").default;
const { builder } = require("@netlify/functions");
// We shouldn't hard-code ".next" as the path, and should extract it from the next config
const { config }  = require(process.cwd() + "/.next/required-server-files.json")

exports.handler = ${
   isODB
      ? `builder((${makeHandler().toString()})(config));`
      : `(${makeHandler().toString()})(config);`
  }
`;
};
