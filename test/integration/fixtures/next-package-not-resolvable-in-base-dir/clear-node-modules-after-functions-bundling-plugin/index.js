const fs = require(`fs`)
const path = require(`path`)

module.exports = {
  onPostBuild: async () => {
    const movedDir = path.join(process.cwd(), `next-app`, `node_modules2`)
    try {
      fs.unlinkSync(movedDir)
    } catch {}
    fs.renameSync(path.join(process.cwd(), `next-app`, `node_modules`), movedDir)
  },
}
