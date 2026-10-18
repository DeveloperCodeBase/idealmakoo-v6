'use client';
import type {ReactNode} from 'react';
import type {AiSource} from '@/lib/ai-client';
export function safeAiLink(raw:string,locale:string){
 if(raw.startsWith('/')&&!raw.startsWith('//')&&!raw.includes('\\'))return raw.replace(/^\/fa(?=\/)/,`/${locale}`);
 try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}return '';
}
export function sourceTitle(source:AiSource,locale:string){const translated=source.title.split('\n').filter(s=>s.startsWith(locale+': ')).map(s=>s.slice(locale.length+2));return (translated.join(' · ')||source.title).slice(0,180);}
/** React text nodes only: model HTML and executable URL schemes never enter the DOM. */
export default function AiMarkdown({text,sources=[],locale}:{text:string;sources?:AiSource[];locale:string}){
 function inline(value:string):ReactNode[]{return value.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\)|\[\d+\])/g).map((part,index)=>{
  if(part.startsWith('**')&&part.endsWith('**'))return <strong key={index}>{part.slice(2,-2)}</strong>;
  if(part.startsWith('`')&&part.endsWith('`'))return <code key={index}>{part.slice(1,-1)}</code>;
  const citation=part.match(/^\[(\d+)\]$/);if(citation){const source=sources.find(s=>s.number===Number(citation[1]));const href=source&&safeAiLink(source.url,locale);if(source&&href)return <a key={index} className="ai-citation" href={href} title={sourceTitle(source,locale)}>[{citation[1]}]</a>;}
  const link=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);if(link){const href=safeAiLink(link[2],locale);if(href)return <a key={index} href={href} {...(href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{link[1]}</a>;return link[1];}return part;
 });}
 return <div className="ai-prose" dir="auto">{text.split(/(```[\s\S]*?```)/g).map((section,si)=>{
  if(section.startsWith('```')){const body=section.slice(3,-3).replace(/^[^\n]*\n/,'');return <pre key={si} dir="ltr"><code>{body}</code></pre>;}
  return <div key={si}>{section.split(/\n\s*\n/).filter(Boolean).map((block,bi)=>{
   const heading=block.match(/^#{1,4}\s+(.+)$/);if(heading)return <h4 key={bi}>{inline(heading[1])}</h4>;
   const lines=block.split('\n');if(lines.every(l=>/^\s*[-*]\s+/.test(l)))return <ul key={bi}>{lines.map((l,i)=><li key={i}>{inline(l.replace(/^\s*[-*]\s+/,''))}</li>)}</ul>;
   if(lines.every(l=>/^\s*\d+[.)]\s+/.test(l)))return <ol key={bi}>{lines.map((l,i)=><li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/,''))}</li>)}</ol>;
   if(lines.length>2&&/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[1])){const cells=(l:string)=>l.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());return <div className="ai-table-scroll" key={bi}><table><thead><tr>{cells(lines[0]).map((s,i)=><th key={i}>{inline(s)}</th>)}</tr></thead><tbody>{lines.slice(2).map((l,i)=><tr key={i}>{cells(l).map((s,j)=><td key={j}>{inline(s)}</td>)}</tr>)}</tbody></table></div>;}
   return <p key={bi}>{inline(block)}</p>;
  })}</div>;
 })}</div>;
}
