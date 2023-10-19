// eslint-disable-next-line unicorn/filename-case
import type { OutgoingHttpHeaders } from 'http'
import { join } from 'node:path'
import path from 'path'

import pkg from 'fs-extra'

import { NEXT_DIR, SERVER_DIR } from '../constants.js'
// readfile not available in esm version of fs-extra
const { readFile } = pkg

export const removeFileDir = (file: string, num: number) => {
    return file.split('/').slice(num).join('/')
  }   

export const formatBlobContent = async (pathname: string, key: string, file: string) => {
    const isPage = pathname.startsWith('pages')
    const isApp = pathname.startsWith('app')
    const isFetchCache = file.startsWith('cache/fetch-cache')
    const isRoute = file.endsWith('body')

    let data: any = {}

    if( !isRoute && (isApp || isPage) ){
        data = await formatPage(isPage, file, pathname)
    }

    if( isFetchCache ){
        data = await formatFetchCache(file)
    }

    if(isRoute){
        data = await formatRoute(file, key, pathname)
    }
    return data
}

const readFileData = async (files: string, appDir: boolean, ext: string) => 
    await readFile(
    join(SERVER_DIR, (appDir ? 'app' : 'pages'), `${files}.${ext}`), 
    'utf8')

const formatPage = async (page: boolean, file: string, pathname: string) => {
    const removedDir = removeFileDir(pathname, 1).replace(path.extname(file), '')
    const pageData = page ? JSON.parse(await readFileData(removedDir, false,'json')) : await readFileData(removedDir, true, 'rsc')
    let meta: { status?: number, headers?: OutgoingHttpHeaders } = {}

    try{
        meta = JSON.parse((await readFileData(removedDir, true, 'meta')))
    }catch{}

    return {
        lastModified: Date.now(),
        value: {
        kind: 'PAGE',
        html: await readFile(join(NEXT_DIR, file), 'utf8'),
        pageData,
        headers: meta.headers,
        status: meta.status,
        }
    }
}

const formatFetchCache = async (file: string) => {
    const parsedData = JSON.parse(await readFile(join(NEXT_DIR, file), 'utf8'))
    return {
        lastModified: Date.now(), 
        value: parsedData,
    }
}

const formatRoute = async (file: string, key: string, pathname: string) => {
    const removedDir = removeFileDir(pathname, 1).replace(path.extname(file), '')
    try{
        // const data = await readFileData(removedDir, true, 'body')
        const meta = JSON.parse(await readFileData(removedDir, true, 'meta'))
        return{
            lastModified: Date.now(),
            value: {
                kind: 'ROUTE',
                // body: data,
                headers: meta.headers,
                status: meta.status,      
            }
        }
    }catch{}
}