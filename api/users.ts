// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'
import path from 'path'
import fs from 'fs-extra'
import fsOriginal from 'fs'

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('path module:', path)
  console.log('fs-extra module:', fs)
  console.log('fs module:', fsOriginal)

  try {
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
