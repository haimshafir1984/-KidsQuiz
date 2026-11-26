import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/shared/ErrorBoundary'
import './index.css'

const Router = window?.desktopAPI ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* כמו ב-React Router 6: ניווט בלי startTransition, כדי שהפניות אוטומטיות יתנהגו כמו קודם */}
      <Router useTransitions={false}>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
)
