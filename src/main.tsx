import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@components'
import { BrowserRouter } from 'react-router-dom'
import { ValidationContextProvider } from '@context'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ValidationContextProvider>
        <App />
      </ValidationContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
