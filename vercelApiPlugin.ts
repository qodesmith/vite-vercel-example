import type {PluginOption} from 'vite'
import type {VercelRequest, VercelResponse} from '@vercel/node'

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

      // Adds a `res.send(...)` function that sends a string, JSON, or buffer.
      devServer.middlewares.use(resSendMiddleware)

      // Adds a `res.redirect('/url')` function to redirect requests.
      devServer.middlewares.use(resRedirectMiddleware)

      ////////////////////////////////////////////////////
      // Vercel-like `/api` functionality as middleware //
      ////////////////////////////////////////////////////

      const apiPath = path.resolve('./api')
      if (!fs.existsSync(apiPath)) return

      await addApiRoutesMiddleware(devServer)
    },
  }
}

type NextType = (e?: Error) => void

///////////////////////
// Request Middlware //
///////////////////////

function reqQueryMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
  const url = new URL(req.url ?? '', `http://${req?.headers.host ?? ''}`)
  const queryObj = req.query ?? {}

  url.searchParams.forEach((value, key) => {
    queryObj[key] = value
  })

  req.query = queryObj

  next()
}

function reqCookiesMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
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

function resStatusMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
  res.status = function resStatus(statusCode) {
    res.statusCode = statusCode
    return res
  }

  next()
}

function resJsonMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
  res.json = function resJson(jsonBody) {
    const body = JSON.stringify(jsonBody)

    res.setHeader('content-type', 'application/json; charset=utf-8')
    return res.end(body, 'utf-8')
  }

  next()
}

function resSendMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
  res.send = function resSend(body) {
    if (typeof body === 'string') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(body, 'utf-8')
    } else if (Buffer.isBuffer(body)) {
      res.setHeader('content-type', 'application/octet-stream')
      res.end(body)
    } else {
      try {
        JSON.stringify(body) // If it stringifies, we have valid JSON.
        res.json(body)
      } catch {
        console.error('Unsupported type passed to `res.send`:', body)
        throw new Error('Unsupported type passed to `res.send`')
      }
    }

    return res
  }

  next()
}

function resRedirectMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: NextType
) {
  res.redirect = function resRedirect(statusOrUrl, url) {
    if (typeof statusOrUrl === 'string') {
      url = statusOrUrl
      statusOrUrl = 307
    }

    if (typeof statusOrUrl !== 'number' || typeof url !== 'string') {
      throw new Error(
        `Invalid redirect arguments. Please use a single argument URL, e.g. res.redirect('/destination') or use a status code and URL, e.g. res.redirect(307, '/destination').`
      )
    }

    return res.writeHead(statusOrUrl, {Location: url}).end()
  }

  next()
}
