import React,{useEffect,useRef,useState} from 'react';
import {Text,TextInput,View,useWindowDimensions} from 'react-native';
import CadCanvas,{type SceneObject} from './CadCanvas.web';
import useLabKeys from './useLabKeys';
import {LabButton,LabGroup,labStyles} from './LabControls';
import {add,arcData,cadCoordinates,cadNumber,contains,distance,dot,fitDrawing,isClosed,multiply,nearEdge,offsetShape,readCadPoint,
 screenPoint,snapPoint,subtract,transformShape,trimLine,worldPoint,zoomCamera,type CadShape,type Camera,type Point,type Size} from './CadGeometry';

type Tool='select'|'line'|'poly'|'rect'|'circle'|'arc'|'hatch'|'move'|'copy'|'rotate'|'scale'|'mirror'|'offset'|'trim'|'dist'|'dimlinear'|'dimaligned';
type Session={tool:Tool;points:Point[];target?:number;selecting?:boolean;amount?:number;diameter?:boolean;boundaries?:number[]};
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

export default function CadWorkspace({shortcut,runId}:{shortcut?:string;runId:number}){
 const {width:screenWidth}=useWindowDimensions();
 const [size,setSize]=useState<Size>({width:1,height:1}),[camera,setCamera]=useState<Camera|null>(null);
 const [drawing,setDrawing]=useState(initial),[history,setHistory]=useState<Drawing[]>([]),[future,setFuture]=useState<Drawing[]>([]);
 const [session,setSession]=useState<Session>(idle),[selected,setSelected]=useState<number>(),[last,setLast]=useState<Point>();
 const [pointer,setPointer]=useState<Point>(),[input,setInput]=useState(''),[lastCommand,setLastCommand]=useState<Tool>();
 const [message,setMessage]=useState('Gotowy. Wpisz polecenie lub użyj wstążki.'),[log,setLog]=useState<string[]>([]);
 const [grid,setGrid]=useState(true),[ortho,setOrtho]=useState(false),[osnap,setOsnap]=useState(false),[snapGrid,setSnapGrid]=useState(false),[dynamic,setDynamic]=useState(true);
 const [tab,setTab]=useState<'home'|'annotate'|'view'>('home'),[panel,setPanel]=useState<'draw'|'modify'|'layers'>('draw');
 const [pan,setPan]=useState(false),[layout,setLayout]=useState(false),[expandLog,setExpandLog]=useState(false),[pattern,setPattern]=useState<'hatch'|'solid'>('hatch');
 const [layerName,setLayerName]=useState(''),[newLayer,setNewLayer]=useState(false);
 const nextId=useRef(1),nextLayer=useRef(3),commandRef=useRef<React.ComponentRef<typeof TextInput>>(null);
 const view=camera??fitDrawing([],size);
 const visible=drawing.shapes.filter(shape=>drawing.layers.find(l=>l.id===shape.layer)?.visible);
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
  updateShapes([...drawing.shapes,{...shape,id,layer}]);setSelected(id);
  return id;
 }
 function resetSession(){setSession(idle);setInput('');}
 function start(next:Tool){
  if(layout){tell('Otwórz Model, aby edytować rysunek.');return;}
  setPan(false);setInput('');
  const selecting=modify.has(next)&&!chosen;
  setSession({tool:next,points:[],target:modify.has(next)?chosen?.id:undefined,selecting});
  if(next!=='select')setLastCommand(next);
  if(next==='hatch'){setTab('home');setPanel('draw');}
  tell(next==='select'?'Wskaż krawędź obiektu.':tools[next].name+' · '+promptFor({tool:next,points:[],selecting}));
 }
 function undo(){
  const previous=history.at(-1);
  if(!previous){tell('Historia rysunku jest pusta.');return;}
  setFuture(old=>[drawing,...old]);setHistory(history.slice(0,-1));setDrawing(previous);setSelected(undefined);resetSession();
  tell('Cofnięto ostatnią zmianę rysunku.');
 }
 function redo(){
  if(!future.length)return;
  setHistory(old=>[...old,drawing]);setDrawing(future[0]);setFuture(future.slice(1));setSelected(undefined);resetSession();tell('Ponowiono zmianę rysunku.');
 }
 function endPolyline(close:boolean){
  if(points.length<2){resetSession();return;}
  const id=storeShape({kind:'poly',points,closed:close});
  if(id){resetSession();tell(close?'Zamknięto polilinię.':'Zakończono polilinię.');}
 }
 function finish(close=false){
  if(tool==='hatch'){
   if(!session.boundaries?.length){resetSession();return;}
   updateShapes(drawing.shapes.map(s=>session.boundaries?.includes(s.id)?{...s,fill:pattern}:s));resetSession();tell('Zastosowano wypełnienie.');return;
  }
  if(session.selecting){
   if(target){setSession({...session,selecting:false});tell('Zatwierdzono wybór obiektu.');}
   else tell('Wskaż krawędź obiektu, aby go wybrać.');
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
  if(tool==='select')setSelected(undefined);
  resetSession();setPan(false);tell('Anulowano aktywne polecenie.');
 }
 function erase(){
  if(layout)return;
  if(!chosen){tell('Zaznacz krawędź obiektu, który chcesz usunąć.');return;}
  updateShapes(drawing.shapes.filter(s=>s.id!==selected));setSelected(undefined);resetSession();tell('Usunięto zaznaczony obiekt.');
 }
 function atPointer(pixel:Point){
  const raw=worldPoint(pixel,view,size);
  const snapped=osnap?snapPoint(raw,visible,baseTolerance):undefined;
  if(snapped)return snapped;
  const gridSize=50;
  let point=snapGrid?{x:Math.round(raw.x/gridSize)*gridSize,y:Math.round(raw.y/gridSize)*gridSize}:raw;
  if(ortho&&latest&&['line','poly','move','copy','mirror','dist'].includes(tool)){
   point=Math.abs(point.x-latest.x)>=Math.abs(point.y-latest.y)?{x:point.x,y:latest.y}:{x:latest.x,y:point.y};
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
 function pick(point:Point){
  if(layout||pan)return;
  if(!inRange(point)){tell('Współrzędne przekraczają zakres warsztatu.');return;}
  const ordered=[...visible].reverse();
  if(tool==='select'||session.selecting||(tool==='offset'&&session.target===undefined)||tool==='trim'){
   if(tool==='offset'&&session.amount===undefined){tell(prompt);return;}
   const hit=ordered.find(s=>nearEdge(s,point,baseTolerance))??ordered.find(s=>s.fill&&contains(s,point));
   if(!hit){if(tool==='select')setSelected(undefined);tell('Wskaż krawędź obiektu.');return;}
   setSelected(hit.id);
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
   const delta=subtract(point,first);
   setLast(point);applyChange(transformShape(target,p=>add(p,delta)),tool==='copy','Przesunięcie '+cadCoordinates(delta)+'.');
  }else if(target&&tool==='mirror'){
   const axis=subtract(point,first),square=dot(axis,axis);
   applyChange(transformShape(target,p=>subtract(add(first,multiply(axis,2*dot(subtract(p,first),axis)/square)),subtract(p,first)),false),
    true,'Odbito obiekt. Oryginał pozostaje na rysunku.');
  }
 }
 function zoom(factor:number,at:Point={x:size.width/2,y:size.height/2}){setCamera(old=>zoomCamera(old??view,size,factor,at));}
 function shift(delta:Point){setCamera(old=>{const c=old??view;return {...c,center:add(c.center,{x:-delta.x*c.unitsPerPixel,y:delta.y*c.unitsPerPixel})};});}
 function fit(){setCamera(fitDrawing(visible,size));tell('Dopasowano widok do zasięgu widocznych obiektów.');}
 function flags(command:string){
  switch(command){
   case 'F3':setOsnap(v=>!v);return true;
   case 'F7':setGrid(v=>!v);return true;
   case 'F8':setOrtho(v=>!v);return true;
   case 'F9':setSnapGrid(v=>!v);return true;
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
  if(['E','ERASE','DELETE'].includes(command)){erase();return;}
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
   if(tool==='scale'&&number<=0){tell('Współczynnik skali musi być dodatni.');return;}
   if(tool==='scale'){
    applyChange(transformShape(target,p=>add(first,multiply(subtract(p,first),number))),false,'Przeskalowano obiekt przez '+cadNumber(number)+'.');
   }else{
    const angle=number*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
    applyChange(transformShape(target,p=>{const v=subtract(p,first);return add(first,{x:v.x*cos-v.y*sin,y:v.x*sin+v.y*cos});},false),false,'Obrócono o '+cadNumber(number)+'°.');
   }
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
  color:drawing.layers.find(l=>l.id===shape.layer)!.color,selected:!layout&&shape.id===selected,
 }));
 const ribbonButton=(t:Exclude<Tool,'select'>)=><LabButton key={t} label={tools[t].label+' · '+tools[t].name} selected={tool===t} onPress={()=>start(t)}/>;
 const reportedPoint=candidate?.point??last;
 return <View style={labStyles.panel} testID="cad-workspace">
  <Text style={labStyles.heading}>AutoCAD · pracownia rysunku 2D</Text>
  <Text style={labStyles.body}>Zadanie na start. Narysuj prostokąt od 0,0 do @4200,3000. Dopasuj widok, wybierz HATCH, wskaż wnętrze i potwierdź Enterem. Potem zmierz szerokość.</Text>
  <View style={labStyles.ribbon}>
   <View style={labStyles.row}>{([['home','Home / Narzędzia główne'],['annotate','Annotate / Opisz'],['view','View / Widok']] as const).map(([id,label])=>
    <LabButton key={id} label={label} selected={tab===id} onPress={()=>setTab(id)}/>)}</View>
   {tab==='home'&&<>
    <View style={labStyles.row}>{([['draw','Draw / Rysuj'],['modify','Modify / Zmień'],['layers','Layers / Warstwy']] as const).map(([id,label])=>
     <LabButton key={id} label={label} selected={panel===id} onPress={()=>setPanel(id)}/>)}</View>
    {panel==='draw'&&<View style={labStyles.row}>{(['line','poly','rect','circle','arc','hatch'] as const).map(ribbonButton)}</View>}
    {panel==='modify'&&<View style={labStyles.row}>{(['move','copy','rotate','scale','mirror','offset','trim'] as const).map(ribbonButton)}
     <LabButton label="Usuń · ERASE" disabled={!chosen||layout} onPress={erase}/>
    </View>}
    {panel==='layers'&&<View style={{gap:7}}>
     <LabGroup label={'Warstwa aktywna · '+currentLayer.name}>
      {drawing.layers.map(layer=><View key={layer.id} style={labStyles.row}>
       <LabButton label={layer.name} selected={drawing.currentLayer===layer.id} onPress={()=>setDrawing({...drawing,currentLayer:layer.id})}/>
       <LabButton label={(layer.visible?'Ukryj ':'Pokaż ')+layer.name} onPress={()=>record({...drawing,layers:drawing.layers.map(l=>l.id===layer.id?{...l,visible:!l.visible}:l)})}/>
      </View>)}
     </LabGroup>
     <View style={labStyles.row}>
      <LabButton label="Nowa warstwa" onPress={()=>setNewLayer(v=>!v)}/>
      {newLayer&&<>
       <TextInput accessibilityLabel="Nazwa warstwy" value={layerName} onChangeText={setLayerName} onSubmitEditing={addLayer} style={[labStyles.input,{minWidth:120}]}/>
       <LabButton label="Dodaj warstwę" onPress={addLayer}/>
      </>}
     </View>
    </View>}
   </>}
   {tab==='annotate'&&<LabGroup label="Dimensions / Wymiary i pomiary">{(['dimlinear','dimaligned','dist'] as const).map(ribbonButton)}</LabGroup>}
   {tab==='view'&&<LabGroup label="Navigate / Nawiguj">
    <LabButton label="Dopasuj · Zoom Extents" onPress={fit}/>
    <LabButton label="Przybliż +" disabled={layout} onPress={()=>zoom(.8)}/>
    <LabButton label="Oddal −" disabled={layout} onPress={()=>zoom(1.25)}/>
    <LabButton label="Przesuń widok · PAN" selected={pan} disabled={layout} onPress={()=>{setPan(v=>!v);setPointer(undefined);}}/>
   </LabGroup>}
  </View>
  {tool==='hatch'&&<LabGroup label="Hatch Creation / Kreskowanie">
   <LabButton label="Linie ukośne" selected={pattern==='hatch'} onPress={()=>setPattern('hatch')}/>
   <LabButton label="Pełne · SOLID" selected={pattern==='solid'} onPress={()=>setPattern('solid')}/>
  </LabGroup>}
  <View style={{height:screenWidth<640?270:385,borderRadius:8,overflow:'hidden',backgroundColor:'#172530'}}
   onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize({width,height});}}>
   <CadCanvas size={size} camera={layout?fitDrawing(visible,size):view} objects={[...objects,...drawingPreview]} grid={grid} pan={pan} layout={layout}
    cursor={pointer} snap={candidate?.label&&cursorPoint?screenPoint(cursorPoint,view,size):undefined}
    prompt={dynamic&&tool!=='select'&&cursorPoint?(candidate?.label?candidate.label+' · ':'')+cadCoordinates(cursorPoint):undefined}
    onMove={setPointer} onPick={p=>pick(tool==='select'||session.selecting||tool==='hatch'||tool==='trim'?worldPoint(p,view,size):atPointer(p).point)}
    onPan={shift} onZoom={zoom} onFinish={()=>finish()}/>
  </View>
  <View style={labStyles.row}>
   <LabButton label="Model" selected={!layout} onPress={()=>setLayout(false)}/>
   <LabButton label="Layout 1 / Arkusz" selected={layout} onPress={()=>{cancel();setLayout(true);setPointer(undefined);}}/>
   <LabButton label="Dopasuj widok" onPress={fit}/>
   <LabButton label="Cofnij · Ctrl+Z" disabled={!history.length} onPress={undo}/>
   <LabButton label="Ponów · Ctrl+Y" disabled={!future.length} onPress={redo}/>
  </View>
  <Text style={labStyles.eyebrow} testID="cad-summary">{layout?'Arkusz':'Model'} · Obiekty: {visible.length} · Wypełnienia: {visible.filter(s=>s.fill).length}
   {reportedPoint?' · X,Y '+cadCoordinates(reportedPoint):''}{chosen?' · Zaznaczony '+chosen.id:''}</Text>
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
    {tool!=='select'&&<LabButton label="Anuluj · Esc" onPress={cancel}/>}
    <LabButton label="Historia poleceń · F2" selected={expandLog} onPress={()=>setExpandLog(v=>!v)}/>
   </View>
   <Text accessibilityLiveRegion="polite" style={labStyles.body}>{message}</Text>
   {expandLog&&<View style={{gap:3}}>{log.map((entry,i)=><Text key={i} style={labStyles.eyebrow}>{entry}</Text>)}</View>}
  </View>
  <LabGroup label="Pasek stanu">
   <LabButton label="Siatka · F7" selected={grid} onPress={()=>flags('F7')}/>
   <LabButton label="Skok siatki 50 · F9" selected={snapGrid} onPress={()=>flags('F9')}/>
   <LabButton label="OSNAP · F3" selected={osnap} onPress={()=>flags('F3')}/>
   <LabButton label="ORTHO · F8" selected={ortho} onPress={()=>flags('F8')}/>
   <LabButton label="Współrzędne przy kursorze · F12" selected={dynamic} onPress={()=>flags('F12')}/>
  </LabGroup>
  <Text style={labStyles.body}>Przewiń kółko nad rysunkiem, aby powiększyć widok. Przeciągnij środkowym przyciskiem myszy albo wybierz PAN. Wiersz poleceń przyjmuje X,Y, @ΔX,ΔY oraz @odległość&lt;kąt. ORTHO i OSNAP pomagają przy wskazywaniu kursorem.</Text>
 </View>;
}
