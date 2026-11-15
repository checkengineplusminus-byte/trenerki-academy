import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import useLabKeys from './useLabKeys';
import {LabButton,LabGroup,labStyles} from './LabControls';
import {CAD_HEIGHT,CAD_WIDTH,contains,distance,edges,fillSegments,nearEdge,outline,readCadPoint,fitDrawing,joinCadLines,screenPoint,worldPoint,type CadShape,type Camera,type Point} from './CadGeometry';

type Tool='select'|'line'|'poly'|'rect'|'circle'|'hatch'|'move'|'copy';
const commands:Record<string,Tool>={L:'line',LINE:'line',PL:'poly',PLINE:'poly',REC:'rect',RECTANG:'rect',C:'circle',CIRCLE:'circle',H:'hatch',HATCH:'hatch',M:'move',MOVE:'move',CO:'copy',CP:'copy',COPY:'copy'};
const toolNames:Record<Tool,string>={select:'Wskaż obiekt',line:'LINE',poly:'PLINE',rect:'RECTANG',circle:'CIRCLE',hatch:'HATCH',move:'MOVE',copy:'COPY'};
const number=(n:number)=>String(Number(n.toFixed(2)));
const colors=['#cbe6a4','#89d9ed','#f0bf85'];
const inBounds=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1000000&&Math.abs(p.y)<=1000000;

function Stroke({a,b,camera,size,color,weight=2}:{a:Point;b:Point;camera:Camera;size:{width:number;height:number};color:string;weight?:number}){
 const first=screenPoint(a,camera,size),last=screenPoint(b,camera,size);
 const length=distance(first,last);
 return <View style={{position:'absolute',width:length,height:weight,
  left:(first.x+last.x-length)/2,top:(first.y+last.y)/2-weight/2,
  backgroundColor:color,transform:[{rotate:Math.atan2(last.y-first.y,last.x-first.x)+'rad'}]}}/>;
}

export default function CadWorkspace({shortcut,runId,storageKey,lessonNo}:{shortcut?:string;runId:number;storageKey?:string;lessonNo?:number}){
 const [shapes,setShapes]=useState<CadShape[]>([]),[history,setHistory]=useState<CadShape[][]>([]);
 const [tool,setTool]=useState<Tool>('select'),[points,setPoints]=useState<Point[]>([]),[selected,setSelected]=useState<number>();
 const [layer,setLayer]=useState(0),[grid,setGrid]=useState(true),[ortho,setOrtho]=useState(false),[snap,setSnap]=useState(false);
 const [fill,setFill]=useState<'hatch'|'solid'>('hatch'),[input,setInput]=useState(''),[width,setWidth]=useState(860);
 const [camera,setCamera]=useState<Camera>({center:{x:2000,y:1500},unitsPerPixel:5000/860});
 const [loaded,setLoaded]=useState(false);
 const [ribbon,setRibbon]=useState('Home'),[message,setMessage]=useState('Wybierz narzędzie z panelu Rysuj lub wpisz jego nazwę.');
 const nextId=useRef(1);
 const size={width,height:width*CAD_HEIGHT/CAD_WIDTH},scale=1/camera.unitsPerPixel;
 const bottomLeft=worldPoint({x:0,y:size.height},camera,size);
 const topRight=worldPoint({x:size.width,y:0},camera,size);
 const gridStep=Math.pow(10,Math.ceil(Math.log10(Math.max(1,camera.unitsPerPixel*45))));
 const gridXs=Array.from({length:Math.min(30,Math.max(0,Math.ceil((topRight.x-Math.ceil(bottomLeft.x/gridStep)*gridStep)/gridStep)+1))},(_,i)=>Math.ceil(bottomLeft.x/gridStep)*gridStep+i*gridStep);
 const gridYs=Array.from({length:Math.min(30,Math.max(0,Math.ceil((topRight.y-Math.ceil(bottomLeft.y/gridStep)*gridStep)/gridStep)+1))},(_,i)=>Math.ceil(bottomLeft.y/gridStep)*gridStep+i*gridStep);
 const target=shapes.find(s=>s.id===selected);
 const first=points[0],last=points.at(-1);
 const prompt=tool==='select'?'Dotknij krawędzi lub wnętrza zamkniętej figury.':tool==='hatch'?'Wskaż wnętrze zamkniętego obrysu.':
  tool==='move'||tool==='copy'?(!target?'Wybierz obiekt na rysunku.':first?'Wskaż punkt docelowy.':'Wskaż punkt bazowy.'):
  tool==='circle'?(first?'Wskaż punkt na obwodzie albo wpisz promień.':'Wskaż środek.'):
  tool==='rect'?(first?'Wskaż przeciwległy narożnik.':'Wskaż pierwszy narożnik.'):
  points.length?'Dodaj punkt albo zakończ rysowanie.':'Wskaż pierwszy punkt.';

 function store(next:CadShape[]){
  setHistory(old=>[...old.slice(-39),shapes]);setShapes(next);
  if(shapes.length===0&&next.length>0)setCamera(fitDrawing(next,size));
 }
 useEffect(()=>{
  if(Platform.OS!=='web'||!storageKey||typeof localStorage==='undefined'){setLoaded(true);return;}
  try{
   const raw=JSON.parse(localStorage.getItem('trenerki-cad-drawing-v2-'+storageKey)||'null');
   if(Array.isArray(raw)&&raw.length<=200&&raw.every((shape:any)=>
      Number.isInteger(shape.id)&&['line','poly','rect','circle'].includes(shape.kind)&&
      Array.isArray(shape.points)&&shape.points.length>=2&&shape.points.length<100&&
      shape.points.every((p:any)=>inBounds(p)))){
    setShapes(raw as CadShape[]);
    nextId.current=1+Math.max(0,...raw.map((shape:CadShape)=>shape.id));
    if(raw.length)setCamera(fitDrawing(raw,size));
   }
  }catch{}
  setLoaded(true);
 },[storageKey]);
 useEffect(()=>{
  if(!loaded||Platform.OS!=='web'||!storageKey||typeof localStorage==='undefined')return;
  try{localStorage.setItem('trenerki-cad-drawing-v2-'+storageKey,JSON.stringify(shapes.slice(-200)));}catch{}
 },[shapes,loaded,storageKey]);
 function start(next:Tool){
  setTool(next);setPoints([]);setInput('');setMessage(toolNames[next]+' · '+(next==='select'?'Gotowe do zaznaczenia.':'Polecenie aktywne.'));
 }
 function undo(){
  if(points.length){setPoints(points.slice(0,-1));setMessage('Cofnięto ostatni wskazany punkt.');return;}
  const previous=history.at(-1);
  if(!previous){setMessage('Historia rysunku jest pusta.');return;}
  setShapes(previous);setHistory(history.slice(0,-1));setSelected(undefined);setMessage('Cofnięto ostatnią zmianę rysunku.');
 }
 function add(kind:CadShape['kind'],vertices:Point[],closed=false){
  const id=nextId.current++;
  store([...shapes,{id,kind,points:vertices,layer,closed}]);
  setSelected(id);start('select');setMessage('Utworzono obiekt '+id+'.');
 }
 function finish(close=false){
  if(tool!=='line'&&tool!=='poly')return;
  if(points.length<(close?3:2)){setMessage(close?'Do zamknięcia potrzebujesz co najmniej trzech punktów.':'Wskaż co najmniej dwa punkty.');return;}
  if(tool==='poly'){add(tool,points,close);return;}
  const segments=points.slice(1).map((end,i):CadShape=>({id:nextId.current++,kind:'line',points:[points[i],end],layer}));
  if(close)segments.push({id:nextId.current++,kind:'line',points:[points[points.length-1],points[0]],layer});
  store([...shapes,...segments]);setSelected(segments.at(-1)?.id);start('select');setMessage('Utworzono '+segments.length+' osobne odcinki LINE. Aby utworzyć jeden obiekt, wpisz JOIN.');
 }
 function erase(){
  if(!target){setMessage('Wskaż obiekt, który chcesz usunąć.');return;}
  store(shapes.filter(s=>s.id!==selected));setSelected(undefined);start('select');setMessage('Obiekt usunięty.');
 }
 function place(point:Point,byTouch=false){
  const tolerance=12*camera.unitsPerPixel;
  if(tool==='select'||tool==='hatch'||((tool==='move'||tool==='copy')&&!target)){
   const reversed=[...shapes].reverse();
   const hit=tool==='hatch'?reversed.find(s=>contains(s,point)):reversed.find(s=>nearEdge(s,point,tolerance))??reversed.find(s=>contains(s,point));
   if(!hit){setMessage(tool==='hatch'?'Wskaż punkt wewnątrz prostokąta, okręgu lub zamkniętej polilinii.':'W tym miejscu nie ma obiektu.');if(tool==='select')setSelected(undefined);return;}
   setSelected(hit.id);
   if(tool==='hatch'){
    store(shapes.map(s=>s.id===hit.id?{...s,fill}:s));
    start('select');setMessage('Wypełniono obiekt '+hit.id+'.');
   }else setMessage('Zaznaczono obiekt '+hit.id+'.');
   return;
  }
  let p=point;
  if(byTouch&&snap){
   const closest=shapes.flatMap(outline).reduce<Point|undefined>((best,current)=>distance(current,p)<distance(best??{x:Infinity,y:Infinity},p)?current:best,undefined);
   if(closest&&distance(closest,p)<=tolerance)p=closest;
  }
  if(byTouch&&last&&ortho&&(tool==='line'||tool==='poly')){
   p=Math.abs(p.x-last.x)>=Math.abs(p.y-last.y)?{x:p.x,y:last.y}:{x:last.x,y:p.y};
  }
  if(!inBounds(p)){setMessage('Wpisz punkt w bezpiecznym zakresie współrzędnych (od -1 000 000 do 1 000 000).');return;}
  if(!first){setPoints([p]);setMessage('Punkt '+number(p.x)+','+number(p.y)+' przyjęty.');return;}
  if(distance(p,last!)<0.001){setMessage('Wskaż punkt inny niż poprzedni.');return;}
  if(tool==='rect'){
   if(first.x===p.x||first.y===p.y){setMessage('Prostokąt potrzebuje dodatniej szerokości i wysokości.');return;}
   add('rect',[first,p]);
  }else if(tool==='circle')add('circle',[first,p]);
  else if(tool==='line'||tool==='poly'){setPoints([...points,p]);setMessage('Punkt '+number(p.x)+','+number(p.y)+' przyjęty.');}
  else if(target){
   const shifted=target.points.map(v=>({x:v.x+p.x-first.x,y:v.y+p.y-first.y}));
   if(shifted.some(v=>!inBounds(v))){setMessage('Obiekt wykracza poza pole ćwiczenia. Wskaż bliższy punkt.');return;}
   const id=tool==='copy'?nextId.current++:target.id;
   const moved={...target,points:shifted,id};
   store(tool==='copy'?[...shapes,moved]:shapes.map(s=>s.id===id?moved:s));
   setSelected(id);start('select');setMessage(tool==='copy'?'Utworzono kopię obiektu.':'Przesunięto obiekt.');
  }
 }
 function runCommand(raw:string){
  const command=raw.trim().toUpperCase().replace(/^[_.]+/,'');
  if((command==='CLOSE'||command==='C')&&(tool==='poly'||tool==='line')&&points.length>=3)finish(true);
  else if(Object.hasOwn(commands,command)){setRibbon('Home');start(commands[command]);}
  else if(command==='F3'){setSnap(v=>!v);setMessage('Przełączono przyciąganie do punktów obiektów.');}
  else if(command==='F7'){setGrid(v=>!v);setMessage('Przełączono siatkę.');}
  else if(command==='F8'){setOrtho(v=>!v);setMessage('Przełączono tryb ortogonalny.');}
  else if(['E','ERASE','DELETE'].includes(command))erase();
  else if(['U','UNDO','CTRL+Z'].includes(command))undo();
  else if(['JOIN','J','PEDIT'].includes(command)){
   const connected=joinCadLines(shapes,selected);
   if(!connected){setMessage('JOIN wymaga przynajmniej dwóch odcinków LINE ze wspólnymi końcami na jednej warstwie.');}
   else {
    store([...shapes.filter(s=>!connected.sourceIds.includes(s.id)),connected.joined]);
    setSelected(connected.joined.id);start('select');
    setMessage('JOIN: połączono '+connected.sourceIds.length+' linii w '+(connected.joined.closed?'zamkniętą':'otwartą')+' polilinię. Sprawdź MOVE.');
   }
  }
  else if(['Z','ZOOM','ZOOM E','ZE','EXTENTS'].includes(command)){
   setCamera(fitDrawing(shapes,size));setMessage('ZOOM Extents: dopasowano widok do geometrii.');
  }
  else if(['ESC','ESCAPE'].includes(command)){
   if(tool==='select')setSelected(undefined);
   start('select');
  }
  else if(['LA','LAYER'].includes(command)){setRibbon('Home');setMessage('Wybierz aktywną warstwę w panelu Layers.');}
  else if(['DI','DIST'].includes(command)&&target){
   const value=target.kind==='rect'?`${number(Math.abs(target.points[1].x-target.points[0].x))} × ${number(Math.abs(target.points[1].y-target.points[0].y))}`:number(distance(target.points[0],target.points[1]));
   setMessage((target.kind==='circle'?'Promień: ':target.kind==='rect'?'Szerokość × wysokość: ':'Długość pierwszego odcinka: ')+value);
  }else if(!command&&(tool==='line'||tool==='poly'))finish();
  else if(first&&tool==='circle'&&/^\d+(?:\.\d+)?$/.test(command)){
   const radius=Number(command);
   if(radius>0)place({x:first.x+radius,y:first.y});
   else setMessage('Promień musi być większy od zera.');
  }else {
   const point=readCadPoint(command,last);
   if(point)place(point);
   else setMessage(command?'Polecenie omówione w lekcji. W warsztacie użyj przycisków z menu albo wpisz punkt, np. 120,80.':prompt);
  }
  setInput('');
 }
 useEffect(()=>{if(shortcut&&runId)runCommand(shortcut);},[runId]);
 useLabKeys('cad-workspace',event=>{
  if(['F3','F7','F8','Escape'].includes(event.key)){runCommand(event.key);return true;}
  if((event.target as HTMLElement).tagName==='INPUT')return false;
  if(event.ctrlKey&&event.key.toLowerCase()==='z'){undo();return true;}
  if(event.key==='Delete'){erase();return true;}
  return false;
 });

 function drawShape(shape:CadShape){
  const color=shape.id===selected?'#fff5b7':colors[shape.layer]||colors[0];
  const [a,b]=shape.points,r=shape.kind==='circle'?distance(a,b)*scale:0;
  const center=screenPoint(a,camera,size),fillColor=shape.fill==='solid'?'#5a815c':color;
  return <React.Fragment key={shape.id}>
   {shape.fill&&fillSegments(shape,shape.fill==='solid'?3*camera.unitsPerPixel:32*camera.unitsPerPixel,shape.fill==='solid'?0:1).slice(0,500).map(([p,q],i)=>
    <Stroke key={'fill'+i} a={p} b={q} camera={camera} size={size} color={fillColor} weight={shape.fill==='solid'?3.4:1}/>)}
   {shape.kind==='circle'?<View style={{position:'absolute',left:center.x-r,top:center.y-r,width:2*r,height:2*r,borderRadius:r,borderWidth:2,borderColor:color}}/>:
    edges(shape).map(([p,q],i)=><Stroke key={i} a={p} b={q} camera={camera} size={size} color={color}/>)}
  </React.Fragment>;
 }

 return <View style={labStyles.panel} testID="cad-workspace">
  <Text style={labStyles.heading}>Warsztat AutoCAD 2D — rysuj i wpisuj polecenia</Text>
  <Text style={labStyles.body}>To interaktywny trening komend, nie licencjonowany Autodesk AutoCAD. Wpisz LINE → Enter → 0,0 → Enter → 4000,0 → Enter → pusty Enter. Zobaczysz narysowaną linię. Możesz również rysować palcem lub myszą.</Text>
  <Text testID="cad-coordinate-guide" style={[labStyles.eyebrow,{marginBottom:5}]}>Jednostki ćwiczenia: mm · współrzędne X,Y · @X,Y = przesunięcie względem poprzedniego punktu</Text>
  <View style={labStyles.ribbon}>
   <View style={labStyles.row}>{['Home / Narzędzia główne','View / Widok'].map((label,i)=><LabButton key={label} label={label} selected={ribbon===(i?'View':'Home')} onPress={()=>setRibbon(i?'View':'Home')}/>)}</View>
   {ribbon==='Home'?<>
    <LabGroup label="Draw / Rysuj">
     {([['line','Linia'],['poly','Polilinia'],['rect','Prostokąt'],['circle','Okrąg'],['hatch','Kreskowanie']] as const).map(([id,label])=>
      <LabButton key={id} label={label+' · '+toolNames[id]} selected={tool===id} onPress={()=>start(id)}/>)}
    </LabGroup>
    <LabGroup label="Modify / Zmień">
     <LabButton label="Zaznacz" selected={tool==='select'} onPress={()=>start('select')}/>
     <LabButton label="Przesuń · MOVE" selected={tool==='move'} onPress={()=>start('move')}/>
     <LabButton label="Kopiuj · COPY" selected={tool==='copy'} onPress={()=>start('copy')}/>
     <LabButton label="Połącz · JOIN" onPress={()=>runCommand('JOIN')}/>
     <LabButton label="Usuń · ERASE" disabled={!target} onPress={erase}/>
     <LabButton label="Cofnij · Ctrl+Z" disabled={!history.length&&!points.length} onPress={undo}/>
    </LabGroup>
    <LabGroup label="Layers / Warstwy">
     {['Obrys','Osie','Detale'].map((name,i)=><LabButton key={name} label={name} selected={layer===i} onPress={()=>{setLayer(i);setMessage('Aktywna warstwa: '+name+'.')}}/>)}
    </LabGroup>
   </>:<LabGroup label="Widoczność i pomiar">
    <LabButton label="Siatka · F7" selected={grid} onPress={()=>runCommand('F7')}/>
    <LabButton label="Zoom + " onPress={()=>setCamera(c=>({...c,unitsPerPixel:c.unitsPerPixel*.7}))}/>
    <LabButton label="Zoom −" onPress={()=>setCamera(c=>({...c,unitsPerPixel:c.unitsPerPixel*1.4}))}/>
    <LabButton label="Dopasuj · ZOOM E" onPress={()=>runCommand('ZOOM E')}/>
    <LabButton label="Przesuń widok ←" onPress={()=>setCamera(c=>({...c,center:{...c.center,x:c.center.x-150*c.unitsPerPixel}}))}/>
    <LabButton label="Przesuń widok →" onPress={()=>setCamera(c=>({...c,center:{...c.center,x:c.center.x+150*c.unitsPerPixel}}))}/>
    <LabButton label="Zmierz zaznaczony obiekt" disabled={!target} onPress={()=>runCommand('DI')}/>
   </LabGroup>}
  </View>
  {tool==='hatch'&&<LabGroup label="Hatch Creation / Typ wypełnienia">
   <LabButton label="Linie ukośne" selected={fill==='hatch'} onPress={()=>setFill('hatch')}/>
   <LabButton label="Pełne · SOLID" selected={fill==='solid'} onPress={()=>setFill('solid')}/>
  </LabGroup>}
  <Pressable testID="cad-canvas" accessibilityLabel="Pole rysunku Model" onLayout={event=>{
   const next=event.nativeEvent.layout.width;
   if(!next||Math.abs(next-width)<1)return;
   setCamera(old=>({...old,unitsPerPixel:old.unitsPerPixel*width/next}));
   setWidth(next);
  }}
   onPress={event=>{
    let {locationX:x,locationY:y}=event.nativeEvent;
    if(Platform.OS==='web'){
     const click=event.nativeEvent as unknown as MouseEvent;
     if(!click.detail)return;
     const rect=(event.currentTarget as unknown as HTMLElement).getBoundingClientRect();
     x=click.clientX-rect.left;y=click.clientY-rect.top;
    }
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const world=worldPoint({x,y},camera,size);
    place({x:Math.round(world.x),y:Math.round(world.y)},true);
   }}
   style={{aspectRatio:CAD_WIDTH/CAD_HEIGHT,borderRadius:8,overflow:'hidden',backgroundColor:'#13262d',position:'relative',borderColor:'#5d7880',borderWidth:1}}>
   <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0}}>
    {grid&&gridXs.map(x=><View key={'x'+x} style={{position:'absolute',left:screenPoint({x,y:0},camera,size).x,top:0,bottom:0,width:1,backgroundColor:'#304850'}}/>)}
    {grid&&gridYs.map(y=><View key={'y'+y} style={{position:'absolute',top:screenPoint({x:0,y},camera,size).y,left:0,right:0,height:1,backgroundColor:'#304850'}}/>)}
    {shapes.map(drawShape)}
    {points.map((p,i)=>{
     const pixel=screenPoint(p,camera,size);
     return <React.Fragment key={i}>
      {i>0&&<Stroke a={points[i-1]} b={p} camera={camera} size={size} color="#f6cb87"/>}
      <View style={{position:'absolute',left:pixel.x-3,top:pixel.y-3,width:6,height:6,borderRadius:3,backgroundColor:'#f6cb87'}}/>
     </React.Fragment>;
    })}
    <Text style={{position:'absolute',bottom:5,left:7,color:'#c3d6d8',fontSize:10}}>Model 2D · mm · X → · Y ↑</Text>
   </View>
  </Pressable>
  <View style={[labStyles.row,{flexWrap:'wrap'}]}>
   <LabButton label="Zoom +" onPress={()=>setCamera(c=>({...c,unitsPerPixel:c.unitsPerPixel*.7}))}/>
   <LabButton label="Zoom −" onPress={()=>setCamera(c=>({...c,unitsPerPixel:c.unitsPerPixel*1.4}))}/>
   <LabButton label="Pokaż cały rysunek" onPress={()=>runCommand('ZOOM E')}/>
  </View>
  <Text style={labStyles.eyebrow} testID="cad-summary">Model · Obiekty: {shapes.length} · Wypełnienia: {shapes.filter(s=>s.fill).length}{selected!==undefined?' · Wybrany: '+selected:''}</Text>
  <Text style={labStyles.body}>{prompt}</Text>
  <View style={labStyles.row}>
   <TextInput testID="cad-command" accessibilityLabel="Wiersz poleceń AutoCAD" style={[labStyles.input,{flex:1,minWidth:125}]}
    value={input} onChangeText={setInput} onSubmitEditing={()=>runCommand(input)} autoCorrect={false} autoCapitalize="none" placeholder="LINE, 0,0, 4000,0, JOIN, MOVE..."/>
   <LabButton label="Enter ↵" onPress={()=>runCommand(input)}/>
  </View>
  <View style={labStyles.row}>
   <LabButton label="OSNAP · F3" selected={snap} onPress={()=>runCommand('F3')}/>
   <LabButton label="ORTHO · F8" selected={ortho} onPress={()=>runCommand('F8')}/>
   {(tool==='line'||tool==='poly')&&<LabButton label="Zakończ rysowanie" disabled={points.length<2} onPress={()=>finish()}/>}
   {(tool==='poly'||tool==='line')&&<LabButton label="Zamknij obrys" disabled={points.length<3} onPress={()=>finish(true)}/>}
   {tool!=='select'&&<LabButton label="Anuluj · Esc" onPress={()=>start('select')}/>}
  </View>
  <Text accessibilityLiveRegion="polite" style={labStyles.status}>{message}</Text>
 </View>;
}
