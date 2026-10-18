import type{ReactNode}from 'react';
import{notFound}from 'next/navigation';
import{isLocale,direction,locales}from '@/lib/i18n';
import{AppProvider}from '@/components/providers/AppProvider';
import '../globals.css';
import '../liquid-theme.css';
import '../full-width.css';
export const dynamicParams=false;
export function generateStaticParams(){return locales.map(locale=>({locale}));}
export default async function LocaleLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <html lang={locale} dir={direction(locale)} data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('idealmakoo.theme')==='light'?'light':'dark'}catch(e){}"}}/><link rel="icon" href="/media/brand/logo-transparent.png" type="image/png"/><link rel="manifest" href={`/manifests/${locale}.webmanifest`}/></head><body><AppProvider locale={locale}>{children}</AppProvider></body></html>;}
