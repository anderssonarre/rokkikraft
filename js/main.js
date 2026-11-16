import { initUI } from './ui.js';
initUI();
// Håll spelet uppdaterat: service workern hämtar alltid nyaste filerna (se sw.js).
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { });
