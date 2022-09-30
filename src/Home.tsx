import reactLogo from './assets/react.svg'
import './Home.css'
import './user.css'

export default function Home() {
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://vercel.com" target="_blank">
          <img
            src="/vercel-icon-light.svg"
            className="logo"
            alt="Vercel logo"
          />
        </a>
      </div>
      <h1>Vite + React + Vercel</h1>
    </>
  )
}
