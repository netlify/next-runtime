import fs from 'fs-extra'

const blobContent = await fs.readFile('src/templates/blob.js', 'utf8')
const blobContentWithHacks = blobContent.replace(
  `const encodedKey = encodeURIComponent(key);`,
  `const encodedKey = encodeURIComponent(key);\n    console.log({ key, encodedKey });`,
)

await fs.writeFile('src/blob.js', blobContentWithHacks)
console.log(`added logging`)
