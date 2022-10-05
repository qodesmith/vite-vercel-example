import type {LocationGenerics} from './main'

import {useMatch} from '@tanstack/react-location'

export default function User() {
  const {data} = useMatch<LocationGenerics>()

  if (!data.user) {
    return <div>No user found</div>
  }

  return (
    <div>
      <div>
        {data.user.firstName} {data.user.lastName}
      </div>
      <div>Date String: {data.user.dateString}</div>
      <div>Locale Date: {data.user.localeDate}</div>
    </div>
  )
}
