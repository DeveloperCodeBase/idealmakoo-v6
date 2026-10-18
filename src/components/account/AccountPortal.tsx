"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ArrowRight, Bell, Bookmark, Building2, Check, ChevronRight, Clock3, Download, FileText, Grid2X2, LayoutDashboard, LockKeyhole, LogOut, Mail, MessageSquare, Plus, Search, Send, ShieldCheck, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { articles, resources, type Product } from "@/data/catalog";
import { localizedPath, productPath } from "@/lib/custom-products";
import { getPublishedProductInventory, type PublishedProduct } from "@/lib/publications";
import { formatDate, localeNames, locales, localized, type Locale } from "@/lib/i18n";
import { copyText, downloadJson, exportCsv, makeId, readStore, writeStore } from "@/lib/storage";
import type { FrontSession } from "@/lib/auth";
import type { FrontRequest } from "@/types/frontend";
import { accountText } from "./account-copy";
import { digestPassword, isValidPassword, normalizeVerificationCode, readLocalAccounts, saveLocalAccounts, securityKey, type SecurityPreferences } from "./auth-storage";
import { canRespondToQuote, canViewRequest, createQuoteResponse, importInquiryCsv, mergeInquiryLines, publicRequestSnapshot, type QuoteResponseStatus, type SharedQuote } from "./portal-data";
import QuoteLines from '@/components/ui/QuoteLines';
import styles from "./account.module.css";

type Profile = { name: string; phone: string; organization: string; profession: string; timezone: string; language: Locale };
type Organization = { id: string; name: string; city: string; country: string; members: { id: string; email: string; name: string; role: string; status: string }[]; sharedRequestIds: string[] };
type NotificationPrefs = { inApp: boolean; email: boolean; requests: boolean; products: boolean; research: boolean; events: boolean; frequency: string; quietStart: string; quietEnd: string };
const securityDefault: SecurityPreferences = { mfaEnabled: false, recoveryCodes: [] };
const sourceTitleLabel = localized('زبان منبع', 'Source language', 'Kaynak dili', 'لغة المصدر', 'Язык оригинала');
/** Display fallback never supplies the catalogue for a new product selection. */
function useExistingProductDisplay(catalog: Product[]) {
  return useMemo(() => { const merged = new Map(catalog.map(product => [product.id, product])); for (const product of getPublishedProductInventory()) if (!merged.has(product.id)) merged.set(product.id, product); return [...merged.values()]; }, [catalog]);
}
function existingProductTitle(product: Product | undefined, locale: Locale, fallback = '—') {
  if (!product) return { title: fallback, language: locale };
  const published = product as PublishedProduct, source = published.sourceName || published.sourceProduct?.name;
  for (const language of [locale, ...(published.localPublication?.locale ? [published.localPublication.locale] : []), 'fa', ...locales] as Locale[]) { const title = product.name[language]?.trim() || source?.[language]?.trim(); if (title) return { title, language }; }
  return { title: product.brand || fallback, language: locale };
}
function existingProductHref(product: Product, catalog: Product[], locale: Locale) {
  const sourceLocale = (product as PublishedProduct).localPublication?.locale || existingProductTitle(product, locale).language;
  return localizedPath(catalog.some(item => item.id === product.id) ? locale : sourceLocale, productPath(product));
}
function ExistingProductName({ product, locale, fallback }: { product: Product | undefined; locale: Locale; fallback?: string }) {
  const name = existingProductTitle(product, locale, fallback);
  return <><bdi lang={name.language}>{name.title}</bdi>{name.language !== locale && <small className={styles.statusBadge} data-tone="muted" style={{ fontSize: 10, marginInlineStart: 6 }}>{sourceTitleLabel[locale]}: <bdi>{localeNames[name.language]}</bdi></small>}</>;
}

function useAccountText() {
  const { locale, t } = useApp();
  return (key: string) => accountText(locale, key, t);
}

function useLocalState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(fallback);
  const initial = useRef(fallback);
  const { notify } = useApp();
  const text = useAccountText();
  useEffect(() => {
    const read = () => setValue(readStore(key, initial.current));
    read();
    const storage = (event: StorageEvent) => { if (event.key === key) read(); };
    const local = (event: Event) => { if ((event as CustomEvent).detail?.key === key) read(); };
    window.addEventListener("storage", storage); window.addEventListener("idealmakoo:store", local);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("idealmakoo:store", local); };
  }, [key]);
  const update: Dispatch<SetStateAction<T>> = action => {
    const current = readStore(key, initial.current);
    const next = typeof action === "function" ? (action as (previous: T) => T)(current) : action;
    if (!writeStore(key, next)) { notify(text("storageError")); return; }
    setValue(next);
  };
  return [value, update];
}

const nav = [
  ["", "overview", LayoutDashboard], ["profile", "profile", UserRound], ["organizations", "organizations", Building2],
  ["requests", "requests", MessageSquare], ["quick-matrix", "quickMatrix", Grid2X2], ["saved", "saved", Bookmark],
  ["notifications", "notifications", Bell], ["security", "security", ShieldCheck],
] as const;

export function AccountPortal({ section = "" }: { section: string }) {
  const { theme, dir, locale, session, signOut, requests, saved, href } = useApp();
  const text = useAccountText();
  const normalized = section.split("/")[0] === "overview" ? "" : section.split("/")[0];
  const current = nav.find(item => item[0] === normalized) || nav[0];
  const ownRequests = useMemo(() => requests.filter(request => canViewRequest(request, session)), [requests, session]);
  const needsSession = ["profile", "organizations", "security"].includes(normalized);
  const name = session ? (session.email.endsWith(".invalid") ? text(`role_${session.role}`) : session.name) : text("guest");
  return (
    <div className={styles.portal} data-page-shell="account" data-theme={theme} dir={dir}>
      <div className={styles.portalHeading}><div><span className={styles.eyebrow}>IDEAL MAKOO · {text("account")}</span><h1>{text("portalTitle")}</h1><p>{text("portalIntro")}</p></div><Link className={styles.secondaryButton} href={href("products")}>{text("browseProducts")}<ArrowRight className={styles.directionArrow} size={17} /></Link></div>
      <div className={styles.portalLayout}>
        <aside className={styles.portalSidebar} data-liquid-surface="">
          <div className={styles.userCard}><span className={styles.userAvatar}>{session ? name.slice(0, 1) : <UserRound size={23} />}</span><strong>{name}</strong><small dir="ltr">{session?.email || "IDEAL MAKOO"}</small><span className={styles.userStatus}><span className={styles.liveDot} />{text(session ? `role_${session.role}` : "guest")}</span></div>
          <nav aria-label={text("account")}>{nav.map(([path, label, Icon]) => <Link key={path} href={href(`account${path ? `/${path}` : ""}`)} className={current[0] === path ? styles.activeNav : ""} aria-current={current[0] === path ? "page" : undefined}><Icon size={18} /><span>{text(label)}</span>{path === "requests" && ownRequests.length > 0 && <b>{new Intl.NumberFormat(locale).format(ownRequests.length)}</b>}{path === "saved" && saved.length > 0 && <b>{new Intl.NumberFormat(locale).format(saved.length)}</b>}</Link>)}</nav>
          {session ? <button type="button" className={styles.sidebarLogout} onClick={signOut}><LogOut size={17} />{text("logout")}</button> : <Link className={styles.sidebarLogout} href={href("auth/login")}><LogOut size={17} />{text("signIn")}</Link>}
        </aside>
        <section className={styles.portalContent} aria-labelledby="portal-section-title">
          <div className={styles.sectionBreadcrumb}><span>{text("account")}</span><ChevronRight className={styles.directionArrow} size={13} /><span id="portal-section-title">{text(current[1])}</span></div>
          {!session && <div className={styles.localNotice}><ShieldCheck size={18} /><p>{text("guestIntro")}</p><Link href={href("auth/login")}>{text("signIn")}</Link></div>}
          {needsSession && !session ? <EmptyState icon="profile" title={text("signIn")} body={text("guestIntro")} href={href("auth/login")} action={text("signIn")} /> : normalized === "profile" ? <ProfilePanel key={session!.id} session={session!} /> : normalized === "organizations" ? <OrganizationsPanel key={session!.id} session={session!} requests={ownRequests} /> : normalized === "requests" ? <RequestsPanel requests={ownRequests} section={section} /> : normalized === "quick-matrix" ? <QuickMatrix /> : normalized === "saved" ? <SavedPanel /> : normalized === "notifications" ? <NotificationsPanel requests={ownRequests} /> : normalized === "security" ? <SecurityPanel key={session!.id} session={session!} requests={ownRequests} /> : <OverviewPanel requests={ownRequests} name={name} />}
        </section>
      </div>
    </div>
  );
}

export default AccountPortal;

function EmptyState({ title, body, href, action, icon = "requests", onAction }: { title: string; body?: string; href?: string; action?: string; icon?: string; onAction?: () => void }) {
  return <div className={styles.emptyState}><span className={styles.emptyIcon}>{icon === "profile" ? <UserRound size={30} /> : icon === "saved" ? <Bookmark size={30} /> : <MessageSquare size={30} />}</span><h3>{title}</h3>{body && <p>{body}</p>}{href && <Link className={styles.primaryButton} href={href} onClick={onAction}>{action}<ArrowRight className={styles.directionArrow} size={16} /></Link>}</div>;
}

function Status({ value }: { value: string }) {
  const text = useAccountText();
  const key = ({ new: "received", review: "in_review", pending: "in_review", "in-progress": "in_review", complete: "resolved" } as Record<string, string>)[value] || value;
  return <span className={styles.statusBadge} data-tone={["resolved", "closed", "complete"].includes(key) ? "success" : key === "withdrawn" ? "muted" : key === "waiting_customer" ? "warning" : "info"}><i />{text(key)}</span>;
}

function requestKind(kind: string) {
  return ({ rfq: "inquiry", sample: "sample", sample_request: "sample", support_ticket: "support", support: "support", quality_complaint: "quality", job_application: "careers", careers: "careers", factory_visit: "visit", distribution_partnership: "distributors", cooperation: "cooperation", data_deletion: "privacy", research_proposal: "research" } as Record<string, string>)[kind] || "requests";
}

function RequestList({ requests, onSelect }: { requests: FrontRequest[]; onSelect?: (id: string) => void }) {
  const { locale, href } = useApp(); const text = useAccountText();
  return <div className={styles.requestList}>{requests.map(request => <Link className={styles.requestRow} href={`${href("account/requests")}?id=${encodeURIComponent(request.id)}`} key={request.id} onClick={() => onSelect?.(request.id)}><span className={styles.requestIcon}><FileText size={20} /></span><span className={styles.requestTitle}><strong>{text(requestKind(request.kind))}</strong><small><bdi>{request.id}</bdi><span>·</span>{formatDate(request.createdAt, locale)}</small></span><Status value={request.status} /><ChevronRight className={styles.directionArrow} size={17} /></Link>)}</div>;
}

function OverviewPanel({ requests, name }: { requests: FrontRequest[]; name: string }) {
  const { locale, saved, inquiries, href } = useApp(); const text = useAccountText();
  const stats = [["allRequests", requests.length, FileText], ["openRequests", requests.filter(request => !["resolved", "closed", "withdrawn"].includes(request.status)).length, Clock3], ["saved", saved.length, Bookmark], ["inquiry", inquiries.length, Grid2X2]] as const;
  return <><div className={styles.welcomeCard}><div><span className={styles.eyebrow}>{text("welcome")}</span><h2>{name}</h2><p>{text("loginDescription")}</p><Link className={styles.primaryButton} href={href("products")}>{text("startInquiry")}<Plus size={17} /></Link></div><div className={styles.welcomeArt} aria-hidden="true"><div /><div /><Sparkles size={45} /></div></div><div className={styles.stats}>{stats.map(([label, amount, Icon]) => <div key={label} className={styles.statCard} data-liquid-surface=""><span><Icon size={19} /></span><strong>{new Intl.NumberFormat(locale).format(amount)}</strong><small>{text(label)}</small></div>)}</div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("latestRequests")}</h2><Link href={href("account/requests")}>{text("viewRequests")}<ArrowRight className={styles.directionArrow} size={14} /></Link></div>{requests.length ? <RequestList requests={requests.slice(0, 5)} /> : <EmptyState title={text("noRequests")} href={href("products")} action={text("startInquiry")} />}</div><div className={styles.portalShortcuts}>{[["account/quick-matrix", "quickMatrix", Grid2X2], ["resources", "resources", Download], ["research", "research", FileText]].map(([url, label, Icon]) => { const Symbol = Icon as typeof Grid2X2; return <Link href={href(url as string)} key={label as string}><Symbol size={23} /><strong>{text(label as string)}</strong><ArrowRight className={styles.directionArrow} size={17} /></Link>; })}</div></>;
}

function ProfilePanel({ session }: { session: FrontSession }) {
  const { locale, notify, signIn, switchLocale } = useApp(); const text = useAccountText();
  const [profile, saveProfile] = useLocalState<Profile>(`idealmakoo.account.${session.id}.profile.v1`, { name: session.name, phone: "", organization: "", profession: "", timezone: "Asia/Tehran", language: locale });
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const save = (event: FormEvent) => { event.preventDefault(); if (draft.name.trim().length < 2) { notify(text("fieldRequired")); return; } saveProfile({ ...draft, name: draft.name.trim() }); signIn(session.role, draft.name.trim(), session.email); notify(text("profileSaved")); if (draft.language !== locale) switchLocale(draft.language); };
  return <div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("profile")}</h2><UserRound size={20} /></div><form className={styles.profileForm} onSubmit={save}><div className={styles.formGrid}>{[["name", "name"], ["phone", "phone"], ["organization", "organization"], ["profession", "profession"]].map(([key, label]) => <label className={styles.field} key={key}><span>{text(label)}</span><input value={draft[key as keyof Profile]} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} required={key === "name"} maxLength={100} dir={key === "phone" ? "ltr" : undefined} /></label>)}<label className={styles.field}><span>{text("email")}</span><input value={session.email} readOnly dir="ltr" /><small>{text("emailReadOnly")}</small></label><label className={styles.field}><span>{text("language")}</span><select value={draft.language} onChange={event => setDraft(value => ({ ...value, language: event.target.value as Locale }))}>{locales.map(language => <option key={language} value={language}>{localeNames[language]}</option>)}</select></label><label className={styles.field}><span>{text("timeZone")}</span><select value={draft.timezone} onChange={event => setDraft(value => ({ ...value, timezone: event.target.value }))}>{["Asia/Tehran", "Europe/Istanbul", "Asia/Dubai", "Europe/Moscow", "Europe/London", "UTC"].map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></label></div><button className={styles.primaryButton} type="submit">{text("save")}<Check size={17} /></button></form></div>;
}

function OrganizationsPanel({ session, requests }: { session: FrontSession; requests: FrontRequest[] }) {
  const { notify } = useApp(); const text = useAccountText();
  const [organizations, setOrganizations] = useLocalState<Organization[]>(`idealmakoo.account.${session.id}.organizations.v1`, []);
  const [activeId, setActiveId] = useState(""); const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState(""); const [city, setCity] = useState(""); const [country, setCountry] = useState(""); const [memberEmail, setMemberEmail] = useState("");
  const selected = organizations.find(organization => organization.id === activeId) || organizations[0];
  const addOrganization = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; const organization: Organization = { id: makeId("ORG"), name: name.trim(), city, country, members: [{ id: session.id, name: session.name, email: session.email, role: "owner", status: "active" }], sharedRequestIds: [] }; setOrganizations(items => [...items, organization]); setActiveId(organization.id); setName(""); setFormOpen(false); notify(text("savedChanges")); };
  const invite = (event: FormEvent) => { event.preventDefault(); if (!selected || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) { notify(text("validEmail")); return; } if (selected.members.some(member => member.email.toLowerCase() === memberEmail.trim().toLowerCase())) { notify(text("emailExists")); return; } setOrganizations(items => items.map(organization => organization.id === selected.id ? { ...organization, members: [...organization.members, { id: makeId("MEM"), name: memberEmail.trim().split("@")[0], email: memberEmail.trim(), role: "member", status: "prepared" }] } : organization)); setMemberEmail(""); notify(text("memberLocal")); };
  return <><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("organizations")}</h2><button type="button" className={styles.secondaryButton} onClick={() => setFormOpen(value => !value)}><Plus size={16} />{text("createOrganization")}</button></div>{formOpen && <form className={styles.inlineForm} onSubmit={addOrganization}><label className={styles.field}><span>{text("organizationName")}</span><input required value={name} onChange={event => setName(event.target.value)} maxLength={100} /></label><label className={styles.field}><span>{text("city")}</span><input value={city} onChange={event => setCity(event.target.value)} maxLength={80} /></label><label className={styles.field}><span>{text("country")}</span><input value={country} onChange={event => setCountry(event.target.value)} maxLength={80} /></label><button className={styles.primaryButton}>{text("save")}<Check size={16} /></button></form>}{organizations.length ? <div className={styles.organizationTabs}>{organizations.map(organization => <button key={organization.id} className={selected?.id === organization.id ? styles.selectedOrganization : ""} onClick={() => setActiveId(organization.id)}><Building2 size={20} /><strong>{organization.name}</strong><small>{[organization.city, organization.country].filter(Boolean).join(" · ")}</small></button>)}</div> : <EmptyState title={text("noOrganizations")} icon="profile" />}</div>{selected && <><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("members")}</h2><Users size={20} /></div><div className={styles.memberList}>{selected.members.map(member => <div key={member.id}><span className={styles.smallAvatar}><UserRound size={17} /></span><span><strong>{member.name}</strong><small dir="ltr">{member.email}</small></span><span className={styles.statusBadge} data-tone={member.status === "active" ? "success" : "warning"}>{text(member.status === "active" ? "enabled" : "connectionPending")}</span>{member.id !== session.id && <button type="button" className={styles.iconButton} aria-label={text("remove")} onClick={() => setOrganizations(items => items.map(organization => organization.id === selected.id ? { ...organization, members: organization.members.filter(item => item.id !== member.id) } : organization))}><Trash2 size={16} /></button>}</div>)}</div><form className={styles.memberInvite} onSubmit={invite}><label className={styles.field}><span>{text("email")}</span><input type="email" dir="ltr" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="colleague@company.com" required /></label><button className={styles.secondaryButton}>{text("addMember")}<Plus size={16} /></button></form><p className={styles.smallNote}>{text("memberLocal")}</p></div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("sharedRequests")}</h2><FileText size={20} /></div>{requests.length ? requests.map(request => <label className={styles.shareRequest} key={request.id}><input type="checkbox" checked={selected.sharedRequestIds.includes(request.id)} onChange={event => setOrganizations(items => items.map(organization => organization.id === selected.id ? { ...organization, sharedRequestIds: event.target.checked ? [...organization.sharedRequestIds, request.id] : organization.sharedRequestIds.filter(id => id !== request.id) } : organization))} /><span>{text(requestKind(request.kind))}<small><bdi>{request.id}</bdi></small></span><Status value={request.status} /></label>) : <p className={styles.smallNote}>{text("noRequests")}</p>}</div></>}</>;
}

function RequestsPanel({ requests, section }: { requests: FrontRequest[]; section: string }) {
  const { catalog: products, locale, session, href, updateRequest, notify } = useApp(); const text = useAccountText();
  const displayProducts = useExistingProductDisplay(products);
  const [selectedId, setSelectedId] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [reply, setReply] = useState("");
  useEffect(() => { const read = () => setSelectedId(new URLSearchParams(window.location.search).get("id") || section.split("/")[1] || ""); read(); window.addEventListener("popstate", read); return () => window.removeEventListener("popstate", read); }, [section]);
  const selected = requests.find(request => request.id === selectedId);
  const filtered = requests.filter(request => (status === "all" || request.status === status) && `${request.id} ${request.organization} ${request.message}`.toLowerCase().includes(search.toLowerCase()));
  const addReply = (event: FormEvent) => { event.preventDefault(); if (!selected || !reply.trim()) return; if (updateRequest(selected.id, { messages: [...(selected.messages || []), { id: makeId("MSG"), body: reply.trim(), visibility: "public", createdAt: new Date().toISOString(), sender: session?.name || selected.name }], status: selected.status === "waiting_customer" ? "in_review" : selected.status })) { setReply(""); notify(text("localReply")); } };
  if (selectedId && !selected) return <EmptyState title={text("noTracking")} href={href("account/requests")} action={text("back")} onAction={() => setSelectedId("")} />;
  return <>{selected ? <><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><div><button className={styles.textLink} onClick={() => { setSelectedId(""); window.history.replaceState(null, "", href("account/requests")); }}>{text("back")}</button><h2>{text("requestDetails")}</h2></div><Status value={selected.status} /></div><div className={styles.requestMeta}><span><small>{text("tracking")}</small><bdi>{selected.id}</bdi></span><span><small>{text("requestType")}</small>{text(requestKind(selected.kind))}</span><span><small>{text("date")}</small>{formatDate(selected.createdAt, locale)}</span></div><p className={styles.requestBody}>{selected.message}</p><div className={styles.requestProducts}>{selected.productIds.map(id => { const product = displayProducts.find(item => item.id === id); return product ? <Link key={id} href={existingProductHref(product, products, locale)}><img src={product.image} alt="" width={40} height={40} /><ExistingProductName product={product} locale={locale} /><ArrowRight className={styles.directionArrow} size={14} /></Link> : null; })}</div>{selected.items && selected.items.length > 0 && <div className={styles.tableWrap}><table><thead><tr><th>{text("products")}</th><th>{text("mould")}</th><th>{text("shade")}</th><th>{text("quantity")}</th></tr></thead><tbody>{selected.items.map((item, index) => <tr key={index}><td><ExistingProductName product={displayProducts.find(product => product.id === item.productId)} locale={locale} fallback={item.productId} />{item.sku && <><br/><small dir="ltr">SKU: {item.sku}</small></>}</td><td><bdi>{item.mould || "—"}</bdi></td><td><bdi>{item.shade || "—"}</bdi></td><td>{new Intl.NumberFormat(locale).format(item.quantity)}{item.unit && <> <bdi>{item.unit}</bdi></>}</td></tr>)}</tbody></table></div>}<div className={styles.panelActions}><button className={styles.secondaryButton} onClick={() => downloadJson(publicRequestSnapshot(selected), `${selected.id}.json`)}><Download size={16} />{text("download")}</button>{!["closed", "withdrawn", "resolved"].includes(selected.status) && <button className={styles.dangerButton} onClick={() => { if (window.confirm(text("confirmWithdraw"))) updateRequest(selected.id, { status: "withdrawn" }); }}>{text("withdraw")}</button>}</div></div><SharedQuotes request={selected} /><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("conversation")}</h2><MessageSquare size={20} /></div><p className={styles.smallNote}>{text("publicOnly")}</p><div className={styles.conversation}><div className={styles.messageBubble}><strong>{selected.name}</strong><p>{selected.message}</p><time>{formatDate(selected.createdAt, locale)}</time></div>{(selected.messages || []).filter(message => message.visibility === "public").map(message => <div className={styles.messageBubble} key={message.id} data-own={message.sender === session?.name || message.sender === selected.name}><strong>{message.sender}</strong><p>{message.body}</p><time>{formatDate(message.createdAt, locale)}</time></div>)}</div>{!["withdrawn", "closed"].includes(selected.status) && <form className={styles.replyForm} onSubmit={addReply}><label className={styles.field}><span>{text("reply")}</span><textarea value={reply} onChange={event => setReply(event.target.value)} placeholder={text("messagePlaceholder")} maxLength={4000} rows={3} required /></label><button className={styles.primaryButton} type="submit">{text("sendReply")}<Send size={16} /></button></form>}</div></> : <div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("allRequests")}</h2><Link className={styles.secondaryButton} href={href("products")}><Plus size={16} />{text("startInquiry")}</Link></div><div className={styles.listFilters}><label className={styles.searchInput}><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={text("search")} aria-label={text("search")} /></label><select value={status} onChange={event => setStatus(event.target.value)} aria-label={text("status")}><option value="all">{text("all")}</option>{Array.from(new Set(requests.map(request => request.status))).map(value => <option value={value} key={value}>{text(value)}</option>)}</select></div>{filtered.length ? <RequestList requests={filtered} onSelect={setSelectedId} /> : <EmptyState title={text("noRequests")} href={href("products")} action={text("startInquiry")} />}</div>}</>;
}

function SharedQuotes({ request }: { request: FrontRequest }) {
  const { locale, updateRequest, notify } = useApp(); const text = useAccountText(); const [notes, setNotes] = useState<Record<string, string>>({});
  const [quoteNow, setQuoteNow] = useState(() => Date.now());
  const quotes = useMemo(() => request.sharedQuotes || [], [request.sharedQuotes]);
  useEffect(() => {
    const refresh = () => setQuoteNow(Date.now());
    const nextExpiry = Math.min(...quotes.filter(quote => quote.status === "issued").map(quote => Date.parse(quote.validUntil || "")).filter(time => time > quoteNow));
    const timer = Number.isFinite(nextExpiry) ? window.setTimeout(refresh, Math.max(1, Math.min(nextExpiry - Date.now() + 1, 2147483647))) : undefined;
    window.addEventListener("focus", refresh);
    return () => { if (timer !== undefined) window.clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [quotes, quoteNow]);
  const respond = (quote: SharedQuote, status: QuoteResponseStatus) => {
    const at = Date.now();
    setQuoteNow(at);
    const response = createQuoteResponse(quote, status, notes[quote.id] || "", at);
    if (!response) { notify(text(quote.status === "issued" ? "quoteExpiredHelp" : "quoteResponseClosed")); return; }
    if (updateRequest(request.id, { sharedQuotes: quotes.map(item => item.id === quote.id ? response : item) })) notify(text("localReply"));
  };
  const statusLabels: Record<SharedQuote["status"], string> = { issued: "quoteIssuedStatus", accepted_interest: "quoteInterestStatus", declined: "quoteDeclinedStatus", revision_requested: "requestRevision" };
  const responseLabels: Record<QuoteResponseStatus, string> = { accepted_interest: "interestRecorded", declined: "declinedRecorded", revision_requested: "revisionRecorded" };
  if (!quotes.length) return null;
  return <div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("quotes")}</h2><FileText size={20} /></div>{quotes.map(quote => {
    const canRespond = canRespondToQuote(quote, quoteNow);
    const expired = quote.status === "issued" && !canRespond;
    return <article className={styles.quoteCard} key={quote.id}>
      <header><div><strong>{quote.title}</strong><small><bdi>{quote.number}</bdi> · {formatDate(quote.issuedAt, locale)}</small></div><span className={styles.quoteAmount}><bdi>{quote.amount} {quote.currency}</bdi></span></header>
      <QuoteLines lines={quote.lines || []}/>
      {quote.terms && <p className={styles.requestBody}>{quote.terms}</p>}
      <span className={styles.statusBadge} data-tone={expired ? "muted" : quote.status === "revision_requested" ? "warning" : quote.status === "accepted_interest" ? "success" : "info"}>{text(expired ? "quoteExpired" : statusLabels[quote.status])}</span>
      <p className={styles.smallNote}>{text("quoteInterestNote")}</p>
      {quote.validUntil && <small>{text("validUntil")}: {formatDate(quote.validUntil, locale)}</small>}
      {quote.status === "issued" ? <>
        {expired && <p id={`quote-expired-${quote.id}`} className={styles.smallNote} role="status">{text("quoteExpiredHelp")}</p>}
        <label className={styles.field}><span>{text("note")}</span><textarea value={notes[quote.id] || ""} onChange={event => setNotes(value => ({ ...value, [quote.id]: event.target.value }))} rows={2} maxLength={1000} disabled={!canRespond} /></label>
        <div className={styles.panelActions} aria-describedby={expired ? `quote-expired-${quote.id}` : undefined}>
          <button className={styles.primaryButton} disabled={!canRespond} onClick={() => respond(quote, "accepted_interest")}>{text("expressInterest")}<Check size={16} /></button>
          <button className={styles.secondaryButton} disabled={!canRespond} onClick={() => respond(quote, "declined")}>{text("reject")}</button>
          <button className={styles.secondaryButton} disabled={!canRespond} onClick={() => respond(quote, "revision_requested")}>{text("requestRevision")}</button>
        </div>
      </> : <><p className={quote.status === "declined" ? styles.smallNote : styles.successMessage} role="status">{text(responseLabels[quote.status])}</p>{quote.customerResponse && <p className={styles.requestBody}>{quote.customerResponse}</p>}</>}
      <button className={styles.textLink} onClick={() => window.print()}>{text("print")}</button>
    </article>;
  })}</div>;
}

function QuickMatrix() {
  const { catalog: products, locale, inquiries, setInquiries, href, notify } = useApp(); const text = useAccountText();
  const teeth = products.filter(product => product.family === "teeth");
  const [productId, setProductId] = useState(teeth[0]?.id || ""); const [shadeInput, setShadeInput] = useState(""); const [quantities, setQuantities] = useState<Record<string, number>>({}); const [error, setError] = useState(""); const fileRef = useRef<HTMLInputElement>(null);
  const product = teeth.find(item => item.id === productId) || teeth[0];
  useEffect(() => { if (!products.some(item => item.id === productId && item.family === "teeth")) { setProductId(products.find(item => item.family === "teeth")?.id || ""); setQuantities({}); } }, [products, productId]);
  const moulds = Array.from(new Set(product?.specs.filter(spec => /posterior codes|mould codes/i.test(spec.label.en)).flatMap(spec => spec.value.en.split(/[·,،;\r\n]+/).map(value => value.trim()).filter(Boolean)) || []));
  const shades = Array.from(new Set(shadeInput.split(/[,،;]/).map(value => value.trim().slice(0, 30)).filter(Boolean))).slice(0, 12);
  const addMatrix = () => { const rows = moulds.flatMap(mould => shades.map(shade => ({ productId: product?.id || productId, mould, shade, quantity: quantities[`${mould}|${shade}`] || 0 }))).filter(row => row.quantity > 0); if (!rows.length) { setError(text("matrixEmpty")); return; } setInquiries(current => mergeInquiryLines(current, rows)); setQuantities({}); setError(""); notify(text("matrixAdded")); };
  const importFile = async (file?: File) => { if (!file) return; try { if (file.size > 256000) throw new Error("size"); const rows = importInquiryCsv(await file.text(), products); setInquiries(current => mergeInquiryLines(current, rows)); setError(""); notify(text("matrixAdded")); } catch { setError(text("invalidCsv")); } if (fileRef.current) fileRef.current.value = ""; };
  return <div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("quickMatrix")}</h2><Grid2X2 size={21} /></div><p className={styles.smallNote}>{text("matrixIntro")}</p><div className={styles.formGrid}><label className={styles.field}><span>{text("products")}</span><select value={productId} onChange={event => { setProductId(event.target.value); setQuantities({}); }}>{teeth.map(item => <option value={item.id} key={item.id}>{item.name[locale]}</option>)}</select></label><label className={styles.field}><span>{text("shadeCodes")}</span><input dir="ltr" value={shadeInput} onChange={event => setShadeInput(event.target.value)} maxLength={350} /></label></div>{product && <div className={styles.matrixProduct}><img src={product.image} width={70} height={70} alt={product.name[locale]} /><div><strong>{product.name[locale]}</strong>{product.sourceUrl && <a href={product.sourceUrl} target="_blank" rel="noreferrer">{text("source")}<ArrowRight className={styles.directionArrow} size={13} /></a>}</div><Link className={styles.textLink} href={existingProductHref(product, products, locale)}>{text("catalogue")}</Link></div>}{!moulds.length ? <p className={styles.smallNote}>{text("noMoulds")}</p> : !shades.length ? <div className={styles.matrixPlaceholder}><Grid2X2 size={27} /><p>{text("noShades")}</p></div> : <div className={styles.tableWrap}><table className={styles.matrixTable}><thead><tr><th>{text("mould")} / {text("shade")}</th>{shades.map(shade => <th key={shade}><bdi>{shade}</bdi></th>)}</tr></thead><tbody>{moulds.map(mould => <tr key={mould}><th><bdi>{mould}</bdi></th>{shades.map(shade => <td key={shade}><input type="number" min={0} max={100000} step={1} value={quantities[`${mould}|${shade}`] || ""} onChange={event => setQuantities(value => ({ ...value, [`${mould}|${shade}`]: Math.max(0, Math.min(100000, Math.floor(Number(event.target.value) || 0))) }))} aria-label={`${mould} ${shade} ${text("quantity")}`} placeholder="0" /></td>)}</tr>)}</tbody></table></div>}{error && <p className={styles.inlineError} role="alert">{error}</p>}<div className={styles.panelActions}><button className={styles.primaryButton} onClick={addMatrix}>{text("addMatrix")}<Plus size={16} /></button><Link className={styles.secondaryButton} href={href("inquiry-list")}>{text("inquiry")} ({inquiries.length})<ArrowRight className={styles.directionArrow} size={16} /></Link></div><div className={styles.csvTools}><button onClick={() => exportCsv([["productId", "mould", "shade", "quantity"]], "idealmakoo-inquiry-template.csv")}><Download size={16} />{text("downloadTemplate")}</button><button onClick={() => fileRef.current?.click()}><Plus size={16} />{text("importCsv")}</button><button onClick={() => exportCsv([["productId", "mould", "shade", "quantity"], ...inquiries.map(item => [item.productId, item.mould || "", item.shade || "", item.quantity])], "idealmakoo-inquiry.csv")}><Download size={16} />{text("exportCsv")}</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={event => void importFile(event.target.files?.[0])} /></div></div>;
}

function SavedPanel() {
  const { catalog: products, saved, toggleSaved, locale, href } = useApp(); const text = useAccountText();
  const displayProducts = useExistingProductDisplay(products);
  const items = saved.flatMap(id => { const clean = id.replace(/^(product|article|resource):/, ""); const product = displayProducts.find(item => item.id === clean); if (product) return [{ id, title: existingProductTitle(product, locale).title, product, href: existingProductHref(product, products, locale), image: product.image, type: text("products") }]; const article = articles.find(item => item.id === clean); if (article) return [{ id, product: undefined as Product | undefined, title: article.title[locale], href: href(`research/${article.slug}`), image: article.image || "", type: text("research") }]; const resource = resources.find(item => item.id === clean); return resource ? [{ id, product: undefined as Product | undefined, title: resource.title[locale], href: resource.url, image: "", type: text("resources") }] : []; });
  return <div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("saved")}</h2><Bookmark size={20} /></div>{items.length ? <div className={styles.savedGrid}>{items.map(item => <article className={styles.savedCard} data-liquid-surface="" key={item.id}><Link href={item.href}><div className={styles.savedImage}>{item.image ? <img src={item.image} alt={item.title} width={280} height={190} /> : <FileText size={38} />}</div><small>{item.type}</small><h3>{item.product ? <ExistingProductName product={item.product} locale={locale} /> : item.title}</h3></Link><button className={styles.removeSaved} aria-label={`${text("remove")} ${item.title}`} onClick={() => toggleSaved(item.id)}><Bookmark size={17} fill="currentColor" /></button></article>)}</div> : <EmptyState title={text("noSaved")} href={href("products")} action={text("browseProducts")} icon="saved" />}</div>;
}

function NotificationsPanel({ requests }: { requests: FrontRequest[] }) {
  const { session, locale, href, notify } = useApp(); const text = useAccountText(); const owner = session?.id || "guest";
  const [read, setRead] = useLocalState<string[]>(`idealmakoo.account.${owner}.notifications-read.v1`, []);
  const [preferences, setPreferences] = useLocalState<NotificationPrefs>(`idealmakoo.account.${owner}.notification-prefs.v1`, { inApp: true, email: false, requests: true, products: false, research: false, events: false, frequency: "immediate", quietStart: "22:00", quietEnd: "08:00" });
  const [draft, setDraft] = useState(preferences); useEffect(() => setDraft(preferences), [preferences]);
  const messages = requests.flatMap(request => [{ id: `request-${request.id}-${request.status}`, title: text(requestKind(request.kind)), requestId: request.id, body: text(request.status), createdAt: request.createdAt }, ...(request.messages || []).filter(message => message.visibility === "public" && message.sender !== session?.name && message.sender !== request.name).map(message => ({ id: message.id, title: text("reply"), requestId: request.id, body: message.body, createdAt: message.createdAt }))]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("notifications")}</h2><button className={styles.textLink} onClick={() => setRead(Array.from(new Set([...read, ...messages.map(message => message.id)])))}>{text("markAllRead")}</button></div>{messages.length ? <div className={styles.notificationList}>{messages.map(message => <Link key={message.id} href={`${href("account/requests")}?id=${encodeURIComponent(message.requestId)}`} onClick={() => setRead(items => Array.from(new Set([...items, message.id])))} data-unread={!read.includes(message.id)}><span className={styles.notificationIcon}><Bell size={19} /></span><span><strong>{message.title}</strong><p>{message.body.slice(0, 150)}</p><small>{formatDate(message.createdAt, locale)}</small></span><i>{text(read.includes(message.id) ? "read" : "unread")}</i></Link>)}</div> : <EmptyState title={text("noNotifications")} />}</div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("notificationPreferences")}</h2><Bell size={20} /></div><form onSubmit={event => { event.preventDefault(); setPreferences(draft); notify(text("savedChanges")); }}><div className={styles.preferencesGrid}>{["inApp", "email", "requests", "products", "research", "events"].map(key => <label className={styles.preferenceToggle} key={key}><span>{text(key)}</span><input type="checkbox" checked={draft[key as keyof NotificationPrefs] === true} onChange={event => setDraft(value => ({ ...value, [key]: event.target.checked }))} /></label>)}</div><div className={styles.formGrid}><label className={styles.field}><span>{text("frequency")}</span><select value={draft.frequency} onChange={event => setDraft(value => ({ ...value, frequency: event.target.value }))}>{["immediate", "daily", "weekly"].map(value => <option key={value} value={value}>{text(value)}</option>)}</select></label><label className={styles.field}><span>{text("quietHours")}</span><div className={styles.timeRange}><input type="time" value={draft.quietStart} onChange={event => setDraft(value => ({ ...value, quietStart: event.target.value }))} /><span>—</span><input type="time" value={draft.quietEnd} onChange={event => setDraft(value => ({ ...value, quietEnd: event.target.value }))} /></div></label></div><p className={styles.smallNote}>{text("connectionPending")}: {text("email")}</p><button className={styles.primaryButton}>{text("save")}<Check size={16} /></button></form></div></>;
}

function SecurityPanel({ session, requests }: { session: FrontSession; requests: FrontRequest[] }) {
  const { notify, signOut, createRequest } = useApp(); const text = useAccountText();
  const [preferences, setPreferences] = useLocalState<SecurityPreferences>(securityKey(session.id), securityDefault);
  const staffMfaRequired = session.role !== "customer";
  const mfaEnabled = staffMfaRequired || preferences.mfaEnabled;
  const [mfaCode, setMfaCode] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [passwordBusy, setPasswordBusy] = useState(false);
  const changePassword = async (event: FormEvent) => { event.preventDefault(); if (!isValidPassword(newPassword)) { notify(text("passwordRules")); return; } setPasswordBusy(true); try { const accounts = readLocalAccounts(); const account = accounts.find(item => item.email === session.email); if (!account) { notify(text("demoPasswordFixed")); return; } if (await digestPassword(currentPassword, account.salt) !== account.passwordDigest) { notify(text("wrongCredentials")); return; } const salt = crypto.randomUUID(); const passwordDigest = await digestPassword(newPassword, salt); if (!saveLocalAccounts(accounts.map(item => item.id === account.id ? { ...item, salt, passwordDigest } : item))) throw new Error("storage"); setCurrentPassword(""); setNewPassword(""); notify(text("passwordChanged")); } catch { notify(text("storageError")); } finally { setPasswordBusy(false); } };
  const requestDeletion = async () => { const existing = requests.find(request => request.kind === "data_deletion" && !["closed", "resolved", "withdrawn"].includes(request.status)); if (existing) { notify(text("privacyRecorded")); return; } try { await createRequest({ kind: "data_deletion", name: session.name, email: session.email, organization: "", message: text("privacyRequestText"), productIds: [], status: "received" }); notify(text("privacyRecorded")); } catch { notify(text("storageError")); } };
  const exportData = () => downloadJson({ profile: readStore(`idealmakoo.account.${session.id}.profile.v1`, { name: session.name, email: session.email }), organizations: readStore(`idealmakoo.account.${session.id}.organizations.v1`, []), preferences: readStore(`idealmakoo.account.${session.id}.notification-prefs.v1`, {}), requests: requests.map(publicRequestSnapshot), exportedAt: new Date().toISOString() }, "idealmakoo-my-data.json");
  return <><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("currentSession")}</h2><ShieldCheck size={21} /></div><div className={styles.sessionCard}><span className={styles.requestIcon}><LockKeyhole size={23} /></span><div><strong>{text("thisBrowser")}</strong><small><bdi>{session.email}</bdi></small><p>{text("localSession")}</p></div><button className={styles.secondaryButton} onClick={signOut}>{text("logout")}<LogOut size={16} /></button></div></div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("demoMfa")}</h2><span className={styles.statusBadge} data-tone={mfaEnabled ? "success" : "muted"}>{text(mfaEnabled ? "enabled" : "disabled")}</span></div><p className={styles.smallNote}>{text("localAuth")}</p>{staffMfaRequired && <p className={styles.smallNote}>{text("staffMfaRequired")}</p>}{mfaEnabled ? <div className={styles.panelActions}>{!staffMfaRequired && <button className={styles.secondaryButton} onClick={() => setPreferences({ mfaEnabled: false, recoveryCodes: [] })}>{text("disabled")}</button>}<button className={styles.secondaryButton} onClick={() => setPreferences(value => ({ ...value, recoveryCodes: Array.from({ length: 8 }, () => crypto.randomUUID().replaceAll("-", "").slice(0, 12)) }))}>{text("generateCodes")}</button></div> : <form className={styles.memberInvite} onSubmit={event => { event.preventDefault(); if (mfaCode !== "123456") { notify(text("wrongCode")); return; } setPreferences({ mfaEnabled: true, recoveryCodes: [] }); setMfaCode(""); notify(text("savedChanges")); }}><label className={styles.field}><span>{text("demoCode")}</span><input value={mfaCode} onChange={event => setMfaCode(normalizeVerificationCode(event.target.value))} dir="ltr" inputMode="numeric" maxLength={6} required /></label><button className={styles.primaryButton}>{text("enable")}<Check size={16} /></button></form>}{preferences.recoveryCodes.length > 0 && <><h3 className={styles.minorHeading}>{text("recoveryCodes")}</h3><div className={styles.recoveryCodes}>{preferences.recoveryCodes.map(code => <code key={code}>{code}</code>)}</div><button className={styles.textLink} onClick={() => void copyText(preferences.recoveryCodes.join("\n")).then(() => notify(text("copied"))).catch(() => notify(text("clipboardError")))}>{text("copy")}</button></>}</div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("changePassword")}</h2><LockKeyhole size={21} /></div>{session.email.endsWith(".invalid") ? <p className={styles.smallNote}>{text("demoPasswordFixed")}</p> : <form onSubmit={changePassword}><div className={styles.formGrid}><label className={styles.field}><span>{text("currentPassword")}</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required dir="ltr" /></label><label className={styles.field}><span>{text("newPassword")}</span><input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} maxLength={128} required dir="ltr" /></label></div><p className={styles.smallNote}>{text("passwordRules")}</p><button className={styles.primaryButton} disabled={passwordBusy}>{text(passwordBusy ? "working" : "save")}<Check size={16} /></button></form>}</div><div className={styles.panel} data-liquid-surface=""><div className={styles.panelTitle}><h2>{text("privacy")}</h2><ShieldCheck size={21} /></div><div className={styles.panelActions}><button className={styles.secondaryButton} onClick={exportData}>{text("exportMyData")}<Download size={16} /></button><button className={styles.dangerButton} onClick={() => void requestDeletion()}>{text("deletionRequest")}</button></div></div></>;
}
