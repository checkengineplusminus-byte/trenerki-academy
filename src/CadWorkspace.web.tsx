import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import CadRibbonIcon from './CadRibbonIcon.web';
import {copyCadSelection,mergeCadSelection,selectCadWindow,transformCadSelection,mirrorCadSelection,rotateCadSelection,nearestCadObjects} from './CadSelection';
import {polarTracking,objectSnapTracking} from './CadTracking';
import statusReference from '../content/autocad-status-controls-2026.json';
import CadCanvas,{type SceneObject} from './CadCanvas.web';
import useLabKeys from './useLabKeys';
import {LabButton,LabGroup,labStyles} from './LabControls';
import {add,arcData,cadCoordinates,cadNumber,contains,distance,dot,fitDrawing,isClosed,multiply,nearEdge,offsetShape,readCadPoint,
 screenPoint,snapPoint,subtract,transformShape,trimLine,worldPoint,zoomCamera,joinCadLines,type CadShape,type Camera,type Point,type Size,type CadSnapMode} from './CadGeometry';

type Tool='select'|'line'|'poly'|'rect'|'circle'|'arc'|'hatch'|'move'|'copy'|'rotate'|'scale'|'mirror'|'offset'|'trim'|'dist'|'dimlinear'|'dimaligned';
type Session={tool:Tool;points:Point[];target?:number;selecting?:boolean;amount?:number;diameter?:boolean;boundaries?:number[];mirrorAxis?:[Point,Point]};
type Layer={id:number;name:string;color:string;visible:boolean};
type Drawing={shapes:CadShape[];layers:Layer[];currentLayer:number};
const palette=['#d9e8e9','#83d9ee','#edbe83','#bfda94','#e69fa7','#c4a9ee'];
const initial:Drawing={shapes:[],currentLayer:0,layers:[
 {id:0,name:'0',color:palette[0],visible:true},{id:1,name:'Obrys',color:palette[1],visible:true},{id:2,name:'Osie',color:palette[2],visible:true},
]};
const tools:Record<Exclude<Tool,'select'>,{name:string;label:string;aliases:string[]}>={
 line:{name:'LINE',label:'Linia',aliases:['L']},poly:{name:'PLINE',label:'Polilinia',aliases:['PL']},
 rect:{name:'RECTANG',label:'Prostokąt',aliases:['REC']},circle:{name:'CIRCLE',label:'Okrąg',aliases:['C']},
 arc:{name:'ARC',label:'Łuk 3-punktowy',aliases:['A']},hatch:{name:'HATCH',label:'Kreskowanie',aliases:['H']},
 move:{name:'MOVE',label:'Przesuń',aliases:['M']},copy:{name:'COPY',label:'Kopiuj',aliases:['CO','CP']},
 rotate:{name:'ROTATE',label:'Obróć',aliases:['RO']},scale:{name:'SCALE',label:'Skaluj',aliases:['SC']},
 mirror:{name:'MIRROR',label:'Lustro',aliases:['MI']},offset:{name:'OFFSET',label:'Odsuń',aliases:['O']},
 trim:{name:'TRIM',label:'Przytnij',aliases:['TR']},dist:{name:'DIST',label:'Zmierz odległość',aliases:['DI']},
 dimlinear:{name:'DIMLINEAR',label:'Wymiar liniowy',aliases:['DLI']},dimaligned:{name:'DIMALIGNED',label:'Wymiar równoległy',aliases:['DAL']},
};
const aliasMap=Object.fromEntries(Object.entries(tools).flatMap(([tool,t])=>[t.name,...t.aliases].map(name=>[name,tool as Tool])));
const modify=new Set<Tool>(['move','copy','rotate','scale','mirror']);
const promptFor=(s:Session)=>{
 const n=s.points.length;
 if(s.mirrorAxis)return 'Usunąć oryginalne obiekty? [Tak/Nie] <Nie>. Naciśnij Enter, aby je zachować.';
 if(s.tool==='select')return 'Wybierz narzędzie lub wskaż krawędź obiektu.';
 if(s.tool==='line'||s.tool==='poly')return n?'Wskaż następny punkt lub wybierz [Zamknij/Cofnij].':'Wskaż pierwszy punkt.';
 if(s.tool==='rect')return n?'Wskaż przeciwległy narożnik.':'Wskaż pierwszy narożnik.';
 if(s.tool==='circle')return n?s.diameter?'Podaj średnicę.':'Podaj promień lub wybierz [Średnica].':'Wskaż środek okręgu.';
 if(s.tool==='arc')return ['Wskaż początek łuku.','Wskaż punkt na łuku.','Wskaż koniec łuku.'][n]??'Wskaż punkt.';
 if(s.tool==='hatch')return 'Wskaż wnętrze zamkniętego obrysu i zatwierdź Enterem.';
 if(s.tool==='offset')return s.amount===undefined?'Podaj odległość odsunięcia.':s.target===undefined?'Wskaż linię lub okrąg.':'Wskaż stronę odsunięcia.';
 if(s.tool==='trim')return 'Wskaż fragment odcinka do usunięcia. Przecinające krawędzie wyznaczą cięcie.';
 if(s.tool==='dist')return n?'Wskaż drugi punkt pomiaru.':'Wskaż pierwszy punkt pomiaru.';
 if(s.tool==='dimlinear'||s.tool==='dimaligned')return ['Wskaż początek pierwszej linii pomocniczej.','Wskaż drugi punkt wymiaru.','Wskaż położenie linii wymiarowej.'][n]??'Wskaż punkt.';
 if(s.selecting)return 'Wskaż obiekt i zatwierdź wybór Enterem.';
 if(s.tool==='mirror')return n?'Wskaż drugi punkt osi odbicia.':'Wskaż pierwszy punkt osi odbicia.';
 if(!n)return 'Wskaż punkt bazowy.';
 if(s.tool==='rotate')return 'Podaj kąt obrotu w stopniach.';
 if(s.tool==='scale')return 'Podaj dodatni współczynnik skali.';
 return 'Wskaż punkt docelowy lub podaj przesunięcie względem bazy.';
};
const idle:Session={tool:'select',points:[]};
const scalar=(text:string)=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?Number(text):NaN;
const inRange=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1e9&&Math.abs(p.y)<=1e9;
const countObjects=(n:number)=>n===1?'obiekt':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'obiekty':'obiektów';

export default function CadWorkspace({shortcut,runId,storageKey,lessonNo}:{shortcut?:string;runId:number;storageKey?:string;lessonNo?:number}){
 const {width:screenWidth}=useWindowDimensions();
 const [size,setSize]=useState<Size>({width:1,height:1}),[camera,setCamera]=useState<Camera|null>(null);
 const [drawing,setDrawing]=useState(initial),[history,setHistory]=useState<Drawing[]>([]),[future,setFuture]=useState<Drawing[]>([]);
 const [session,setSession]=useState<Session>(idle),[selected,setSelected]=useState<number>(),[selectedIds,setSelectedIds]=useState<number[]>([]),[last,setLast]=useState<Point>();
 const [pointer,setPointer]=useState<Point>(),[input,setInput]=useState(''),[lastCommand,setLastCommand]=useState<Tool>();
 const [message,setMessage]=useState('Gotowy. Wpisz polecenie lub użyj wstążki.'),[log,setLog]=useState<string[]>([]);
 const [grid,setGrid]=useState(true),[ortho,setOrtho]=useState(false),[osnap,setOsnap]=useState(false),[snapGrid,setSnapGrid]=useState(false),[dynamic,setDynamic]=useState(true);
 const [selectionHold,setSelectionHold]=useState(false);
 const [polar,setPolar]=useState(false),[polarStep,setPolarStep]=useState(45),[otrack,setOtrack]=useState(false);
 const [lineweight,setLineweight]=useState(false),[transparency,setTransparency]=useState(false),[selectionCycling,setSelectionCycling]=useState(false);
 const [statusCustom,setStatusCustom]=useState(false),[statusInfo,setStatusInfo]=useState(''),[cleanScreen,setCleanScreen]=useState(false);
 const [showMoreStatus,setShowMoreStatus]=useState(true);
 const polarAnchor=useRef<Point|null>(null),lastCycle=useRef({ids:'' as string,index:0});
 const [snapModes,setSnapModes]=useState<CadSnapMode[]>(['endpoint','midpoint']);
 const [showSnapSettings,setShowSnapSettings]=useState(false);
 const [layoutScale,setLayoutScale]=useState(50);
 const [fontSample,setFontSample]=useState('Przykładowy opis rysunku');
 const [sampleFont,setSampleFont]=useState('Arial');
 const [sampleHeight,setSampleHeight]=useState(2.5);
 const [tab,setTab]=useState<'home'|'insert'|'annotate'|'parametric'|'view'|'manage'|'output'>('home'),[panel,setPanel]=useState<'draw'|'modify'|'layers'>('draw');
 const [pan,setPan]=useState(false),[layout,setLayout]=useState(false),[expandLog,setExpandLog]=useState(false),[pattern,setPattern]=useState<'hatch'|'solid'>('hatch');
 const [layerName,setLayerName]=useState(''),[newLayer,setNewLayer]=useState(false);
 const nextId=useRef(1),nextLayer=useRef(3),commandRef=useRef<React.ComponentRef<typeof TextInput>>(null);
 const view=camera??fitDrawing([],size);
 const visible=drawing.shapes.filter(shape=>drawing.layers.find(l=>l.id===shape.layer)?.visible);
 const selectedVisible=selectedIds.filter(id=>visible.some(s=>s.id===id));
 const chosen=visible.find(shape=>shape.id===selected),target=visible.find(shape=>shape.id===session.target);
 const {tool,points}=session,first=points[0],latest=points.at(-1);
 const prompt=promptFor(session);
 const baseTolerance=view.unitsPerPixel*(screenWidth<650?14:8);
 const currentLayer=drawing.layers.find(l=>l.id===drawing.currentLayer)!;

 function tell(text:string){setMessage(text);setLog(old=>[...old.slice(-13),text]);}
 function record(next:Drawing){setHistory(old=>[...old.slice(-79),drawing]);setFuture([]);setDrawing(next);}
 function updateShapes(shapes:CadShape[]){record({...drawing,shapes});}
 function storeShape(shape:Omit<CadShape,'id'|'layer'>,layer=drawing.currentLayer){
  if(!drawing.layers.find(l=>l.id===layer)?.visible){tell('Włącz widoczność warstwy, aby zobaczyć nowy obiekt.');return;}
  if(!shape.points.every(inRange)){tell('Obiekt przekracza zakres współrzędnych warsztatu.');return;}
  if(drawing.shapes.length>=400){tell('Osiągnięto limit 400 obiektów w pracowni.');return;}
  const id=nextId.current++;
  updateShapes([...drawing.shapes,{...shape,id,layer}]);setSelected(id);setSelectedIds([id]);
  return id;
 }
 function resetSession(){setSession(idle);setInput('');}
 function start(next:Tool){
  if(layout){tell('Otwórz Model, aby edytować rysunek.');return;}
  setPan(false);setInput('');
  const firstSelected=visible.find(shape=>selectedVisible.includes(shape.id))??chosen;
  const selecting=modify.has(next)&&!firstSelected;
  setSession({tool:next,points:[],target:modify.has(next)?firstSelected?.id:undefined,selecting});
  if(next!=='select')setLastCommand(next);
  if(next==='hatch'){setTab('home');setPanel('draw');}
  tell(next==='select'?'Wskaż krawędź obiektu.':tools[next].name+' · '+promptFor({tool:next,points:[],selecting}));
 }
 function undo(){
  const previous=history.at(-1);
  if(!previous){tell('Historia rysunku jest pusta.');return;}
  setFuture(old=>[drawing,...old]);setHistory(history.slice(0,-1));setDrawing(previous);setSelected(undefined);setSelectedIds([]);resetSession();
  tell('Cofnięto ostatnią zmianę rysunku.');
 }
 function redo(){
  if(!future.length)return;
  setHistory(old=>[...old,drawing]);setDrawing(future[0]);setFuture(future.slice(1));setSelected(undefined);setSelectedIds([]);resetSession();tell('Ponowiono zmianę rysunku.');
 }
 function endPolyline(close:boolean){
  if(points.length<2){resetSession();return;}
  const id=storeShape({kind:'poly',points,closed:close});
  if(id){resetSession();tell(close?'Zamknięto polilinię.':'Zakończono polilinię.');}
 }
 function performMirror(eraseSource:boolean){
  if(!session.mirrorAxis)return;
  const ids=selectedVisible.length?selectedVisible:session.target!==undefined?[session.target]:[];
  const result=mirrorCadSelection(drawing.shapes,ids,session.mirrorAxis[0],session.mirrorAxis[1],
   eraseSource,nextId.current);
  if(!result){tell('MIRROR nie powiódł się: zaznacz obiekty, wybierz dwa różne punkty osi i sprawdź limit obiektów.');return;}
  nextId.current=result.nextId;
  updateShapes(result.shapes);
  setSelectedIds(result.ids);setSelected(result.ids.at(-1));resetSession();
  tell('MIRROR: odbito '+ids.length+' '+countObjects(ids.length)+'. '+(eraseSource?'Oryginały usunięte.':'Oryginały zachowane.'));
 }
 function performRotate(degrees:number){
  if(!first||!Number.isFinite(degrees))return;
  const ids=selectedVisible.length?selectedVisible:session.target!==undefined?[session.target]:[];
  if(!ids.length){tell('ROTATE: najpierw zaznacz obiekt.');return;}
  const updated=rotateCadSelection(drawing.shapes,ids,first,degrees);
  if(!updated.filter(shape=>ids.includes(shape.id)).every(shape=>shape.points.every(inRange))){
   tell('ROTATE: część obiektów wyszłaby poza bezpieczny zakres współrzędnych.');return;
  }
  updateShapes(updated);setSelectedIds(ids);setSelected(ids.at(-1));resetSession();
  tell('ROTATE: obrócono '+ids.length+' '+countObjects(ids.length)+' o '+cadNumber(degrees)+'° względem '+cadCoordinates(first)+'.');
 }
 function finish(close=false){
  if(session.mirrorAxis){performMirror(false);return;}
  if(tool==='hatch'){
   if(!session.boundaries?.length){resetSession();return;}
   updateShapes(drawing.shapes.map(s=>session.boundaries?.includes(s.id)?{...s,fill:pattern}:s));resetSession();tell('Zastosowano wypełnienie.');return;
  }
  if(session.selecting){
   const candidate=selectedVisible[0]??target?.id;
   if(candidate!==undefined){setSession({...session,target:candidate,selecting:false});tell('Zatwierdzono wybór '+selectedVisible.length+' obiektów. Wskaż punkt bazowy.');}
   else tell('Zaznacz obiekty, przeciągnij okno lub wpisz ALL.');
   return;
  }
  if(close&&points.length<3){tell('Do zamknięcia wskaż co najmniej trzy różne punkty.');return;}
  if(tool==='poly'){endPolyline(close);return;}
  if(tool==='line'){
   if(close&&!storeShape({kind:'line',points:[latest!,first]}))return;
   resetSession();tell(close?'Dodano odcinek zamykający.':'Zakończono polecenie LINE.');return;
  }
  if(tool==='select'&&lastCommand){start(lastCommand);return;}
  resetSession();
 }
 function cancel(){
  if(tool==='poly'&&points.length>=2){endPolyline(false);return;}
  if(tool==='select'){setSelected(undefined);setSelectedIds([]);}
  resetSession();setPan(false);tell('Anulowano polecenie lub wyczyszczono zaznaczenie.');
 }
 function clearSelection(){
  setSelected(undefined);setSelectedIds([]);
  if(session.selecting)setSession({...session,target:undefined});
  tell('Wyczyszczono zaznaczenie.');
 }
 function selectOneById(id:number,remove=false,location?:Point){
  if(layout||pan||!visible.some(shape=>shape.id===id))return;
  if(tool!=='select'&&!session.selecting)return;
  if(location){
   const point=worldPoint(location,view,size);
   // Touch targets on close parallel lines may overlap. Select by actual CAD
   // distance, not by whichever invisible SVG hit area is on top.
   const hits=nearestCadObjects(visible,point,baseTolerance);
   if(hits.length){
    if(selectionCycling&&hits.length>1){
     const key=hits.map(hit=>hit.id).join(',');
     const index=key===lastCycle.current.ids?(lastCycle.current.index+1)%hits.length:0;
     lastCycle.current={ids:key,index};id=hits[index].id;
     tell('CYCLING: nakładający się obiekt '+(index+1)+'/'+hits.length+'.');
    }else{
     const first=hits[0],underPointer=hits.find(hit=>hit.id===id);
     id=underPointer&&Math.abs(underPointer.distance-first.distance)<1e-6?underPointer.id:first.id;
    }
   }
  }
  const ids=remove?mergeCadSelection(selectedVisible,[id],true):
   selectionHold||session.selecting?mergeCadSelection(selectedVisible,[id]):[id];
  setSelectedIds(ids);setSelected(ids.at(-1));
  if(session.selecting)setSession({...session,target:ids[0],selecting:true});
  tell('Lewy klik: '+(remove?'odjęto':'wybrano')+' obiekt '+id+'. Zaznaczone: '+ids.length+'.');
 }
 function selectAll(){
  if(layout){tell('Zaznaczaj obiekty w Model Space.');return;}
  const ids=visible.map(shape=>shape.id);
  setSelectedIds(ids);setSelected(ids.at(-1));
  if(session.selecting&&ids.length)setSession({...session,target:ids[0],selecting:false});
  tell('Zaznaczono wszystkie widoczne obiekty: '+ids.length+'. Wpisz MOVE, COPY lub SCALE.');
 }
 function selectWindow(startPx:Point,endPx:Point,remove:boolean){
  const from=worldPoint(startPx,view,size),to=worldPoint(endPx,view,size);
  const result=selectCadWindow(visible,from,to);
  const ids=remove?mergeCadSelection(selectedVisible,result.ids,true):
   selectionHold||session.selecting?mergeCadSelection(selectedVisible,result.ids):result.ids;
  setSelectedIds(ids);setSelected(ids.at(-1));
  if(session.selecting&&ids.length)setSession({...session,target:ids[0],selecting:false});
  tell((result.direction==='window'?'Okno: całkowicie objęte':'Przecięcie: objęte lub dotknięte')+' · '+result.ids.length+' obiektów. Łącznie zaznaczono '+ids.length+'.');
 }
 function join(){
  if(layout){tell('Połącz obiekty w przestrzeni Model.');return;}
  const connected=joinCadLines(visible,selected);
  if(!connected){tell('JOIN: wybierz co najmniej dwa połączone odcinki LINE na jednej warstwie.');return;}
  updateShapes([...drawing.shapes.filter(s=>!connected.sourceIds.includes(s.id)),connected.joined]);
  setSelected(connected.joined.id);setSelectedIds([connected.joined.id]);resetSession();
  tell('JOIN: połączono '+connected.sourceIds.length+' odcinki w '+(connected.joined.closed?'zamkniętą':'otwartą')+' polilinię. Możesz przesunąć ją przez MOVE.');
 }
 function erase(){
  if(layout)return;
  const ids=selectedVisible.length?selectedVisible:chosen?[chosen.id]:[];
  if(!ids.length){tell('Zaznacz obiekty, które chcesz usunąć.');return;}
  updateShapes(drawing.shapes.filter(s=>!ids.includes(s.id)));setSelected(undefined);setSelectedIds([]);resetSession();
  tell('Usunięto '+ids.length+' obiektów.');
 }
 function atPointer(pixel:Point){
  const raw=worldPoint(pixel,view,size);
  const snapped=osnap?snapPoint(raw,visible,baseTolerance,snapModes):undefined;
  if(snapped){if(otrack)polarAnchor.current=snapped.point;return snapped;}
  if(otrack&&osnap&&polarAnchor.current){
   const projected=objectSnapTracking(raw,polarAnchor.current,baseTolerance);
   if(projected)return projected;
  }
  const gridSize=50;
  let point=snapGrid?{x:Math.round(raw.x/gridSize)*gridSize,y:Math.round(raw.y/gridSize)*gridSize}:raw;
  if(ortho&&latest&&['line','poly','move','copy','mirror','dist'].includes(tool)){
   point=Math.abs(point.x-latest.x)>=Math.abs(point.y-latest.y)?{x:point.x,y:latest.y}:{x:latest.x,y:point.y};
   return {point,label:'ORTHO 90°'};
  }
  if(polar&&latest&&['line','poly','move','copy','dist'].includes(tool)){
   const guide=polarTracking(point,latest,polarStep);
   if(guide)return guide;
  }
  return {point,label:''};
 }
 function applyChange(shape:CadShape,copy:boolean,text:string){
  if(!shape.points.every(inRange)){tell('Obiekt przekracza zakres współrzędnych warsztatu.');return;}
  if(copy){
   const {id:_id,layer,...data}=shape;
   if(!storeShape(data,layer))return;
  }else updateShapes(drawing.shapes.map(s=>s.id===shape.id?shape:s));
  resetSession();tell(text);
 }
 function accept(point:Point){
  setLast(point);
  setSession({...session,points:[...points,point]});
 }
 function pick(point:Point,remove=false){
  if(layout||pan)return;
  if(!inRange(point)){tell('Współrzędne przekraczają zakres warsztatu.');return;}
  const ordered=[...visible].reverse();
  if(tool==='select'||session.selecting||(tool==='offset'&&session.target===undefined)||tool==='trim'){
   if(tool==='offset'&&session.amount===undefined){tell(prompt);return;}
   const hit=ordered.find(s=>nearEdge(s,point,baseTolerance))??ordered.find(s=>s.fill&&contains(s,point));
   if(!hit){
    if(tool==='select'&&!selectionHold){setSelected(undefined);setSelectedIds([]);}
    tell('Wskaż krawędź obiektu lub zaznacz obiekty oknem.');return;
   }
   if(tool==='select'||session.selecting){
    const ids=remove?mergeCadSelection(selectedVisible,[hit.id],true):
     selectionHold||session.selecting?mergeCadSelection(selectedVisible,[hit.id]):[hit.id];
    setSelectedIds(ids);setSelected(ids.at(-1));
    if(session.selecting)setSession({...session,target:ids[0],selecting:true});
    tell((remove?'Odjęto obiekt. ':'Dodano obiekt. ')+'Zaznaczono: '+ids.length+'.');
    return;
   }
   setSelected(hit.id);setSelectedIds([hit.id]);
   if(tool==='trim'){
    const remaining=trimLine(hit,visible,point);
    if(remaining){
     if(drawing.shapes.length>=400&&remaining.length>1){tell('Usuń jeden obiekt przed rozdzieleniem odcinka.');return;}
     const parts=remaining.map((s,i)=>i?{...s,id:nextId.current++}:s);
     updateShapes(drawing.shapes.flatMap(s=>s.id===hit.id?parts:[s]));
     tell('Przycięto wybrany fragment. Możesz przyciąć kolejny odcinek.');
    }else tell('Wybierz odcinek, który przecina inna widoczna krawędź.');
   }else if(session.selecting||tool==='offset')setSession({...session,target:hit.id});
   else tell('Zaznaczono obiekt '+hit.id+'.');
   return;
  }
  if(tool==='hatch'){
   const boundary=ordered.find(s=>isClosed(s)&&contains(s,point));
   if(!boundary){tell('Wskaż punkt wewnątrz zamkniętego obrysu.');return;}
   const ids=session.boundaries??[];
   setSession({...session,boundaries:ids.includes(boundary.id)?ids.filter(id=>id!==boundary.id):[...ids,boundary.id]});
   tell('Sprawdź podgląd kreskowania i zatwierdź Enterem.');return;
  }
  if(tool==='offset'&&target){
   const shifted=offsetShape(target,session.amount!,point);
   if(shifted)applyChange(shifted,true,'Utworzono obiekt odsunięty o '+cadNumber(session.amount!)+'.');
   else tell('Odsunięcie w tej pracowni działa na liniach i okręgach. Sprawdź też promień.');
   return;
  }
  if(session.mirrorAxis){tell('MIRROR: wybierz Tak lub Nie, aby zakończyć odbicie.');return;}
  if(!first){accept(point);return;}
  if(distance(point,latest!)<1e-8){tell('Wybierz punkt różny od poprzedniego.');return;}
  if(tool==='line'){
   if(storeShape({kind:'line',points:[latest!,point]})){accept(point);tell('Odcinek · długość '+cadNumber(distance(latest!,point)));}
  }else if(tool==='poly'||(tool==='arc'&&points.length===1)||((tool==='dimlinear'||tool==='dimaligned')&&points.length===1)){
   accept(point);
  }else if(tool==='rect'){
   if(Math.abs(point.x-first.x)<1e-8||Math.abs(point.y-first.y)<1e-8){tell('Prostokąt potrzebuje dwóch różnych wymiarów.');return;}
   if(storeShape({kind:'rect',points:[first,point]})){setLast(point);resetSession();tell('Prostokąt · '+cadNumber(Math.abs(point.x-first.x))+' × '+cadNumber(Math.abs(point.y-first.y)));}
  }else if(tool==='circle'){
   const radius=distance(first,point)/(session.diameter?2:1);
   const rim=add(first,multiply(subtract(point,first),session.diameter?.5:1));
   if(storeShape({kind:'circle',points:[first,rim]})){resetSession();tell('Okrąg · R '+cadNumber(radius)+' · Ø '+cadNumber(radius*2));}
  }else if(tool==='arc'){
   if(!arcData([first,latest!,point])){tell('Wybierz trzeci punkt poza prostą dwóch poprzednich punktów.');return;}
   if(storeShape({kind:'arc',points:[first,latest!,point]})){setLast(point);resetSession();tell('Utworzono łuk przez trzy punkty.');}
  }else if(tool==='dist'){
   setLast(point);resetSession();tell('Odległość '+cadNumber(distance(first,point))+' · ΔX '+cadNumber(point.x-first.x)+' · ΔY '+cadNumber(point.y-first.y));
  }else if(tool==='dimlinear'||tool==='dimaligned'){
   if(storeShape({kind:'dimension',points:[...points,point],aligned:tool==='dimaligned'})){resetSession();tell('Dodano wymiar do rysunku.');}
  }else if(target&&(tool==='move'||tool==='copy')){
   const delta=subtract(point,first),ids=selectedVisible.length?selectedVisible:[target.id];
   const shifted=transformCadSelection(drawing.shapes,ids,p=>add(p,delta));
   const moved=shifted.filter(shape=>ids.includes(shape.id));
   if(!moved.every(shape=>shape.points.every(inRange))){tell('Obiekty wyszłyby poza dozwolony zakres współrzędnych.');return;}
   if(tool==='copy'){
    const result=copyCadSelection(drawing.shapes,ids,nextId.current);
    if(!result){tell('Nie można skopiować tej liczby obiektów.');return;}
    nextId.current=result.nextId;
    updateShapes(transformCadSelection(result.shapes,result.newIds,p=>add(p,delta)));
    setSelectedIds(result.newIds);setSelected(result.newIds.at(-1));
   }else{
    updateShapes(shifted);
    setSelectedIds(ids);setSelected(ids.at(-1));
   }
   setLast(point);resetSession();
   tell((tool==='copy'?'Skopiowano ':'Przesunięto ')+ids.length+' '+countObjects(ids.length)+' o '+cadCoordinates(delta)+'.');
  }else if(target&&tool==='rotate'){
   const angle=Math.atan2(point.y-first.y,point.x-first.x)*180/Math.PI;
   performRotate(angle);
  }else if(target&&tool==='mirror'){
   if(distance(point,first)<1e-6){tell('MIRROR: punkty osi muszą być różne.');return;}
   setSession({...session,points:[first,point],mirrorAxis:[first,point]});
   tell('MIRROR: usunąć obiekty źródłowe? [Tak/Nie] <Nie>. Enter zachowuje oryginały.');
  }
 }
 function zoom(factor:number,at:Point={x:size.width/2,y:size.height/2}){setCamera(old=>zoomCamera(old??view,size,factor,at));}
 function shift(delta:Point){setCamera(old=>{const c=old??view;return {...c,center:add(c.center,{x:-delta.x*c.unitsPerPixel,y:delta.y*c.unitsPerPixel})};});}
 function fit(){setCamera(fitDrawing(visible,size));tell('Dopasowano widok do zasięgu widocznych obiektów.');}
 function flags(command:string){
  switch(command){
   case 'F3':setOsnap(v=>!v);return true;
   case 'F7':setGrid(v=>!v);return true;
   case 'F8':setOrtho(v=>!v);setPolar(false);return true;
   case 'F9':setSnapGrid(v=>!v);return true;
   case 'F10':setPolar(v=>!v);setOrtho(false);return true;
   case 'F11':setOtrack(v=>!v);return true;
   case 'F12':setDynamic(v=>!v);return true;
   case 'F2':setExpandLog(v=>!v);return true;
   default:return false;
  }
 }
 function runCommand(raw:string){
  const command=raw.trim().toUpperCase().replace(/^[_.]+(?=[A-Z])/,'');
  const number=scalar(command);
  setInput('');
  if(flags(command))return;
  if(['ESC','ESCAPE'].includes(command)){cancel();return;}
  if(session.mirrorAxis){
   if(['N','NO','NIE',''].includes(command)){performMirror(false);return;}
   if(['Y','YES','T','TAK'].includes(command)){performMirror(true);return;}
   tell('MIRROR: wpisz N, aby zachować oryginały, lub Y, aby je usunąć.');return;
  }
  if(['CTRL+Z','UNDO','U'].includes(command)){
   if(command==='U'&&(tool==='line'||tool==='poly')&&points.length>1){
    if(tool==='line'&&history.length){
     setDrawing(history.at(-1)!);setHistory(history.slice(0,-1));setFuture([]);setSelected(undefined);
    }
    setSession({...session,points:points.slice(0,-1)});setLast(points.at(-2));tell('Cofnięto ostatni odcinek polecenia.');return;
   }
   undo();return;
  }
  if(['CTRL+Y','REDO'].includes(command)){redo();return;}
  if(['CTRL+W','SELECTIONCYCLING'].includes(command)){setSelectionCycling(v=>!v);tell('Przełączono wybór nakładających się obiektów.');return;}
  if(['ALL','CTRL+A','SELECTALL'].includes(command)){selectAll();return;}
  if(['DESELECT','CLEARSELECTION'].includes(command)){clearSelection();return;}
  if(command==='SELECT'){setSession({tool:'select',points:[]});tell('Wybieraj obiekty pojedynczo lub oknem.');return;}
  if(['E','ERASE','DELETE'].includes(command)){erase();return;}
  if(['JOIN','J','PEDIT'].includes(command)){join();return;}
  if(['LA','LAYER'].includes(command)){setTab('home');setPanel('layers');return;}
  if(['ZOOM','Z','ZOOM E','ZOOM EXTENTS','ZE'].includes(command)){fit();return;}
  if(['PAN','P'].includes(command)){setPan(v=>!v);tell('Przesuń widok przez przeciągnięcie.');return;}
  if(!command){finish();return;}
  if((command==='C'||command==='CLOSE')&&(tool==='poly'||tool==='line')&&points.length>=2){finish(true);return;}
  if((command==='D'||command==='DIAMETER')&&tool==='circle'&&first){setSession({...session,diameter:true});return;}
  if(tool==='offset'&&session.amount===undefined&&Number.isFinite(number)){
   if(number>0)setSession({...session,amount:number});
   else tell('Odległość musi być większa od zera.');
   return;
  }
  if(tool==='circle'&&first&&Number.isFinite(number)){
   if(number>0)pick({x:first.x+number,y:first.y});else tell('Wymiar okręgu musi być dodatni.');
   return;
  }
  if((tool==='rotate'||tool==='scale')&&first&&target&&Number.isFinite(number)){
   if(tool==='rotate'){performRotate(number);return;}
   if(number<=0){tell('Współczynnik skali musi być dodatni.');return;}
   const ids=selectedVisible.length?selectedVisible:[target.id];
   const updated=transformCadSelection(drawing.shapes,ids,p=>add(first,multiply(subtract(p,first),number)));
   if(!updated.filter(shape=>ids.includes(shape.id)).every(shape=>shape.points.every(inRange))){
    tell('Obiekt wychodzi poza bezpieczny zakres współrzędnych.');return;
   }
   updateShapes(updated);setSelectedIds(ids);setSelected(ids.at(-1));resetSession();
   tell('SCALE: przeskalowano '+ids.length+' '+countObjects(ids.length)+' ×'+cadNumber(number)+'.');
   return;
  }
  const point=readCadPoint(command,latest??last);
  if(point){pick(point);return;}
  if(Object.hasOwn(aliasMap,command)){start(aliasMap[command]);return;}
  tell('Nie rozpoznano wpisu „'+raw.slice(0,50)+'”. Użyj polecenia z wstążki lub wpisz punkt, np. 1200,800 albo @600<30.');
 }
 useEffect(()=>{if(shortcut&&runId)runCommand(shortcut);},[runId]);
 useLabKeys('cad-workspace',event=>{
  if(flags(event.key))return true;
  if(event.key==='Escape'){cancel();return true;}
  const tag=(event.target as Element).tagName.toUpperCase();
  if(tag==='INPUT')return false;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){selectAll();return true;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='w'){setSelectionCycling(v=>!v);return true;}
  if(event.ctrlKey&&event.key.toLowerCase()==='z'){undo();return true;}
  if(event.ctrlKey&&event.key.toLowerCase()==='y'){redo();return true;}
  if(event.key==='Delete'){erase();return true;}
  if(tag==='SVG'){
   if(event.key==='Enter'||event.key===' '){finish();return true;}
   if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&event.key.length===1){
    setInput(event.key);commandRef.current?.focus();return true;
   }
  }
  return false;
 });

 function addLayer(){
  const name=layerName.trim().slice(0,24);
  if(!name||drawing.layers.some(l=>l.name.toLowerCase()===name.toLowerCase())){tell('Podaj nową, unikalną nazwę warstwy.');return;}
  const id=nextLayer.current++;
  record({...drawing,currentLayer:id,layers:[...drawing.layers,{id,name,color:palette[id%palette.length],visible:true}]});
  setNewLayer(false);setLayerName('');tell('Utworzono i aktywowano warstwę '+name+'.');
 }
 const candidate=pointer&&!layout&&!pan?atPointer(pointer):undefined;
 const cursorPoint=candidate?.point;
 const drawingPreview:SceneObject[]=[];
 const draft=(kind:CadShape['kind'],vertices:Point[],aligned?:boolean)=>{
  if(vertices.length>1&&distance(vertices[0],vertices[1])>1e-8)drawingPreview.push({shape:{id:0,kind,points:vertices,layer:currentLayer.id,aligned},color:currentLayer.color,preview:true});
 };
 if(first&&!layout){
  if(tool==='poly'&&points.length>1)draft('poly',cursorPoint?[...points,cursorPoint]:points);
  else if(cursorPoint&&['line','poly','move','copy','dist','mirror'].includes(tool))draft('line',[latest!,cursorPoint]);
  else if(cursorPoint&&tool==='rect')draft('rect',[first,cursorPoint]);
  else if(cursorPoint&&tool==='circle')draft('circle',[first,session.diameter?multiply(add(first,cursorPoint),.5):cursorPoint]);
  else if(cursorPoint&&tool==='arc')draft(points.length===2?'arc':'line',[...points,cursorPoint]);
  else if(cursorPoint&&(tool==='dimlinear'||tool==='dimaligned'))draft(points.length===2?'dimension':'line',[...points,cursorPoint],tool==='dimaligned');
 }
 const objects:SceneObject[]=visible.map(shape=>({
  shape:session.boundaries?.includes(shape.id)?{...shape,fill:pattern}:shape,
  color:drawing.layers.find(l=>l.id===shape.layer)!.color,selected:!layout&&selectedVisible.includes(shape.id),
 }));
 const ribbonButton=(t:Exclude<Tool,'select'>)=><Pressable key={t} accessibilityRole="button"
   accessibilityLabel={tools[t].label+' · '+tools[t].name} accessibilityState={{selected:tool===t}} onPress={()=>start(t)}
   style={{minWidth:65,maxWidth:76,alignItems:'center',justifyContent:'center',paddingHorizontal:5,paddingVertical:8,
    borderRadius:3,backgroundColor:tool===t?'#506d80':'transparent',gap:4,minHeight:64}}>
   <CadRibbonIcon tool={t} size={28}/>
   <Text style={{color:'#e9f0f5',fontSize:10,fontWeight:'700',textAlign:'center'}}>{tools[t].name}</Text>
  </Pressable>;
 const extraRibbonButton=(name:string,toolIcon:'join'|'erase'|'text'|'layer'|'select'|'zoom'|'pan',
    action:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityLabel={name} disabled={disabled} onPress={action}
    style={{minWidth:66,justifyContent:'center',alignItems:'center',gap:4,padding:6,opacity:disabled?0.38:1}}>
    <CadRibbonIcon tool={toolIcon} size={26}/>
    <Text style={{fontSize:10,color:'#e9f0f5',fontWeight:'700',textAlign:'center'}}>{name.split(' · ')[0]}</Text>
   </Pressable>;
 const ribbonCaption={color:'#a6b7c5',fontSize:11,fontWeight:'700' as const,textAlign:'center' as const,marginTop:'auto' as const,paddingTop:8};
 const ribbonPanel={minHeight:113,borderRightWidth:1,borderRightColor:'#526071',paddingRight:8,marginRight:8,justifyContent:'space-between' as const,gap:4};
 const reportedPoint=candidate?.point??last;
 const statusButtons:{id:string;icon:string;name:string;active:boolean;onPress:()=>void;extra?:boolean}[]=[
  {id:'grid',icon:'▦',name:'Siatka · F7',active:grid,onPress:()=>flags('F7')},
  {id:'snap',icon:'⌗',name:'Skok siatki 50 · F9',active:snapGrid,onPress:()=>flags('F9')},
  {id:'ortho',icon:'⊥',name:'ORTHO · F8',active:ortho,onPress:()=>{setOrtho(v=>!v);setPolar(false);}},
  {id:'polar',icon:'◠',name:'POLAR · F10',active:polar,onPress:()=>flags('F10')},
  {id:'osnap',icon:'⊙',name:'OSNAP · F3',active:osnap,onPress:()=>flags('F3')},
  {id:'otrack',icon:'↗',name:'OTRACK · F11',active:otrack,onPress:()=>flags('F11')},
  {id:'dyn',icon:'▣',name:'Dynamic Input · F12',active:dynamic,onPress:()=>flags('F12')},
  {id:'hold',icon:'▧',name:'PICKADD · Przytrzymaj',active:selectionHold,onPress:()=>setSelectionHold(v=>!v)},
  {id:'coord',icon:'XY',name:'X,Y · Współrzędne',active:true,onPress:()=>setStatusInfo('coord')},
  {id:'cycle',icon:'⧉',name:'Selection Cycling · Ctrl+W',active:selectionCycling,onPress:()=>setSelectionCycling(v=>!v),extra:true},
  {id:'lwt',icon:'≡',name:'LWT · Grubość linii',active:lineweight,onPress:()=>setLineweight(v=>!v),extra:true},
  {id:'trans',icon:'◫',name:'Transparency · Przezroczystość',active:transparency,onPress:()=>setTransparency(v=>!v),extra:true},
  {id:'annotation',icon:'1:50',name:'Skala anotacji · 1:50',active:layout,onPress:()=>{setLayout(true);setSession(idle);},extra:true},
  {id:'clean',icon:'⛶',name:'Czysty ekran · Ctrl+0',active:cleanScreen,onPress:()=>setCleanScreen(v=>!v),extra:true},
 ];
 const activeStatus=statusReference.items.find(item=>item.id===statusInfo);
 return <View style={labStyles.panel} testID="cad-workspace">
  <Text style={labStyles.heading}>AutoCAD · pracownia rysunku 2D</Text>
  <Text style={labStyles.body}>{lessonNo===0?'Ćwiczenie 1: wpisz LINE → 0,0 → 1000,0 → 500,800 → CLOSE. Następnie wpisz JOIN, aby otrzymać jedną polilinię, i MOVE, aby przesunąć cały trójkąt.':lessonNo===5?'Połącz trzy osobne linie trójkąta poleceniem JOIN. Sprawdź, że to jeden zamknięty obiekt; przesuń go przez MOVE.':lessonNo===9?'Narysuj RECTANG od 0,0 do @4000,3000. Zmierz boki i przekątną oraz dopasuj widok.':'Przećwicz polecenia z tej lekcji na rysunku. Możesz wpisywać współrzędne, używać wstążki oraz zaznaczać obiekty myszą.'}</Text>

  {!cleanScreen&&<View testID="cad-ribbon" style={{backgroundColor:'#25303f',borderWidth:1,borderColor:'#56687c',borderRadius:5,overflow:'hidden',marginVertical:5}}>
   <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#1d2734',minHeight:38}}>
    <View style={{backgroundColor:'#be294f',paddingHorizontal:10,minHeight:38,justifyContent:'center'}}>
     <Text style={{color:'white',fontWeight:'900',fontSize:17}}>A</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{flexDirection:'row',alignItems:'stretch',gap:2,paddingHorizontal:6}}>
     {([
      ['home','Home / Narzędzia główne','Home'],['insert','Insert / Wstawianie','Insert'],
      ['annotate','Annotate / Opisz','Annotate'],['parametric','Parametric / Parametryczne','Parametric'],
      ['view','View / Widok','View'],['manage','Manage / Zarządzaj','Manage'],['output','Output / Wydruk','Output'],
     ] as const).map(([id,label,caption])=><Pressable key={id} accessibilityRole="button" accessibilityLabel={label} onPress={()=>setTab(id)}
      style={{paddingHorizontal:11,paddingVertical:10,backgroundColor:tab===id?'#3b485c':'transparent',
       borderBottomWidth:tab===id?2:0,borderBottomColor:'#98bed9'}}>
      <Text style={{color:tab===id?'white':'#c8d1dc',fontWeight:tab===id?'900':'600',fontSize:12}}>{caption}</Text>
     </Pressable>)}
    </ScrollView>
   </View>
   {tab==='home'&&<ScrollView horizontal showsHorizontalScrollIndicator testID="cad-home-ribbon"
    contentContainerStyle={{flexDirection:'row',alignItems:'stretch',paddingVertical:9,paddingHorizontal:8}}>
    <View style={ribbonPanel}>
     <View style={{flexDirection:'row',alignItems:'center'}}>
      {(['line','poly','circle','arc','rect','hatch'] as const).map(ribbonButton)}
     </View>
     <Text style={ribbonCaption}>Draw / Rysuj</Text>
    </View>
    <View style={ribbonPanel}>
     <View style={{flexDirection:'row',alignItems:'center'}}>
      {(['move','copy','rotate','mirror','trim','scale','offset'] as const).map(ribbonButton)}
      {extraRibbonButton('Połącz linie · JOIN','join',join)}
      {extraRibbonButton('Usuń · ERASE','erase',erase,!selectedVisible.length)}
     </View>
     <Text style={ribbonCaption}>Modify / Zmień</Text>
    </View>
    <View style={{...ribbonPanel,minWidth:195}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
      <CadRibbonIcon tool="layer" size={30}/>
      <View style={{gap:3,flex:1}}>
       <Text style={{color:'#e9f0f5',fontSize:11}}>Bieżąca warstwa</Text>
       <Text style={{color:'#c9ebd1',fontSize:13,fontWeight:'800'}}>{currentLayer.name}</Text>
      </View>
     </View>
     <View style={{flexDirection:'row',gap:5,alignItems:'center'}}>
      {drawing.layers.map(layer=><Pressable key={layer.id} accessibilityRole="button" accessibilityLabel={'Warstwa: '+layer.name}
       onPress={()=>setDrawing({...drawing,currentLayer:layer.id})}
       style={{paddingHorizontal:7,paddingVertical:7,backgroundColor:drawing.currentLayer===layer.id?'#587084':'#344557',borderRadius:4}}>
       <Text style={{color:'white',fontSize:10}}>{layer.name}</Text>
      </Pressable>)}
     </View>
     <Text style={ribbonCaption}>Layers / Warstwy</Text>
    </View>
    <View style={{...ribbonPanel,borderRightWidth:0}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
      {extraRibbonButton('Tekst · MTEXT','text',()=>setTab('annotate'))}
      {ribbonButton('dimlinear')}
      {extraRibbonButton('Wybierz wszystkie · Ctrl+A','select',selectAll,!visible.length)}
     </View>
     <Text style={ribbonCaption}>Annotation / Właściwości</Text>
    </View>
   </ScrollView>}
   {tab!=='home'&&<View style={{padding:12,backgroundColor:'#e9f0f3',gap:9}}>
    {tab==='annotate'&&<Text style={{fontSize:12,color:'#395569',fontWeight:'800'}}>Annotate → Dimensions · Text · Style (wymiary i tekst)</Text>}
    {tab==='view'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
     <LabButton label="ZOOM · Dopasuj" onPress={fit}/>
     <LabButton label="PAN · Przesuń" selected={pan} onPress={()=>{setPan(v=>!v);setPointer(undefined);}}/>
     <LabButton label="Przybliż +" disabled={layout} onPress={()=>zoom(.8)}/>
     <LabButton label="Oddal −" disabled={layout} onPress={()=>zoom(1.25)}/>
    </View>}
    {tab==='insert'&&<Text style={{fontSize:13,color:'#395569',lineHeight:21}}>Insert / Wstaw: BLOCK, INSERT, XREF, PDFATTACH, IMAGEATTACH. Te narzędzia wymagają oryginalnego AutoCAD-a — instrukcje znajdziesz w Bibliotece AutoCAD.</Text>}
    {tab==='parametric'&&<Text style={{fontSize:13,color:'#395569',lineHeight:21}}>Parametric / Parametryczne: wiązania geometryczne, równoległość, styczność oraz ograniczenia wymiarowe. Ćwiczenia są w Bibliotece AutoCAD.</Text>}
    {tab==='manage'&&<Text style={{fontSize:13,color:'#395569',lineHeight:21}}>Manage / Zarządzaj: CUI, aliasy z acad.pgp, standardy CAD i personalizacja. Korzystaj z Biblioteki AutoCAD oraz programu desktopowego.</Text>}
    {tab==='output'&&<Text style={{fontSize:13,color:'#395569',lineHeight:21}}>Output / Wydruk: PLOT, PUBLISH, EXPORTPDF, PAGESETUP. W modelu rysuj w 1:1, skalę ustawiaj w rzutni arkusza.</Text>}
   </View>}
  </View>}
  {tab==='annotate'&&!cleanScreen&&<View style={{backgroundColor:'#f1f6f8',padding:12,borderRadius:9,gap:10}}>
   <LabGroup label="Dimensions / Wymiary i pomiary">{(['dimlinear','dimaligned','dist'] as const).map(t=><LabButton key={t} label={tools[t].label+' · '+tools[t].name} selected={tool===t} onPress={()=>start(t)}/>)}</LabGroup>
    <View style={{padding:13,backgroundColor:'#f0f6f8',borderRadius:10,gap:9}} testID="cad-font-style">
     <Text style={labStyles.heading}>Tekst i czcionka — STYLE / MTEXT</Text>
     <Text style={labStyles.body}>Podgląd stylu edukacyjnego (nie edytuje pliku DWG). W oryginalnym AutoCAD: wpisz STYLE, utwórz styl i wybierz font TrueType/SHX; użyj MTEXT, aby dodać opis lub zmienić wysokość tekstu.</Text>
     <TextInput accessibilityLabel="Treść napisu do podglądu" value={fontSample} onChangeText={setFontSample} style={labStyles.input}/>
     <LabGroup label="Wygląd czcionki (przykłady)">
      {['Arial','Times New Roman','monospace'].map(font=><LabButton key={font} label={font} selected={sampleFont===font} onPress={()=>setSampleFont(font)}/>)}
     </LabGroup>
     <LabGroup label="Wysokość tekstu na papierze">
      {[2.5,3.5,5].map(h=><LabButton key={h} label={String(h).replace('.',',')+' mm'} selected={sampleHeight===h} onPress={()=>setSampleHeight(h)}/>)}
     </LabGroup>
     <Text testID="cad-font-preview" style={{fontFamily:sampleFont,fontSize:Math.round(10+sampleHeight*2.5),color:'#264955',padding:13,backgroundColor:'white',borderRadius:8}}>{fontSample||'Przykładowy napis'}</Text>
     <Text style={{fontSize:12,color:'#516c73'}}>Wymiar w modelu i wysokość tekstu na papierze to dwie różne rzeczy. Dla skali 1:50 tekst nieanotacyjny 2,5 mm na papierze odpowiada 125 mm w modelu. Styl anotacyjny potrafi przeliczać to automatycznie.</Text>
    </View>
  </View>}
  {tool==='hatch'&&<LabGroup label="Hatch Creation / Kreskowanie">
   <LabButton label="Linie ukośne" selected={pattern==='hatch'} onPress={()=>setPattern('hatch')}/>
   <LabButton label="Pełne · SOLID" selected={pattern==='solid'} onPress={()=>setPattern('solid')}/>
  </LabGroup>}
  <View style={{backgroundColor:'#e6eff1',padding:11,borderRadius:10,gap:7,marginBottom:8}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,alignItems:'center'}}>
    <LabButton testID="cad-hold-selection" label={selectionHold?'Przytrzymaj zaznaczenie · WŁ.':'Przytrzymaj zaznaczenie · WYŁ.'}
      selected={selectionHold} disabled={layout} onPress={()=>{setSelectionHold(v=>!v);tell('Tryb podtrzymania wyboru: '+(!selectionHold?'włączony.':'wyłączony.'));}}/>
    <LabButton label="Zaznacz wszystko · Ctrl+A" disabled={layout||!visible.length} onPress={selectAll}/>
    <LabButton label="Wyczyść zaznaczenie · Esc" disabled={!selectedVisible.length} onPress={clearSelection}/>
    <LabButton label="Przesuń zaznaczone · MOVE" disabled={layout||!selectedVisible.length} onPress={()=>start('move')}/>
    <LabButton label="Kopiuj zaznaczone · COPY" disabled={layout||!selectedVisible.length} onPress={()=>start('copy')}/>
   </View>
   <Text style={{color:'#385b64',fontSize:12,lineHeight:19}}>
    Zaznaczone: {selectedVisible.length}. Pojedynczy lewy klik od razu wybiera obiekt. Włącz „Przytrzymaj zaznaczenie”, aby kolejne kliknięcia dodawały elementy do grupy (również na telefonie); Shift + kliknięcie odejmuje. Przeciągnięcie od lewej do prawej wybiera obiekty wewnątrz, od prawej do lewej także przecinane. Potem wybierz MOVE.
   </Text>
  </View>
  <View style={{height:screenWidth<640?270:385,borderRadius:8,overflow:'hidden',backgroundColor:'#172530'}}
   onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize({width,height});}}>
   <CadCanvas size={size} camera={layout?fitDrawing(visible,size):view} objects={[...objects,...drawingPreview]} grid={grid} pan={pan} layout={layout} selecting={tool==='select'||!!session.selecting} lineweight={lineweight} transparency={transparency}
    cursor={pointer} snap={candidate?.label&&cursorPoint?screenPoint(cursorPoint,view,size):undefined}
    prompt={dynamic&&tool!=='select'&&cursorPoint?(candidate?.label?candidate.label+' · ':'')+cadCoordinates(cursorPoint):undefined}
    onMove={setPointer} onPick={(p,remove)=>pick(tool==='select'||session.selecting||tool==='hatch'||tool==='trim'?worldPoint(p,view,size):atPointer(p).point,remove)}
    onObjectTap={selectOneById} onWindowSelect={selectWindow}
    onPan={shift} onZoom={zoom} onFinish={()=>finish()}/>
  </View>
  <View style={labStyles.row}>
   <LabButton label="Dopasuj widok" onPress={fit}/>
   <LabButton label="Cofnij · Ctrl+Z" disabled={!history.length} onPress={undo}/>
   <LabButton label="Ponów · Ctrl+Y" disabled={!future.length} onPress={redo}/>
  </View>
  {layout&&<View testID="cad-layout-scale" style={{backgroundColor:'#edf5ec',padding:12,borderRadius:10,gap:10}}>
   <Text style={labStyles.heading}>Skala rzutni i wydruku — ćwiczenie</Text>
   <Text style={labStyles.body}>W modelu pozostaw wymiary 1:1. W prawdziwym AutoCAD zaznacz ramkę rzutni na Layout, otwórz Properties (Ctrl+1), ustaw Standard Scale i zablokuj rzutnię. Poniższy kalkulator nie zmienia Twojego rysunku.</Text>
   <LabGroup label="Porównaj skale">
    {[20,25,50,100,200].map(scale=><LabButton key={scale} label={'1:'+scale} selected={layoutScale===scale} onPress={()=>setLayoutScale(scale)}/>)}
   </LabGroup>
   <Text style={{fontWeight:'800',color:'#315b43'}}>Przy 1:{layoutScale} odcinek 5000 mm w modelu ma {(5000/layoutScale).toLocaleString('pl-PL')} mm na papierze.</Text>
   <Text style={{fontSize:12,color:'#607a69'}}>SCALE zmienia rozmiar zaznaczonych obiektów. Skala rzutni nie zmienia geometrii. Zoom również jej nie zmienia.</Text>
  </View>}
  <Text style={labStyles.eyebrow} testID="cad-summary">{layout?'Arkusz':'Model'} · Obiekty: {visible.length} · Zaznaczone: {selectedVisible.length} · Wypełnienia: {visible.filter(s=>s.fill).length}
   {reportedPoint?' · X,Y '+cadCoordinates(reportedPoint):''}</Text>
  <View style={{backgroundColor:'#edf2f4',borderColor:'#c1d1d6',borderWidth:1,borderRadius:8,padding:9,gap:6}}>
   <Text style={labStyles.eyebrow}>{tool==='select'?'Polecenie':tools[tool].name} · {layout?'Podgląd arkusza. Edycję wykonujesz w Modelu.':prompt}</Text>
   <View style={labStyles.row}>
    <TextInput ref={commandRef} testID="cad-command" accessibilityLabel="Wiersz poleceń AutoCAD" style={[labStyles.input,{flex:1,minWidth:135}]}
     value={input} onChangeText={setInput} onSubmitEditing={()=>runCommand(input)} autoCorrect={false} autoCapitalize="none"
     placeholder={tool==='select'?'Wpisz polecenie, np. L lub REC':'Wpisz punkt albo opcję polecenia'}/>
    <LabButton label="Enter ↵" onPress={()=>runCommand(input)}/>
   </View>
   <View style={labStyles.row}>
    {(tool==='poly'||tool==='line')&&points.length>1&&<>
     <LabButton label="Zakończ rysowanie" onPress={()=>finish()}/>
     <LabButton label="Cofnij punkt · U" onPress={()=>runCommand('U')}/>
     <LabButton label="Zamknij obrys" disabled={points.length<3} onPress={()=>finish(true)}/>
    </>}
    {tool==='circle'&&first&&<LabButton label="Średnica · D" selected={session.diameter} onPress={()=>setSession({...session,diameter:!session.diameter})}/>}
    {tool==='mirror'&&session.mirrorAxis&&<>
     <LabButton label="Zachowaj oryginały · Nie" onPress={()=>performMirror(false)}/>
     <LabButton label="Usuń oryginały · Tak" onPress={()=>performMirror(true)}/>
    </>}
    {tool!=='select'&&<LabButton label="Anuluj · Esc" onPress={cancel}/>}
    <LabButton label="Historia poleceń · F2" selected={expandLog} onPress={()=>setExpandLog(v=>!v)}/>
   </View>
   <Text accessibilityLiveRegion="polite" style={labStyles.body}>{message}</Text>
   {expandLog&&<View style={{gap:3}}>{log.map((entry,i)=><Text key={i} style={labStyles.eyebrow}>{entry}</Text>)}</View>}
  </View>
  <View testID="cad-status-bar" style={{backgroundColor:'#222c3a',borderRadius:6,
    borderWidth:1,borderColor:'#566a7c',gap:0,marginTop:7,overflow:'hidden'}}>
   <View style={{flexDirection:'row',alignItems:'stretch',minHeight:45}}>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:4,backgroundColor:'#1b2431',gap:2}}>
     {([['Model',false],['Layout 1 / Arkusz',true]] as const).map(([label,isPaper])=><Pressable key={label}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:layout===isPaper}}
      onPress={()=>{if(isPaper){cancel();setLayout(true);setPointer(undefined);}else setLayout(false);setStatusInfo('model');}}
      style={{backgroundColor:layout===isPaper?'#317cb0':'transparent',paddingHorizontal:8,paddingVertical:10,borderRadius:3}}>
      <Text style={{color:'white',fontSize:11,fontWeight:'800'}}>{isPaper?'LAYOUT':'MODEL'}</Text>
     </Pressable>)}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator style={{flex:1,minWidth:0}} contentContainerStyle={{flexDirection:'row',alignItems:'stretch',paddingHorizontal:4,gap:2}}>
     {statusButtons.filter(item=>showMoreStatus||!item.extra).map(item=><Pressable key={item.id}
      testID={'cad-status-'+item.id} accessibilityRole="button" accessibilityLabel={item.name}
      accessibilityState={{selected:item.active}} onPress={()=>{item.onPress();setStatusInfo(item.id);}}
      style={{backgroundColor:item.active?'#24689e':'transparent',borderRadius:3,minWidth:50,
       alignItems:'center',justifyContent:'center',paddingVertical:5,paddingHorizontal:7,gap:1}}>
      <Text style={{color:item.active?'#fff':'#c6d4e3',fontSize:14,fontWeight:'900'}}>{item.icon}</Text>
      <Text style={{color:item.active?'white':'#c3d1df',fontSize:9,fontWeight:'800'}}>{item.id.toUpperCase()}</Text>
     </Pressable>)}
     <Pressable accessibilityRole="button" accessibilityLabel="Tryby OSNAP · ustaw"
      accessibilityState={{selected:showSnapSettings}} onPress={()=>{setShowSnapSettings(v=>!v);setStatusInfo('osnap');}}
      style={{paddingHorizontal:11,backgroundColor:showSnapSettings?'#24689e':'#243345',justifyContent:'center'}}>
      <Text style={{color:'white',fontWeight:'900',fontSize:17}}>⌄</Text>
     </Pressable>
    </ScrollView>
    <Pressable testID="cad-status-customize" accessibilityRole="button" accessibilityLabel="Dostosuj pasek statusu"
      onPress={()=>{setStatusCustom(v=>!v);setStatusInfo('custom');}}
      style={{backgroundColor:statusCustom?'#24689e':'#1b2431',paddingHorizontal:11,justifyContent:'center'}}>
      <Text style={{color:'white',fontSize:17,fontWeight:'900'}}>☰</Text>
    </Pressable>
   </View>
   <View style={{paddingHorizontal:9,paddingVertical:5,backgroundColor:'#1a2532'}}>
    <Text style={{color:'#c9d7e3',fontSize:10}}>Wskazówka: pojedynczy lewy klik wybiera obiekt • Przeciągnij, aby zaznaczyć oknem • F7/F9/F3/F8/F10/F11/F12 zmieniają tryb pracy • ⇄ przewiń przyciski</Text>
   </View>
  </View>
  {statusCustom&&<View testID="cad-status-customize-panel" style={{backgroundColor:'#ebf2f7',padding:13,borderRadius:9,gap:9}}>
   <Text style={{color:'#234456',fontSize:15,fontWeight:'900'}}>Dostosowanie paska stanu</Text>
   <Text style={{color:'#435e6f',fontSize:13,lineHeight:21}}>W oryginalnym AutoCAD możesz włączyć lub ukryć poszczególne ikony. Tutaj pokazujemy wszystkie ważne ustawienia 2D i uczciwie oznaczamy narzędzia wymagające Autodesk.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
    <LabButton label="Pokaż wszystkie funkcje" selected={showMoreStatus} onPress={()=>setShowMoreStatus(true)}/>
    <LabButton label="Tylko podstawowe" selected={!showMoreStatus} onPress={()=>setShowMoreStatus(false)}/>
    {(['f4','f5','f6','workspace'] as const).map(id=><LabButton key={id}
     label={statusReference.items.find(x=>x.id===id)?.title||id} onPress={()=>setStatusInfo(id)}/>)}
   </View>
  </View>}
  {activeStatus&&<View testID="cad-status-help" style={{padding:13,borderWidth:1,borderColor:'#c3d4db',borderRadius:9,backgroundColor:'#eef6f8',gap:7}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
    <Text style={{color:'#24475a',fontWeight:'900',fontSize:15,flex:1}}>{activeStatus.title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Zamknij opis paska statusu" onPress={()=>setStatusInfo('')}
     style={{padding:6}}><Text style={{color:'#2b526a',fontWeight:'900'}}>✕</Text></Pressable>
   </View>
   <Text style={{color:'#425f6d',lineHeight:22,fontSize:13}}>{activeStatus.meaning}</Text>
   <Text style={{fontWeight:'900',color:'#315d47'}}>Ćwiczenie — wykonaj teraz</Text>
   <Text style={{color:'#425e4d',lineHeight:21,fontSize:13}}>{activeStatus.practice}</Text>
   <Text style={{fontWeight:'800',color:'#335a44'}}>Sprawdź wynik: {activeStatus.result}</Text>
   <Text style={{color:activeStatus.level==='autodesk'?'#7f6030':'#436d51',fontSize:11,fontWeight:'800'}}>
    {activeStatus.level==='autodesk'?'Wymaga oryginalnego AutoCAD — nieudawana funkcja 3D':
     activeStatus.level==='podgląd'?'Podgląd edukacyjny; nie zapisuje zmiany w DWG':'Funkcja obsługiwana w naszym warsztacie 2D'}
   </Text>
  </View>}
  {showSnapSettings&&<View testID="cad-osnap-settings" style={{backgroundColor:'#e7f4ee',padding:12,borderRadius:10,gap:9}}>
   <Text style={labStyles.heading}>Przyciąganie do punktów OSNAP</Text>
   <Text style={labStyles.body}>Włącz F3, potem wybierz konkretne typy punktów. Możesz zaznaczyć kilka jednocześnie. Zobacz marker i podpis przy kursorze.</Text>
   <View style={[labStyles.row,{flexWrap:'wrap'}]}>
    {([
     ['endpoint','Koniec odcinka'],['midpoint','Środek odcinka'],['center','Środek okręgu'],['quadrant','Kwadrant'],
     ['intersection','Przecięcie'],['nearest','Najbliższy na obiekcie'],['geometric','Środek geometryczny'],['node','Węzeł wymiaru'],
    ] as [CadSnapMode,string][]).map(([id,label])=><LabButton key={id} label={label} selected={snapModes.includes(id)} onPress={()=>{
     setSnapModes(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id]);setOsnap(true);
    }}/>)}
   </View>
   <Text style={{fontSize:12,color:'#536d61'}}>Nasz warsztat ćwiczy wskazane tryby 2D. Pełny AutoCAD ma dodatkowo m.in. prostopadłość, styczność, śledzenie i osnap 3D — wyjaśniono je w przewodniku.</Text>
  </View>}
  <Text style={labStyles.body}>Przewiń kółko nad rysunkiem, aby powiększyć widok. Przeciągnij środkowym przyciskiem myszy albo wybierz PAN. Wiersz poleceń przyjmuje X,Y, @ΔX,ΔY oraz @odległość&lt;kąt. ORTHO i OSNAP pomagają przy wskazywaniu kursorem.</Text>
 </View>;
}
