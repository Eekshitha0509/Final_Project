import React from 'react'
import Header from './components/Header'
import LandingPage from './pages/LandingPage'
import { BrowserRouter as Router , Routes , Route } from 'react-router-dom'
import Profile from './pages/Profile'
import Homepage from './pages/Homepage'
function App() {
  return (
    <>
    <Header />
    <Router>
      <Routes>
        <Route path = '/' element = {<LandingPage/>}></Route>
        <Route path = '/admin' element = {<LandingPage />}></Route>
        <Route path = '/profile' element = {<Profile />}></Route>
        <Route path= '/homepage' element={<Homepage />}></Route>
      </Routes>
    </Router>
    </>
  )
}

export default App