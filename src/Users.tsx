import type {LocationGenerics} from './main'

import {useMatch} from '@tanstack/react-location'

export default function Users() {
  const {data} = useMatch<LocationGenerics>()

  if (data.users) {
    return (
      <div>
        {data.users.map(({id, firstName, lastName, dob}) => {
          const date = new Date(dob.year, dob.month, dob.day)

          return (
            <div key={id} className="user">
              {firstName} {lastName}
              <div>Birthday: {date.toLocaleDateString()}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return <div>No users found</div>
}
