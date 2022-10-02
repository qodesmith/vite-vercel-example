// https://vercel.com/docs/runtimes#official-runtimes/node-js/using-type-script-with-the-node-js-runtime
import type {VercelRequest, VercelResponse} from '@vercel/node'

// `import` syntax works for local modules.
import {
  fakeAdd,
  fakeHello,
  createLocaleDate,
  createDateString,
  errorToObject,
} from '../helpers'

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

/*
  https://github.com/vercel/community/discussions/893#discussioncomment-3756470
  The `require` syntax is needed to import Node modules.
*/
import {createRequire} from 'module'
if (process.env.VERCEL_ENV !== 'production') {
  global.require = createRequire(import.meta.url)
}
const path = require('path')
const fs = require('fs-extra')

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('2 + 3:', fakeAdd(2, 3))
    console.log('Hello:', fakeHello('world'))

    // https://vercel.com/guides/how-can-i-use-files-in-serverless-functions
    const pathFromProjectRootToFile = '/api/users/usersData.json'
    const usersDataFilePath = path.join(
      process.cwd(),
      pathFromProjectRootToFile
    )
    const usersData: UserType[] = fs.readJSONSync(usersDataFilePath)
    const usersDataWithDates = usersData.map(({dob, ...rest}) => ({
      ...rest,
      dob,
      localeDate: createLocaleDate(dob),
      dateString: createDateString(dob),
    }))

    res.json({users: usersDataWithDates})
  } catch (e) {
    res.json({error: errorToObject(e as Error)})
  }
}
