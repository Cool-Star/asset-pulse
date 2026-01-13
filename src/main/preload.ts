import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  receive: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    // Return the cleanup function
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
});
