import reactLogo from './assets/react.svg'
import './App.css'
import './user.css'
import {useEffect, useState} from 'react'
import type {UserType} from '../api/users'

function App() {
  const [users, setUsers] = useState<UserType[]>([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        if (data.users) setUsers(data.users)
      })
      .catch(error => {
        console.error('fetch error:', error)
      })
  }, [])

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        {error ? (
          <pre>
            <code>{JSON.stringify(error, null, 2)}</code>
          </pre>
        ) : (
          users.map(({id, firstName, lastName, dob}) => {
            const date = new Date(dob.year, dob.month, dob.day)

            return (
              <div key={id} className="user">
                {firstName} {lastName}
                <div>Birthday: {date.toLocaleDateString()}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default App
