/* ============================================================
   Digitalium SAE — Shared components
   Loaded as Babel JSX. Exports to window for cross-file scope.
   ============================================================ */

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ---------- Icons (inline SVG, Lucide-style) ---------- */
const Icon = ({ name, size = 16, stroke = 1.75, className = '', style }) => {
  const paths = {
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronLeft:  <polyline points="15 18 9 12 15 6"/>,
    chevronDown:  <polyline points="6 9 12 15 18 9"/>,
    chevronUp:    <polyline points="18 15 12 9 6 15"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    checkCircle: <><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    xCircle: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    alertTriangle: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    alertCircle: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>,
    folderOpen: <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>,
    archive: <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    home: <><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    shieldCheck: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    helpCircle: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    barChart: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
    server: <><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    moreH: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    moreV: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    paperclip: <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    fingerprint: <><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10c-1.7 0-3 1.3-3 3 0 2.5 2 4.5 4 5.5"/><path d="M9.1 17.5c.5 0 .9-.1 1.4-.3"/><path d="M16 13c0-1.7-1.3-3-3-3"/><path d="M21.18 12c.13.7.32 1.83.32 3 0 .43-.05.86-.14 1.27"/><path d="M2 12c0 1.66.34 3.34 1 5"/></>,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    hash: <><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    building: <><rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></>,
    mailQuestion: <><circle cx="12" cy="12" r="10"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2.5-2.5 2.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></>,
    sparkle: <><path d="M12 3v18"/><path d="M3 12h18"/></>,
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    messageSquare: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></>,
    dollarSign: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    expand: <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    externalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    hardDrive: <><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></>,
    messageCircle: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    moreVertical: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    printer: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    refreshCw: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    signal: <><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></>,
    trendingDown: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
    trendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    userCheck: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></>,
    wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    zoomIn: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    zoomOut: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    creditCard: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    mapPin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  };
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
    >
      {paths[name] || null}
    </svg>
  );
};

/* ---------- Buttons ---------- */
const btnStyles = {
  base: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
    padding: '8px 16px', minHeight: 36, borderRadius: 6,
    border: '1px solid transparent', cursor: 'pointer',
    whiteSpace: 'nowrap', transition: 'background .12s, border-color .12s, color .12s',
    letterSpacing: '0.01em',
  },
};
const Button = ({ variant = 'primary', size = 'md', icon, iconRight, children, style, ...rest }) => {
  const v = {
    primary: { background: 'var(--primary-500)', color: 'white', border: '1px solid var(--primary-500)' },
    secondary: { background: 'white', color: 'var(--primary-500)', border: '1px solid var(--primary-500)' },
    ghost: { background: 'transparent', color: 'var(--ink-700)', border: '1px solid transparent' },
    outline: { background: 'white', color: 'var(--ink-800)', border: '1px solid var(--ink-300)' },
    danger: { background: 'var(--danger-500)', color: 'white', border: '1px solid var(--danger-500)' },
    success: { background: 'var(--success-500)', color: 'white', border: '1px solid var(--success-500)' },
    link: { background: 'transparent', color: 'var(--primary-500)', border: '1px solid transparent', padding: 0, minHeight: 'auto' },
  }[variant] || {};
  const s = { sm: { padding: '6px 12px', minHeight: 32, fontSize: 13 }, md: {}, lg: { padding: '12px 24px', minHeight: 48, fontSize: 16 } }[size] || {};
  return (
    <button {...rest} style={{ ...btnStyles.base, ...v, ...s, ...style }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 18 : 15}/>}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 18 : 15}/>}
    </button>
  );
};

/* ---------- Status badge ---------- */
const Badge = ({ tone = 'neutral', children, dot, icon, size = 'md', style }) => {
  const tones = {
    neutral: { bg: 'var(--ink-150)', fg: 'var(--ink-700)', dot: 'var(--ink-500)' },
    primary: { bg: 'var(--primary-50)', fg: 'var(--primary-600)', dot: 'var(--primary-500)' },
    success: { bg: 'var(--success-50)', fg: 'var(--success-600)', dot: 'var(--success-500)' },
    warning: { bg: 'var(--warning-50)', fg: 'var(--warning-600)', dot: 'var(--warning-500)' },
    danger:  { bg: 'var(--danger-50)',  fg: 'var(--danger-600)',  dot: 'var(--danger-500)' },
    info:    { bg: 'var(--info-50)',    fg: 'var(--info-600)',    dot: 'var(--info-500)' },
    archived:{ bg: 'var(--status-archived-bg)', fg: 'var(--success-600)', dot: 'var(--status-archived)' },
    active:  { bg: 'var(--status-active-bg)',   fg: 'var(--primary-600)', dot: 'var(--status-active)' },
    semi:    { bg: 'var(--status-semi-bg)',     fg: 'var(--ink-700)',     dot: 'var(--status-semi)' },
    inactive:{ bg: 'var(--status-inactive-bg)', fg: 'var(--ink-600)',     dot: 'var(--status-inactive)' },
    destruct:{ bg: 'var(--status-destruct-bg)', fg: 'var(--warning-600)', dot: 'var(--status-destruct)' },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm' ? { padding: '1px 8px', fontSize: 11, height: 18 } : { padding: '2px 10px', fontSize: 12, height: 22 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: t.bg, color: t.fg, ...sz,
      borderRadius: 999, fontWeight: 600,
      letterSpacing: '0.01em',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }}/>}
      {icon && <Icon name={icon} size={11} stroke={2.25} style={{ color: t.dot }}/>}
      {children}
    </span>
  );
};

/* ---------- Card ---------- */
const Card = ({ children, style, padded = true, hover = false, onClick }) => (
  <div onClick={onClick} style={{
    background: 'white',
    border: '1px solid var(--ink-200)',
    borderRadius: 8,
    padding: padded ? 24 : 0,
    boxShadow: '0 1px 2px rgba(14,26,43,.04)',
    cursor: hover || onClick ? 'pointer' : 'default',
    transition: 'border-color .12s, box-shadow .12s',
    ...(hover ? { ':hover': { borderColor: 'var(--ink-300)' } } : {}),
    ...style,
  }}>{children}</div>
);

/* ---------- Form fields ---------- */
const Field = ({ label, hint, error, required, children, htmlFor }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && (
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)', letterSpacing: '0.01em' }}>
        {label}{required && <span style={{ color: 'var(--danger-500)', marginLeft: 4 }}>*</span>}
      </label>
    )}
    {children}
    {hint && !error && <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{hint}</span>}
    {error && <span style={{ fontSize: 12, color: 'var(--danger-500)', display: 'flex', gap: 4, alignItems: 'center' }}>
      <Icon name="alertCircle" size={12}/>{error}
    </span>}
  </div>
);
const inputBase = {
  fontFamily: 'inherit', fontSize: 14, color: 'var(--ink-900)',
  padding: '8px 12px', minHeight: 38,
  background: 'white',
  border: '1px solid var(--ink-300)', borderRadius: 6,
  outline: 'none', width: '100%',
  transition: 'border-color .12s, box-shadow .12s',
};
const TextInput = React.forwardRef(({ icon, ...rest }, ref) => (
  <div style={{ position: 'relative' }}>
    {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }}><Icon name={icon} size={16}/></span>}
    <input ref={ref} {...rest} style={{ ...inputBase, paddingLeft: icon ? 36 : 12, ...(rest.style || {}) }}/>
  </div>
));
const TextArea = React.forwardRef((props, ref) => (
  <textarea ref={ref} {...props} style={{ ...inputBase, minHeight: 100, resize: 'vertical', ...(props.style || {}) }}/>
));
const Select = ({ children, ...rest }) => (
  <div style={{ position: 'relative' }}>
    <select {...rest} style={{ ...inputBase, appearance: 'none', paddingRight: 36, ...(rest.style || {}) }}>{children}</select>
    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)', pointerEvents: 'none' }}><Icon name="chevronDown" size={16}/></span>
  </div>
);
const Checkbox = ({ checked, onChange, label, id, style }) => (
  <label htmlFor={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', ...style }}>
    <span style={{
      width: 18, height: 18, marginTop: 2,
      borderRadius: 3, border: `1.5px solid ${checked ? 'var(--primary-500)' : 'var(--ink-400)'}`,
      background: checked ? 'var(--primary-500)' : 'white',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      transition: 'border-color .1s, background .1s',
    }}>
      {checked && <Icon name="check" size={12} stroke={3} style={{ color: 'white' }}/>}
    </span>
    <input type="checkbox" id={id} checked={checked} onChange={onChange || (() => {})} readOnly={!onChange} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}/>
    {label && <span style={{ fontSize: 14, color: 'var(--ink-800)', lineHeight: 1.4 }}>{label}</span>}
  </label>
);
const Radio = ({ checked, onChange, label, id, hint, name, value }) => (
  <label htmlFor={id} style={{
    display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
    padding: '10px 12px', borderRadius: 6,
    border: `1px solid ${checked ? 'var(--primary-500)' : 'var(--ink-200)'}`,
    background: checked ? 'var(--primary-50)' : 'white',
    transition: 'border-color .12s, background .12s',
  }}>
    <span style={{
      width: 18, height: 18, marginTop: 2, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${checked ? 'var(--primary-500)' : 'var(--ink-400)'}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'white',
    }}>
      {checked && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary-500)' }}/>}
    </span>
    <input type="radio" id={id} name={name} value={value} checked={checked} onChange={onChange || (() => {})} readOnly={!onChange} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}/>
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{label}</span>
      {hint && <span style={{ fontSize: 13, color: 'var(--ink-600)' }}>{hint}</span>}
    </span>
  </label>
);

/* ---------- Toggle ---------- */
const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <span style={{
      width: 36, height: 20, borderRadius: 999,
      background: checked ? 'var(--primary-500)' : 'var(--ink-300)',
      position: 'relative', transition: 'background .15s',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
      }}/>
    </span>
    <input type="checkbox" checked={checked} onChange={onChange || (() => {})} readOnly={!onChange} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}/>
    {label && <span style={{ fontSize: 14, color: 'var(--ink-800)' }}>{label}</span>}
  </label>
);

/* ---------- Alert / Banner ---------- */
const Alert = ({ tone = 'info', title, children, icon, onClose, style }) => {
  const tones = {
    info:    { bg: 'var(--info-50)',    border: 'var(--primary-300)', fg: 'var(--primary-700)', icon: 'info' },
    success: { bg: 'var(--success-50)', border: '#9bcfa6',            fg: 'var(--success-600)', icon: 'checkCircle' },
    warning: { bg: 'var(--warning-50)', border: '#f0c269',            fg: 'var(--warning-600)', icon: 'alertTriangle' },
    danger:  { bg: 'var(--danger-50)',  border: '#e89a9a',            fg: 'var(--danger-600)', icon: 'alertCircle' },
  };
  const t = tones[tone] || tones.info;
  return (
    <div role="alert" style={{
      display: 'flex', gap: 12, padding: '12px 16px',
      background: t.bg, border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`,
      borderRadius: 6, color: t.fg, ...style,
    }}>
      <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name={icon || t.icon} size={18}/></span>
      <div style={{ flex: 1, color: 'var(--ink-800)' }}>
        {title && <div style={{ fontWeight: 700, color: t.fg, marginBottom: 2 }}>{title}</div>}
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>{children}</div>
      </div>
      {onClose && <button onClick={onClose} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: t.fg, cursor: 'pointer', padding: 0 }}><Icon name="x" size={16}/></button>}
    </div>
  );
};

/* ---------- Stepper (horizontal) ---------- */
const Stepper = ({ steps, current }) => (
  <ol style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, gap: 0 }}>
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: done ? 'var(--success-500)' : active ? 'var(--primary-500)' : 'white',
            border: `1.5px solid ${done ? 'var(--success-500)' : active ? 'var(--primary-500)' : 'var(--ink-300)'}`,
            color: done || active ? 'white' : 'var(--ink-500)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {done ? <Icon name="check" size={14} stroke={3}/> : i + 1}
          </span>
          <span style={{ fontSize: 13, fontWeight: active || done ? 600 : 500, color: active ? 'var(--primary-600)' : done ? 'var(--ink-700)' : 'var(--ink-500)' }}>{s}</span>
          {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: done ? 'var(--success-500)' : 'var(--ink-200)', marginLeft: 12 }}/>}
        </li>
      );
    })}
  </ol>
);

/* ---------- Pipeline stepper (vertical, for ingestion) ---------- */
const PipelineStep = ({ name, status, duration, log, icon }) => {
  const cfg = {
    done:    { color: 'var(--success-500)', bg: 'var(--success-50)', icon: 'check', label: 'Terminé' },
    active:  { color: 'var(--primary-500)', bg: 'var(--primary-50)', icon: icon || 'refresh', label: 'En cours' },
    pending: { color: 'var(--ink-400)',     bg: 'var(--ink-100)',    icon: 'clock', label: 'En attente' },
    error:   { color: 'var(--danger-500)',  bg: 'var(--danger-50)',  icon: 'xCircle', label: 'Échec' },
  }[status];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span style={{
          width: 32, height: 32, borderRadius: '50%',
          background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          animation: status === 'active' ? 'spin 1.4s linear infinite' : 'none',
        }}><Icon name={cfg.icon} size={15} stroke={2.25}/></span>
        <span style={{ width: 1.5, flex: 1, minHeight: 24, background: status === 'pending' ? 'var(--ink-200)' : 'var(--ink-300)' }}/>
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>{name}</span>
          <Badge tone={status === 'done' ? 'archived' : status === 'active' ? 'active' : status === 'error' ? 'danger' : 'neutral'} size="sm" dot>
            {cfg.label}
          </Badge>
          {duration && <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{duration}</span>}
        </div>
        {log && <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4, fontFamily: status === 'error' ? 'inherit' : 'inherit' }}>{log}</div>}
      </div>
    </div>
  );
};

/* ---------- Avatar / Initial ---------- */
const Avatar = ({ name = '', tone = 'primary', size = 28 }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const tones = {
    primary: { bg: 'var(--primary-50)', fg: 'var(--primary-600)' },
    green:   { bg: '#d8eed8', fg: 'var(--success-600)' },
    pink:    { bg: '#fce4eb', fg: '#a3315a' },
    purple:  { bg: '#e9e0fa', fg: '#5b3aa3' },
    amber:   { bg: 'var(--warning-100)', fg: 'var(--warning-600)' },
    cyan:    { bg: '#d6eef0', fg: '#1f6e75' },
  };
  const t = tones[tone] || tones.primary;
  return <span style={{
    width: size, height: size, borderRadius: '50%',
    background: t.bg, color: t.fg,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size <= 24 ? 10 : 11, fontWeight: 700, letterSpacing: '0.02em',
    flexShrink: 0,
  }}>{initials || '?'}</span>;
};

/* ---------- Republic header bar (filet tricolore Gabon discret) ---------- */
const RepublicBar = () => (
  <div aria-hidden="true" style={{ display: 'flex', height: 3 }}>
    <span style={{ flex: 1, background: '#009e60' }}/>
    <span style={{ flex: 1, background: '#fcd116' }}/>
    <span style={{ flex: 1, background: '#3a75c4' }}/>
  </div>
);

/* ---------- Logo ---------- */
const Logo = ({ size = 32, variant = 'default', subtitle = 'Guichet unique' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{
      width: size, height: size, borderRadius: 6,
      background: variant === 'light' ? 'white' : 'var(--primary-500)',
      color: variant === 'light' ? 'var(--primary-600)' : 'white',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, position: 'relative', overflow: 'hidden',
    }}>
      {/* Mark : G stylisé + 3 filets tricolores */}
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="3" y="3" width="6" height="2" fill="#009e60"/>
        <rect x="3" y="6" width="6" height="2" fill="#fcd116"/>
        <rect x="3" y="9" width="6" height="2" fill="#3a75c4"/>
        <path d="M22 12.5a6.5 6.5 0 1 0 0 8.5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M22 17h-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
      <span style={{ fontWeight: 900, fontSize: 16, color: variant === 'light' ? 'white' : 'var(--ink-900)', letterSpacing: '-0.01em' }}>
        Gabon<span style={{ color: variant === 'light' ? 'rgba(255,255,255,.75)' : 'var(--primary-500)' }}>Connect</span>
      </span>
      <span style={{ fontWeight: 600, fontSize: 10.5, color: variant === 'light' ? 'rgba(255,255,255,.75)' : 'var(--ink-600)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{subtitle}</span>
    </span>
  </div>
);

/* ---------- App header (top bar) ---------- */
const AppHeader = ({ org, user, role, onNav, current }) => (
  <header style={{ borderBottom: '1px solid var(--ink-200)', background: 'white', position: 'relative', zIndex: 5 }}>
    <RepublicBar/>
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 60, gap: 24 }}>
      <Logo/>
      {org && <>
        <div style={{ width: 1, height: 28, background: 'var(--ink-200)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="building" size={16} style={{ color: 'var(--ink-500)' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)' }}>{org}</span>
          <Icon name="chevronDown" size={14} style={{ color: 'var(--ink-500)' }}/>
        </div>
      </>}
      <div style={{ flex: 1 }}/>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button aria-label="Notifications" style={{ background: 'transparent', border: 'none', padding: 6, color: 'var(--ink-600)', position: 'relative' }}>
            <Icon name="bell" size={18}/>
            <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--danger-500)' }}/>
          </button>
          <button aria-label="Aide" style={{ background: 'transparent', border: 'none', padding: 6, color: 'var(--ink-600)' }}>
            <Icon name="helpCircle" size={18}/>
          </button>
          <div style={{ width: 1, height: 28, background: 'var(--ink-200)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={user} tone="primary" size={30}/>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{user}</span>
              {role && <span style={{ fontSize: 11, color: 'var(--ink-600)' }}>{role}</span>}
            </div>
            <Icon name="chevronDown" size={14} style={{ color: 'var(--ink-500)' }}/>
          </div>
        </div>
      )}
    </div>
  </header>
);

/* ---------- Sidebar nav ---------- */
const Sidebar = ({ items, current, onSelect, footer }) => (
  <nav style={{ width: 232, background: 'white', borderRight: '1px solid var(--ink-200)', padding: '16px 12px', display: 'flex', flexDirection: 'column' }}>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      {items.map(it => it.section ? (
        <li key={it.section} style={{ padding: '12px 12px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-500)', textTransform: 'uppercase' }}>{it.section}</li>
      ) : (
        <li key={it.id}>
          <button
            onClick={() => onSelect && onSelect(it.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6,
              background: current === it.id ? 'var(--primary-50)' : 'transparent',
              color: current === it.id ? 'var(--primary-600)' : 'var(--ink-700)',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 14, fontWeight: current === it.id ? 600 : 500,
            }}
          >
            <Icon name={it.icon} size={16}/>
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.count !== undefined && <Badge tone={current === it.id ? 'primary' : 'neutral'} size="sm">{it.count}</Badge>}
          </button>
        </li>
      ))}
    </ul>
    {footer}
  </nav>
);

/* ---------- Page header (title + breadcrumbs) ---------- */
const PageHeader = ({ breadcrumbs, title, subtitle, actions, meta }) => (
  <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid var(--ink-200)', background: 'white' }}>
    {breadcrumbs && (
      <nav aria-label="Fil d'Ariane" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-600)', marginBottom: 8 }}>
        {breadcrumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevronRight" size={12} style={{ color: 'var(--ink-400)' }}/>}
            <span style={{ color: i === breadcrumbs.length - 1 ? 'var(--ink-900)' : 'var(--ink-600)', fontWeight: i === breadcrumbs.length - 1 ? 600 : 500 }}>{c}</span>
          </React.Fragment>
        ))}
      </nav>
    )}
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>{title}</h1>
        {subtitle && <p style={{ marginTop: 4, color: 'var(--ink-600)', fontSize: 14 }}>{subtitle}</p>}
        {meta && <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  </div>
);

/* ---------- Probatory banner (composant transverse) ---------- */
const ProbatoryBanner = ({ hash, timestamp, signature, compact }) => (
  <div style={{
    background: 'linear-gradient(180deg, var(--primary-50) 0%, white 100%)',
    border: '1px solid var(--primary-200)',
    borderRadius: 8, padding: compact ? 12 : 16,
    display: 'flex', gap: 12, alignItems: 'flex-start',
  }}>
    <span style={{
      width: 32, height: 32, borderRadius: 6, background: 'var(--primary-500)', color: 'white',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}><Icon name="shieldCheck" size={18}/></span>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-700)' }}>
        Document scellé électroniquement · valeur probante NF Z42-013
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, color: 'var(--ink-700)' }}>
        <span style={{ color: 'var(--ink-500)' }}>Empreinte SHA-256</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-800)', wordBreak: 'break-all' }}>{hash}</span>
        <span style={{ color: 'var(--ink-500)' }}>Horodaté</span>
        <span style={{ fontWeight: 500 }}>{timestamp}</span>
        {signature && <>
          <span style={{ color: 'var(--ink-500)' }}>Signé par</span>
          <span style={{ fontWeight: 500 }}>{signature}</span>
        </>}
      </div>
      {!compact && <a href="#verify" style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Comment vérifier l'intégrité ?</a>}
    </div>
  </div>
);

/* ---------- Stat card ---------- */
const StatCard = ({ label, value, delta, deltaTone, icon, hint, accent = false }) => (
  <div style={{
    background: accent ? 'var(--primary-500)' : 'white',
    color: accent ? 'white' : 'inherit',
    border: accent ? 'none' : '1px solid var(--ink-200)',
    borderRadius: 8, padding: 20,
    display: 'flex', flexDirection: 'column', gap: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: accent ? 'rgba(255,255,255,.85)' : 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {icon && <Icon name={icon} size={16} style={{ color: accent ? 'rgba(255,255,255,.85)' : 'var(--ink-500)' }}/>}
    </div>
    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: accent ? 'white' : 'var(--ink-900)', lineHeight: 1.1 }}>{value}</div>
    {(delta || hint) && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        {delta && <Badge tone={deltaTone || 'success'} size="sm" dot>{delta}</Badge>}
        {hint && <span style={{ color: accent ? 'rgba(255,255,255,.8)' : 'var(--ink-500)' }}>{hint}</span>}
      </div>
    )}
  </div>
);

/* ---------- Table primitives ---------- */
const Table = ({ children, sticky }) => (
  <div style={{ width: '100%', overflow: 'auto', border: '1px solid var(--ink-200)', borderRadius: 8, background: 'white' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
  </div>
);
const Th = ({ children, sortable, align = 'left', style }) => (
  <th style={{
    textAlign: align, padding: '10px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--ink-600)', borderBottom: '1px solid var(--ink-200)',
    background: 'var(--ink-50)', whiteSpace: 'nowrap', ...style,
  }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {children}
      {sortable && <Icon name="chevronDown" size={11} style={{ color: 'var(--ink-400)' }}/>}
    </span>
  </th>
);
const Td = ({ children, align = 'left', style }) => (
  <td style={{ padding: '12px', textAlign: align, borderBottom: '1px solid var(--ink-150)', color: 'var(--ink-800)', verticalAlign: 'middle', ...style }}>{children}</td>
);
const Tr = ({ children, onClick, selected }) => (
  <tr
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default', background: selected ? 'var(--primary-50)' : 'transparent' }}
    onMouseEnter={onClick ? e => e.currentTarget.style.background = selected ? 'var(--primary-100)' : 'var(--ink-50)' : undefined}
    onMouseLeave={onClick ? e => e.currentTarget.style.background = selected ? 'var(--primary-50)' : 'transparent' : undefined}
  >{children}</tr>
);

/* ---------- Progress bar ---------- */
const Progress = ({ value, total = 100, tone = 'primary', label, height = 6 }) => {
  const pct = Math.min(100, (value / total) * 100);
  const colors = { primary: 'var(--primary-500)', success: 'var(--success-500)', warning: 'var(--warning-500)', danger: 'var(--danger-500)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height, background: 'var(--ink-200)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: colors[tone], borderRadius: 999, transition: 'width .3s' }}/>
      </div>
      {label && <span style={{ fontSize: 12, color: 'var(--ink-700)', fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>{label}</span>}
    </div>
  );
};

/* ---------- Tab strip ---------- */
const Tabs = ({ tabs, current, onChange, variant = 'pill' }) => {
  if (variant === 'pill') {
    return (
      <div style={{ display: 'inline-flex', padding: 3, background: 'var(--ink-100)', borderRadius: 8, gap: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
            padding: '6px 16px', minHeight: 32, borderRadius: 6,
            background: current === t.id ? 'white' : 'transparent',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: current === t.id ? 'var(--ink-900)' : 'var(--ink-600)',
            boxShadow: current === t.id ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>
    );
  }
  return (
    <div role="tablist" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ink-200)' }}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={current === t.id} onClick={() => onChange && onChange(t.id)} style={{
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600,
          color: current === t.id ? 'var(--primary-600)' : 'var(--ink-600)',
          borderBottom: `2px solid ${current === t.id ? 'var(--primary-500)' : 'transparent'}`,
          marginBottom: -1,
        }}>{t.label}</button>
      ))}
    </div>
  );
};

/* ---------- Section heading ---------- */
const SectionHeading = ({ title, subtitle, action, level = 2, style }) => {
  const Tag = `h${level}`;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16, ...style }}>
      <div style={{ flex: 1 }}>
        <Tag style={{ fontSize: level === 2 ? 18 : 15, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.005em' }}>{title}</Tag>
        {subtitle && <p style={{ marginTop: 2, fontSize: 13, color: 'var(--ink-600)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

/* ---------- Demo banner ---------- */
const DemoBanner = () => (
  <div style={{
    background: 'var(--warning-100)', borderBottom: '1px solid #f0c269',
    padding: '6px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontSize: 12, color: 'var(--warning-600)', fontWeight: 600,
  }}>
    <Icon name="alertTriangle" size={13}/>
    Environnement de démonstration — les données affichées n'ont aucune valeur probante
  </div>
);

/* ---------- Frame wrapper for design canvas screenshots ---------- */
const Frame = ({ width = 1440, height = 900, children, style }) => (
  <div style={{
    width, minHeight: height, height: 'auto',
    background: 'var(--ink-100)', overflow: 'hidden', position: 'relative',
    fontFamily: 'var(--font-sans)', color: 'var(--ink-900)',
    ...style,
  }}>{children}</div>
);

/* ---------- Sparkline ---------- */
const Sparkline = ({ values, width = 600, height = 160, tone = 'primary' }) => {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * (height - 20) - 10}`).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  const color = tone === 'primary' ? 'var(--primary-500)' : 'var(--success-500)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <linearGradient id={`sg-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon fill={`url(#sg-${tone})`} points={area}/>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points}/>
    </svg>
  );
};

/* ---------- Export ---------- */
Object.assign(window, {
  Icon, Button, Badge, Card, Field, TextInput, TextArea, Select, Checkbox, Radio, Toggle,
  Alert, Stepper, PipelineStep, Avatar, RepublicBar, Logo, AppHeader, Sidebar, PageHeader,
  ProbatoryBanner, StatCard, Table, Th, Td, Tr, Progress, Tabs, SectionHeading, DemoBanner, Frame,
  Sparkline,
});
