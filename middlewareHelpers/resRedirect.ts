import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'

export default function resRedirectMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
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
