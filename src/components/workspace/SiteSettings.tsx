"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Eye, FileDown, Globe2, LayoutTemplate, Link2, Menu, Plus, RotateCcw, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import { company } from "@/data/catalog";
import { direction, formatDate, localeNames, locales, type Locale, type Localized } from "@/lib/i18n";
import { downloadJson, makeId } from "@/lib/storage";
import { applySitePreferences, createDefaultSitePreferences, MAX_MENU_GROUPS, MAX_MENU_ITEMS, normalizeLogoSource, normalizeMenuPath, publicMenuRoutes, readSitePreferencesDraft, saveSitePreferencesDraft, scopeSitePreferences, siteMenuHref, useSitePreferences, validateSitePreferences, visibleMenuGroups, type MenuPlacement, type PreferenceIssue, type SiteMenuGroup, type SitePreferences } from "@/lib/site-preferences";
import { canWorkspace } from '@/lib/auth';
import type { WorkspaceStore } from './store';
import styles from "./SiteSettings.module.css";

type Props = { store: WorkspaceStore; mode?: "menus" | "settings" | "all" };
const copy: Record<string, [string, string, string, string, string]> = {
  title: ["هویت و مسیرهای وب‌سایت", "Website identity & navigation", "Site kimliği ve gezinme", "هوية الموقع والتنقل", "Оформление и навигация сайта"],
  intro: ["منو، نام برند و راه‌های ارتباط را در همان نمای عمومی سایت مدیریت کنید.", "Manage menus, the brand name and contact details in the public site preview.", "Menüleri, marka adını ve iletişim bilgilerini sitenin önizlemesinde yönetin.", "أدر القوائم واسم العلامة وبيانات الاتصال في معاينة الموقع العامة.", "Управляйте меню, названием бренда и контактами в публичном предпросмотре."],
  local: ["اعمال تغییرات، پیش‌نمایش همین مرورگر را به‌روز می‌کند. انتشار مشترک و کنترل دسترسی سروری به بک‌اند متصل می‌شوند.", "Applying changes updates this browser's preview. Shared publication and server permissions require the backend.", "Uygulama bu tarayıcının önizlemesini günceller. Ortak yayın ve sunucu yetkileri için arka uç gerekir.", "التطبيق يحدّث معاينة هذا المتصفح. النشر المشترك وصلاحيات الخادم تتطلب الواجهة الخلفية.", "Применение обновляет предпросмотр в этом браузере. Общая публикация и серверные права требуют бэкенда."],
  language: ["زبان محتوا", "Content language", "İçerik dili", "لغة المحتوى", "Язык содержания"],
  navigation: ["ناوبری اصلی", "Main navigation", "Ana gezinme", "التنقل الرئيسي", "Основная навигация"],
  footer: ["فوتر", "Footer", "Alt bilgi", "تذييل الصفحة", "Нижняя часть сайта"],
  brand: ["برند و ارتباط", "Brand & contact", "Marka ve iletişim", "العلامة والاتصال", "Бренд и контакты"],
  name: ["نام برند", "Brand name", "Marka adı", "اسم العلامة", "Название бренда"],
  logo: ["نشان برند", "Brand logo", "Marka logosu", "شعار العلامة", "Логотип бренда"],
  uploadLogo: ["انتخاب تصویر نشان", "Upload logo image", "Logo görseli yükle", "تحميل صورة الشعار", "Загрузить логотип"],
  logoHelp: ["PNG، JPEG یا WebP تا ۵۱۲ کیلوبایت، یا مسیر تصویر در رسانه‌های سایت. برای نمایش در ناوبری و فوتر، تغییرات را اعمال کنید.", "PNG, JPEG or WebP up to 512 KB, or a site media image path. Apply changes to display it in navigation and footer.", "512 KB'a kadar PNG, JPEG veya WebP ya da site görsel yolu. Gezinme ve alt bilgide göstermek için uygulayın.", "PNG أو JPEG أو WebP حتى ٥١٢ كيلوبايت، أو مسار صورة من وسائط الموقع. طبّق التغييرات لعرضه في التنقل والتذييل.", "PNG, JPEG или WebP до 512 КБ либо путь к изображению сайта. Примените изменения для меню и нижней части сайта."],
  mediaLogo: ["انتخاب از رسانه‌ها", "Choose from media", "Medyadan seç", "اختر من الوسائط", "Выбрать из медиа"],
  error_logo: ["تصویر نشان معتبر نیست. PNG، JPEG یا WebP حداکثر ۵۱۲ کیلوبایت، یا مسیر محلی تصویر معتبر انتخاب کنید.", "Invalid logo. Choose a PNG, JPEG or WebP up to 512 KB, or a valid local image path.", "Geçersiz logo. En fazla 512 KB PNG, JPEG veya WebP ya da geçerli yerel görsel yolu seçin.", "الشعار غير صالح. اختر PNG أو JPEG أو WebP حتى ٥١٢ كيلوبايت أو مسار صورة محلي صالح.", "Некорректный логотип. Выберите PNG, JPEG или WebP до 512 КБ либо допустимый локальный путь."],
  tagline: ["متن معرفی کوتاه", "Short tagline", "Kısa tanıtım", "عبارة تعريفية قصيرة", "Краткое описание"],
  address: ["نشانی تماس", "Contact address", "İletişim adresi", "عنوان الاتصال", "Контактный адрес"],
  phone: ["تلفن", "Phone", "Telefon", "الهاتف", "Телефон"],
  email: ["ایمیل — اختیاری", "Email — optional", "E-posta — isteğe bağlı", "البريد الإلكتروني — اختياري", "Email — необязательно"],
  source: ["منبع اطلاعات اولیه کارخانه", "Original factory source", "Fabrikanın ilk bilgi kaynağı", "مصدر معلومات المصنع الأصلية", "Исходные сведения производителя"],
  group: ["عنوان گروه", "Group title", "Grup başlığı", "عنوان المجموعة", "Название группы"],
  newGroup: ["گروه جدید", "New group", "Yeni grup", "مجموعة جديدة", "Новая группа"],
  addGroup: ["افزودن گروه", "Add group", "Grup ekle", "إضافة مجموعة", "Добавить группу"],
  addItem: ["افزودن پیوند", "Add link", "Bağlantı ekle", "إضافة رابط", "Добавить ссылку"],
  label: ["عنوان پیوند", "Link label", "Bağlantı etiketi", "عنوان الرابط", "Подпись ссылки"],
  path: ["مسیر صفحه", "Page path", "Sayfa yolu", "مسار الصفحة", "Путь страницы"],
  pathHint: ["مسیرهای تعریف‌شده سایت پذیرفته می‌شوند؛ زبان هنگام نمایش افزوده می‌شود. برای صفحه‌ساز: page?id=شناسه", "Use a declared site route; the current language is added automatically. Page builder: page?id=identifier", "Tanımlı site yollarını kullanın; dil otomatik eklenir. Sayfa oluşturucu: page?id=kimlik", "استخدم مسارًا معرّفًا؛ تُضاف اللغة تلقائيًا. منشئ الصفحات: page?id=المعرّف", "Используйте объявленный маршрут; язык добавляется автоматически. Конструктор: page?id=идентификатор"],
  visible: ["نمایش", "Visible", "Görünür", "ظاهر", "Показывать"],
  hidden: ["پنهان", "Hidden", "Gizli", "مخفي", "Скрыто"],
  moveUp: ["انتقال به بالا", "Move up", "Yukarı taşı", "نقل لأعلى", "Выше"],
  moveDown: ["انتقال به پایین", "Move down", "Aşağı taşı", "نقل لأسفل", "Ниже"],
  remove: ["حذف", "Remove", "Kaldır", "حذف", "Удалить"],
  save: ["ذخیره پیش‌نویس", "Save draft", "Taslağı kaydet", "حفظ المسودة", "Сохранить черновик"],
  apply: ["اعمال در پیش‌نمایش سایت", "Apply to site preview", "Site önizlemesine uygula", "تطبيق على معاينة الموقع", "Применить в предпросмотре"],
  reset: ["بازگردانی اطلاعات مرجع", "Restore source defaults", "Kaynak varsayılanlarını geri yükle", "استعادة القيم الأصلية", "Восстановить исходные данные"],
  discard: ["بازگشت به نسخه اعمال‌شده", "Revert to applied version", "Uygulanan sürüme dön", "الرجوع للإصدار المطبق", "Вернуться к применённой версии"],
  export: ["خروجی JSON", "Export JSON", "JSON dışa aktar", "تصدير JSON", "Экспорт JSON"],
  preview: ["پیش‌نمایش", "Preview", "Önizleme", "معاينة", "Предпросмотр"],
  open: ["مشاهده سایت", "Open site", "Siteyi aç", "فتح الموقع", "Открыть сайт"],
  draft: ["تغییرات پیش‌نویس", "Draft changes", "Taslak değişiklikleri", "تغييرات المسودة", "Изменения в черновике"],
  applied: ["نسخه اعمال‌شده", "Applied version", "Uygulanan sürüm", "الإصدار المطبق", "Применённая версия"],
  appliedMessage: ["ناوبری، برند و فوتر پیش‌نمایش سایت به‌روز شدند.", "The preview navigation, brand and footer are updated.", "Önizlemenin gezinmesi, markası ve alt bilgisi güncellendi.", "تم تحديث التنقل والعلامة والتذييل في المعاينة.", "Навигация, бренд и нижняя часть предпросмотра обновлены."],
  savedMessage: ["پیش‌نویس ذخیره شد؛ برای نمایش عمومی این مرورگر آن را اعمال کنید.", "Draft saved. Apply it to update this browser's public preview.", "Taslak kaydedildi. Bu tarayıcıdaki önizleme için uygulayın.", "حُفظت المسودة. طبّقها لتحديث معاينة هذا المتصفح.", "Черновик сохранён. Примените его для обновления предпросмотра."],
  resetMessage: ["مقادیر مرجع به پیش‌نویس برگشتند. برای به‌روزرسانی سایت، اعمال را بزنید.", "Source defaults restored to the draft. Apply to update the site.", "Kaynak değerleri taslağa geri yüklendi. Siteyi güncellemek için uygulayın.", "استُعيدت القيم الأصلية في المسودة. طبّقها لتحديث الموقع.", "Исходные значения восстановлены в черновике. Примените их на сайте."],
  empty: ["هنوز گروهی در این فهرست نیست.", "This menu has no groups yet.", "Bu menüde henüz grup yok.", "لا توجد مجموعات في هذه القائمة بعد.", "В этом меню пока нет групп."],
  emptyLinks: ["برای این گروه پیوند اضافه کنید.", "Add links to this group.", "Bu gruba bağlantılar ekleyin.", "أضف روابط إلى هذه المجموعة.", "Добавьте ссылки в эту группу."],
  fixed: ["کنترل‌های ورود، استعلام، زبان و تم به‌صورت مستقل همیشه در دسترس می‌مانند.", "Sign-in, inquiry, language and theme controls remain independently accessible.", "Giriş, talep, dil ve tema kontrolleri bağımsız olarak erişilebilir kalır.", "تبقى عناصر الدخول والاستفسار واللغة والمظهر متاحة بشكل مستقل.", "Вход, запросы, язык и тема остаются доступными независимо от меню."],
  readonly: ["این نقش دسترسی ویرایش این تنظیمات را ندارد.", "This role cannot edit these settings.", "Bu rol bu ayarları düzenleyemez.", "هذا الدور لا يمكنه تعديل هذه الإعدادات.", "Эта роль не может изменять эти настройки."],
  error_labels: ["نام برند و عنوان گروه‌ها و پیوندها را در هر پنج زبان کامل کنید.", "Complete the brand, group and link names in all five languages.", "Marka, grup ve bağlantı adlarını beş dilde tamamlayın.", "أكمل أسماء العلامة والمجموعات والروابط باللغات الخمس.", "Заполните названия бренда, групп и ссылок на пяти языках."],
  error_route: ["مسیر نامعتبر است؛ یکی از صفحات عمومی تعریف‌شده را انتخاب کنید.", "Invalid path. Choose a declared public page.", "Geçersiz yol. Tanımlı bir genel sayfa seçin.", "المسار غير صالح. اختر صفحة عامة معرّفة.", "Неверный путь. Выберите объявленную публичную страницу."],
  error_phone: ["شماره تلفن معتبر وارد کنید.", "Enter a valid phone number.", "Geçerli telefon numarası girin.", "أدخل رقم هاتف صالحًا.", "Введите корректный номер телефона."],
  error_email: ["ایمیل معتبر وارد کنید یا آن را خالی بگذارید.", "Enter a valid email or leave it empty.", "Geçerli e-posta girin veya boş bırakın.", "أدخل بريدًا صالحًا أو اتركه فارغًا.", "Введите корректный email или оставьте поле пустым."],
  error_limit: ["حداکثر ۶ گروه و ۱۲ پیوند در هر گروه مجاز است.", "Use up to 6 groups and 12 links per group.", "En fazla 6 grup ve grup başına 12 bağlantı kullanın.", "الحد الأقصى ٦ مجموعات و١٢ رابطًا لكل مجموعة.", "Не более 6 групп и 12 ссылок в каждой."],
  storageError: ["ذخیره انجام نشد؛ می‌توانید پیش‌نویس را به‌صورت JSON دریافت کنید.", "Saving failed. You can export the draft as JSON.", "Kayıt başarısız. Taslağı JSON olarak dışa aktarabilirsiniz.", "تعذر الحفظ. يمكنك تصدير المسودة بصيغة JSON.", "Не удалось сохранить. Черновик можно экспортировать в JSON."],
};
const textAt = (key: string, locale: Locale) => copy[key]?.[locales.indexOf(locale)] || key;
const allLanguages = (key: string): Localized => Object.fromEntries(locales.map(locale => [locale, textAt(key, locale)])) as Localized;
function move<T>(items: T[], index: number, offset: number) { const next = [...items]; const target = index + offset; if (target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; }

export default function SiteSettings({ store, mode = "all" }: Props) {
  const { locale, role, notify } = store;
  const text = (key: string) => textAt(key, locale);
  const applied = useSitePreferences();
  const [draft, setDraft] = useState<SitePreferences>(applied);
  const [dirty, setDirty] = useState(false);
  const [targetLocale, setTargetLocale] = useState<Locale>(locale);
  const [placement, setPlacement] = useState<MenuPlacement>("navigation");
  const [activeGroup, setActiveGroup] = useState("products");
  const [issues, setIssues] = useState<PreferenceIssue[]>([]);
  const previousApplied = useRef(applied);
  const logoInput = useRef<HTMLInputElement>(null);
  const permissionAction = mode === 'menus' ? 'edit' : 'manage';
  const permissionModule = mode === 'menus' ? 'menus' : 'settings';
  const allowed = canWorkspace(role, permissionAction, permissionModule);
  const permit = () => store.permit(permissionAction, permissionModule);
  const groups = draft[placement];
  const selected = groups.find(group => group.id === activeGroup) || groups[0];
  useEffect(() => { const saved = readSitePreferencesDraft(); if (saved) { const next = scopeSitePreferences(saved, applied, mode); setDraft(next); setDirty(JSON.stringify(next) !== JSON.stringify(applied)); } }, [mode]);
  useEffect(() => { if (previousApplied.current === applied) return; previousApplied.current = applied; const matches = JSON.stringify(scopeSitePreferences(draft, applied, mode)) === JSON.stringify(applied); if (!dirty || matches) { setDraft(applied); setDirty(false); } }, [applied, dirty, draft, mode]);
  useEffect(() => setTargetLocale(locale), [locale]);
  const change = (update: (value: SitePreferences) => SitePreferences) => { if (!allowed || !permit()) return; setDraft(update); setDirty(true); setIssues([]); };
  const changeGroups = (update: (value: SiteMenuGroup[]) => SiteMenuGroup[]) => change(value => ({ ...value, [placement]: update(value[placement]) }));
  const patchGroup = (id: string, patch: Partial<SiteMenuGroup>) => changeGroups(list => list.map(group => group.id === id ? { ...group, ...patch } : group));
  const verify = () => { const errors = validateSitePreferences(scopeSitePreferences(draft, applied, mode)); setIssues(errors); return errors.length === 0; };
  const save = () => { if (!allowed || !permit() || !verify()) return; const next = scopeSitePreferences(draft, readSitePreferencesDraft() || applied, mode); notify(text(saveSitePreferencesDraft(next) ? "savedMessage" : "storageError")); };
  const apply = () => { if (!allowed || !store.permit(mode === 'menus' ? 'publish' : 'manage', permissionModule) || !verify()) return; const next = applySitePreferences(scopeSitePreferences(draft, applied, mode)); if (!next) { notify(text("storageError")); return; } saveSitePreferencesDraft(scopeSitePreferences(next, readSitePreferencesDraft() || next, mode)); setDraft(next); setDirty(false); notify(text("appliedMessage")); };
  const reset = () => { if (!allowed || !permit()) return; const next = scopeSitePreferences(createDefaultSitePreferences(), applied, mode); setDraft(next); saveSitePreferencesDraft(scopeSitePreferences(next, readSitePreferencesDraft() || applied, mode)); setDirty(true); setIssues([]); notify(text("resetMessage")); };
  const discard = () => { if (!allowed || !permit()) return; setDraft(applied); saveSitePreferencesDraft(scopeSitePreferences(applied, readSitePreferencesDraft() || applied, mode)); setDirty(false); setIssues([]); };
  const uploadLogo = async (file?: File) => {
    if (!file || !permit()) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 512 * 1024) { setIssues(['logo']); return; }
    try { const result = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); const source = normalizeLogoSource(result); if (!source) { setIssues(['logo']); return; } if (!permit()) return; change(value => ({...value, brand: {...value.brand, logo: source}})); } catch { setIssues(['logo']); }
    finally { if (logoInput.current) logoInput.current.value = ''; }
  };
  const previewGroups = visibleMenuGroups(groups);
  const addGroup = () => { if (groups.length >= MAX_MENU_GROUPS) return; const id = makeId("menu"); changeGroups(list => [...list, { id, label: allLanguages("newGroup"), visible: true, items: [] }]); setActiveGroup(id); };

  return <section className={styles.root} dir={direction(locale)}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>IDEAL MAKOO · WEBSITE</span><h2>{text("title")}</h2><p>{text("intro")}</p></div><a className={styles.openSite} href={`/${locale}/`} target="_blank" rel="noreferrer">{text("open")}<ArrowUpRight size={17}/></a></header>
    <div className={styles.localNote}><ShieldCheck size={19}/><p>{text("local")}</p></div>
    <div className={styles.toolbar}><span className={styles.draftStatus} data-dirty={dirty}><i/>{text(dirty ? "draft" : "applied")}{!dirty && applied.updatedAt && <small>{formatDate(applied.updatedAt, locale)}</small>}</span><label className={styles.language}><Globe2 size={17}/><span>{text("language")}</span><select value={targetLocale} onChange={event => setTargetLocale(event.target.value as Locale)}>{locales.map(language => <option key={language} value={language}>{localeNames[language]}</option>)}</select></label></div>
    {!allowed && <p className={styles.localNote}>{text("readonly")}</p>}
    {mode !== "menus" && <section className={styles.brandGrid} aria-label={text("brand")}>
      <div className={styles.card}><h3><LayoutTemplate size={20}/>{text("brand")}</h3><div className={styles.fields}>
        <div className="ws-logo-editor"><label className={styles.field}><span>{text('logo')}</span><input dir="ltr" disabled={!allowed} value={draft.brand.logo} aria-invalid={!normalizeLogoSource(draft.brand.logo)} onChange={event => change(value => ({...value,brand:{...value.brand,logo:event.target.value}}))}/></label><input className="sr-only" type="file" ref={logoInput} accept="image/png,image/jpeg,image/webp" aria-label={text('uploadLogo')} onChange={event => void uploadLogo(event.target.files?.[0])}/><div className="ws-logo-editor-actions"><button type="button" className={styles.secondary} disabled={!allowed} onClick={() => logoInput.current?.click()}><Upload size={16}/>{text('uploadLogo')}</button><select className="input" disabled={!allowed} aria-label={text('mediaLogo')} value="" onChange={event => {const source=normalizeLogoSource(event.target.value); if(source)change(value=>({...value,brand:{...value.brand,logo:source}}));}}><option value="">{text('mediaLogo')}</option><option value="/media/brand/logo-transparent.png">IDEAL MAKOO</option>{store.state.media.filter(item=>item.type==='image'&&normalizeLogoSource(item.url)).map(item=><option key={item.id} value={item.url}>{item.title}</option>)}</select></div><p className={styles.hint}>{text('logoHelp')}</p></div>
        <label className={styles.field}><span>{text("name")} · {targetLocale.toUpperCase()}</span><input value={draft.brand.name[targetLocale]} maxLength={100} disabled={!allowed} dir={direction(targetLocale)} onChange={event => change(value => ({ ...value, brand: { ...value.brand, name: { ...value.brand.name, [targetLocale]: event.target.value } } }))}/></label>
        <label className={styles.field}><span>{text("tagline")} · {targetLocale.toUpperCase()}</span><textarea rows={2} value={draft.brand.tagline[targetLocale]} maxLength={200} disabled={!allowed} dir={direction(targetLocale)} onChange={event => change(value => ({ ...value, brand: { ...value.brand, tagline: { ...value.brand.tagline, [targetLocale]: event.target.value } } }))}/></label>
        <label className={styles.field}><span>{text("address")} · {targetLocale.toUpperCase()}</span><textarea rows={3} value={draft.contact.address[targetLocale]} maxLength={500} disabled={!allowed} dir={direction(targetLocale)} onChange={event => change(value => ({ ...value, contact: { ...value.contact, address: { ...value.contact.address, [targetLocale]: event.target.value } } }))}/></label>
        <div className={styles.twoFields}><label className={styles.field}><span>{text("phone")}</span><input dir="ltr" type="tel" value={draft.contact.phone} maxLength={26} disabled={!allowed} onChange={event => change(value => ({ ...value, contact: { ...value.contact, phone: event.target.value } }))}/></label><label className={styles.field}><span>{text("email")}</span><input dir="ltr" type="email" value={draft.contact.email} maxLength={254} disabled={!allowed} onChange={event => change(value => ({ ...value, contact: { ...value.contact, email: event.target.value } }))}/></label></div>
      </div><a className={styles.source} href={company.contactSourceUrl} target="_blank" rel="noreferrer"><ShieldCheck size={14}/>{text("source")}<ArrowUpRight size={14}/></a></div>
      <div className={styles.brandPreview} dir={direction(targetLocale)}><span className={styles.previewCaption}><Eye size={16}/>{text("preview")}</span><img src={normalizeLogoSource(draft.brand.logo) || '/media/brand/logo-transparent.png'} alt={draft.brand.name[targetLocale]} width={86} height={86}/><h3>{draft.brand.name[targetLocale]}</h3><p>{draft.brand.tagline[targetLocale]}</p><div><p>{draft.contact.address[targetLocale]}</p><bdi>{draft.contact.phone}</bdi>{draft.contact.email && <bdi>{draft.contact.email}</bdi>}</div><span className={styles.previewLine}/></div>
    </section>}
    {mode !== "settings" && <>
      <div className={styles.menuToolbar}><div className={styles.tabs}>{(["navigation", "footer"] as const).map(value => <button key={value} aria-pressed={placement === value} onClick={() => { setPlacement(value); setActiveGroup(draft[value][0]?.id || ""); }}>{value === "navigation" ? <Menu size={17}/> : <LayoutTemplate size={17}/>} {text(value)}</button>)}</div><button className={styles.secondary} onClick={addGroup} disabled={!allowed || groups.length >= MAX_MENU_GROUPS}><Plus size={16}/>{text("addGroup")}</button></div>
      <div className={styles.menuLayout}>
        <aside className={styles.groupList} aria-label={text(placement)}>{groups.map((group, index) => <div className={styles.groupRow} data-active={selected?.id === group.id} data-hidden={!group.visible} key={group.id}><button className={styles.chooseGroup} onClick={() => setActiveGroup(group.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{group.label[targetLocale] || "—"}</strong><small>{group.items.filter(item => item.visible).length}</small></button><div className={styles.rowTools}><button disabled={!allowed || index === 0} onClick={() => changeGroups(list => move(list, index, -1))} aria-label={`${text("moveUp")} ${group.label[targetLocale]}`}><ArrowUp size={14}/></button><button disabled={!allowed || index === groups.length - 1} onClick={() => changeGroups(list => move(list, index, 1))} aria-label={`${text("moveDown")} ${group.label[targetLocale]}`}><ArrowDown size={14}/></button><button disabled={!allowed} onClick={() => changeGroups(list => list.filter(item => item.id !== group.id))} aria-label={`${text("remove")} ${group.label[targetLocale]}`}><Trash2 size={14}/></button></div></div>)}{!groups.length && <p className={styles.empty}>{text("empty")}</p>}</aside>
        <div className={styles.card}>{selected ? <>
          <div className={styles.groupHeader}><label className={styles.field}><span>{text("group")} · {targetLocale.toUpperCase()}</span><input maxLength={100} dir={direction(targetLocale)} disabled={!allowed} value={selected.label[targetLocale]} onChange={event => patchGroup(selected.id, { label: { ...selected.label, [targetLocale]: event.target.value } })}/></label><label className={styles.visibility}><input type="checkbox" disabled={!allowed} checked={selected.visible} onChange={event => patchGroup(selected.id, { visible: event.target.checked })}/>{text(selected.visible ? "visible" : "hidden")}</label></div>
          <p className={styles.hint}>{text("pathHint")}</p>
          <div className={styles.linkList}>{selected.items.map((item, index) => <div className={styles.linkRow} data-hidden={!item.visible} key={item.id}><div className={styles.linkFields}><label className={styles.field}><span>{text("label")} · {targetLocale.toUpperCase()}</span><input maxLength={100} dir={direction(targetLocale)} value={item.label[targetLocale]} disabled={!allowed} onChange={event => patchGroup(selected.id, { items: selected.items.map(link => link.id === item.id ? { ...link, label: { ...link.label, [targetLocale]: event.target.value } } : link) })}/></label><label className={styles.field}><span><Link2 size={12}/>{text("path")}</span><input list="site-menu-routes" dir="ltr" value={item.path} placeholder="/" maxLength={240} disabled={!allowed} aria-invalid={normalizeMenuPath(item.path) === null} onChange={event => patchGroup(selected.id, { items: selected.items.map(link => link.id === item.id ? { ...link, path: event.target.value } : link) })}/></label></div><div className={styles.linkActions}><label className={styles.visibility}><input type="checkbox" checked={item.visible} disabled={!allowed} onChange={event => patchGroup(selected.id, { items: selected.items.map(link => link.id === item.id ? { ...link, visible: event.target.checked } : link) })}/>{text(item.visible ? "visible" : "hidden")}</label><div className={styles.rowTools}><button disabled={!allowed || index === 0} aria-label={text("moveUp")} onClick={() => patchGroup(selected.id, { items: move(selected.items, index, -1) })}><ArrowUp size={15}/></button><button disabled={!allowed || index === selected.items.length - 1} aria-label={text("moveDown")} onClick={() => patchGroup(selected.id, { items: move(selected.items, index, 1) })}><ArrowDown size={15}/></button><button disabled={!allowed} aria-label={`${text("remove")} ${item.label[targetLocale]}`} onClick={() => patchGroup(selected.id, { items: selected.items.filter(link => link.id !== item.id) })}><Trash2 size={15}/></button></div></div>{normalizeMenuPath(item.path) === null && <small className={styles.pathError}>{text("error_route")}</small>}</div>)}</div>
          {!selected.items.length && <p className={styles.empty}>{text("emptyLinks")}</p>}
          <button className={styles.addLink} disabled={!allowed || selected.items.length >= MAX_MENU_ITEMS} onClick={() => patchGroup(selected.id, { items: [...selected.items, { id: makeId("link"), label: { ...createDefaultSitePreferences().navigation[3].items[5].label }, path: "contact", visible: true }] })}><Plus size={17}/>{text("addItem")}</button>
        </> : <div className={styles.empty}><Menu size={28}/><p>{text("empty")}</p></div>}</div>
      </div>
      <div className={styles.menuPreview} dir={direction(targetLocale)}><span className={styles.previewCaption}><Eye size={16}/>{text("preview")} · {text(placement)}</span><div className={styles.previewMenus}>{previewGroups.map(group => <div key={group.id}><strong>{group.label[targetLocale]}</strong>{group.items.map(item => <a key={item.id} href={siteMenuHref(item.path, targetLocale)} target="_blank" rel="noreferrer">{item.label[targetLocale]}<ArrowUpRight size={13}/></a>)}</div>)}</div><p className={styles.hint}>{text("fixed")}</p></div>
      <datalist id="site-menu-routes">{publicMenuRoutes.map(path => <option key={path || "home"} value={path || "/"}/>)}</datalist>
    </>}
    {issues.length > 0 && <div className={styles.errors} role="alert">{issues.map(issue => <p key={issue}>{text(`error_${issue}`)}</p>)}</div>}
    <footer className={styles.actions}><div><button className={styles.secondary} disabled={!allowed} onClick={save}><Save size={16}/>{text("save")}</button><button className={styles.primary} disabled={!allowed} onClick={apply}><Check size={17}/>{text("apply")}</button></div><div><button className={styles.quiet} onClick={() => downloadJson(draft, "idealmakoo-site-preferences.json")}><FileDown size={15}/>{text("export")}</button><button className={styles.quiet} disabled={!allowed} onClick={discard}>{text("discard")}</button><button className={styles.quiet} disabled={!allowed} onClick={reset}><RotateCcw size={14}/>{text("reset")}</button></div></footer>
  </section>;
}

export { SiteSettings };
