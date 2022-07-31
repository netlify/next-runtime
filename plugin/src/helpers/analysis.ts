import fs from 'fs'
import { relative } from 'path'

import { extractExportedConstValue, UnsupportedValueError } from 'next/dist/build/analysis/extract-const-value'
import { parseModule } from 'next/dist/build/analysis/parse-module'

export interface ApiConfig {
  runtime?: 'node' | 'experimental-edge'
  background?: boolean
  schedule?: string
}

export const extractConfigFromFile = async (apiFilePath: string): Promise<ApiConfig> => {
  const fileContent = await fs.promises.readFile(apiFilePath, 'utf8')
  if (!fileContent.includes('config')) {
    return {}
  }
  const ast = await parseModule(apiFilePath, fileContent)
  try {
    return extractExportedConstValue(ast, 'config')
  } catch (error) {
    if (error instanceof UnsupportedValueError) {
      console.warn(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
    }
    return {}
  }
}
