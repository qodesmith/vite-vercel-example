import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'

export default function resJsonMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
) {
  res.json = function resJson(jsonBody) {
    try {
      const body = JSON.stringify(jsonBody)

      res.setHeader('content-type', 'application/json; charset=utf-8')
      return res.end(body, 'utf-8')
    } catch {
      console.error('Unsupported type passed to `res.json`:', jsonBody)
      throw new Error('Unsupported type passed to `res.json`')
    }
  }

  next()
}
