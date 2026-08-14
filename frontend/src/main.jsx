import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import HomePage from './HomePage.jsx'
import AdminApp from './admin/AdminApp.jsx'

// Routing sederhana tanpa react-router:
//   /admin      -> panel admin
//   /<slug>     -> status page satu kategori itu saja
//   / (kosong)  -> halaman gabungan semua kategori yang di-toggle tampil ("/api/home")
const segment = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0]

let view
if (segment === 'admin') {
  view = <AdminApp />
} else if (segment) {
  view = <App slug={segment} />
} else {
  view = <HomePage />
}

createRoot(document.getElementById('root')).render(<StrictMode>{view}</StrictMode>)
