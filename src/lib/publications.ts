'use client';
import {useMemo,useSyncExternalStore} from 'react';
import {articles,products,type Article,type ContentLocale,type Localized,type Product} from '@/data/catalog';
import {parseFormSchema,type PublicFormSchema} from '@/lib/form-schema';
import {parseProductRelease,type ProductRelease} from '@/lib/product-release';
import {productFromRelease} from '@/lib/product-release-catalog';
import {parseCustomProduct,type CustomProduct} from '@/lib/custom-products';
import type {PageBlockOptions} from '@/data/workspace-seed';
import { isCustomProductId } from '@/lib/custom-products';

export interface PublishedBlock {id:string;type:string;title:string;body:string;mediaUrl?:string;link?:string;formId?:string;formSchema?:PublicFormSchema;hidden?:boolean;options?:PageBlockOptions;}
export interface PublishedContent {id:string;slug:string;kind:string;locale:ContentLocale;title:string;summary:string;body:string;blocks:PublishedBlock[];publishedAt:string;version:number;eventStart?:string;eventEnd?:string;location?:string;productRelease?:ProductRelease;customProduct?:CustomProduct;}
export type PublishedProduct=Product&{origin?:'editor';localPublication?:PublishedContent;sourceProduct?:Product;sourceName?:Localized;sourceDescription?:Localized};
export type PublishedArticle=Article&{localPublication?:PublishedContent;sourceTitle?:Localized;sourceExcerpt?:Localized};
const key='idealmakoo.publications.v1';
const empty:PublishedContent[]=[];
const validLocales:ContentLocale[]=['fa','en','tr','ar','ru'];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown,fallback='')=>typeof v==='string'?v:fallback;
const productKinds=['product','products'];
function productMatchesPublication(product:Product,publication:{id:string;slug:string}){const slug=publication.slug.replace(/^\/+|\/+$/g,'');return publication.id===product.id||slug===product.slug||productKinds.some(kind=>slug===`${kind}/${product.slug}`);}
/** Whitelist editable presentation fields; unknown products, arbitrary styles and scripts are omitted. */
export function parseBlockOptions(value:unknown):PageBlockOptions|undefined {
 if(!object(value))return undefined;
 const result:PageBlockOptions={};
 for(const key of ['ctaLabel','secondaryLabel'] as const)if(typeof value[key]==='string')result[key]=value[key].slice(0,180);
 if(typeof value.secondaryLink==='string'&&value.secondaryLink.length<=2000&&!/[\\\s\u0000-\u001f\u007f]/.test(value.secondaryLink)){
  if(/^\/(?!\/)/.test(value.secondaryLink))result.secondaryLink=value.secondaryLink;
  else if(/^https?:\/\//.test(value.secondaryLink)){try{const url=new URL(value.secondaryLink);if(url.hostname&&!url.username&&!url.password)result.secondaryLink=value.secondaryLink;}catch{/* Invalid URL stays absent. */}}
 }
 if(value.visual==='scene'||value.visual==='image')result.visual=value.visual;
 if(typeof value.tone==='string'&&['cyan','violet','neutral'].includes(value.tone))result.tone=value.tone as PageBlockOptions['tone'];
 if(Array.isArray(value.productIds))result.productIds=[...new Set(value.productIds.filter((id):id is string=>typeof id==='string'&&(products.some(product=>product.id===id)||isCustomProductId(id))))].slice(0,40);
 return Object.keys(result).length?result:undefined;
}
/** Parse only known publication fields. Corrupt local JSON cannot masquerade as product specifications. */
export function parsePublications(value:unknown):PublishedContent[]{
 if(!Array.isArray(value))return [];
 return value.filter(object).flatMap(p=>{
  if(typeof p.id!=='string'||typeof p.slug!=='string'||typeof p.kind!=='string'||!validLocales.includes(p.locale as ContentLocale)||typeof p.title!=='string')return [];
  const productKind=productKinds.includes(p.kind),identity={id:p.id,slug:p.slug};
  const customCandidate=productKind?parseCustomProduct(p.customProduct):null;
  const customProduct=customCandidate&&productMatchesPublication(customCandidate,identity)?customCandidate:undefined;
  const releasedId=object(p.productRelease)&&typeof p.productRelease.productId==='string'?p.productRelease.productId:undefined;
  const original=productKind?(products.find(product=>product.id===releasedId)||customProduct||products.find(product=>product.id===p.id)):undefined;
  const productRelease=original&&productMatchesPublication(original,identity)?parseProductRelease(p.productRelease,original)||undefined:undefined;
  const blocks:PublishedBlock[]=Array.isArray(p.blocks)?p.blocks.filter(object).filter(b=>typeof b.type==='string').slice(0,250).map((b,index)=>({id:string(b.id,`block-${index}`),type:string(b.type),title:string(b.title),body:string(b.body),mediaUrl:typeof b.mediaUrl==='string'?b.mediaUrl:undefined,link:typeof b.link==='string'?b.link:undefined,formId:typeof b.formId==='string'?b.formId:undefined,formSchema:parseFormSchema(b.formSchema)||undefined,hidden:typeof b.hidden==='boolean'?b.hidden:undefined,options:parseBlockOptions(b.options)})):[];
  return [{id:p.id,slug:p.slug,kind:p.kind,locale:p.locale as ContentLocale,title:p.title,summary:string(p.summary),body:string(p.body),blocks,publishedAt:string(p.publishedAt),version:typeof p.version==='number'&&Number.isFinite(p.version)?Math.max(1,Math.floor(p.version)):1,eventStart:typeof p.eventStart==='string'?p.eventStart:undefined,eventEnd:typeof p.eventEnd==='string'?p.eventEnd:undefined,location:typeof p.location==='string'?p.location:undefined,productRelease,customProduct}];
 });
}
let cachedText:string|null|undefined;
let cached:PublishedContent[]=empty;
function snapshot():PublishedContent[]{
 if(typeof window==='undefined')return empty;
 try{const text=localStorage.getItem(key);if(text===cachedText)return cached;cachedText=text;cached=text?parsePublications(JSON.parse(text)):empty;return cached;}catch{cachedText=undefined;cached=empty;return empty;}
}
function subscribe(listener:()=>void){
 const changed=()=>listener();
 const storage=(event:StorageEvent)=>{if(event.key===key||event.key===null)changed();};
 const store=(event:Event)=>{if((event as CustomEvent).detail?.key===key)changed();};
 window.addEventListener('idealmakoo:publications',changed);window.addEventListener('storage',storage);window.addEventListener('idealmakoo:store',store);
 return()=>{window.removeEventListener('idealmakoo:publications',changed);window.removeEventListener('storage',storage);window.removeEventListener('idealmakoo:store',store);};
}
export function usePublications(){return useSyncExternalStore(subscribe,snapshot,()=>empty);}
function latestPublication(item:{id:string;slug:string},all:PublishedContent[],locale:ContentLocale,kinds:string[]){
 return all.filter(p=>p.locale===locale&&kinds.includes(p.kind)&&(p.id===item.id||p.slug.replace(/^\/+|\/+$/g,'')===item.slug||kinds.some(kind=>p.slug.replace(/^\/+|\/+$/g,'')===`${kind}/${item.slug}`))).sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||b.version-a.version)[0];
}
/** Reviewed fields drive the visible product; its immutable original stays available as sourceProduct. */
export function applyPublishedProduct(product:Product,all:PublishedContent[],locale:ContentLocale):PublishedProduct{
 const prior=product as PublishedProduct;
 const base=products.find(p=>p.id===product.id)||parseCustomProduct(prior.sourceProduct)||parseCustomProduct(product)||product;
 const candidates=parseCustomProduct(base)?all.filter(item=>parseProductRelease(item.productRelease,base)):all;
 const publication=latestPublication(base,candidates,locale,['products','product']);
 if(!publication)return base;
 const visible=productFromRelease(base,publication.productRelease,locale);
 return {...visible,name:{...visible.name,[locale]:publication.title.trim()||visible.name[locale]},description:{...visible.description,[locale]:visible!==base?publication.summary:publication.summary.trim()||base.description[locale]},sourceProduct:base,sourceName:base.name,sourceDescription:base.description,localPublication:publication};
}
export function applyPublishedArticle(article:Article,all:PublishedContent[],locale:ContentLocale):PublishedArticle{
 const base=articles.find(a=>a.id===article.id)||article;
 const publication=latestPublication(base,all,locale,['research','article','articles']);
 return publication?{...base,title:{...base.title,[locale]:publication.title.trim()||base.title[locale]},excerpt:{...base.excerpt,[locale]:publication.summary.trim()||base.excerpt[locale]},sourceTitle:base.title,sourceExcerpt:base.excerpt,localPublication:publication}:base;
}
/** A new manual definition appears only with a valid reviewed release in the requested locale. */
export function catalogFromPublications(all:PublishedContent[],locale:ContentLocale):PublishedProduct[]{
 const originals:Product[]=[...products];const added=new Map<string,CustomProduct>();
 for(const publication of all.filter(item=>item.locale===locale&&productKinds.includes(item.kind)).sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||b.version-a.version)){
  const custom=parseCustomProduct(publication.customProduct);
  if(custom&&!added.has(custom.id)&&productMatchesPublication(custom,publication)&&parseProductRelease(publication.productRelease,custom))added.set(custom.id,custom);
 }
 originals.push(...added.values());return originals.map(product=>applyPublishedProduct(product,all,locale));
}
export function getPublishedCatalog(locale:ContentLocale):PublishedProduct[]{return catalogFromPublications(snapshot(),locale);}
/** Cross-locale validation keeps saved inquiries intact when the interface language changes. */
export function getPublishedProductInventory():PublishedProduct[]{
 const all=snapshot(),inventory=new Map<string,PublishedProduct>();
 for(const locale of validLocales)for(const product of catalogFromPublications(all,locale)){
  const previous=inventory.get(product.id),publication=product.localPublication,prior=previous?.localPublication;
  if(!previous||publication&&(!prior||(Date.parse(publication.publishedAt)||0)>(Date.parse(prior.publishedAt)||0)||publication.publishedAt===prior.publishedAt&&publication.version>prior.version))inventory.set(product.id,product);
 }
 return [...inventory.values()];
}
export function useCatalogProducts(locale:ContentLocale):PublishedProduct[]{const all=usePublications();return useMemo(()=>catalogFromPublications(all,locale),[all,locale]);}
export function usePublishedProduct(product:Product,locale:ContentLocale):PublishedProduct{const all=usePublications();return useMemo(()=>applyPublishedProduct(product,all,locale),[all,locale,product]);}
export function useCatalogArticles(locale:ContentLocale):PublishedArticle[]{const all=usePublications();return useMemo(()=>articles.map(a=>applyPublishedArticle(a,all,locale)),[all,locale]);}
