'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canWorkspace, type WorkspaceAction } from '@/lib/auth';
import { applyWorkspaceMutation, canPublishWorkspaceSnapshot, canRestoreWorkspaceSnapshot, validWorkspaceSnapshot, matchesWorkspaceSession, projectWorkspaceState, workspaceInsights, canRecordAction, type WorkspaceActor } from './permissions';
import { createWorkspaceSeed, recordText } from '@/data/workspace-seed';
import type { WorkspaceState, WorkspaceRecord, WorkspaceActivity, LocalPublication } from '@/data/workspace-seed';
import { L, localized, wLocale, wt } from './i18n';
import type { WorkspaceText } from './i18n';

export const WORKSPACE_KEY = 'idealmakoo.workspace.v1';
export const PUBLICATION_KEY = 'idealmakoo.publications.v1';
export const REQUEST_KEY = 'idealmakoo.requests.v1';
export const uid = (prefix = 'IM') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export const now = () => new Date().toISOString();
export const fullText = (value: string, locale: string, previous?: WorkspaceText): WorkspaceText => ({ ...(previous || L('', '', '', '', '')), [wLocale(locale)]: value });
export const safeUrl = (value?: string) => !!value && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value) || /^data:(image|video|audio)\//.test(value));

export type PublicRequest = { id: string; kind: string; name: string; email?: string; organization?: string; message?: string; productIds?: string[]; status?: string; createdAt: string; formId?: string; formVersion?: number; formValues?: Record<string,string>; messages?: { id: string; body: string; visibility: 'public' | 'internal'; createdAt: string; sender: string }[]; sharedQuotes?: { id: string; status: string; customerResponse?: string; respondedAt?: string }[] };
function getRequests(): PublicRequest[] {
  try { const value = JSON.parse(localStorage.getItem(REQUEST_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function mergeWorkspaceRequests(state: WorkspaceState, requests: PublicRequest[]): WorkspaceState {
  const fresh = requests.filter(request => request.id && !state.records.some(record => record.requestId === request.id));
  let changed = fresh.length > 0;
  const forms = state.forms.map(form => {
    const incoming = requests.filter(request => request.formId === form.id && request.formValues && !form.responses.some(response => response.id === request.id));
    if (!incoming.length) return form;
    changed = true;
    return {...form, responses: [...form.responses, ...incoming.map(request => ({id:request.id,at:request.createdAt,values:Object.fromEntries(Object.entries(request.formValues || {}).filter(([key,value]) => !['__proto__','prototype','constructor'].includes(key) && typeof value === 'string'))}))]};
  });
  const synchronized = state.records.map(record => {
    const request = requests.find(item => item.id === record.requestId);
    if (!request) return record;
    const messages = (request.messages || []).filter(message => message.visibility === 'public' && !record.history.some(event => event.id === message.id));
    const quote = record.collection === 'quotes' ? request.sharedQuotes?.find(item => item.id === record.id && item.respondedAt && item.respondedAt !== record.quoteResponse?.at) : undefined;
    const withdrawn = request.status === 'withdrawn' && record.status !== 'withdrawn' && record.collection !== 'quotes';
    if (!messages.length && !quote && !withdrawn) return record;
    changed = true;
    const history: WorkspaceActivity[] = [...record.history, ...messages.map(message => ({ id: message.id, text: recordText(message.body), actor: message.sender, visibility: 'public' as const, at: message.createdAt }))];
    if(withdrawn)history.push({id:'withdrawn-'+request.id,text:L('مشتری درخواست را پس گرفت.','The customer withdrew the request.','Müşteri talebi geri çekti.','سحب العميل الطلب.','Клиент отозвал запрос.'),actor:'customer',visibility:'public',at:now()});
    if (quote?.respondedAt) history.push({ id: uid('response'), text: L(`پاسخ مشتری به پیشنهاد: ${quote.status === 'accepted_interest' ? 'اعلام تمایل به همکاری' : quote.status === 'revision_requested' ? 'درخواست اصلاح' : 'عدم پذیرش'} — ${quote.customerResponse || ''}`,`Customer proposal response: ${quote.status === 'accepted_interest' ? 'interest in cooperation' : quote.status === 'revision_requested' ? 'revision requested' : 'declined'} — ${quote.customerResponse || ''}`,`Müşteri teklif yanıtı: ${quote.status === 'accepted_interest' ? 'iş birliğine ilgi' : quote.status === 'revision_requested' ? 'revizyon istendi' : 'reddedildi'} — ${quote.customerResponse || ''}`,`رد العميل على العرض: ${quote.status === 'accepted_interest' ? 'إبداء الرغبة في التعاون' : quote.status === 'revision_requested' ? 'طلب تعديل' : 'عدم القبول'} — ${quote.customerResponse || ''}`,`Ответ клиента: ${quote.status === 'accepted_interest' ? 'интерес к сотрудничеству' : quote.status === 'revision_requested' ? 'запрошены изменения' : 'отказ'} — ${quote.customerResponse || ''}`), actor: 'customer', visibility: 'public', at: quote.respondedAt });
    return { ...record, history, updatedAt: now(), ...(withdrawn?{status:'withdrawn'}:{}), ...(quote?.respondedAt ? { quoteResponse: { status: quote.status, response: quote.customerResponse || '', at: quote.respondedAt } } : {}) };
  });
  if (!changed) return state;
  return { ...state, forms, records: [...fresh.map(request => {
    const kind = request.kind || '';
    const collection = /sample/i.test(kind) ? 'samples' : /support|ticket|quality|complaint/i.test(kind) ? 'tickets' : /career|job|talent|^hr$/i.test(kind) ? 'hr' : /partner|cooperat|distribut|invest|outsourc|suppl/i.test(kind) ? 'partners' : /rfq|inquiry/i.test(kind) ? 'leads' : 'inbox';
    const messages: WorkspaceActivity[] = (request.messages || []).filter(message => message.visibility === 'public').map(message => ({ id: message.id, text: recordText(message.body), at: message.createdAt, actor: message.sender, visibility: 'public' }));
    return { id: request.id, requestId: request.id, collection, title: recordText(request.name || request.organization || request.id), summary: recordText(request.message || ''), organization: request.organization, email: request.email, product: request.productIds?.[0], status: !request.status || request.status === 'received' ? 'new' : request.status, owner: collection === 'tickets' ? 'support' : collection === 'hr' ? 'hr' : 'business', createdAt: request.createdAt, updatedAt: request.createdAt, tags: ['website', kind, ...(/quality/i.test(kind) ? ['quality'] : [])], demo: false, priority: /quality/.test(kind) ? 'high' as const : 'normal' as const, history: [{ id: uid('event'), at: request.createdAt, actor: 'customer', visibility: 'public' as const, text: recordText(request.message || '') }, ...messages] };
  }), ...synchronized] };
}

export function useWorkspaceStore(locale: string, role: string, notify: (message: string) => void, actorId = role) {
  const [rawState, setRawState] = useState<WorkspaceState>(createWorkspaceSeed);
  const live = useRef(rawState);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const actor = useMemo<WorkspaceActor>(()=>({role,id:actorId,locale}),[role,actorId,locale]);
  const commit = useCallback((next:WorkspaceState)=>{live.current=next;setRawState(next);},[]);
  useEffect(() => {
    let base = createWorkspaceSeed();
    try {
      const value = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null');
      if (validWorkspaceSnapshot(value)) base = { ...base, ...value };
    } catch { /* Corrupt local data does not prevent opening the workspace. */ }
    commit(mergeWorkspaceRequests(base, getRequests())); setLoaded(true);
    const sync = () => commit(mergeWorkspaceRequests(live.current,getRequests()));
    window.addEventListener('idealmakoo:requests', sync);
    const storage = (event: StorageEvent) => { if (event.key === REQUEST_KEY) sync(); };
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('idealmakoo:requests', sync); window.removeEventListener('storage', storage); };
  }, [commit]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(rawState)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [rawState, loaded]);
  const state=useMemo(()=>projectWorkspaceState(rawState,role),[rawState,role]);
  const insights=useMemo(()=>workspaceInsights(rawState,role),[rawState,role]);
  const activeActor=useCallback(()=>{try{const session=JSON.parse(localStorage.getItem('idealmakoo.session.v1')||'null');return matchesWorkspaceSession(session,{role,id:actorId,locale});}catch{return false;}},[role,actorId,locale]);
  const permit=useCallback((action:WorkspaceAction,section:string,targetLocale=locale)=>activeActor()&&canWorkspace(role,action,section,{locale:targetLocale}),[activeActor,role,locale]);
  const update = useCallback((fn: (previous: WorkspaceState) => WorkspaceState, message?: string):boolean => {
    if(!activeActor()){notify(wt('denied',locale));return false;}
    const decision=applyWorkspaceMutation(live.current,fn(projectWorkspaceState(live.current,role)),actor);
    if(!decision.ok){notify(wt('denied',locale));return false;}
    commit(decision.state);if(message)notify(message);return true;
  }, [activeActor,actor,role,locale,commit,notify]);
  const log = useCallback((text: WorkspaceText): WorkspaceActivity => ({ id: uid('event'), text, at: now(), actor: role, visibility: 'internal' }), [role]);
  const restoreSnapshot=useCallback((snapshot:unknown):boolean=>{
    if(!activeActor()||!canRestoreWorkspaceSnapshot(actor,snapshot)){notify(wt('invalidImport',locale));return false;}
    const event=log(L('مدیر نسخهٔ محلی میزکار را بازیابی کرد.','Administrator restored the local workspace snapshot.','Yönetici yerel çalışma alanını geri yükledi.','استعاد المسؤول نسخة مساحة العمل المحلية.','Администратор восстановил локальный снимок пространства.'));
    commit({...snapshot,audit:[event,...snapshot.audit].slice(0,300)});notify(wt('saved',locale));return true;
  },[activeActor,actor,commit,log,locale,notify]);
  const patchRecord = useCallback((id: string, patch: Partial<WorkspaceRecord>, message = wt('saved', locale)) => {
    const activity = log(L('پرونده به‌روزرسانی شد.','Record updated.','Kayıt güncellendi.','تم تحديث السجل.','Запись обновлена.'));
    const tagged={...patch,...(patch.author===role?{authorId:actorId}:{}),...(patch.approvedBy===role?{approvedById:actorId}:{}),...(patch.approvedBy===undefined&&'approvedBy' in patch?{approvedById:undefined}:{})};
    const accepted=update(previous => ({ ...previous, records: previous.records.map(record => record.id === id ? { ...record, ...tagged, updatedAt: now(), history: [...record.history, activity] } : record), audit: [activity, ...previous.audit].slice(0, 300) }), message);
    if(accepted&&patch.status&&permit('stage',live.current.records.find(record=>record.id===id)?.collection||'')) {
      const requests = getRequests();
      if (requests.some(request => request.id === id)) {
        localStorage.setItem(REQUEST_KEY, JSON.stringify(requests.map(request => request.id === id ? { ...request, status: patch.status } : request)));
        window.dispatchEvent(new CustomEvent('idealmakoo:requests'));
      }
    }
    return accepted;
  }, [locale,log,update,permit,role,actorId]);
  const addRecord = useCallback((record: WorkspaceRecord) => {
    const activity = log(L('محتوا یا پرونده جدید ثبت شد.','New content or record created.','Yeni içerik veya kayıt oluşturuldu.','تم إنشاء محتوى أو سجل جديد.','Создан новый контент или запись.'));
    return update(previous => ({ ...previous, records: [{...record,author:role,authorId:actorId}, ...previous.records], audit: [activity, ...previous.audit].slice(0, 300) }), wt('saved', locale));
  }, [locale,log,update,role,actorId]);
  const addNote = useCallback((id: string, text: string, visibility: 'public' | 'internal') => {
    const record=live.current.records.find(item=>item.id===id);
    if(!record||!activeActor()||!canRecordAction(actor,visibility==='public'?'reply':'note',record)){notify(wt('denied',locale));return false;}
    const activity = { ...log(recordText(text)), visibility };
    const accepted=update(previous => ({ ...previous, records: previous.records.map(record => record.id === id ? { ...record, updatedAt: now(), history: [...record.history, activity] } : record), audit: [activity, ...previous.audit].slice(0, 300) }), wt('saved', locale));
    if (accepted&&visibility === 'public') {
      const requests = getRequests();
      if (requests.some(request => request.id === id)) {
        localStorage.setItem(REQUEST_KEY, JSON.stringify(requests.map(request => request.id === id ? { ...request, messages: [...(request.messages || []), { id: activity.id, body: text, visibility: 'public', createdAt: activity.at, sender: role }] } : request)));
        window.dispatchEvent(new CustomEvent('idealmakoo:requests'));
      }
    }
    return accepted;
  }, [activeActor,actor,locale,log,notify,role,update]);
  const publish = useCallback((publication: LocalPublication):boolean => {
    const section=publication.kind==='page'?'pages':publication.kind==='product'?'products':publication.kind==='article'?'research':publication.kind;
    const page=live.current.pages.find(item=>item.id===publication.id&&item.locale===publication.locale);
    const record=live.current.records.find(item=>item.id===publication.id);
    const source=section==='pages'?(page||record):record;
    if(!permit('publish',section,publication.locale)||!canPublishWorkspaceSnapshot(actor,publication,source)){notify(wt('reviewRequired',locale));return false;}
    if(page&&(page.title!==publication.title||page.summary!==publication.summary||JSON.stringify(page.blocks)!==JSON.stringify(publication.blocks))){notify(wt('revisionConflict',locale));return false;}
    let previous: LocalPublication[] = [];
    try { const parsed = JSON.parse(localStorage.getItem(PUBLICATION_KEY) || '[]'); if (Array.isArray(parsed)) previous = parsed; } catch { /* Start a clean publication index. */ }
    try{localStorage.setItem(PUBLICATION_KEY, JSON.stringify([...previous.filter(p => !(p.slug === publication.slug && p.locale === publication.locale && p.kind === publication.kind)), publication]));}catch{setStorageError(true);return false;}
    window.dispatchEvent(new CustomEvent('idealmakoo:publications'));notify(wt('publishedNotice', locale));return true;
  }, [permit,locale,notify,actor]);
  const unpublish=useCallback((slug:string,publicationLocale:string,kind='page')=>{
    const module=kind==='page'?'pages':kind==='product'?'products':kind;
    if(!permit('publish',module,publicationLocale)){notify(wt('denied',locale));return false;}
    try{const previous=JSON.parse(localStorage.getItem(PUBLICATION_KEY)||'[]') as LocalPublication[];localStorage.setItem(PUBLICATION_KEY,JSON.stringify(previous.filter(item=>!(item.slug===slug&&item.locale===publicationLocale&&item.kind===kind))));window.dispatchEvent(new CustomEvent('idealmakoo:publications'));notify(wt('saved',locale));return true;}catch{setStorageError(true);return false;}
  },[permit,locale,notify]);
  return { state, insights, actor, actorId, loaded, storageError, locale: wLocale(locale), role, notify, permit, update, restoreSnapshot, patchRecord, addRecord, addNote, log, publish, unpublish };
}
export type WorkspaceStore = ReturnType<typeof useWorkspaceStore>;

export function downloadFile(content: string, filename: string, type = 'application/json;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportRecords(records: WorkspaceRecord[], locale: string, filename: string) {
  const escaped = (value: unknown) => { let str = String(value ?? ''); if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`; return `"${str.replaceAll('"', '""')}"`; };
  const rows = [[wt('title', locale), 'ID', wt('status', locale), wt('organization', locale), wt('email', locale), wt('updated', locale)], ...records.map(record => [localized(record.title, locale), record.id, wt(record.status, locale), record.organization || '', record.email || '', record.updatedAt])];
  downloadFile('\ufeff' + rows.map(row => row.map(escaped).join(',')).join('\r\n'), `${filename}.csv`, 'text/csv;charset=utf-8');
}
export function canEdit(role: string, section: string) { return canWorkspace(role,'edit',section); }
