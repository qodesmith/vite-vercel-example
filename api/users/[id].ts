// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {errorToObject, createLocaleDate, createDateString} from '../helpers'

/*
  https://github.com/vercel/community/discussions/893#discussioncomment-3756470
  The `require` syntax is needed to import Node modules.
*/
const path = require('path')
const fs = require('fs-extra')

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // https://vercel.com/guides/how-can-i-use-files-in-serverless-functions
    const pathFromProjectRootToFile = '/api/usersData.json'
    const usersDataFilePath = path.join(
      process.cwd(),
      pathFromProjectRootToFile
    )
    const usersData = fs.readJSONSync(usersDataFilePath)
    const user = usersData.find(user => user.id.toString() === req.query.id)

    if (user) {
      user.localeDate = createLocaleDate(user.dob)
      user.dateString = createDateString(user.dob)
    }

    res.json(user)
  } catch (e) {
    res.json({error: errorToObject(e as Error)})
  }
}
