import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'

const DEFAULT_SLUG = import.meta.env.VITE_STATUS_PAGE_SLUG || 'public'

// Routing sederhana tanpa react-router: /admin -> panel admin, /<slug> -> status
// page dengan slug itu, / (kosong) -> status page default dari VITE_STATUS_PAGE_SLUG.
const segment = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0]
const isAdmin = segment === 'admin'
const slug = !isAdmin && segment ? segment : DEFAULT_SLUG

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <AdminApp /> : <App slug={slug} />}
  </StrictMode>,
)
