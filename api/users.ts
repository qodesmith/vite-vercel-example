// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'
const path = require('path')
const fs = require('fs-extra')
const {fakeAdd, fakeHello} = require('./helpers')

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('2 + 3:', fakeAdd(2, 3))
    console.log('Hello:', fakeHello('world'))

    // https://vercel.com/guides/how-can-i-use-files-in-serverless-functions
    const pathFromProjectRootToFile = '/api/usersData.json'
    const usersDataFilePath = path.join(
      process.cwd(),
      pathFromProjectRootToFile
    )
    const usersData = fs.readJSONSync(usersDataFilePath)
    res.json({users: usersData})
  } catch (e) {
    res.json({error: errorToObject(e as Error)})
  }
}

function errorToObject(err?: Error): Record<string, string> | null {
  if (!err || !(err instanceof Error)) return null

  const obj: Record<string, string> = {}

  Object.getOwnPropertyNames(err).forEach(prop => {
    const value = err[prop as keyof Error]

    if (typeof value !== 'string') return

    obj[prop] = value
  })

  return obj
}
