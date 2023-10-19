// eslint-disable-next-line unicorn/filename-case
import type { OutgoingHttpHeaders } from 'http'
import { join } from 'node:path'
import path from 'path'

import pkg from 'fs-extra'

import { BUILD_DIR, SERVER_DIR } from '../constants.js'

// readfile not available in esm version of fs-extra
const { readFile } = pkg


export const removeFileDir = (file: string, num: number) => {
    return file.split('/').slice(num).join('/')
  }   


export const formatPageData = async (pathname: string, key: string, file: string) => {
    const isPage = pathname.startsWith('pages')
    const isApp = pathname.startsWith('app')
    const removedDir = removeFileDir(pathname, 1).replace(path.extname(file), '')
    // console.log({pathname, key, file, isPage, isApp, removedDir} )
    let data: any = {}
    if( isApp || isPage ){
      console.log("WIHTIN APP + PAGE CHECK")
      const getDataFile = async (files: string, appDir: boolean, ext: string) => 
        await readFile(
          join(SERVER_DIR, (appDir ? 'app' : 'pages'), `${files}.${ext}`), 
          'utf8')
  
      const pageData = isPage ? JSON.parse(await getDataFile(removedDir, false,'json')) : await getDataFile(removedDir, true, 'rsc')
      let meta: { status?: number, headers?: OutgoingHttpHeaders } = {}
  
      try{
        meta = JSON.parse((await getDataFile(key, true, 'meta')))
      }catch{}
  
      data = {
        lastModified: Date.now(),
        value: {
          kind: 'PAGE',
          html: await readFile(join(BUILD_DIR, file), 'utf8'),
          pageData,
          headers: meta.headers,
          status: meta.status,
        }
      }
    }
    return data
}