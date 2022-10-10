import reqQueryMiddleware from './middlewareHelpers/reqQueryMiddleware'
import reqCookiesMiddleware from './middlewareHelpers/reqCookiesMiddleware'
import resStatusMiddleware from './middlewareHelpers/resStatusMiddleware'
import resJsonMiddleware from './middlewareHelpers/resJsonMiddleware'
import resSendMiddleware from './middlewareHelpers/resSendMiddleware'
import resRedirectMiddleware from './middlewareHelpers/resRedirect'
import addApiRoutesMiddleware from './addApiRoutesMiddleware'
import type {PluginOption} from 'vite'
import reqBodyMiddleware from './middlewareHelpers/reqBodyMiddleware'

/**
 *
 * Mimics Vercel's /api functionality locally, making Vite compatible with
 * Vercel's serverless functions. No need to be online or run `vercel dev`. You
 * can simply run `npm run dev` to start Vite locally and use the /api directory
 * the way you would with Vercel.
 *
 * This plugin provides 2 main features:
 * 1. Traverses the /api directory at the root of your project and parses files
 *    the same way Vercel does in production.
 * 2. Adds a number of middleware features found on the request and response
 *    objects in Vercel's serverless functions.
 *
 * See https://nextjs.org/docs/api-routes/dynamic-api-routes for how the logic
 * works for the /api directory, its files, and its folder structure.
 *
 * See https://vercel.com/docs/runtimes#official-runtimes/node-js/node-js-request-and-response-objects
 * for what middleware Vercel exposes on the request and response objects in
 * serverless functions.
 *
 */
export default function vercelApiPlugin(): PluginOption {
  return {
    name: 'vite-plugin-vercel-api',
    async configureServer(devServer) {
      ////////////////////////////////////
      // Vercel-link middleware helpers //
      ////////////////////////////////////

      /*
        Adds a `req.body` object populated from fetch POST requests which
        contain a body.
      */
      reqBodyMiddleware(devServer)

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

      await addApiRoutesMiddleware(devServer)
    },
  }
}
