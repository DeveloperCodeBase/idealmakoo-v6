'use client';
import Link from 'next/link';
import {ArrowUpRight,Mail,MapPin,Phone} from 'lucide-react';
import {Brand} from './Navigation';
import {useApp} from '@/components/providers/AppProvider';
import {company} from '@/data/catalog';
import {siteMenuHref,useSitePreferences,visibleMenuGroups} from '@/lib/site-preferences';
import styles from './preferences.module.css';

export default function Footer(){
 const{locale,t,href}=useApp();const preferences=useSitePreferences();const groups=visibleMenuGroups(preferences.footer);
 return <footer className="site-footer"><div className={`container footer-grid ${styles.footerGrid}`}><div className="footer-brand"><Brand/><p>{preferences.brand.tagline[locale]}</p><span className="footer-since">{t('since')}</span></div>{groups.map(group=><div key={group.id}><h4>{group.label[locale]}</h4>{group.items.map(item=><Link key={item.id} href={siteMenuHref(item.path,locale)}>{item.label[locale]}</Link>)}</div>)}<div className="footer-contact"><h4>{t('contact')}</h4><p><MapPin size={16}/>{preferences.contact.address[locale]}</p><a href={`tel:${preferences.contact.phone.replace(/[^+\d]/g,'')}`}><Phone size={16}/><bdi dir="ltr">{preferences.contact.phone}</bdi></a>{preferences.contact.email&&<a href={`mailto:${preferences.contact.email}`}><Mail size={16}/><bdi dir="ltr">{preferences.contact.email}</bdi></a>}<Link className="text-link" href={href('contact')}>{t('contactUs')}<ArrowUpRight size={16}/></Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {preferences.brand.name[locale]}. {t('footerCopy')}</span><div><Link href={href('privacy')}>{t('privacy')}</Link><Link href={href('terms')}>{t('terms')}</Link><a href={company.website} target="_blank" rel="noreferrer">{t('source')}<ArrowUpRight size={12}/></a></div></div></footer>;
}
