import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'
import cookie from 'cookie'

export default function reqCookiesMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
) {
  const header = req.headers.cookie

  if (!header) {
    req.cookies = {}
    return next()
  }

  req.cookies = cookie.parse(Array.isArray(header) ? header.join(';') : header)

  next()
}
