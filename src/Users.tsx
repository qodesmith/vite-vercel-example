import type {LocationGenerics} from './main'

import {useMatch, Link} from '@tanstack/react-location'

export default function Users() {
  const {data} = useMatch<LocationGenerics>()

  if (data.users) {
    return (
      <div>
        {data.users.map(({id, firstName, lastName, dob}) => {
          const date = new Date(dob.year, dob.month, dob.day)

          return (
            <Link to={id} key={id}>
              <div className="user">
                {firstName} {lastName}
                <div>Birthday: {date.toLocaleDateString()}</div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

  return <div>No users found</div>
}
