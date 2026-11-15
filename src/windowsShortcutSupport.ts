// Only these hotkeys have working effects inside the Trenerki desktop model.
// Other shortcuts require a real Windows machine or a dedicated safe practice tool.
export const supportedWindowsShortcuts=[
 'Win+Ctrl+←','Win+Ctrl+→','Win+Ctrl+D','Win+Ctrl+F4','Win+Tab',
 'Win+←','Win+→','Win+↑','Win+↓','Win+D','Win+M','Win+Shift+M',
 'Alt+Tab','Alt+F4','Win+E','Win+I','Win+S'
] as const;
export const normalizeWindowsShortcut=(combo:string)=>combo.toUpperCase().replace(/\s/g,'').replace(/ARROWLEFT/g,'←').replace(/ARROWRIGHT/g,'→').replace(/ARROWUP/g,'↑').replace(/ARROWDOWN/g,'↓');
const simulatedSet=new Set<string>(supportedWindowsShortcuts.map(normalizeWindowsShortcut));
export function canSimulateWindowsShortcut(combo:string):boolean{
 return simulatedSet.has(normalizeWindowsShortcut(combo));
}
