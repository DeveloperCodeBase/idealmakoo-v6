'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, AudioLines, CheckCircle2, Clipboard, Download, FileText, Image as ImageIcon, Languages, Loader2, Plus, Save, Sparkles, UploadCloud, Video, WandSparkles, X, Link2, ShieldCheck, Trash2, Eye } from 'lucide-react';
import { WorkspaceMedia, recordText } from '@/data/workspace-seed';
import { WorkspaceStore, canEdit, downloadFile, now, uid } from './store';
import { L, WorkspaceLocale, localized, workspaceLocales, wt } from './i18n';
import { Empty, Field, Modal, SearchInput, Status, safeDate } from './ui';

export { ContentStudio } from './AiStudio';

export function MediaLibrary({ store }: { store: WorkspaceStore }) {
  const { state, locale } = store;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const allowed = canEdit(store.role, 'media');
  const asset = state.media.find(media => media.id === selected);
  const visible = state.media.filter(media => (filter === 'all' || media.type === filter) && `${media.title} ${media.filename}`.toLowerCase().includes(query.toLowerCase()));
  const upload = async (file: File) => {
    if(!store.permit('create','media'))return;
    if (file.size > 2 * 1024 * 1024 || !/^(image\/|video\/|audio\/|application\/pdf$)/.test(file.type)) return store.notify(wt('uploadError', locale));
    const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document';
    const media: WorkspaceMedia = { id: uid('MEDIA'), title: file.name, filename: file.name, type, url, size: file.size, usage: [], rights: false, focalX: 50, focalY: 50 };
    if(store.update(previous => ({ ...previous, media: [media, ...previous.media] }), wt('saved', locale)))setSelected(media.id);
  };
  const patch = (data: Partial<WorkspaceMedia>) => { if (asset && allowed) store.update(previous => ({ ...previous, media: previous.media.map(media => media.id === asset.id ? { ...media, ...data } : media) })); };
  const remove = (media: WorkspaceMedia) => { if (media.usage.length || state.pages.some(p => p.blocks.some(b => b.mediaUrl === media.url))) return store.notify(wt('usedAsset', locale)); store.update(previous => ({ ...previous, media: previous.media.filter(item => item.id !== media.id) }), wt('saved', locale)); setSelected(null); };
  return <div><div className="ws-toolbar"><SearchInput value={query} onChange={setQuery} locale={locale}/><div className="ws-toolbar-end"><span className="ws-muted"><bdi>{visible.length}</bdi> {wt('records', locale)}</span>{allowed && <button className="btn btn-primary ws-small-btn" onClick={() => fileRef.current?.click()}><UploadCloud size={17}/>{wt('upload', locale)}</button>}<input ref={fileRef} hidden type="file" accept="image/*,video/*,audio/*,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }}/></div></div><div className="ws-filter-row">{['all', 'image', 'video', 'audio', 'document'].map(type => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{wt(type, locale)}</button>)}</div>
    <div className="ws-upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && allowed) void upload(file); }}><UploadCloud size={22}/><div><strong>{wt('upload', locale)}</strong><p>{wt('uploadHint', locale)}</p></div><button className="btn ws-small-btn" disabled={!allowed} onClick={() => fileRef.current?.click()}><Plus size={17}/>{wt('create', locale)}</button></div>
    <div className="ws-media-grid">{visible.map(media => <article key={media.id} className="ws-card ws-media-card"><button className="ws-media-thumb" onClick={() => setSelected(media.id)} aria-label={media.title}>{media.type === 'image' ? <img src={media.url} alt={media.title} style={{ objectPosition: `${media.focalX}% ${media.focalY}%` }}/> : media.type === 'video' ? <Video size={40}/> : media.type === 'audio' ? <AudioLines size={40}/> : <FileText size={40}/>}<span>{wt(media.type, locale)}</span></button><div className="ws-media-info"><strong>{media.title}</strong><p><bdi>{media.size ? (media.size / 1024).toFixed(0) + ' KB' : media.filename}</bdi></p><div className="ws-flex-between"><span><Link2 size={12}/>{media.usage.length} {wt('usage', locale)}</span><button className="ws-icon-button" aria-label={wt('edit', locale)} onClick={() => setSelected(media.id)}><ArrowUpRight size={16}/></button></div></div></article>)}</div>{!visible.length && <Empty locale={locale}/>}
    {asset && <Modal title={wt('media', locale)} onClose={() => setSelected(null)} wide><div className="ws-asset-editor"><div className="ws-asset-preview">{asset.type === 'image' ? <img src={asset.url} alt={asset.title} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}/> : asset.type === 'video' ? <video src={asset.url} controls/> : asset.type === 'audio' ? <audio src={asset.url} controls/> : <FileText size={70}/>}</div><div className="ws-asset-fields"><Field label={wt('title', locale)}><input className="input" value={asset.title} disabled={!allowed} onChange={e => patch({ title: e.target.value })}/></Field><Field label={wt('type', locale)}><span>{wt(asset.type, locale)}</span></Field>{asset.type === 'image' && <><Field label={localized(L('نقطه تمرکز افقی','Horizontal focal point','Yatay odak noktası','نقطة التركيز الأفقية','Горизонтальная фокусная точка'), locale)}><input type="range" disabled={!allowed} min="0" max="100" value={asset.focalX} onChange={e => patch({ focalX: Number(e.target.value) })}/></Field><Field label={localized(L('نقطه تمرکز عمودی','Vertical focal point','Dikey odak noktası','نقطة التركيز الرأسية','Вертикальная фокусная точка'), locale)}><input type="range" disabled={!allowed} min="0" max="100" value={asset.focalY} onChange={e => patch({ focalY: Number(e.target.value) })}/></Field></>}<label className="ws-checkbox-label"><input type="checkbox" disabled={!allowed} checked={asset.rights} onChange={e => patch({ rights: e.target.checked })}/>{wt('rights', locale)}</label><h4>{wt('usage', locale)}</h4><div className="ws-asset-usage">{asset.usage.length ? asset.usage.map(id => <span key={id}><Link2 size={13}/><bdi>{id}</bdi></span>) : <span>—</span>}</div><div className="ws-detail-actions"><a className="btn ws-small-btn" href={asset.url} download={asset.filename} target="_blank" rel="noreferrer"><Download size={15}/>{wt('exportJson', locale)}</a>{allowed && <button className="btn ws-small-btn" onClick={() => remove(asset)}><Trash2 size={15}/>{wt('delete', locale)}</button>}</div>{asset.sourceUrl && <a className="ws-source-link" href={asset.sourceUrl} target="_blank" rel="noreferrer"><ShieldCheck size={15}/>{wt('source', locale)}</a>}</div></div></Modal>}
  </div>;
}
