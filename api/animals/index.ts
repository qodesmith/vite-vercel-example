// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({animals: true})
}
