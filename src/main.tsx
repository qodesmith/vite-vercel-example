import type {UserType} from '../api/users'

import React from 'react'
import ReactDOM from 'react-dom/client'
import Home from './Home'
import Users from './Users'
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
          element: <Users />,
          async loader() {
            return fetch('/api/users')
              .then(res => res.json())
              .catch(e => {
                console.log('fetch error - /api/users:\n', e)
              })
          },
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
