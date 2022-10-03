import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {ViteDevServer} from 'vite'

import path from 'path'
import fs from 'fs-extra'
import esbuild from 'esbuild'

type RouteHandlerDataType = {
  handler: HandlerType
  type: FileType
  route: string
  param: string | undefined
}

type HandlerType = (req: VercelRequest, res: VercelResponse) => void

type FileType =
  | 'explicit' /* cars.ts */
  | 'dynamic' /* [cardId].ts */
  | 'catchAll' /* [...slug].ts */
  | 'catchAllOptional' /* [[...slug]].ts */

export default async function addApiRoutesMiddleware(devServer: ViteDevServer) {
  const apiPath = path.resolve('./api')
  if (!fs.existsSync(apiPath)) return

  const buildResults = await buildApiFiles(apiPath)
  const routeHandlers = await createRouteHandlerData(buildResults)

  return routeHandlers
}

async function buildApiFiles(basePath) {
  return esbuild.build({
    // Have esbuild process many files at once.
    entryPoints: getEntryPoints(basePath),

    // Avoid bundling anything from node_modules.
    external: ['./node_modules/*'],

    /*
        Bundle local dependencies (node_modules is ignored above). Anything from
        node_modules can be imported and used at runtime.
      */
    bundle: true,

    // After all, this is for mimicing Vercel's /api functionality in Node.
    platform: 'node',

    // Stick with esm as opposed to CommonJS.
    format: 'esm',

    // Don't write the results to any file, keep it in memory for later use.
    write: false,

    // Helpful while developing and debugging. Doesn't affect the output.
    metafile: true,

    /*
      Ensure non-native node_modules have an absolute file://... url.
      Transform the few require()'s that we have to esm.
    */
    plugins: [fileUrlPlugin, requireToEsm],

    /*
        No output directory will be written to because of `write:false`.
        This is still used to appropriately construct `require()` urls.
      */
    outdir: '/api',
  })
}

const fileUrlPlugin: esbuild.Plugin = {
  name: 'fileUrlPlugin',
  setup(build) {
    // Use a "match-all" regex so we can filter on other properties later.
    build.onResolve({filter: /.*/}, async args => {
      const {kind, namespace, resolveDir, path: importPath} = args

      /*
        For non-native node_modules, we're interested in transforming the import
        path to an absolute `file://...` path.
      */
      if (kind === 'import-statement' && namespace === 'file') {
        /*
          https://esbuild.github.io/plugins/#resolve
          Use esbuild's built-in behavior to search for a package in the user's
          node_modules directory.
        */
        const result = await build.resolve(importPath, {resolveDir})
        const isNativeNodeModule = result.path === importPath

        // Let esbuild continue the process undisturbed.
        if (!result.external || isNativeNodeModule) return undefined

        /*
          Explicitly mark non-native node_modules as external and give it an
          absolute `file://...` path for resolution.
        */
        return {
          external: true,
          path: `file://${result.path}`,
        }
      }

      return undefined
    })
  },
}

const requireToEsm: esbuild.Plugin = {
  name: 'requireToEsm',
  setup(build) {
    // require() => esm
    build.onLoad({filter: /.*/}, async args => {
      /*
        https://esbuild.github.io/plugins/#on-resolve
        Many callbacks may be running concurrently. In JavaScript, if your
        callback does expensive work that can run on another thread such as
        fs.existsSync(), you should make the callback async and use await
        (in this case with fs.promises.exists()) to allow other code to run in
        the meantime.
      */
      const fileContents = await fs.promises.readFile(args.path, {
        encoding: 'utf8',
      })

      if (fileContents.includes(' = require(')) {
        // https://ar.al/2021/01/27/commonjs-to-esm-in-node.js - require => esm
        const regex = /const (.*?)\s*?=\s*?require\(('.*?')\)/g
        const newContents = fileContents.replace(regex, 'import $1 from $2')
        const results = esbuild.transformSync(newContents, {loader: 'ts'})

        return {contents: results.code}
      }

      return undefined
    })
  },
}

function getEntryPoints(basePath: string) {
  return fs
    .readdirSync(basePath, {withFileTypes: true})
    .reduce((acc, dirent) => {
      const {name} = dirent

      if (dirent.isFile() && isValidFile(name)) {
        const absoluteFilePath = `${basePath}/${name}`
        acc.push(absoluteFilePath)
      } else if (dirent.isDirectory()) {
        const entryPoints = getEntryPoints(`${basePath}/${name}`)
        acc.push(...entryPoints)
      }

      return acc
    }, [] as string[])
}

async function createRouteHandlerData(
  buildResults: Awaited<ReturnType<typeof esbuild.build>>
) {
  const {outputFiles = []} = buildResults

  const promises = outputFiles.map(file => {
    const {path: filePath, text} = file
    const fileName = filePath.split('/').pop() ?? ''

    /*
      https://2ality.com/2019/10/eval-via-import.html
      eval() doesn't support import and export statements, but dynamic import()
      does, using a `data:` URI.
    */
    const encodedJs = encodeURIComponent(text)
    const dataUri = `data:text/javascript;charset=utf-8,${encodedJs}`

    return import(dataUri)
      .then(mod => {
        if (typeof mod !== 'object' || typeof mod.default !== 'function') {
          return null
        }

        const {dir: route, name} = path.parse(filePath)
        const type = getType(name)

        return {
          handler: mod.default as HandlerType,
          type,
          route,
          param: getParam(name, type),
        }
      })
      .catch(e => {
        console.error(`Unable to dynamically import ${fileName}:`, e)
        return null
      })
  })

  const results = await Promise.all(promises)

  return results.reduce((acc, obj) => {
    if (obj === null) return acc

    const {route, ...rest} = obj
    if (!acc[route]) acc[route] = []

    acc[route].push(rest)

    return acc
  }, {} as Record<string, Omit<RouteHandlerDataType, 'route'>[]>)
}

function isValidFile(name: string) {
  return name.endsWith('.ts') || name.endsWith('.js')
}

function getType(name: string): FileType {
  if (name.startsWith('[[...') && name.endsWith(']]')) return 'catchAllOptional'
  if (name.startsWith('[...') && name.endsWith(']')) return 'catchAll'
  if (name.startsWith('[') && name.endsWith(']')) return 'dynamic'

  return 'explicit'
}

function getParam(name: string, type: FileType) {
  switch (type) {
    case 'explicit':
      return // cars
    case 'dynamic':
      return name.slice(1, -1) // [carId]
    case 'catchAll':
      return name.slice(4, -1) // [...slug]
    case 'catchAllOptional':
      return name.slice(5, -2) // [[...slug]]
    default:
      throw new Error('Unrecognized FileType.')
  }
}
