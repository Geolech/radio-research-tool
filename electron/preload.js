// Preload: stellt dem Renderer eine minimale, sichere Brücke zum Verschlüsseln
// von API-Keys über Electrons safeStorage (OS-Schlüsselbund) bereit.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("radioSecure", {
  // Liefert base64 des verschlüsselten Texts — oder null, wenn Verschlüsselung
  // nicht verfügbar ist (dann speichert der Renderer im Klartext).
  encrypt: (text) => ipcRenderer.invoke("secure:encrypt", text),
  // Entschlüsselt einen base64-Blob zurück zu Klartext — oder null bei Fehler.
  decrypt: (blob) => ipcRenderer.invoke("secure:decrypt", blob),
});
