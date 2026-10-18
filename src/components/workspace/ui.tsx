'use client';

import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/components/providers/AppProvider';
import { useDialogPortalTarget, useViewportDialog } from '@/components/ui/dialog-runtime';
import './workspace-modal.css';
import { X, Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { wt } from './i18n';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), closeButton = useRef<HTMLButtonElement>(null), backdropDown = useRef(false);
  const titleId = useId(), portalTarget = useDialogPortalTarget();
  const { locale, dir, role } = useApp();
  useViewportDialog(ref, true, portalTarget, onClose, { initialFocus: closeButton });
  const outside = (x: number, y: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    return Boolean(bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom));
  };
  if (!portalTarget) return null;
  return createPortal(
    <dialog ref={ref} className={`ws-modal ws-viewport-modal ws-root ws-liquid-workspace glass ${wide ? 'ws-modal-wide' : ''}`}
      data-viewport-dialog="true" data-role={role} dir={dir} lang={locale} aria-labelledby={titleId} tabIndex={-1}
      onPointerDown={event => { backdropDown.current = event.target === event.currentTarget && outside(event.clientX, event.clientY); }}
      onPointerCancel={() => { backdropDown.current = false; }}
      onClick={event => {
        const dismiss = backdropDown.current && event.target === event.currentTarget && outside(event.clientX, event.clientY);
        backdropDown.current = false;
        if (dismiss) onClose();
      }}>
      <div className="ws-modal-heading"><h2 id={titleId} dir="auto">{title}</h2><button ref={closeButton} type="button" className="ws-icon-button" onClick={onClose} aria-label={wt('close', locale)}><X size={20}/></button></div>
      <div className="ws-modal-body">{children}</div>
    </dialog>, portalTarget,
  );
}
export function Status({ status, locale }: { status: string; locale: string }) { return <span className={`ws-status ws-status-${status}`}><i/>{wt(status, locale)}</span>; }
export function SearchInput({ value, onChange, locale }: { value: string; onChange: (value: string) => void; locale: string }) { return <label className="ws-search"><Search size={17}/><input aria-label={wt('search', locale)} type="search" placeholder={wt('search', locale)} value={value} onChange={e => onChange(e.target.value)}/></label>; }
export function Empty({ locale, action }: { locale: string; action?: ReactNode }) { return <div className="ws-empty"><Inbox size={42}/><h3>{wt('empty', locale)}</h3><p>{wt('emptyHint', locale)}</p>{action}</div>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="ws-field"><span>{label}</span>{children}</label>; }
export function Pager({ page, total, size, onChange, locale }: { page: number; total: number; size: number; onChange: (page: number) => void; locale: string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="ws-pagination"><span><bdi>{Math.min(page * size + 1, total)}–{Math.min((page + 1) * size, total)} / {total}</bdi> {wt('records', locale)}</span><div><button className="ws-icon-button" disabled={!page} onClick={() => onChange(page - 1)} aria-label={wt('previous', locale)}><ChevronLeft size={17}/></button><span><bdi>{page + 1} / {pages}</bdi></span><button className="ws-icon-button" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)} aria-label={wt('next', locale)}><ChevronRight size={17}/></button></div></div>;
}
export function safeDate(value: string, locale: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) { try { return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar-EG' : locale, { timeZone: 'Asia/Tehran', ...options }).format(new Date(value)); } catch { return value; } }
