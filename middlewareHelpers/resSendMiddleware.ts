import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'

export default function resSendMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
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
