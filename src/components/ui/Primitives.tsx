'use client';
import Link from 'next/link';
import {useId,useRef,type ReactNode,type ButtonHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUpRight,X} from 'lucide-react';
import {useApp} from '@/components/providers/AppProvider';
import {useDialogPortalTarget,useViewportDialog} from './dialog-runtime';
import './modal.css';
export function GlassCard({children,className='',...rest}:React.HTMLAttributes<HTMLDivElement>){return <div {...rest} className={`glass ${className}`}>{children}</div>;}
export function GlowingButton({children,className='',...rest}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`btn btn-primary ${className}`} {...rest}>{children}</button>;}
export function BiDiText({children}:{children:ReactNode}){return <bdi dir="ltr">{children}</bdi>;}
export function SectionTitle({eyebrow,title,description,action,href}:{eyebrow?:string;title:string;description?:string;action?:string;href?:string}){return <div className="section-heading"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{href&&<Link href={href} className="text-link">{action}<ArrowUpRight size={18} className="directional"/></Link>}</div>;}
export function EmptyState({title,description,action,href,icon}:{title:string;description?:string;action?:string;href?:string;icon?:ReactNode}){return <div className="empty-state glass">{icon&&<div className="empty-icon">{icon}</div>}<h3>{title}</h3>{description&&<p>{description}</p>}{href&&<Link className="btn btn-primary" href={href}>{action}<ArrowUpRight size={17}/></Link>}</div>;}
export function Modal({title,children,onClose,className=''}:{title:string;children:ReactNode;onClose:()=>void;className?:string}){
 const ref=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),backdropDown=useRef(false);
 const titleId=useId(),portalTarget=useDialogPortalTarget();const {t,dir,locale}=useApp();
 useViewportDialog(ref,true,portalTarget,onClose,{initialFocus:closeButton});
 const outside=(x:number,y:number)=>{const r=ref.current?.getBoundingClientRect();return !!r&&(x<r.left||x>r.right||y<r.top||y>r.bottom);};
 if(!portalTarget)return null;
 return createPortal(<dialog ref={ref} className={`app-dialog glass ${className}`} data-viewport-dialog="true" aria-labelledby={titleId} dir={dir} lang={locale} tabIndex={-1}
  onPointerDown={event=>{backdropDown.current=event.target===event.currentTarget&&outside(event.clientX,event.clientY);}}
  onPointerCancel={()=>{backdropDown.current=false;}}
  onClick={event=>{const close=backdropDown.current&&event.target===event.currentTarget&&outside(event.clientX,event.clientY);backdropDown.current=false;if(close)onClose();}}>
  <div className="dialog-inner"><header><h2 id={titleId} dir="auto">{title}</h2><button ref={closeButton} type="button" className="icon-btn" aria-label={t('close')} onClick={onClose}><X size={20}/></button></header>{children}</div>
 </dialog>,portalTarget);
}
