import React,{createContext,useCallback,useContext,useLayoutEffect,useMemo,useState} from 'react';
const Context=createContext(null);
export function PageGuidanceProvider({routeKey,children}){
 const [entry,setEntry]=useState(null),register=useCallback(value=>setEntry(old=>old?.routeKey===routeKey&&old.title===value.title&&old.description===value.description?old:{...value,routeKey}),[routeKey]);
 const value=useMemo(()=>({introduction:entry?.routeKey===routeKey?entry:null,register}),[entry,routeKey,register]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const usePageGuidance=()=>useContext(Context)?.introduction;
export function PageIntroduction({title,description,persistent=false}){const context=useContext(Context),register=context?.register;useLayoutEffect(()=>{if(register)register({title,description:persistent?'':description});},[register,title,description,persistent]);return !context||persistent?<p>{description}</p>:null;}
