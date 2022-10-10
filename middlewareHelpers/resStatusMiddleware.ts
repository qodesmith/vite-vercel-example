import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'

export default function resStatusMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
) {
  res.status = function resStatus(statusCode) {
    res.statusCode = statusCode
    return res
  }

  next()
}
