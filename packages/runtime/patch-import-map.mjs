import { readFile, writeFile } from "fs/promises"

const importMapPath = new URL("src/templates/vendor/import_map.json", import.meta.url)
const importMap = JSON.parse(await readFile(importMapPath, "utf8"))

const newMap = {
  scopes: {
    "../": importMap.imports,
    ...importMap.scopes
  }
}

await writeFile(importMapPath, JSON.stringify(newMap, null, 2))
