import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCVStore } from '../../store/useCVStore';
import type { Certification, Education, Experience, Hobby, Project, Reference, SectionKey, Skill } from '../../types/cv';

const uid = () => crypto.randomUUID();
const updateAt = <T,>(items: T[], index: number, patch: Partial<T>) => items.map((item,i) => i === index ? { ...item, ...patch } : item);

function Field({ label, value, onChange, type = 'text', placeholder, wide = false }: { label: string; value?: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; wide?: boolean }) {
  return <label className={wide ? 'field wide' : 'field'}><span>{label}</span><input type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field wide"><span>{label}</span><textarea value={value ?? ''} placeholder={placeholder} rows={5} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="check"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
function SortableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return <div ref={setNodeRef} className={`editor-card ${isDragging ? 'dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}><button className="drag-handle" aria-label="Drag to reorder" {...attributes} {...listeners}><GripVertical /></button>{children}</div>;
}
function SortableList<T extends { id: string; order: number }>({ items, onReorder, render }: { items: T[]; onReorder: (items: T[]) => void; render: (item: T, index: number) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sorted = [...items].sort((a,b) => a.order-b.order);
  const end = ({active,over}: DragEndEvent) => { if (!over || active.id === over.id) return; const oldIndex=sorted.findIndex(x=>x.id===active.id); const newIndex=sorted.findIndex(x=>x.id===over.id); onReorder(arrayMove(sorted,oldIndex,newIndex).map((item,order)=>({...item,order}))); };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}><SortableContext items={sorted.map(x=>x.id)} strategy={verticalListSortingStrategy}>{sorted.map((item,index)=><SortableCard id={item.id} key={item.id}>{render(item,index)}</SortableCard>)}</SortableContext></DndContext>;
}
function CardActions({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) { return <div className="card-actions"><button onClick={onDuplicate}><Copy />Duplicate</button><button className="danger" onClick={onDelete}><Trash2 />Delete</button></div>; }
function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="add-button" onClick={onClick}><Plus />{children}</button>; }

export function Editor() {
  const { cv, activeSection, update } = useCVStore();
  const personal = cv.personal;
  if (activeSection === 'personal') return <Panel title="Personal information" subtitle="Your header and contact links."><div className="form-grid">
    <Field label="Full name" value={personal.fullName} onChange={(v)=>update(c=>{c.personal.fullName=v})} wide />
    <Field label="Primary email" type="email" value={personal.email} onChange={(v)=>update(c=>{c.personal.email=v})} />
    <Field label="Primary phone" value={personal.phone} onChange={(v)=>update(c=>{c.personal.phone=v})} />
    <Field label="Secondary phone" value={personal.secondaryPhone} onChange={(v)=>update(c=>{c.personal.secondaryPhone=v})} />
    <Field label="Nationality" value={personal.nationality} onChange={(v)=>update(c=>{c.personal.nationality=v})} />
    <Field label="Marital status" value={personal.maritalStatus} onChange={(v)=>update(c=>{c.personal.maritalStatus=v})} />
    <Field label="LinkedIn URL" value={personal.linkedIn} onChange={(v)=>update(c=>{c.personal.linkedIn=v})} wide />
    <Field label="WhatsApp URL" value={personal.whatsapp} onChange={(v)=>update(c=>{c.personal.whatsapp=v})} wide />
    <Field label="Portfolio URL" value={personal.portfolio} onChange={(v)=>update(c=>{c.personal.portfolio=v})} wide />
    <Field label="GitHub URL" value={personal.github} onChange={(v)=>update(c=>{c.personal.github=v})} wide />
  </div></Panel>;
  if (activeSection === 'summary') return <Panel title="Professional summary" subtitle="A concise overview of your value and focus."><div className="form-grid"><Field label="Professional title / headline" value={cv.summary.headline} onChange={(v)=>update(c=>{c.summary.headline=v})} wide /><TextArea label="Professional summary" value={cv.summary.text} onChange={(v)=>update(c=>{c.summary.text=v})} /></div><AssistButtons /></Panel>;
  if (activeSection === 'location') return <Panel title="Location"><div className="form-grid">{([['State of residence','state'],['Region','region'],['LGA','lga'],['Address','address'],['Country','country']] as const).map(([label,key])=><Field key={key} label={label} value={cv.location[key]} onChange={(v)=>update(c=>{c.location[key]=v})} wide={key==='address'} />)}</div></Panel>;
  if (activeSection === 'experiences') return <ExperienceEditor />;
  if (activeSection === 'education') return <EducationEditor />;
  if (activeSection === 'certifications') return <CertificationEditor />;
  if (activeSection === 'skills') return <SkillEditor />;
  if (activeSection === 'hobbies') return <SimpleEditor type="hobbies" />;
  if (activeSection === 'references') return <ReferenceEditor />;
  if (activeSection === 'projects') return <ProjectEditor />;
  if (activeSection === 'theme') return <ThemeEditor />;
  return <SectionsEditor />;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) { return <section className="editor-panel"><div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function ExperienceEditor() {
  const {cv,update}=useCVStore(); const add=()=>update(c=>c.experiences.push({id:uid(),jobTitle:'New role',organization:'Organization',startDate:'',current:false,description:'',achievements:[],technologies:[],order:c.experiences.length,keepTogether:true}));
  return <Panel title="Work experience" subtitle="Drag entries to reorder." action={<AddButton onClick={add}>Add experience</AddButton>}><SortableList items={cv.experiences} onReorder={(items)=>update(c=>{c.experiences=items})} render={(item,index)=><div className="form-grid">
    <Field label="Job title" value={item.jobTitle} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{jobTitle:v})})} wide />
    <Field label="Employment type" value={item.employmentType} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{employmentType:v})})} />
    <Field label="Organization" value={item.organization} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{organization:v})})} wide />
    <Field label="Start date" type="month" value={toMonth(item.startDate)} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{startDate:fromMonth(v)})})} />
    <Field label="End date" type="month" value={toMonth(item.endDate)} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{endDate:fromMonth(v)})})} />
    <Checkbox label="Current role" checked={item.current} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{current:v})})} />
    <Checkbox label="Keep entry together" checked={!!item.keepTogether} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{keepTogether:v})})} />
    <TextArea label="Description" value={item.description} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{description:v})})} />
    <TextArea label="Achievement bullets (one per line)" value={item.achievements.join('\n')} onChange={(v)=>update(c=>{c.experiences=updateAt(c.experiences,index,{achievements:v.split('\n').filter(Boolean)})})} />
    <CardActions onDuplicate={()=>update(c=>c.experiences.push({...structuredClone(item),id:uid(),order:c.experiences.length}))} onDelete={()=>update(c=>{c.experiences=c.experiences.filter(x=>x.id!==item.id)})} />
  </div>} /></Panel>;
}
function EducationEditor() { const {cv,update}=useCVStore(); const add=()=>update(c=>c.education.push({id:uid(),qualification:'New qualification',institution:'Institution',order:c.education.length})); return <Panel title="Education" action={<AddButton onClick={add}>Add education</AddButton>}><SortableList items={cv.education} onReorder={(items)=>update(c=>{c.education=items})} render={(item,index)=><div className="form-grid"><Field label="Qualification" value={item.qualification} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{qualification:v})})} wide/><Field label="Field of study" value={item.fieldOfStudy} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{fieldOfStudy:v})})}/><Field label="Institution" value={item.institution} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{institution:v})})} wide/><Field label="Start year" value={item.startYear} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{startYear:v})})}/><Field label="End year" value={item.endYear} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{endYear:v})})}/><TextArea label="Description" value={item.description} onChange={(v)=>update(c=>{c.education=updateAt(c.education,index,{description:v})})}/><CardActions onDuplicate={()=>update(c=>c.education.push({...item,id:uid(),order:c.education.length}))} onDelete={()=>update(c=>{c.education=c.education.filter(x=>x.id!==item.id)})}/></div>} /></Panel>; }
function CertificationEditor() { const {cv,update}=useCVStore(); const add=()=>update(c=>c.certifications.push({id:uid(),name:'New certification',order:c.certifications.length})); return <Panel title="Certifications" action={<AddButton onClick={add}>Add certification</AddButton>}><SortableList items={cv.certifications} onReorder={(items)=>update(c=>{c.certifications=items})} render={(item,index)=><div className="form-grid"><Field label="Name" value={item.name} onChange={(v)=>update(c=>{c.certifications=updateAt(c.certifications,index,{name:v})})} wide/><Field label="Issuer" value={item.issuer} onChange={(v)=>update(c=>{c.certifications=updateAt(c.certifications,index,{issuer:v})})}/><Field label="Date" value={item.date} onChange={(v)=>update(c=>{c.certifications=updateAt(c.certifications,index,{date:v})})}/><Field label="Credential URL" value={item.credentialUrl} onChange={(v)=>update(c=>{c.certifications=updateAt(c.certifications,index,{credentialUrl:v})})} wide/><TextArea label="Grouped items (one per line)" value={item.items?.join('\n')} onChange={(v)=>update(c=>{c.certifications=updateAt(c.certifications,index,{items:v.split('\n').filter(Boolean)})})}/><CardActions onDuplicate={()=>update(c=>c.certifications.push({...item,id:uid(),order:c.certifications.length}))} onDelete={()=>update(c=>{c.certifications=c.certifications.filter(x=>x.id!==item.id)})}/></div>} /></Panel>; }
function SkillEditor() { const {cv,update}=useCVStore(); const add=()=>update(c=>c.skills.push({id:uid(),name:'New skill',level:'Intermediate',order:c.skills.length})); return <Panel title="Skills" action={<AddButton onClick={add}>Add skill</AddButton>}><div className="inline-settings"><Checkbox label="Show proficiency" checked={cv.settings.showSkillLevels} onChange={(v)=>update(c=>{c.settings.showSkillLevels=v})}/><Checkbox label="Sort alphabetically" checked={cv.settings.alphabeticalSkills} onChange={(v)=>update(c=>{c.settings.alphabeticalSkills=v})}/></div><SortableList items={cv.skills} onReorder={(items)=>update(c=>{c.skills=items})} render={(item,index)=><div className="form-grid"><Field label="Skill" value={item.name} onChange={(v)=>update(c=>{c.skills=updateAt(c.skills,index,{name:v})})}/><label className="field"><span>Level</span><select value={item.level ?? ''} onChange={(e)=>update(c=>{c.skills=updateAt(c.skills,index,{level:e.target.value as Skill['level']})})}><option value="">Not set</option>{['Beginner','Intermediate','Advanced','Expert'].map(v=><option key={v}>{v}</option>)}</select></label><Field label="Category" value={item.category} onChange={(v)=>update(c=>{c.skills=updateAt(c.skills,index,{category:v})})}/><CardActions onDuplicate={()=>update(c=>c.skills.push({...item,id:uid(),order:c.skills.length}))} onDelete={()=>update(c=>{c.skills=c.skills.filter(x=>x.id!==item.id)})}/></div>} /></Panel>; }
function SimpleEditor({type}:{type:'hobbies'}) { const {cv,update}=useCVStore(); const add=()=>update(c=>c[type].push({id:uid(),name:'New interest',order:c[type].length})); return <Panel title="Hobbies / Interests" action={<AddButton onClick={add}>Add interest</AddButton>}><SortableList items={cv[type]} onReorder={(items)=>update(c=>{c[type]=items})} render={(item,index)=><div className="form-grid"><Field label="Name" value={item.name} onChange={(v)=>update(c=>{c[type]=updateAt(c[type],index,{name:v})})}/><CardActions onDuplicate={()=>update(c=>c[type].push({...item,id:uid(),order:c[type].length}))} onDelete={()=>update(c=>{c[type]=c[type].filter(x=>x.id!==item.id)})}/></div>} /></Panel>; }
function ReferenceEditor() { const {cv,update}=useCVStore(); const add=()=>update(c=>c.references.push({id:uid(),name:'New reference',order:c.references.length})); return <Panel title="References" action={<AddButton onClick={add}>Add reference</AddButton>}><div className="inline-settings"><Checkbox label="References available on request" checked={cv.settings.referencesOnRequest} onChange={(v)=>update(c=>{c.settings.referencesOnRequest=v})}/></div>{!cv.settings.referencesOnRequest && <SortableList items={cv.references} onReorder={(items)=>update(c=>{c.references=items})} render={(item,index)=><div className="form-grid"><Field label="Name" value={item.name} onChange={(v)=>update(c=>{c.references=updateAt(c.references,index,{name:v})})}/><Field label="Job title" value={item.jobTitle} onChange={(v)=>update(c=>{c.references=updateAt(c.references,index,{jobTitle:v})})}/><Field label="Organization" value={item.organization} onChange={(v)=>update(c=>{c.references=updateAt(c.references,index,{organization:v})})}/><Field label="Phone" value={item.phone} onChange={(v)=>update(c=>{c.references=updateAt(c.references,index,{phone:v})})}/><Field label="Email" value={item.email} onChange={(v)=>update(c=>{c.references=updateAt(c.references,index,{email:v})})}/><CardActions onDuplicate={()=>update(c=>c.references.push({...item,id:uid(),order:c.references.length}))} onDelete={()=>update(c=>{c.references=c.references.filter(x=>x.id!==item.id)})}/></div>} />}</Panel>; }
function ProjectEditor() { const {cv,update}=useCVStore(); const add=()=>update(c=>c.projects.push({id:uid(),title:'New project',order:c.projects.length})); return <Panel title="Projects" action={<AddButton onClick={add}>Add project</AddButton>}><SortableList items={cv.projects} onReorder={(items)=>update(c=>{c.projects=items})} render={(item,index)=><div className="form-grid"><Field label="Title" value={item.title} onChange={(v)=>update(c=>{c.projects=updateAt(c.projects,index,{title:v})})} wide/><Field label="Subtitle" value={item.subtitle} onChange={(v)=>update(c=>{c.projects=updateAt(c.projects,index,{subtitle:v})})}/><Field label="Date" value={item.date} onChange={(v)=>update(c=>{c.projects=updateAt(c.projects,index,{date:v})})}/><TextArea label="Description" value={item.body} onChange={(v)=>update(c=>{c.projects=updateAt(c.projects,index,{body:v})})}/><CardActions onDuplicate={()=>update(c=>c.projects.push({...item,id:uid(),order:c.projects.length}))} onDelete={()=>update(c=>{c.projects=c.projects.filter(x=>x.id!==item.id)})}/></div>} /></Panel>; }
function ThemeEditor() {
  const {cv,update}=useCVStore();
  const presets=[['Original Blue','#1639B7'],['Navy','#102A43'],['Royal Blue','#2457F5'],['Emerald','#087F5B'],['Burgundy','#8B1E3F'],['Charcoal','#344054'],['Purple','#6938EF']];
  const fonts=['Poppins','Inter','Manrope','DM Sans','Lato','Montserrat','Open Sans'];
  const sectionSpacing=cv.settings.sectionSpacing??10;
  return <Panel title="Theme" subtitle="Controlled styling keeps the template consistent.">
    <h3 className="subheading">Colour preset</h3>
    <div className="preset-grid">{presets.map(([name,color])=><button key={name} className={cv.settings.primary===color?'selected':''} onClick={()=>update(c=>{c.settings.primary=color})}><i style={{background:color}}/>{name}</button>)}</div>
    <div className="form-grid">
      <Field label="PDF filename" value={cv.settings.fileName} onChange={(v)=>update(c=>{c.settings.fileName=v.replace(/\.pdf$/i,'')})} wide/>
      <label className="field"><span>Custom accent</span><input type="color" value={cv.settings.primary} onChange={(e)=>update(c=>{c.settings.primary=e.target.value})}/></label>
      <label className="field"><span>Heading font</span><select value={cv.settings.headingFont} onChange={(e)=>update(c=>{c.settings.headingFont=e.target.value})}>{fonts.map(f=><option key={f}>{f}</option>)}</select></label>
      <Checkbox label="Use one font everywhere" checked={cv.settings.oneFont} onChange={(v)=>update(c=>{c.settings.oneFont=v})}/>
      <label className="field"><span>Density</span><select value={cv.settings.density} onChange={(e)=>update(c=>{c.settings.density=e.target.value as typeof cv.settings.density})}>{['compact','standard','spacious'].map(v=><option key={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
      <label className="field"><span>Body size · {cv.settings.bodySize}px</span><input type="range" min="9" max="13" step="0.5" value={cv.settings.bodySize} onChange={(e)=>update(c=>{c.settings.bodySize=Number(e.target.value)})}/></label>
      <label className="field wide"><span>Section spacing · {sectionSpacing} pt</span><input type="range" min="2" max="24" step="1" value={sectionSpacing} onChange={(e)=>update(c=>{c.settings.sectionSpacing=Number(e.target.value)})}/></label>
      <Checkbox label="ATS-friendly mode" checked={cv.settings.atsMode} onChange={(v)=>update(c=>{c.settings.atsMode=v})}/>
    </div>
  </Panel>;
}
function SectionsEditor() { const {cv,update}=useCVStore(); return <Panel title="Sections" subtitle="Hide content without deleting it. Drag to reorder."><SortableList items={cv.settings.sections.map((s,order)=>({...s,id:s.key,order}))} onReorder={(items)=>update(c=>{c.settings.sections=items.map(({id:_,order:__,...s})=>s)})} render={(item)=><div className="section-row"><Checkbox label={item.label} checked={item.enabled} onChange={(v)=>update(c=>{const s=c.settings.sections.find(x=>x.key===item.key);if(s)s.enabled=v})}/><Checkbox label="Start on new page" checked={!!item.startNewPage} onChange={(v)=>update(c=>{const s=c.settings.sections.find(x=>x.key===item.key);if(s)s.startNewPage=v})}/></div>} /></Panel>; }
function AssistButtons(){return <div className="assist"><span>Writing tools</span>{['Improve wording','Shorten','Make professional','Achievement bullets','Fix grammar','ATS friendly'].map(label=><button key={label} title="Suggestions are shown before changes are applied" onClick={()=>alert('Writing assistance is suggestion-only. Connect an AI provider in Settings to enable it.')}>{label}</button>)}</div>}
function toMonth(value?:string){if(!value)return ''; const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function fromMonth(value:string){if(!value)return '';return new Intl.DateTimeFormat('en',{month:'short',year:'numeric'}).format(new Date(`${value}-02`))}
