'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {Archive,ArrowUpRight,BookOpen,ChevronDown,ExternalLink,FileText,Languages,Search} from 'lucide-react';
import {useApp} from '@/components/providers/AppProvider';
import {products,articles,companyPages,type ContentLocale} from '@/data/catalog';
import {officialSourcePages,type OfficialSourcePage} from '@/data/official-source-pages';
import {BackLink,ContentEmpty,ContentIntro,ContentSearch,L,contentLabels,useContentText} from './shared';
import './reference-documents.css';
const labels={
 title:L('متن کاملِ سایت مرجع.','The complete primary-site text.','Birincil sitenin tam metni.','النص الكامل للموقع المرجعي.','Полный текст первоисточника.'),
 description:L('۴۳ صفحهٔ عمومیِ سایت ایده‌آل ماکو، شامل محصولات، پژوهش‌ها، معرفی شرکت و فهرست‌ها؛ متن‌های اصلی همراه پیوند منبع حفظ شده‌اند.','43 public Ideal Makoo pages covering products, research, company information and indexes. Original text is preserved alongside its source link.','Ürünler, araştırmalar, şirket bilgileri ve dizinlerden oluşan 43 halka açık Ideal Makoo sayfası. Özgün metin ve kaynak bağlantısı korunmuştur.','43 صفحة عامة من إيده‌آل ماكو تشمل المنتجات والبحوث ومعلومات الشركة والفهارس. حُفظ النص الأصلي مع رابط مصدره.','43 публичные страницы Ideal Makoo: продукты, исследования, компания и указатели. Исходный текст сохранён со ссылками.'),
 notice:L('متن اصلی منبع، با همان ادعاهای تاریخی و تبلیغاتی، برای مراجعه حفظ شده است. این آرشیو تأیید مستقلِ قیمت امروز، نمایندگی فعال، عملکرد درمانی یا اعتبار فعلی گواهی‌ها نیست.','Original historical and promotional statements are preserved for reference. This archive is not independent confirmation of today’s prices, active distributors, clinical performance or current certificates.','Tarihsel ve tanıtım amaçlı özgün ifadeler referans için korunmuştur. Arşiv bugünkü fiyatlar, aktif temsilciler, klinik performans veya güncel sertifikalar için bağımsız doğrulama değildir.','حُفظت العبارات التاريخية والترويجية الأصلية للرجوع إليها. الأرشيف ليس تأكيدًا مستقلاً لأسعار اليوم أو الموزعين النشطين أو الأداء السريري أو الشهادات الحالية.','Исторические и рекламные заявления сохранены для справки. Архив не подтверждает независимо текущие цены, действующих представителей, клинические результаты или сертификаты.'),
 fullText:L('خواندن متن کاملِ صفحهٔ مرجع','Read the complete source-page text','Kaynak sayfanın tam metnini oku','قراءة النص الكامل للصفحة المصدر','Прочитать полный текст исходной страницы'),
 openArchive:L('آرشیو متن‌های اصلی','Original text archive','Özgün metin arşivi','أرشيف النصوص الأصلية','Архив исходных текстов'),
 original:L('بازکردن صفحهٔ اصلی','Open primary-source page','Birincil kaynak sayfayı aç','فتح الصفحة المصدر','Открыть страницу первоисточника'),
 originalLanguage:L('متن اصلی به زبان فارسی','Original text in Persian','Farsça özgün metin','النص الأصلي بالفارسية','Исходный текст на персидском'),
 sourceDate:L('ثبت منبع در','Source captured on','Kaynağın alınma tarihi','سُجّل المصدر بتاريخ','Источник сохранён'),
 query:L('جستجو در عنوان یا متن کامل مرجع…','Search titles or complete source text…','Başlıkta veya tam kaynak metninde ara…','ابحث في العنوان أو النص الكامل…','Поиск по заголовку или полному тексту…'),
 all:L('همهٔ صفحات','All pages','Tüm sayfalar','كل الصفحات','Все страницы'),
 products:L('محصولات','Products','Ürünler','المنتجات','Продукты'),
 research:L('پژوهش‌ها','Research','Araştırmalar','البحوث','Исследования'),
 company:L('معرفی شرکت','Company information','Şirket bilgileri','معلومات الشركة','О компании'),
 indexes:L('فهرست‌ها','Indexes','Dizinler','الفهارس','Указатели'),
 home:L('صفحهٔ اصلی مرجع','Source homepage','Kaynak ana sayfası','الرئيسية في المصدر','Главная страница источника'),
 catalogue:L('فهرست محصولات مرجع','Source product index','Kaynak ürün dizini','فهرس منتجات المصدر','Список продуктов источника'),
 blog:L('فهرست پژوهش مرجع','Source research index','Kaynak araştırma dizini','فهرس بحوث المصدر','Список исследований источника'),
};
function translatedTitle(page:OfficialSourcePage,locale:ContentLocale){
 const title=page.productId?products.find(item=>item.id===page.productId)?.name:page.articleId?articles.find(item=>item.id===page.articleId)?.title:page.companyPageId?companyPages.find(item=>item.id===page.companyPageId)?.title:page.id==='official-page-home'?labels.home:page.id==='official-page-3'?labels.catalogue:page.id==='official-page-5'?labels.blog:undefined;
 return title?.[locale]??page.title;
}

export function OfficialSourceDisclosure({url,source,archive=false}:{url?:string;source?:OfficialSourcePage;archive?:boolean}){
 const {locale,href}=useApp();const c=useContentText();const page=source??officialSourcePages.find(item=>item.url===url);if(!page)return null;
 return <details id={archive?page.id:undefined} className="glass official-source-disclosure"><summary><span><FileText size={18}/>{archive?translatedTitle(page,locale):c(labels.fullText)}</span>{archive&&<b>{c(page.kind==='product'?labels.products:page.kind==='research'?labels.research:page.kind==='company'?labels.company:labels.indexes)}</b>}<ChevronDown size={17}/></summary><span className="official-source-date"><Languages size={13}/> {c(labels.originalLanguage)} · {c(labels.sourceDate)} <time dateTime={page.retrievedAt}>{page.retrievedAt}</time></span><p>{c(labels.notice)}</p><div className="official-source-text" lang="fa" dir="rtl">{page.contentText||page.text}</div><div className="content-action-row"><a className="btn" href={page.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>{c(labels.original)}</a>{!archive&&<Link className="btn" href={`${href('resources/official-site-archive')}#${page.id}`}><Archive size={15}/>{c(labels.openArchive)}</Link>}</div></details>;
}

export function OfficialSourceArchiveLink(){
 const {href}=useApp();const c=useContentText();return <section className="glass official-source-archive-link"><div><span className="eyebrow">IDEALMAKOO.COM · 43</span><h3>{c(labels.title)}</h3><p>{c(labels.description)}</p></div><Link className="btn" href={href('resources/official-site-archive')}><Archive size={17}/>{c(labels.openArchive)}<ArrowUpRight size={16}/></Link></section>;
}

export function OfficialSourceArchive(){
 const {locale,t}=useApp();const c=useContentText();const [query,setQuery]=useState('');const [kind,setKind]=useState<'all'|OfficialSourcePage['kind']>('all');const [focusedSource,setFocusedSource]=useState('');
 const filtered=useMemo(()=>officialSourcePages.filter(page=>(kind==='all'||page.kind===kind)&&`${translatedTitle(page,locale)} ${page.text}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))),[query,kind,locale]);
 useEffect(()=>{function reveal(){const id=window.location.hash.slice(1);if(!officialSourcePages.some(page=>page.id===id))return;setQuery('');setKind('all');setFocusedSource(id);}reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);},[]);
 useEffect(()=>{if(!focusedSource)return;const target=document.getElementById(focusedSource);if(target instanceof HTMLDetailsElement){target.open=true;target.scrollIntoView({behavior:'instant',block:'start'});setFocusedSource('');}},[focusedSource,filtered]);
 return <section className="container content-root official-source-archive"><BackLink path="resources" label={t('resources')}/><ContentIntro eyebrow={c(labels.openArchive)} title={c(labels.title)} description={c(labels.description)}><div className="content-counts"><span><BookOpen size={16}/>{officialSourcePages.length.toLocaleString(locale)} {c(labels.all)}</span><span><Languages size={16}/>{c(labels.originalLanguage)}</span></div></ContentIntro><p className="content-footnote">{c(labels.notice)}</p><div className="glass content-toolbar"><ContentSearch value={query} onChange={setQuery} placeholder={c(labels.query)}/><div className="content-filters" role="group" aria-label={t('filters')}>{(['all','product','research','company','index']as const).map(value=><button type="button" key={value} className="content-filter" aria-pressed={kind===value} onClick={()=>setKind(value)}>{c(value==='all'?labels.all:value==='product'?labels.products:value==='research'?labels.research:value==='company'?labels.company:labels.indexes)}</button>)}</div></div><div className="content-results-top"><span>{filtered.length.toLocaleString(locale)} {c(contentLabels.resultCount)}</span>{(query||kind!=='all')&&<button type="button" onClick={()=>{setQuery('');setKind('all');}}>{t('reset')}</button>}</div>{filtered.length?<div className="official-source-grid">{filtered.map(page=><OfficialSourceDisclosure key={page.id} source={page} archive/>)}</div>:<ContentEmpty title={c(contentLabels.noResults)} body={c(contentLabels.adjustSearch)} icon={<Search size={30}/>}/>}</section>;
}
