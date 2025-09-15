import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SpeechRecognitionProvider } from 'react-speech-recognition'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpeechRecognitionProvider>
      <App />
    </SpeechRecognitionProvider>
  </React.StrictMode>,
)
