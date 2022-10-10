import type {
  VercelRequest,
  VercelResponse,
  VercelApiHandler,
} from '@vercel/node'
import type {ViteDevServer} from 'vite'
import type {BuildResult} from 'esbuild'
import path from 'node:path'
import fs from 'node:fs'
import esbuild from 'esbuild'

type ApiDataType = Record<string, ApiRouteDataType>

type ApiRouteDataType = Record<
  RouteType,
  Pick<RouteHandlerDataType, 'handler' | 'param' | 'filePath'>
>

type RouteHandlerDataType = {
  handler: VercelApiHandler
  type: RouteType
  route: string
  param: string | undefined
  filePath: string
}

type BuildResultsType = {
  esbuildResults: BuildResult
  originalFilePaths: string[]
}

type RouteType =
  | 'explicit' /* cars.ts */
  | 'dynamic' /* [cardId].ts */
  | 'catchAll' /* [...slug].ts */
  | 'catchAllOptional' /* [[...slug]].ts */

export default async function addApiRoutesMiddleware(devServer: ViteDevServer) {
  const apiPath = path.resolve(process.cwd(), 'api')
  if (!fs.existsSync(apiPath)) return

  const buildResults = await buildApiFiles(apiPath)
  const routeHandlerData = await createRouteHandlerData(buildResults)
  console.dir(buildResults, {depth: null})
  addApiRoutes(routeHandlerData, devServer)
}

async function buildApiFiles(basePath): Promise<BuildResultsType> {
  const entryPoints = getEntryPoints(basePath)
  const originalFilePaths = entryPoints.map(absolutePath => {
    // i.e. 'Users/qodesmith/some/path/api/cars' => '/api/cars'
    return absolutePath.slice(absolutePath.indexOf('/api'))
  })

  return esbuild
    .build({
      // Have esbuild process many files at once.
      entryPoints,

      // Avoid bundling anything from node_modules. They're accessible in dev.
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
        Vite + Vercel needs require() for node_modules - https://bit.ly/3EiphjJ
      */
      plugins: [fileUrlPlugin, requireToEsm],

      /*
        No output directory will be written to because of `write:false`.
        This is still used to appropriately construct require() urls.
      */
      outdir: '/api',
    })
    .then(esbuildResults => {
      return {esbuildResults, originalFilePaths}
    })
}

async function createRouteHandlerData(buildResults: Awaited<BuildResultsType>) {
  const {esbuildResults, originalFilePaths} = buildResults
  const {outputFiles = []} = esbuildResults

  const promises: Promise<RouteHandlerDataType | null>[] = outputFiles.map(
    (file, i) => {
      const {text} = file
      const filePath = originalFilePaths[i]
      const {dir, name, base: fileName} = path.parse(filePath)

      /*
        https://2ality.com/2019/10/eval-via-import.html
        eval() doesn't support import and export statements, but dynamic
        import() does, using a `data:` URI.
      */
      const encodedJs = encodeURIComponent(text)
      const dataUri = `data:text/javascript;charset=utf-8,${encodedJs}`

      return import(dataUri)
        .then(mod => {
          // Only process modules with a default export.
          if (typeof mod !== 'object' || typeof mod.default !== 'function') {
            return null
          }

          const type = getType(name)

          // Ensure /api/cars.js => {route: /api/cars, ...}
          const route =
            type === 'explicit' && name !== 'index' ? `${dir}/${name}` : dir

          return {
            handler: mod.default as VercelApiHandler,
            type,
            route,
            param: getParam(name, type),
            filePath,
          }
        })
        .catch(e => {
          console.error(`Unable to dynamically import ${fileName}:`, e)
          return null
        })
    }
  )

  const results = await Promise.all(promises)

  /*
    When we have 2 files that conflict:
      * /api/cars/index.ts
      * /api/cars.ts
  
    When the 2nd file is reached, it overwrites the 1st one. Vercel also
    prioritizes cars.ts over index.ts, presumably because of a loop like below.
  */
  return results.reduce((acc, obj) => {
    if (obj === null) return acc

    const {route, type, ...rest} = obj
    if (!acc[route]) acc[route] = {} as ApiRouteDataType

    acc[route][type] = rest

    return acc
  }, {} as ApiDataType)
}

type DevRequestType = VercelRequest & {originalUrl: string}

function addApiRoutes(apiData: ApiDataType, devServer: ViteDevServer) {
  Object.entries(apiData)
    .sort(([a], [b]) => b.length - a.length) // Longest length (more specific) routes 1st.
    .forEach(([route, data]) => {
      devServer.middlewares.use(
        route,
        (req: DevRequestType, res: VercelResponse) => {
          /*
          new URL(request.url, `http://${request.getHeaders().host}`);
          When request.url is '/status?name=ryan' and
          request.getHeaders().host is 'localhost:3000':

          $ node
          > new URL(request.url, `http://${request.getHeaders().host}`)
          URL {
            href: 'http://localhost:3000/status?name=ryan',
            origin: 'http://localhost:3000',
            protocol: 'http:',
            username: '',
            password: '',
            host: 'localhost:3000',
            hostname: 'localhost',
            port: '3000',
            pathname: '/status',
            search: '?name=ryan',
            searchParams: URLSearchParams { 'name' => 'ryan' },
            hash: ''
          }
        */
          const url = new URL(
            req.originalUrl,
            `http://${req.headers.host ?? ''}`
          )
          const pathSegments = url.pathname
            .replace(route, '')
            .split('/')
            .filter(Boolean)
          const routeData = (() => {
            switch (true) {
              case pathSegments.length === 0:
                return data.explicit ?? data.catchAll ?? data.catchAllOptional
              case pathSegments.length === 1:
                return data.dynamic ?? data.catchAll ?? data.catchAllOptional
              case pathSegments.length > 1:
                return data.catchAll ?? data.catchAllOptional
              default:
                return undefined
            }
          })()

          // We should never hit this error...
          if (!routeData) {
            throw new Error(
              `Could not find middleware handler for ${req.originalUrl}`
            )
          }

          const {handler, param, filePath} = routeData

          // Explicit.
          if (pathSegments.length === 0) {
            return handler(req, res)
          }

          // We should never hit this error...
          if (!param) {
            throw new Error(`Dynamic route param not found for ${filePath}`)
          }

          // Dynamic.
          if (pathSegments.length === 1) {
            const queryValue = pathSegments[0]

            // req.query => { [param]: queryValue, ... }
            req.query[param] = queryValue
          }

          // Catch all routes.
          if (pathSegments.length > 1) {
            // req.query => { [param]: [val1, val2, ...], ... }
            req.query[param] = pathSegments
          }

          handler(req, res)
        }
      )
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
          absolute `file://...` path for resolution. This will be used to
          resolve the file during development.
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

function isValidFile(name: string) {
  return name.endsWith('.ts') || name.endsWith('.js')
}

function getType(name: string): RouteType {
  if (name.startsWith('[[...') && name.endsWith(']]')) return 'catchAllOptional'
  if (name.startsWith('[...') && name.endsWith(']')) return 'catchAll'
  if (name.startsWith('[') && name.endsWith(']')) return 'dynamic'

  return 'explicit'
}

function getParam(name: string, type: RouteType) {
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
      throw new Error(`Unrecognized route type - ${type}`)
  }
}
