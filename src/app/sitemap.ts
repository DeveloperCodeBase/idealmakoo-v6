import type{MetadataRoute}from 'next';
import{locales}from '@/lib/i18n';
import{publicIndexablePaths}from '@/lib/routes';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://idealmakoo-glass-platform.sunsetkid7.chatgpt.site';return locales.flatMap(locale=>publicIndexablePaths.map(path=>({url:`${origin}/${locale}/${path}${path?'/':''}`,alternates:{languages:Object.fromEntries(locales.map(l=>[l,`${origin}/${l}/${path}${path?'/':''}`]))}})));}
