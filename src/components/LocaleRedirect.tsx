'use client';
import{useEffect}from 'react';
import{useRouter}from 'next/navigation';
import{isLocale}from '@/lib/i18n';
export default function LocaleRedirect({path=''}:{path?:string}){const router=useRouter();useEffect(()=>{let saved='fa';try{saved=localStorage.getItem('idealmakoo.locale')||'fa';}catch{/* The default locale remains navigable without storage. */}router.replace(`/${isLocale(saved)?saved:'fa'}/${path}${location.search}`);},[path,router]);return <div className="site-loading"><span className="loading-orbit"/><noscript><a href={'/fa/'+path}>ایده‌آل ماکو — ادامه</a></noscript></div>;}
