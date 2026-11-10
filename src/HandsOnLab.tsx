import React from 'react';
import CadWorkspace from './CadWorkspace';
import ExplorerWorkspace from './ExplorerWorkspace';
import SpreadsheetWorkspace from './SpreadsheetWorkspace';
import WordWorkspace from './WordWorkspace';

const modes={cad:CadWorkspace,excel:SpreadsheetWorkspace,word:WordWorkspace,windows:ExplorerWorkspace};
const courseModes:Record<string,keyof typeof modes>={
 'autocad-skroty':'cad','excel-skroty':'excel','word-skroty':'word','windows-skroty':'windows',
};
export function softwareMode(slug:string){
 return Object.hasOwn(courseModes,slug)?courseModes[slug]:undefined;
}

export default function HandsOnLab({mode,shortcut,runId}:{mode:keyof typeof modes;shortcut?:string;runId:number}){
 const Workspace=modes[mode];
 return <Workspace shortcut={shortcut} runId={runId}/>;
}
