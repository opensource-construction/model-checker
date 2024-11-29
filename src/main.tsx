import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@components'
import { BrowserRouter } from 'react-router-dom'
import { ValidationContextProvider } from '@context'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ValidationContextProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ValidationContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
