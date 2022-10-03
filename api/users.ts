// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'

export type UserType = {
  id: number
  firstName: string
  lastName: string
  dob: {
    month: number
    day: number
    year: number
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({users: [], message: 'this file is found at /api/users.ts'})
}
