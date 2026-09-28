import { useEffect, useState } from 'react';
import { Activity, CalendarDays, ChevronRight, GraduationCap, LayoutDashboard, Users } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar.js';
import { Topbar } from '../components/layout/Topbar.js';
import { BatchesView, type BatchSection } from './BatchesView.js';
import { TimetableTemplatesView } from './TimetableTemplatesView.js';

type Page = BatchSection;
const items = [
  { id:'overview', label:'Batch overview', icon:LayoutDashboard, group:'BATCH WORKSPACE' },
  { id:'roster', label:'Students', icon:Users },
  { id:'staff', label:'Faculty', icon:GraduationCap },
  { id:'timetable', label:'Batch timetable', icon:CalendarDays },
  { id:'attendance', label:'Daily attendance', icon:Activity, group:'ATTENDANCE' },
  { id:'alerts', label:'Alerts & login access', icon:Activity }
] as const;
export function BatchWorkspace({batchId}:{batchId:string}) {
  const [page,setPage]=useState<Page>('overview');
  const [navigationOpen,setNavigationOpen]=useState(false);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setNavigationOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const navigate=(value:Page)=>{setPage(value);setNavigationOpen(false);};
  const navigation=items.map(item=><div key={item.id}>{'group' in item&&<div className="nav-section-title">{item.group}</div>}<button className={`nav-item ${page===item.id?'active':''}`} onClick={()=>navigate(item.id)} aria-current={page===item.id?'page':undefined}><div className="nav-item-content"><item.icon size={17}/><span>{item.label}</span></div>{page===item.id&&<ChevronRight size={14}/>}</button></div>);
  return <div className="app-container batch-workspace">
    {navigationOpen&&<button className="nav-backdrop" aria-label="Close navigation" onClick={()=>setNavigationOpen(false)}/>}
    <Sidebar currentView="batches" onNavigate={()=>{}} open={navigationOpen} navigation={navigation}/>
    <div className="main-wrapper"><Topbar title={items.find(item=>item.id===page)?.label||'Batch workspace'} navigationOpen={navigationOpen} onToggleNavigation={()=>setNavigationOpen(!navigationOpen)}/>
      <main className="content-viewport">
        {page==='timetable' ? <TimetableTemplatesView initialBatchId={batchId}/> : <BatchesView batchWindowId={batchId} section={page} onSectionChange={value=>navigate(value)}/>}
      </main>
    </div>
  </div>;
}
