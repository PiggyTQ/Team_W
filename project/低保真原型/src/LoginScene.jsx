import React,{useEffect,useRef,useState} from 'react';

export default function LoginScene({secret,focus,hello,language,onGreet,label}){
  const mount=useRef(null),engine=useRef(null),latest=useRef({secret,focus,hello,language});
  const [status,setStatus]=useState('loading');
  latest.current={secret,focus,hello,language};
  useEffect(()=>{
    let disposed=false;
    import('./login-scene-engine.js').then(({createLoginScene})=>{
      if(disposed)return;
      engine.current=createLoginScene(mount.current,latest.current);
      setStatus('ready');
    }).catch(()=>{if(!disposed)setStatus('fallback');});
    return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
  },[]);
  useEffect(()=>engine.current?.update(latest.current),[secret,focus,hello,language]);
  return <button className="auth-scene" ref={mount} type="button" onClick={onGreet} aria-label={label} data-renderer={status}>
    {status!=='ready'&&<img className="auth-scene-poster" src={secret?'/login-scene-private.png':'/login-scene-poster.png'} alt=""/>}
  </button>;
}
