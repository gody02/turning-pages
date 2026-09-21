import { useEffect, useState } from 'react';
import { App } from './App';
import { TownApp } from './TownApp';
import './town.css';
export function GameRoot(){
  const [mode,setMode]=useState(()=>window.location.hash==='#town'?'town':'life');
  useEffect(()=>{const onHash=()=>setMode(window.location.hash==='#town'?'town':'life');window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
  return <><nav className="mode-nav" aria-label="Game mode"><span>TURNING PAGES</span><a href="#life" aria-current={mode==='life'?'page':undefined}>Your life</a><a href="#town" aria-current={mode==='town'?'page':undefined}>Town politics <small>NEW</small></a></nav>{mode==='town'?<TownApp/>:<App/>}</>;
}
