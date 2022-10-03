import type {PluginOption} from 'vite'

import path from 'node:path'
import fs from 'node:fs'
import cookie from 'cookie'
import bodyParser from 'body-parser'
import addApiRoutesMiddleware from './addApiRoutesMiddleware'

/*
  Middleware supported by Connect - https://github.com/senchalabs/connect#middleware
*/
export default function vercelApiPlugin(): PluginOption {
  return {
    name: 'vite-plugin-vercel-api',
    async configureServer(devServer) {
      /*
        Adds a `req.body` object populated from fetch POST requests containing a
        stringified body.
        Header - {'Content-Type': 'application/json'}
      */
      devServer.middlewares.use(bodyParser.json())

      /*
        Adds a `req.body` object populated from form POST requests which encode
        the form data in the url.
        Header - {'Content-Type': 'application/x-www-form-urlencoded'}.
      */
      devServer.middlewares.use(bodyParser.urlencoded({extended: false}))

      // Adds a `req.query` object populated from the URL's query params
      devServer.middlewares.use(reqQueryMiddleware)

      // Adds a `req.cookies` object populated from the header.
      devServer.middlewares.use(reqCookiesMiddleware)

      // Adds a `res.status(...)` function that sets the HTTP status code.
      devServer.middlewares.use(resStatusMiddleware)

      // Adds a `res.json({...})` function that sends a JSON response.
      devServer.middlewares.use(resJsonMiddleware)

      // Adds a `res.redirect('/url')` function to redirect requests.
      devServer.middlewares.use(resRedirectMiddleware)

      ////////////////////////////////////////////////////
      // Vercel-like `/api` functionality as middleware //
      ////////////////////////////////////////////////////

      const apiPath = path.resolve('./api')
      if (!fs.existsSync(apiPath)) return

      const results = await addApiRoutesMiddleware(devServer)
      console.log('RESULTS:')
      console.dir(results, {depth: null})
      process.exit(1)
    },
  }
}

///////////////////////
// Request Middlware //
///////////////////////

function reqQueryMiddleware(req, res, next) {
  const url = new URL(req.url ?? '', `http://${req?.headers.host ?? ''}`)
  const queryObj = req.query ?? {}

  url.searchParams.forEach((value, key) => {
    queryObj[key] = value
  })

  req.query = queryObj

  next()
}

function reqCookiesMiddleware(req, res, next) {
  const header = req.headers.cookie

  if (!header) {
    req.cookies = {}
    return next()
  }

  req.cookies = cookie.parse(Array.isArray(header) ? header.join(';') : header)
  next()
}

/////////////////////////
// Response Middleware //
/////////////////////////

function resStatusMiddleware(req, res, next) {
  res.status = function resStatus(statusCode) {
    res.statusCode = statusCode
    return res
  }

  next()
}

function resJsonMiddleware(req, res, next) {
  res.json = function jsonMiddleware(jsonBody) {
    const body = JSON.stringify(jsonBody)

    // content-type
    if (!res.getHeader('content-type')) {
      res.setHeader('content-type', 'application/json; charset=utf-8')
    }
    return res.end(body, 'utf-8')
  }

  next()
}

function resRedirectMiddleware(req, res, next) {
  res.redirect = (statusOrUrl, url) => {
    if (typeof statusOrUrl === 'string') {
      url = statusOrUrl
      statusOrUrl = 307
    }
    if (typeof statusOrUrl !== 'number' || typeof url !== 'string') {
      throw new Error(
        `Invalid redirect arguments. Please use a single argument URL, e.g. res.redirect('/destination') or use a status code and URL, e.g. res.redirect(307, '/destination').`
      )
    }
    res.writeHead(statusOrUrl, {Location: url}).end()
    return res
  }

  next()
}
