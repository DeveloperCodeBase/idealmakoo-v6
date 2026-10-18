'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, Bell, BookOpen, Box, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock, CloudOff, Command, FileText, FolderOpen, Gauge, Globe2, GraduationCap, Image as ImageIcon, KanbanSquare, Languages, LayoutDashboard, LayoutTemplate, ListTree, LogOut, Mail, Menu, MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, Sparkles, Sun, Users, X, BriefcaseBusiness, Handshake, ScanLine, Network, Database, LockKeyhole } from 'lucide-react';
import { authorize, canonicalWorkspaceSection, roleLandingRoute } from '@/lib/auth';
import { Brand } from '@/components/site/Navigation';
import { SiteControlCenter } from './SiteControlCenter';
import { siteControlCopy } from './site-control-copy';
import { roleExperience, deskCopy } from './role-content';
import { useApp } from '@/components/providers/AppProvider';
import { useWorkspaceStore } from './store';
import { L, localized, roleNames, workspaceLocales, workspaceRoles, wt } from './i18n';
import { Modal, safeDate } from './ui';
import { Overview } from './Overview';
import { RecordsDesk, RecordDetail } from './Records';
import { Pipeline } from './Pipeline';
import { PageBuilder } from './CMS';
import { ContentStudio, MediaLibrary } from './Studio';
import { FormBuilder, PublicationCalendar, ReviewDesk, TranslationDesk } from './Editorial';
import { MigrationRegistry, Monitoring, RoleMatrix, WorkspaceSettings, monitorSections } from './Administration';
import ProductEditor from './ProductEditor';
import SiteSettings from './SiteSettings';
import { CrmTools } from './CrmTools';
import './workspace.css';
import './workspace-role.css';

const navGroups = [
  { key: 'content', items: [
    { key: 'overview', path: '', icon: LayoutDashboard },
    { key: 'site-control', path: 'content', icon: LayoutTemplate },
    { key: 'ai', path: 'ai', icon: Sparkles },
    { key: 'pages', path: 'pages', icon: LayoutTemplate },
    { key: 'products', path: 'products', icon: Box },
    { key: 'research', path: 'research', icon: BookOpen },
    { key: 'news', path: 'news', icon: FileText },
    { key: 'events', path: 'events', icon: CalendarDays },
    { key: 'resources', path: 'resources', icon: FolderOpen },
    { key: 'media', path: 'media', icon: ImageIcon },
    { key: 'translations', path: 'translations', icon: Languages },
    { key: 'reviews', path: 'reviews', icon: ShieldCheck },
    { key: 'publications', path: 'publications', icon: CalendarDays },
    { key: 'forms', path: 'forms', icon: ClipboardList },
    { key: 'menus', path: 'menus', icon: ListTree },
    { key: 'hr', path: 'hr', icon: BriefcaseBusiness },
  ] },
  { key: 'operations', items: [
    { key: 'crm', path: 'crm', icon: Gauge },
    { key: 'leads', path: 'crm/leads', icon: Users },
    { key: 'accounts', path: 'crm/accounts', icon: Network },
    { key: 'contacts', path: 'crm/contacts', icon: Users },
    { key: 'opportunities', path: 'crm/opportunities', icon: KanbanSquare },
    { key: 'activities', path: 'crm/activities', icon: Clock },
    { key: 'quotes', path: 'crm/quotes', icon: FileText },
    { key: 'pricebooks', path: 'crm/pricebooks', icon: BookOpen },
    { key: 'samples', path: 'crm/samples', icon: ScanLine },
    { key: 'handoffs', path: 'crm/handoffs', icon: BriefcaseBusiness },
    { key: 'partners', path: 'crm/partners', icon: Handshake },
    { key: 'tickets', path: 'crm/cases', icon: MessageSquare },
    { key: 'segments', path: 'crm/segments', icon: Users },
    { key: 'campaigns', path: 'crm/campaigns', icon: Mail },
    { key: 'inbox', path: 'crm/inbox', icon: MessageSquare },
    { key: 'automations', path: 'crm/automations', icon: Network },
    { key: 'success', path: 'crm/customer-success', icon: Handshake },
    { key: 'reports', path: 'crm/reports', icon: Gauge },
    { key: 'data', path: 'crm/data', icon: Database },
  ] },
  { key: 'system', items: [
    { key: 'monitoring', path: 'monitoring', icon: Activity },
    { key: 'communications', path: 'communications', icon: Bell },
    { key: 'staff', path: 'staff', icon: Users },
    { key: 'roles', path: 'roles', icon: ShieldCheck },
    { key: 'migration', path: 'migration', icon: Globe2 },
    { key: 'settings', path: 'settings', icon: Settings },
  ] },
];

export function Workspace({ section = '' }: { section: string }) {
  const app=useApp();
  return <WorkspaceScreen key={`${app.session?.id||'guest'}:${app.role}`} section={section}/>;
}
function WorkspaceScreen({section}:{section:string}) {
  const app = useApp();
  const { locale, dir, theme, role, notify } = app;
  const store = useWorkspaceStore(locale, role, notify, app.session?.id || role);
  const active = canonicalWorkspaceSection(section) || 'overview';
  const routeAllowed=authorize(role,section);
  const label=(key:string)=>key==='site-control'?localized(siteControlCopy.title,locale):wt(key,locale);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [groups, setGroups] = useState<Record<string, boolean>>({ content: true, operations: true, system: true });
  const [command, setCommand] = useState(false);
  const [search, setSearch] = useState('');
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [dataCollection, setDataCollection] = useState('leads');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { setCollapsed(localStorage.getItem('idealmakoo.sidebar') === 'collapsed'); } catch { /* Keep the full sidebar if persistence is unavailable. */ } }, []);
  useEffect(() => { setMobile(false); }, [section]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommand(previous => !previous); } if (event.key === 'Escape') setMobile(false); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  const href = (path: string) => `/${locale}/admin${path ? `/${path}` : ''}`;
  const current = store.state.records.find(record => record.id === detail);
  const visibleGroups=navGroups.map(group=>({...group,items:group.items.filter(item=>authorize(role,item.path))})).filter(group=>group.items.length);
  const menus = visibleGroups.flatMap(group => group.items);
  const searchMenus = menus.filter(item => label(item.key).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
  const searchRecords = search ? store.state.records.filter(record => record.status !== 'archived' && `${localized(record.title, locale)} ${record.id} ${record.organization || ''}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))).slice(0, 8) : [];
  const count = (key: string) => key === 'reviews' ? store.state.records.filter(r => r.status === 'review').length : key === 'leads' ? store.state.records.filter(r => r.collection === 'leads' && r.status === 'new').length : 0;
  const toggleCollapse = () => { const next = !collapsed; setCollapsed(next); try { localStorage.setItem('idealmakoo.sidebar', next ? 'collapsed' : 'expanded'); } catch { /* The current layout remains usable. */ } };
  const renderSection = () => {
    if (!routeAllowed) return <div className="ws-card ws-access-card"><span><LockKeyhole size={38}/></span><h2>{wt('denied',locale)}</h2><p>{localized(deskCopy.accessNote,locale)}</p><Link href={`/${locale}/${roleLandingRoute(role)}`} className="btn">{wt('workspace',locale)}<ArrowUpRight size={17}/></Link></div>;
    if(active==='site-control')return <SiteControlCenter key={`${role}-${locale}-${store.loaded}`} store={store}/>;
    if (active === 'overview' || active === 'crm' || active === 'reports') return <Overview store={store} crm={active !== 'overview'}/>;
    if (active === 'pages') return <PageBuilder key={`${locale}-${store.loaded}`} store={store}/>;
    if (active === 'products') return <><ProductEditor key={`${locale}-${store.loaded}`} store={store}/><RecordsDesk collection="products" store={store}/></>;
    if (active === 'ai') return <ContentStudio store={store}/>;
    if (active === 'media') return <MediaLibrary store={store}/>;
    if (active === 'translations') return <TranslationDesk store={store}/>;
    if (active === 'reviews') return <ReviewDesk store={store}/>;
    if (active === 'publications') return <PublicationCalendar store={store}/>;
    if (active === 'forms') return <FormBuilder store={store}/>;
    if (active === 'menus') return <SiteSettings key={`menus-${locale}`} store={store} mode="menus"/>;
    if (active === 'opportunities' || active === 'samples') return <><CrmTools key={`tools-${active}`} store={store} collection={active}/><Pipeline key={active} store={store} collection={active}/></>;
    if (active === 'monitoring') return <Monitoring store={store} section={section.split('/').filter(Boolean).at(-1) === 'monitoring' ? 'overview' : section.split('/').filter(Boolean).at(-1) || 'overview'}/>;
    if (active === 'roles') return <RoleMatrix store={store}/>;
    if (active === 'settings') return <><SiteSettings key={`settings-${locale}`} store={store} mode="settings"/><WorkspaceSettings store={store}/></>;
    if (active === 'data') return <><label className="field" style={{maxWidth:420}}><span>{wt('type',locale)}</span><select className="input" value={dataCollection} onChange={event => setDataCollection(event.target.value)}>{['leads','accounts','contacts','activities','opportunities','quotes','pricebooks','samples','handoffs','partners','tickets','campaigns'].map(collection => <option key={collection} value={collection}>{wt(collection,locale)}</option>)}</select></label><CrmTools key={dataCollection} collection={dataCollection} store={store}/><WorkspaceSettings store={store} transferOnly/></>;
    if (active === 'migration') return <MigrationRegistry store={store}/>;
    return <><CrmTools collection={active} key={`tools-${active}`} store={store}/><RecordsDesk collection={active} key={active} store={store}/></>;
  };
  return <div className={`ws-root ws-liquid-workspace ${store.state.settings.compact ? 'ws-compact' : ''}`} dir={dir} data-collapsed={collapsed} data-role={role}>
    <div className="ws-background-orbs" aria-hidden="true"><i/><i/><i/></div>
    {mobile && <button className="ws-mobile-scrim" aria-label={wt('close', locale)} onClick={() => setMobile(false)}/>}
    <aside className={`ws-sidebar glass ${mobile ? 'ws-sidebar-open' : ''}`}><div className="ws-window-dots" aria-hidden="true"><i/><i/><i/></div><div className="ws-brand"><Brand small/></div><button className="ws-sidebar-toggle ws-icon-button" onClick={toggleCollapse} aria-label={collapsed ? wt('next', locale) : wt('previous', locale)}>{collapsed ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}</button><div className="ws-sidebar-rule"/><div className="ws-workspace-profile"><span className="ws-profile-symbol">IM</span><div><strong>{localized(roleNames[role]||role,locale)}</strong><span>{localized(deskCopy.scope,locale)} · {menus.length}</span></div><i className="ws-status-light"/></div>
      <nav className="ws-navigation" aria-label={wt('workspace', locale)}>{visibleGroups.map(group => <div className="ws-nav-group" key={group.key}><button className="ws-group-caption" aria-expanded={groups[group.key]} onClick={() => setGroups(previous => ({ ...previous, [group.key]: !previous[group.key] }))}><span>{wt(group.key, locale)}</span><ChevronDown size={13} style={{ transform: groups[group.key] ? 'rotate(0deg)' : 'rotate(-90deg)' }}/></button>{(groups[group.key] || collapsed) && group.items.map(item => <Link key={item.path} href={href(item.path)} className={`ws-nav-item ${active === item.key ? 'active' : ''}`} aria-current={active === item.key ? 'page' : undefined} title={label(item.key)}><span className="ws-nav-icon"><item.icon size={20}/></span><span className="ws-nav-copy">{label(item.key)}</span>{count(item.key) > 0 && <span className="ws-nav-count">{count(item.key)}</span>}</Link>)}</div>)}</nav>
      <div className="ws-sidebar-bottom"><Link className="ws-nav-item" href={`/${locale}`} title={wt('openSite', locale)}><Globe2 size={20}/><span className="ws-nav-copy">{wt('openSite', locale)}</span><ArrowUpRight size={16}/></Link><div className="ws-sidebar-rule"/>{role==='superAdmin'&&<label className="ws-role-selector"><span>{wt('selectRole', locale)}</span><select value={role} onChange={event => app.setRole(event.target.value)} aria-label={wt('selectRole', locale)}>{workspaceRoles.map(r => <option key={r} value={r}>{localized(roleNames[r], locale)}</option>)}</select></label>}</div>
    </aside>
    <main className="ws-shell glass" id="workspace-content"><header className="ws-topbar"><button className="ws-icon-button ws-mobile-menu" onClick={() => setMobile(true)} aria-label={wt('workspace', locale)}><Menu size={21}/></button><button className="ws-command-trigger" onClick={() => setCommand(true)}><Search size={17}/><span>{wt('search', locale)}</span><kbd>⌘ K</kbd></button><div className="ws-topbar-date"><span className="ws-status-light"/><time suppressHydrationWarning>{safeDate(new Date().toISOString(), locale, { weekday: 'short', month: 'short', day: 'numeric' })}</time></div><div className="ws-topbar-actions"><select className="ws-language-picker" value={locale} onChange={event => app.switchLocale(event.target.value as typeof locale)} aria-label={wt('language', locale)}>{workspaceLocales.map(lang => <option key={lang} value={lang}>{({ fa: 'فا', en: 'EN', tr: 'TR', ar: 'ع', ru: 'RU' })[lang]}</option>)}</select><button className="ws-icon-button" onClick={app.toggleTheme} aria-label={localized(theme === 'dark' ? L('تم روشن','Light theme','Açık tema','الوضع الفاتح','Светлая тема') : L('تم تیره','Dark theme','Koyu tema','الوضع الداكن','Тёмная тема'), locale)}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="ws-icon-button" onClick={() => { setNotifications(true); setReadNotifications(true); }} aria-label={wt('notifications', locale)}><Bell size={17}/>{!readNotifications && <i className="ws-notification-dot"/>}</button><button className="ws-icon-button" onClick={() => setHelp(true)} aria-label={wt('help', locale)}><CircleHelp size={17}/></button><button className="ws-icon-button" onClick={app.signOut} aria-label={app.t('logout')}><LogOut size={17}/></button><span className="ws-user-avatar" title={localized(roleNames[role] || role, locale)}>IM<i/></span></div></header>
      <div className="ws-heading"><div><p className="ws-breadcrumb"><span>IDEAL MAKOO</span><ChevronRight size={13}/>{label(active === 'overview' ? 'workspace' : active)}</p><h1>{active==='overview'?localized(roleExperience[role]?.title||roleNames[role],locale):label(active)}</h1></div><span className="ws-demo-badge"><CloudOff size={14}/>{wt('demo', locale)}</span></div>
      {store.storageError && <p className="ws-storage-error">{localized(L('ذخیره‌سازی مرورگر پر یا غیرفعال است؛ برای حفظ تغییرات فایل داده را دریافت کنید.','Browser storage is full or unavailable; export your data to retain changes.','Tarayıcı depolaması dolu veya kullanılamıyor; değişiklikleri korumak için veriyi dışa aktarın.','تخزين المتصفح ممتلئ أو غير متاح؛ صدّر البيانات لحفظ التغييرات.','Хранилище браузера заполнено или недоступно; экспортируйте данные для сохранения изменений.'), locale)}</p>}
      <div className="ws-page-content">{renderSection()}</div><footer className="ws-footer"><span><i className="ws-status-light"/>{wt('local', locale)}</span><span>IDEAL MAKOO · {localized(L('فرانت‌اند یکپارچه','Connected frontend','Bağlantılı ön yüz','واجهة متكاملة','Единый интерфейс'), locale)}</span></footer>
    </main>
    {command && <Modal title={wt('search', locale)} onClose={() => { setCommand(false); setSearch(''); }}><div className="ws-command-dialog"><label className="ws-search"><Search size={19}/><input ref={searchRef} autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder={wt('search', locale)} aria-label={wt('search', locale)}/></label><div className="ws-command-results">{searchMenus.slice(0, 12).map(item => <Link key={item.key} href={href(item.path)} onClick={() => { setCommand(false); setSearch(''); }}><item.icon size={18}/><span>{label(item.key)}</span><ArrowUpRight size={16}/></Link>)}{searchRecords.map(record => <button key={record.id} onClick={() => { setCommand(false); setDetail(record.id); setSearch(''); }}><FileText size={18}/><span>{localized(record.title, locale)}<small><bdi>{record.id}</bdi></small></span><ArrowUpRight size={16}/></button>)}</div></div></Modal>}
    {help && <Modal title={wt('help', locale)} onClose={() => setHelp(false)}><div className="ws-help-body"><span className="ws-help-symbol"><CircleHelp size={38}/></span><h3>{wt(active, locale)}</h3><p>{wt('helpBody', locale)}</p><Link className="btn" href={href('roles')} onClick={() => setHelp(false)}>{wt('roles', locale)}<ArrowUpRight size={16}/></Link></div></Modal>}
    {notifications && <Modal title={wt('notifications', locale)} onClose={() => setNotifications(false)}><div className="ws-notifications">{store.state.audit.slice(0, 10).map(event => <div key={event.id}><span><Bell size={18}/></span><p>{localized(event.text, locale)}<small>{safeDate(event.at, locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></p></div>)}</div></Modal>}
    {current && <RecordDetail record={current} store={store} onClose={() => setDetail(null)}/>} 
  </div>;
}

export default Workspace;
