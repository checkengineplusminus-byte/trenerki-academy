import React,{useEffect,useImperativeHandle,useRef} from 'react';

const commands:Record<string,[string,string?]>={
 bold:['bold'],italic:['italic'],underline:['underline'],
 normal:['formatBlock','p'],heading1:['formatBlock','h1'],heading2:['formatBlock','h2'],
 left:['justifyLeft'],center:['justifyCenter'],right:['justifyRight'],justify:['justifyFull'],
 table:['insertHTML','<table border="1" cellpadding="7" style="border-collapse:collapse;width:100%"><tbody><tr><td>Element</td><td>Termin</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>'],
 page:['insertHTML','<div contenteditable="false" role="separator" style="margin:16px 0;padding:8px;border-top:1px dashed #819387;color:#506f5a;font-size:12px;text-align:center">Podział strony</div><p><br></p>'],
 undo:['undo'],redo:['redo'],selectAll:['selectAll'],
};
export type WordEditorHandle={apply:(action:string)=>boolean;selection:()=>string};

const initial=<>
 <h1>Potwierdzenie terminu</h1>
 <p>Szanowni Państwo,</p>
 <p>Proszę o potwierdzenie daty rozpoczęcia prac.</p>
 <p>Z poważaniem,<br/>Anna</p>
</>;

const style:React.CSSProperties={
 boxSizing:'border-box',width:'100%',minHeight:250,padding:'12px clamp(14px, 5vw, 36px)',borderRadius:6,
 border:'1px solid #b6c8bd',backgroundColor:'#fff',fontSize:16,lineHeight:1.5,color:'#20392d',
 overflowWrap:'anywhere',whiteSpace:'pre-wrap',outlineColor:'#2a7850',
};

const WordDocument=React.forwardRef<WordEditorHandle>(function WordDocument(_,ref){
 const editor=useRef<HTMLDivElement>(null),saved=useRef<Range|null>(null);
 function remember(){
  const selection=window.getSelection();
  if(selection?.rangeCount&&editor.current?.contains(selection.anchorNode)&&editor.current.contains(selection.focusNode))saved.current=selection.getRangeAt(0).cloneRange();
 }
 useEffect(()=>{document.addEventListener('selectionchange',remember);return()=>document.removeEventListener('selectionchange',remember);},[]);
 useImperativeHandle(ref,()=>({
  apply(action){
   const el=editor.current,entry=commands[action];
   if(!el||!entry)return false;
   remember();el.focus();
   const selection=window.getSelection();
   if(saved.current&&el.contains(saved.current.commonAncestorContainer)){
    selection?.removeAllRanges();selection?.addRange(saved.current);
   }else {
    const range=document.createRange();range.selectNodeContents(el);range.collapse(false);
    selection?.removeAllRanges();selection?.addRange(range);
   }
   const changed=document.execCommand(entry[0],false,entry[1]);
   remember();return changed;
  },
  selection(){remember();return saved.current?.toString()??'';},
 }),[]);
 return <div ref={editor} style={style} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
  aria-label="Edytor dokumentu Word" data-testid="word-document"
  onMouseUp={remember} onKeyUp={remember} onTouchEnd={remember}
  onPaste={event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));}}
  onDrop={event=>event.preventDefault()}>{initial}</div>;
});
export default WordDocument;
