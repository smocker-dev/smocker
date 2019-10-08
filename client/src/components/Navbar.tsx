import * as React from 'react'
import { NavLink } from 'react-router-dom'
import './Navbar.scss'

export const Navbar = () => (
  <nav className='navbar'>
    <NavLink exact to='/' className='brand item'>Smocker</NavLink>
    <div className='menu'>
      <div className='start'>
        <NavLink exact to='/pages/history' className='item'>History</NavLink>
        <NavLink exact to='/pages/mocks' className='item'>Mocks</NavLink>
      </div>
    </div>
  </nav>
)
