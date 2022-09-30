import type {LocationGenerics} from './main'

import {useMatch} from '@tanstack/react-location'

export default function Users() {
  const {data} = useMatch<LocationGenerics>()
  console.log(data)

  return <h1>Users!</h1>
}
