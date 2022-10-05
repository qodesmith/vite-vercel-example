import type {UserType} from '../api/users'

import React from 'react'
import ReactDOM from 'react-dom/client'
import Home from './Home'
import Users from './Users'
import User from './User'
import './index.css'
import {
  Link,
  Outlet,
  ReactLocation,
  Router,
  MakeGenerics,
} from '@tanstack/react-location'

const location = new ReactLocation()

export type LocationGenerics = MakeGenerics<{
  LoaderData: {
    users: UserType[]
    user: UserType
  }
  Params: {
    id: string
  }
}>

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router
      location={location}
      routes={[
        {
          path: '/',
          element: <Home />,
        },
        {
          path: '/users',
          children: [
            {
              path: '/',
              element: <Users />,
              async loader() {
                return {
                  users: await fetch('/api/users')
                    .then(res => res.json())
                    .then(({data}) => data)
                    .catch(e => {
                      console.log('fetch error - /api/users:\n', e)
                    }),
                }
              },
            },
            {
              path: ':id',
              element: <User />,
              async loader({params: {id}}) {
                return {
                  user: await fetch(`/api/users/${id}`)
                    .then(res => res.json())
                    .then(({data}) => data)
                    .catch(e => {
                      console.log(`fetch error - /api/users/${id}`, e)
                    }),
                }
              },
            },
          ],
        },
      ]}>
      <div className="app-links">
        <Link to="/">Home</Link>
        <Link to="/users">Users</Link>
      </div>
      <Outlet />
    </Router>
  </React.StrictMode>
)
