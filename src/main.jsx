import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' 
import './index.css' // <-- ¡SI FALTA ESTO, TODO SE VE BLANCO Y NEGRO!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)