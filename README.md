# Notes

## Conflicting File Names

Files existing:

- `/api/users.json`
- `/api/users.ts`

Build error received:

```
Error: Two or more files have conflicting paths or names. Please make sure path segments and filenames, without their extension, are unique. The path "api/users.ts" has conflicts with "api/users.json".
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
