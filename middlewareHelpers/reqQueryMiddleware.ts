import type {VercelRequest, VercelResponse} from '@vercel/node'
import type {Connect} from 'vite/dist/node'

export default function reqQueryMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: Connect.NextFunction
) {
  const url = new URL(req.url ?? '', `http://${req.headers.host ?? ''}`)
  const queryObj = req.query ?? {}

  url.searchParams.forEach((value, key) => {
    queryObj[key] = value
  })

  req.query = queryObj

  next()
}
