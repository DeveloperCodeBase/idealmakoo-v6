'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode,type Dispatch,type SetStateAction} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Check, X} from 'lucide-react';
import {direction,translate,type Locale} from '@/lib/i18n';
import {readStore,writeStore,makeId} from '@/lib/storage';
import {demoUsers,roles,roleLandingRoute,type FrontSession} from '@/lib/auth';
import type {RoleKey} from '@/types/domain';
import type {InquiryLine,FrontRequest} from '@/types/frontend';
import {apiRequests,dataMode} from '@/lib/api';
import type {Product} from '@/data/catalog';
import {parseFrontRequests,parseInquiryLines,inquiryIdentity} from '@/lib/frontend-state';
import {applyCustomerRequestPatch} from '@/components/account/portal-data';
import {getPublishedCatalog,getPublishedProductInventory,useCatalogProducts} from '@/lib/publications';
import {localizedPath} from '@/lib/custom-products';
import PwaRuntime from './PwaRuntime';
import LiquidEffects from './LiquidEffects';
function readAppStore<T>(key:string,initial:T):T{
 const raw=readStore<unknown>(key,initial);
 if(key==='idealmakoo.session.v1'){const session=raw as FrontSession|null;return (session&&typeof session.id==='string'&&typeof session.email==='string'&&typeof session.name==='string'&&roles.includes(session.role)?session:null) as T;}
 if(Array.isArray(initial)){if(!Array.isArray(raw))return initial;
  if(key.includes('requests'))return parseFrontRequests(raw,getPublishedProductInventory()) as T;
  if(key.includes('inquiries'))return parseInquiryLines(raw,getPublishedProductInventory()) as T;
  return raw.filter(item=>typeof item==='string') as T;
 }
 return raw as T;
}
function usePersisted<T>(key:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
 const [state,setState]=useState(initial);
 useEffect(()=>{const read=()=>setState(readAppStore(key,initial));read();const onStorage=(e:StorageEvent)=>{if(e.key===key)read();};const onLocal=(e:Event)=>{if((e as CustomEvent).detail?.key===key)read();};window.addEventListener('storage',onStorage);window.addEventListener('idealmakoo:store',onLocal);return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener('idealmakoo:store',onLocal);};},[key]); // stable per provider
 const update=useCallback<Dispatch<SetStateAction<T>>>((action)=>{const current=readAppStore(key,initial);const next=typeof action==='function'?(action as (v:T)=>T)(current):action;if(!writeStore(key,next))throw new Error('Browser storage unavailable');setState(next);},[key]);
 return[state,update];
}
interface AppContextValue{
 locale:Locale;dir:'rtl'|'ltr';theme:'dark'|'light';setTheme:(theme:'dark'|'light')=>void;toggleTheme:()=>void;t:(key:string)=>string;
 pathname:string;href:(path?:string)=>string;switchLocale:(locale:Locale)=>void;notify:(message:string)=>void;role:RoleKey;setRole:(role:string)=>void;
 session:FrontSession|null;signIn:(role:string,name?:string,email?:string)=>void;signOut:()=>void;
 catalog:Product[];
 inquiries:InquiryLine[];setInquiries:Dispatch<SetStateAction<InquiryLine[]>>;addInquiry:(productId:string,quantity?:number,options?:Partial<InquiryLine>)=>void;
 compare:string[];setCompare:Dispatch<SetStateAction<string[]>>;toggleCompare:(id:string,family?:string)=>void;saved:string[];toggleSaved:(id:string)=>void;
 requests:FrontRequest[];createRequest:(input:Omit<FrontRequest,'id'|'createdAt'>)=>Promise<FrontRequest>;updateRequest:(id:string,patch:Partial<FrontRequest>)=>boolean;
}
const Context=createContext<AppContextValue|null>(null);
export function AppProvider({children,locale}:{children:ReactNode;locale:Locale}){
 const router=useRouter();const pathname=usePathname();const [theme,setThemeState]=useState<'dark'|'light'>('dark');
 const catalog=useCatalogProducts(locale);
 const [session,setSession]=usePersisted<FrontSession|null>('idealmakoo.session.v1',null);
 const [inquiries,setInquiries]=usePersisted<InquiryLine[]>('idealmakoo.inquiries.v1',[]);
 const [compare,setCompare]=usePersisted<string[]>('idealmakoo.compare.v1',[]);
 const [saved,setSaved]=usePersisted<string[]>('idealmakoo.saved.v1',[]);
 const [requests,setRequests]=usePersisted<FrontRequest[]>('idealmakoo.requests.v1',[]);
 const [toasts,setToasts]=useState<{id:string;message:string}[]>([]);
 const t=useCallback((key:string)=>translate(locale,key),[locale]);
 const notify=useCallback((message:string)=>{const id=makeId('toast');setToasts(list=>[...list.slice(-2),{id,message}]);setTimeout(()=>setToasts(list=>list.filter(toast=>toast.id!==id)),4500);},[]);
 const setTheme=useCallback((value:'dark'|'light')=>{setThemeState(value);document.documentElement.dataset.theme=value;try{localStorage.setItem('idealmakoo.theme',value);}catch{/* Theme remains usable in restricted storage. */}},[]);
 useEffect(()=>{let stored='dark';try{stored=localStorage.getItem('idealmakoo.theme')||'dark';}catch{/* Safe default. */}setThemeState(stored==='light'?'light':'dark');document.documentElement.dataset.theme=stored==='light'?'light':'dark';},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=direction(locale);try{localStorage.setItem('idealmakoo.locale',locale);}catch{/* Language stays encoded in the URL. */}},[locale]);
 useEffect(()=>{const refresh=()=>setRequests(readAppStore<FrontRequest[]>('idealmakoo.requests.v1',[]));window.addEventListener('idealmakoo:requests',refresh);return()=>window.removeEventListener('idealmakoo:requests',refresh);},[setRequests]);
 const href=useCallback((path='')=>localizedPath(locale,path),[locale]);
 const signIn=useCallback((role:string,name?:string,email?:string)=>{const user=demoUsers.find(u=>u.role===role);if(!user)return;setSession({id:email&&!email.endsWith('.invalid')?`local-${email.toLowerCase()}`:user.id,role:user.role,name:name||user.name,email:email||user.email,demo:true});},[setSession]);
 const setRole=useCallback((value:string)=>{if(session?.role!=='superAdmin'||!roles.includes(value as RoleKey)){notify(t('accessDenied'));return;}signIn(value);router.replace(href(roleLandingRoute(value as RoleKey)));notify(t('changedRole'));},[session?.role,signIn,router,href,notify,t]);
 const signOut=useCallback(()=>{setSession(null);if('caches'in window)caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('idealmakoo-private')).map(key=>caches.delete(key))));router.push(href());},[setSession,router,href]);
 const createRequest=useCallback(async(input:Omit<FrontRequest,'id'|'createdAt'>)=>{
  const key=input.idempotencyKey||crypto.randomUUID();const existing=readAppStore<FrontRequest[]>('idealmakoo.requests.v1',[]).find(x=>x.idempotencyKey===key);if(existing)return existing;
  const record=dataMode==='api'?await apiRequests.create(input,key):{...input,id:makeId('IM-REQ'),createdAt:new Date().toISOString(),ownerId:session?.id||'guest',locale,version:1,idempotencyKey:key};
  setRequests(items=>[record,...items]);window.dispatchEvent(new CustomEvent('idealmakoo:requests'));return record;
 },[locale,session,setRequests]);
 const updateRequest=useCallback((id:string,patch:Partial<FrontRequest>)=>{let accepted=false;setRequests(items=>items.map(item=>{if(item.id!==id)return item;const next=applyCustomerRequestPatch(item,patch,session);if(!next)return item;accepted=true;return next;}));if(accepted)window.dispatchEvent(new CustomEvent('idealmakoo:requests'));else notify(t('accessDenied'));return accepted;},[setRequests,session,notify,t]);
 const addInquiry=useCallback((id:string,quantity=1,options:Partial<InquiryLine>={})=>{const product=getPublishedCatalog(locale).find(p=>p.id===id)||getPublishedProductInventory().find(p=>p.id===id);if(!product||!Number.isInteger(quantity)||quantity<1||quantity>100000){notify(t('invalidCsv'));return;}const variant=options.variantId?product.localPublication?.productRelease?.variants.find(row=>row.id===options.variantId):undefined;if(options.variantId&&!variant){notify(t('invalidCsv'));return;}const requested={...(product.family==='teeth'?{shade:variant?.shade||options.shade?.trim()||undefined,mould:variant?.mould||options.mould?.trim()||undefined}:{}),note:options.note?.slice(0,1000)};const safeOptions={...requested,...(variant?{variantId:variant.id,sku:variant.sku,unit:variant.unit}:{})};setInquiries(list=>{const found=list.find(x=>inquiryIdentity(x)===inquiryIdentity({productId:id,quantity,...safeOptions}));return found?list.map(x=>x===found?{...x,quantity:Math.min(100000,x.quantity+quantity)}:x):[...list,{productId:id,quantity,...safeOptions}];});notify(t('added'));},[locale,setInquiries,notify,t]);
 const value=useMemo<AppContextValue>(()=>({catalog,locale,dir:direction(locale),theme,setTheme,toggleTheme:()=>setTheme(theme==='dark'?'light':'dark'),t,pathname,href,switchLocale:(l)=>{const suffix=pathname.replace(/^\/(fa|en|tr|ar|ru)(?=\/|$)/,'');router.push(`/${l}${suffix}${typeof window!=='undefined'?window.location.search:''}`);},notify,session,role:session?.role||'customer',setRole,signIn,signOut,inquiries,setInquiries,addInquiry,compare,setCompare,toggleCompare:(id)=>setCompare(items=>items.includes(id)?items.filter(x=>x!==id):items.length<4?[...items,id]:items),saved,toggleSaved:(id)=>{setSaved(items=>items.includes(id)?items.filter(x=>x!==id):[...items,id]);notify(t('savedChanges'));},requests,createRequest,updateRequest}),[catalog,locale,theme,t,pathname,href,router,notify,session,setRole,signIn,signOut,inquiries,setInquiries,addInquiry,compare,setCompare,saved,setSaved,requests,createRequest,updateRequest,setTheme]);
 return <Context.Provider value={value}><PwaRuntime/><LiquidEffects/>{children}<div className="toast-stack" role="status" aria-live="polite">{toasts.map(toast=><div className="toast glass" key={toast.id}><Check size={18}/><span>{toast.message}</span><button className="icon-btn" aria-label={t('close')} onClick={()=>setToasts(items=>items.filter(x=>x.id!==toast.id))}><X size={16}/></button></div>)}</div></Context.Provider>;
}
export function useApp(){const context=useContext(Context);if(!context)throw new Error('useApp requires AppProvider');return context;}
