# Notes

## Conflicting File Names

Files existing:

- `/api/users.json`
- `/api/users.ts`

Build error received:

```
Error: Two or more files have conflicting paths or names. Please make sure path segments and filenames, without their extension, are unique. The path "api/users.ts" has conflicts with "api/users.json".
```

## Same File & Folder Name

File - `/api/users.ts`
File in folder - `/api/users/[id].ts`

According to the [Vercel docs](https://vercel.com/docs/concepts/functions/serverless-functions#path-segments):

> When using path segments, the value passed is made available to the `req.query` object under the key used for the file name.

Vercel is able to hit both files accordingly. There are no conflicts:

```javascript
fetch('/api/users')
fetch('/api/users/1')
```

## Node Version

As of 9/23/2022, Vercel is using Node 16.x. Using the `engines` field in `package.json` to specify a higher version does not work:

```json
"engines": {
  "node": ">=18.6.0"
}
```

The error thrown in the build:

```
Warning: Due to "engines": { "node": ">=18.6.0" } in your `package.json` file, the Node.js Version defined in your Project Settings ("16.x") will not apply. Learn More: http://vercel.link/node-version

Error: Found invalid Node.js Version: ">=18.6.0". Please set "engines": { "node": "16.x" } in your `package.json` file to use Node.js 16.

Learn More: http://vercel.link/node-version
```

Not sure if this means we can't import native Node modules with the `node:` prefix.

## Accesing `usersData.json`

Trying to fetch this file failed with a `404`:

- `fetch('/api/usersData.json').then(res => res.text()).then(console.log)`
- `fetch('/api/usersData').then(res => res.text()).then(console.log)`

## Serverless Functions - `import` vs `require`

When deploying a Vite app on Vercel and utilizing the `/api` directory for a back end with Serverless Functions, _Node_ modules need to be imported via `require`, not `import`. The `import` syntax works for types and _local_ modules. See [this answer](https://github.com/vercel/community/discussions/893#discussioncomment-3756470) (and conversation) in Vercel's community discussions.

## Non-Endpoint Files In `/api`

File: `/api/helpers.ts`

Code used:

```javascript
fetch('/api/helpers')
  .then(res => res.text())
  .then(console.log)
  .catch(e => console.log('catch:', e))
```

After a few seconds, this resulted in a [502](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/502) error:

```
GET https://vite-vercel-example-sqn5.vercel.app/api/helpers 502
An error occurred with this application.

NO_RESPONSE_FROM_FUNCTION
```

Purposely trying to access a file that doesn't exist (`/api/helperz` - "z") correctly results in a 404.

## Query Params

When using dynamic routes, the dynamic information is populated on `req.query`. I had wondered if this would collide with regular url query params. _TL;DR - Vercel's dynamic route information takes precedence._

Route file - `/api/users/[id].ts`

- This will populate `req.query.id`

Example URL's and the resulting `req.query`:
| URL | req.query |
|--------------------------------|-----------------------------|
| /api/users/4 | `{id: '4'}` |
| /api/users/4?hello=world | `{id: '4', hello: 'world'}` |
| /api/users/4?hello=world&id=55 | `{id: '4', hello: 'world'}` |
