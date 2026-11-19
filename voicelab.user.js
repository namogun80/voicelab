// ==UserScript==
// @name         보이스랩 - LiveRC 음성 랩타임
// @namespace    voicelab
// @version      2.29.0
// @description  LiveRC 라이브 스코어링에서 선택한 선수의 랩타임을 음성으로 안내 (모든 LiveRC 트랙)
// @match        https://*.liverc.com/*
// @match        http://*.liverc.com/*
// @match        https://liverc.com/*
// @updateURL    https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab.user.js
// @downloadURL  https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab.user.js
// @homepageURL  https://github.com/namogun80/voicelab
// @noframes
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @inject-into  page
// @run-at       document-idle
// ==/UserScript==
window.__vlAuto = true;
(function () {
  var VER0 = 75;   /* = VER below */
  if (window.__voiceLap && !((+window.__voiceLap.ver || 0) < VER0)) { window.__voiceLap.toggle(); return; }   /* same or newer copy running: a bookmark click toggles it */
  /* Tampermonkey on Chrome MV3 may run us in an isolated world: read LiveRC data through the real page window */
  var W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  var DESK = W.voicelabDesktop || window.voicelabDesktop || null;   /* VoiceLab Windows app bridge (preload) */
  /* iOS app bridge: when running inside the VoiceLab app, speech and screen-awake go to native code */
  var NB = null;
  try { NB = (W.webkit && W.webkit.messageHandlers && W.webkit.messageHandlers.voicelab) || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.voicelab) || null; } catch (e) {}
  function native(o) { try { NB.postMessage(o); } catch (e) {} }
  var hasSpeech = typeof speechSynthesis !== 'undefined';
  /* iPhone / iPad (iPadOS reports itself as a Mac with touch) — every iOS browser is Safari's WebKit underneath */
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function SCW() {
    try { if (W.scoring && W.scoring.driverData) return W; } catch (e) {}
    for (var i = 0; i < W.frames.length; i++) {
      try { var f = W.frames[i]; if (f.scoring && f.scoring.driverData) return f;
        for (var j = 0; j < f.frames.length; j++) { try { var g = f.frames[j]; if (g.scoring && g.scoring.driverData) return g; } catch (e) {} } } catch (e) {}
    }
    return null;
  }
  function SC() { var w = SCW(); return w ? w.scoring : null; }
  var auto = !!window.__vlAuto;
  var onPractice = /^\/practice/.test(location.pathname);
  var onTracks = /^live\.liverc\.com$/i.test(location.hostname);   /* LiveRC's track list: VoiceLab opens as the track picker */
  if (auto && !SC() && !onPractice && !onTracks) {
    var tries = 0;
    var w = setInterval(function () { if (SC() || ++tries > 1800) { clearInterval(w); if (SC() && !(window.__voiceLap && !((+window.__voiceLap.ver || 0) < VER0))) main(); } }, 1000);
    return;
  }
  main();
  function main() {
  if (!document.body) return;
  var VER = VER0;   /* bump when the panel changes */
  var VERSION = '2.29.0';
  /* the ten alert tones (names here, sounds in TONES below) */
  var TONE_NAMES = ['부드러운 띵', '낮은 퐁', '짧은 톡', '나무 똑', '맑은 핑', '띵동', '마림바', '물방울', '낮은 종', '출발 총성'];
  function toneOpts() { return TONE_NAMES.map(function (n, i) { return '<option value="' + i + '">' + n + '</option>'; }).join(''); }
  var warnOld = false;
  var others = document.querySelectorAll('#vl_root');
  for (var oi = 0; oi < others.length; oi++) {
    var ov = +others[oi].getAttribute('data-vl-ver') || 0;
    if (ov >= VER) { var fb = others[oi].querySelector('#vl_fab'); if (fb && !auto) fb.click(); return; }   /* same or newer copy already running: a bookmark click toggles it, an auto start just leaves it */
    others[oi].remove();
    if (!ov) warnOld = true;   /* copies before v1.9 keep running in the background and can't be stopped from here */
  }
  var LS = 'voiceLapCfg';
  var cfg = { sel: {}, targets: '', all: false, sayName: true, sayLap: true, dec: 2, unit: false, pad: 2, sayTime: true, sayPos: false, sayBest: true, gapLead: true, gapLeadLaps: 1, gapAhead: true, gapAheadLaps: 1, rate: 1.1, wake: true, open: true, tab: 'set', colEl: true, colPace: true, colTop3: true, sortK: 'p', sortD: 1, pracFrom: '', pracTo: '', pracSel: [], closeOn: true, closeSec: 1, closeColor: '#ff2bd6', closeV2: 1, dingAhead: false, dingTone: 0, colOrder: null, colHide: null, trendSrc: 'best', graphSel: [], gShow: { pos: true, lap: true, avg: true, list: true }, gBackfill: true, paceColor: true, bhdColor: true, avgMode: 'top10', avgOut: 15, lastDiff: false, psK: 'd', psD: -1, pcUp: '#3ddc84', pcDown: '#ff7a7a', pcTop: '#d27cff', consOn: true, consPct: 90, consCol: '#4fc3f7', pgShow: { best: true, t3: true }, pdrvHide: false, full: null, pcolOrder: null, pcolHide: {}, projMin: 5, projOut: 0, lapDev: 0.5, lapNear: '#3ddc84', lapFar: '#ffa94d', lapBest: '#d27cff', trkRecent: [], trkHide: false, voice: 'def', runOn: false, runMin: 5, runSec: 0, fuelOn: false, fuelMin: 7, fuelSec: 0, pitWord: '피트 인', pitTarget: 10, pitFast: '#3ddc84', pitSlow: '#ff5252', favs: [], lineAfterPit: false, voiceOn: true, raceOn: true, runWord: '주행 완료', gOpen: {}, syncUrl: '', syncKey: '', _ts: 0, closeAfter: 3, lapLive: true, liveSec: 2, liveOk: '#3ddc84', liveNear: '#ffa94d', liveOver: '#ff5252', lapPass: true, qualOn: true, qualMode: 'best', qualOpen: true, zoom: 100,
    teamOn: false, teams: [], teamOf: {}, ptsMode: 'fixed', ptsFixed: [10, 8, 6, 5, 4, 3, 2, 1], ptsCustom: [10, 8, 6, 5, 4, 3, 2, 1], bonusBest: false, bonusFin: false, teamAuto: true, teamSay: true, teamSayLive: false,
    gAllPrac: true, gVoice: true, gVoiceBold: true, mainSay: true,
    nameMulti: true, selKeep: true, toneAuto: true, toneVol: 70, startGun: false, voiceMerge: true, voiceLatest: true, sayDelta: false, runSum: true, finOn: true, finSay: true, finWord: '레이스 종료', finPos: true,
    remOn: true, remAt: { 180: false, 120: true, 60: true, 30: true, 10: false }, posChg: true, gapBehind: true, behindSec: 1, autoFit: true, bigView: false, v227: 1 };
  var koVoice = null, koVoices = [], femVoices = [];
  var VPRESET = { def: { i: -1, pitch: 1, rate: 1 }, f1: { i: 0, pitch: 1.05, rate: 1 }, f2: { i: 1, pitch: 1.22, rate: 1.03 }, f3: { i: 2, pitch: 0.9, rate: 0.95 } };
  var CFG_KEYS = Object.keys(cfg), CFG_DEF = JSON.parse(JSON.stringify(cfg));
  cfg.closeV2 = 0;   /* stays 0 only for settings saved before v2.24 (see below) */
  cfg.v227 = 0;
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
  try { if (DESK && DESK.cfgGet) { var dc = DESK.cfgGet(); if (dc) Object.assign(cfg, JSON.parse(dc)); } } catch (e) {}
  /* Google Drive sync address travels to another track's site in the address (#…&vl-sync=url%0Akey) */
  try { var hsy = location.hash.match(/vl-sync=([^&]*)/); if (hsy) { var spy = decodeURIComponent(hsy[1]).split('\n'); if (/^https:\/\/script\.google(usercontent)?\.com\//.test(spy[0])) { cfg.syncUrl = spy[0]; cfg.syncKey = spy[1] || ''; } } } catch (e) {}
  /* v2.24: close battles are a neon arrow, not a row colour → the old default red becomes neon pink */
  /* v2.27: the name / position / “초” boxes are gone — names follow the 2-or-more rule, position only when it changes, lap times without “초” */
  if (!cfg.v227) { cfg.sayName = true; cfg.sayPos = false; cfg.unit = false; cfg.v227 = 1; }
  if (!cfg.closeV2) { if (!cfg.closeColor || String(cfg.closeColor).toLowerCase() === '#ff5252') cfg.closeColor = '#ff2bd6'; cfg.closeV2 = 1; }
  /* v2.28: a device that has synced with this Drive address before (devices set up before v2.28 count as synced) */
  if (cfg.syncUrl && cfg.syncOk === undefined && !cfg.v228s) cfg.syncOk = cfg.syncUrl;
  cfg.v228s = 1;
  var syncTs0 = +cfg._ts || 0, syncReady = false, syncSig = null;
  var running = false;
  if (!cfg.colHide || typeof cfg.colHide !== 'object') cfg.colHide = { el: cfg.colEl === false, pace: cfg.colPace === false, t3: cfg.colTop3 === false };
  var save = function () {
    /* a real settings change (not just which tab is open) gets a new time stamp and goes to Google Drive a little later */
    if (syncReady && cfg.syncUrl && cfg.syncOk === cfg.syncUrl) { var sg = syncSigOf(); if (sg !== syncSig) { syncSig = sg; cfg._ts = Date.now(); syncPushSoon(); } }
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {}
    try { if (DESK && DESK.cfgSet) DESK.cfgSet(JSON.stringify(cfg)); } catch (e) {}
    try { autoRun(); } catch (e) {}   /* a driver picked or unpicked: start / stop the voice right away (not up to 250 ms later, so no lap slips through) */
  };

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#vl_root{position:fixed;right:14px;bottom:14px;z-index:2147483647;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;color:#eee}' +
    '#vl_fab{width:58px;height:58px;border-radius:50%;border:0;background:#e8b400;color:#000;font-size:26px;box-shadow:0 4px 16px rgba(0,0,0,.5);cursor:pointer;float:right;position:relative}' +
    '#vl_fab.on{background:#2ecc71}#vl_fab .dot{position:absolute;top:6px;right:6px;width:12px;height:12px;border-radius:50%;background:#c0392b;border:2px solid #111}#vl_fab.on .dot{background:#fff}' +
    '#vl_panel{width:min(96vw,780px);height:min(82vh,760px);height:min(82svh,760px);display:flex;flex-direction:column;background:#141417;border:2px solid #e8b400;border-radius:14px;margin-bottom:10px;box-shadow:0 6px 28px rgba(0,0,0,.6);overflow:hidden}' +
    '#vl_panel.pmode #vl_go{display:none}' +
    '.vl-ls{margin:2px 0 8px}.vl-ls .lsc{display:flex;flex-wrap:wrap;gap:5px}.vl-ls .lsc span{display:inline-flex;align-items:center;gap:4px;background:#22222a;border-radius:12px;padding:2px 9px;font-size:12px;color:#ccc;white-space:nowrap}' +
    '.vl-ls .lsc i{width:9px;height:9px;border-radius:2px;display:inline-block}.vl-ls .lsc b{color:#fff}.vl-ls .lsc small{color:#999;font-size:11px}.vl-ls .lsc .lx{color:#888}' +
    '.vl-ls .lsb{display:flex;height:5px;border-radius:3px;overflow:hidden;margin-top:5px;background:#2a2a30}.vl-ls .lsb i{display:block;height:100%}' +
    '#vl_tab_set .grp{padding:0;overflow:hidden}#vl_tab_set .gh{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a1a20;cursor:pointer;user-select:none;-webkit-user-select:none}' +
    '#vl_tab_set .gh .sech{margin:0;white-space:nowrap}#vl_tab_set .gh .ar{color:#888;width:12px;flex:none}#vl_tab_set .gh .ar:before{content:"▸"}#vl_tab_set .grp.open .gh .ar:before{content:"▾"}' +
    '#vl_tab_set .gs{flex:1;min-width:0;color:#888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#vl_tab_set .grp.open .gs{visibility:hidden}' +
    '#vl_tab_set .gb{display:none;padding:8px 12px 10px}#vl_tab_set .grp.open .gb{display:block}#vl_tab_set .grp.dim .gb{opacity:.45}' +
    '#vl_tab_set .gsw{position:relative;flex:none;width:40px;height:22px;cursor:pointer}#vl_tab_set .gsw input{position:absolute;opacity:0;width:0;height:0}' +
    '#vl_tab_set .gsw i{position:absolute;inset:0;border-radius:11px;background:#3a3a42;transition:background .15s}#vl_tab_set .gsw i:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#bbb;transition:left .15s}' +
    '#vl_tab_set .gsw input:checked+i{background:#e8b400}#vl_tab_set .gsw input:checked+i:after{left:21px;background:#000}' +
    '#vl_tab_set .gtools{display:flex;gap:6px;margin:0 0 8px}#vl_tab_set .gb>.sub:first-child{margin-top:0}' +
    '#vl_tab_set details.inf{margin-top:4px}#vl_tab_set details.inf summary{color:#8aa;font-size:12px;cursor:pointer;list-style:none}#vl_tab_set details.inf summary::-webkit-details-marker{display:none}#vl_tab_set details.inf>div{color:#999;font-size:12px;margin-top:3px;line-height:1.5}' +
    '#vl_tab_set .sec{border:1px solid #2a2a30;border-radius:10px;padding:10px 10px 6px;margin-bottom:12px}#vl_tab_set .sech{font-size:15px;font-weight:800;color:#e8b400;margin:0 0 8px}' +
    '#vl_head{display:flex;align-items:center;gap:2px;padding:0 8px 0 4px;border-bottom:1px solid #2a2a30;flex:none}' +
    '#vl_head .tab{position:relative;background:none;border:0;border-bottom:3px solid transparent;color:#999;padding:11px 10px 8px;font:600 15px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap}' +
    '#vl_head .tab.on{color:#fff;border-bottom-color:#e8b400}' +
    '@media (max-width:430px){#vl_head .tab:not(.on) .vl-tn{display:none}#vl_head .tab{padding-left:6px !important;padding-right:6px !important}}' +
    '#vl_zm{margin-left:auto;margin-right:6px;display:inline-flex;align-items:center;gap:2px;background:#1e1e24;border:1px solid #3a3a42;border-radius:16px;padding:2px 4px;font-size:13px;color:#ddd;position:relative;flex:none}' +
    '#vl_zm i{font-style:normal;opacity:.7;margin:0 2px}#vl_zm button{background:#2a2a32;color:#eee;border:0;border-radius:50%;width:22px;height:22px;font-weight:800;cursor:pointer;padding:0;line-height:22px}' +
    '#vl_zm #vl_zv{width:auto;min-width:44px;border-radius:10px;background:none;font-weight:700;font-size:13px}' +
    '#vl_zl{display:none;position:absolute;top:30px;left:14px;z-index:5;flex-direction:column;background:#1e1e24;border:1px solid #3a3a42;border-radius:8px;padding:4px;box-shadow:0 6px 18px rgba(0,0,0,.5)}#vl_zl.on{display:flex}' +
    '#vl_zl button{width:auto;height:auto;border-radius:5px;background:none;padding:4px 16px;font-weight:600;line-height:1.3;white-space:nowrap}#vl_zl button.sel{background:#e8b400;color:#000;font-weight:800}' +
    '@media (max-width:350px){#vl_head .tab{padding:11px 3px 8px !important;font-size:13px !important;letter-spacing:-.5px !important}#vl_go{padding:7px 6px !important;font-size:13px !important}#vl_zm #vl_zv{min-width:34px;font-size:12px}}@media (max-width:430px){#vl_zm i{display:none}#vl_zm #vl_zv{min-width:38px}#vl_zm button[data-zs]{display:none}#vl_zm{margin-right:4px;padding:2px}#vl_head .vl-tl{display:none}}' +
    '#vl_rb .hdr .vl-hl{font-size:14px;font-weight:800;opacity:1;background:rgba(0,0,0,.5);border-radius:6px;padding:2px 9px;display:inline-block;margin-right:6px;vertical-align:4px;color:#ffd54a}#vl_rb .hdr .vl-hl-ela{color:#9fe8ff;margin:0 0 3px;vertical-align:0}' +
    '#vl_go{margin-left:0;padding:7px 12px;border:0;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}' +
    '#vl_min{cursor:pointer;color:#aaa;padding:6px 4px 6px 10px;font-size:16px}' +
    '#vl_body{flex:1;min-height:0;overflow:auto;padding:12px 14px 14px}' +
    '#vl_rb .hdr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:8px 8px 0 0}' +
    '#vl_rb .cls{font-weight:800;font-size:16px;letter-spacing:.3px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vl_rb .sub2{font-size:11px;opacity:.8;white-space:nowrap}' +
    '#vl_fuel{display:flex;align-items:center;gap:8px;white-space:nowrap;align-self:center}#vl_freset{background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:6px;font-size:16px;font-weight:700;padding:0 7px;cursor:pointer}#vl_fbtn{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.35);border-radius:6px;font-size:15px;padding:1px 6px;cursor:pointer;opacity:.6}#vl_fbtn.on{opacity:1;background:rgba(0,0,0,.45)}' +
    '#vl_fbox{display:inline-flex;align-items:center;gap:8px}#vl_fbox .fl{display:flex;flex-direction:column;font-size:12px;opacity:.9;line-height:1.15}#vl_fbox .fl small{font-size:11px;opacity:.95;max-width:90px;overflow:hidden;text-overflow:ellipsis}' +
    '#vl_fbox .fc{font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}#vl_fbox .fc.neg{color:#ffd0d0;background:#c62828;border-radius:6px;padding:1px 6px}' +
    '#vl_fbox .ftag{font-size:12px;font-weight:800;background:#ffd54a;color:#000;border-radius:5px;padding:2px 6px}#vl_fbox .fs{font-size:12px;opacity:.9}' +
    '#vl_fbox .fp{display:flex;flex-direction:column;background:rgba(0,0,0,.55);border-radius:6px;padding:3px 8px;line-height:1.05}#vl_fbox .fp small{font-size:10px;opacity:.8}#vl_fbox .fp b{font:700 20px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
    '#vl_fuel.on{background:rgba(0,0,0,.18);border-radius:8px;padding:4px 8px}' +
    '#vl_rb .clk{font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
    '#vl_rb .tw{overflow-x:auto;border-radius:0 0 8px 8px;-webkit-overflow-scrolling:touch;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
    '#vl_rb .tw{width:fit-content;max-width:100%}#vl_rb table{width:auto;border-collapse:collapse;font-variant-numeric:tabular-nums;background:#0b0b0d}' +
    '#vl_rb th{background:#202026;color:#aaa;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:6px;text-align:right;white-space:nowrap;cursor:pointer;user-select:none;-webkit-user-select:none}' +
    '#vl_rb th:hover{color:#fff}#vl_rb th.sorted{color:#e8b400}#vl_rb th .ar{font-size:9px;margin-left:2px}' +
    '#vl_rb td{padding:8px 6px;text-align:right;white-space:nowrap;border-bottom:1px solid #1c1c21;font-size:15px;color:#e6e6ea}' +
    '#vl_rb tbody tr:nth-child(even) td{background:#121216}' +
    '#vl_cols{display:flex;flex-direction:column;gap:3px}' +
    '#vl_rb th.c-sel,#vl_rb td.c-sel{width:30px;text-align:center;padding-left:4px;padding-right:2px;cursor:default}' +
    '#vl_rb td.c-sel input{width:16px;height:16px;accent-color:#e8b400;cursor:pointer;vertical-align:middle}' +
    '#vl_rb td.c-sel i{display:inline-block;width:4px;height:16px;border-radius:2px;margin-left:3px;vertical-align:middle}' +
    '#vl_gbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0 6px;font-size:12px;color:#aaa;max-width:100%}' +
    '#vl_gsel{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}#vl_gsel .gch{background:#202026;color:#ccc;border:1px solid #33333b;border-radius:14px;padding:4px 11px;font-size:12px;cursor:pointer}' +
    '#vl_rb,#vl_tab_board,#vl_tab_prac,#vl_tab_set{min-width:0;max-width:100%}' +
    '#vl_gbar .gch{background:#202026;color:#888;border:1px solid #33333b;border-radius:14px;padding:4px 11px;font-size:12px;cursor:pointer}' +
    '#vl_gbar .gch.on{background:#e8b400;color:#000;border-color:#e8b400;font-weight:700}' +
    '#vl_glg{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:12px;margin-bottom:4px}#vl_glg span[data-gf]{cursor:pointer;border-radius:10px;padding:1px 6px}#vl_glg span.on{background:#2a2a32;font-weight:700;color:#fff}#vl_glg span.off{opacity:.45}#vl_glg .gfh{color:#777;font-size:11px}#vl_glg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}' +
    '#vl_graphs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}' +
    '#vl_graphs .gc{flex:0 1 320px;min-width:220px;max-width:320px;background:#0f0f12;border:1px solid #24242b;border-radius:8px;padding:6px 6px 2px}' +
    '#vl_trk{margin:0 0 10px;padding:7px 9px;background:#1b1b20;border:1px solid #2a2a30;border-radius:10px;font-size:13px;color:#aaa}' +
    '#vl_trk .tb1{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#vl_trk .tb1 b{color:#e8b400}' +
    '#vl_trk input{flex:1 1 120px;min-width:90px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:5px 8px;font-size:15px}' +
    '#vl_trk button{background:#2c2c33;color:#ddd;border:1px solid #3a3a42;border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;white-space:nowrap}' +
    '#vl_trk button.go{background:#e8b400;color:#000;border-color:#e8b400;font-weight:700}#vl_trk .tog{margin-left:auto}' +
    '#vl_trk .tb2{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;align-items:center}#vl_trk .tb2 button{border-radius:14px;padding:2px 10px;font-size:12px}#vl_trk .tb2 button.cur{border-color:#e8b400;color:#e8b400}' +
    '#vl_glaps .glrow{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}#vl_glaps .glc{flex:0 0 auto;min-width:0;max-width:none;background:#0f0f12;border:1px solid #24242b;border-radius:8px;padding:6px}' +
    '#vl_glaps .glc h5{margin:0 0 4px 2px;font-size:12px;color:#ddd;display:flex;align-items:center;gap:6px}#vl_glaps .glc h5 i{width:10px;height:10px;border-radius:2px;display:inline-block}#vl_glaps .glc h5 small{margin-left:auto;color:#777;font-weight:400}' +
    '#vl_glaps .ll{max-height:none;overflow:visible}#vl_glaps .ll td{height:22px !important;box-sizing:border-box}#vl_glaps .glc h5{cursor:pointer}#vl_glaps table{width:auto;font-size:12px}#vl_glaps td,#vl_glaps th{padding:2px 6px !important;font-size:13px !important;height:auto !important;text-align:right;border-bottom:1px solid #1d1d22}#vl_glaps th{color:#888;font-size:11px;position:sticky;top:0;background:#0f0f12}' +
    '#vl_glaps .glk{margin:2px 0 8px}#vl_glaps .glc{width:fit-content}#vl_glaps .vl-ls{width:0;min-width:100%}#vl_glaps .lk,#vl_graphs .lk{font-size:11px;color:#888}' +
    '#vl_graphs .gc h5{margin:0 0 2px 2px;font-size:12px;color:#e8b400;font-weight:700;display:flex;justify-content:space-between}#vl_graphs .gc h5 small{color:#777;font-weight:400}' +
    '#vl_graphs svg{width:100%;height:auto;display:block}' +
    '#vl_cols .cr{display:flex;align-items:center;gap:8px;background:#1f1f24;border-radius:7px;padding:5px 8px;font-size:14px}' +
    '#vl_cols .cr .cl{flex:1}#vl_cols .cr.off .cl{color:#777}' +
    '#vl_cols button,#vl_panel .pb2{background:#2c2c33;color:#ddd;border:1px solid #3a3a42;border-radius:6px;padding:3px 9px;font-size:13px;cursor:pointer}' +
    '#vl_cols button:disabled{opacity:.3;cursor:default}' +
    '#vl_pcols{display:flex;flex-direction:column;gap:3px}#vl_pcols .cr{display:flex;align-items:center;gap:8px;background:#1f1f24;border-radius:7px;padding:5px 8px;font-size:14px}' +
    '#vl_pcols .cr .cl{flex:1}#vl_pcols .cr.off .cl{color:#777}#vl_pcols button{background:#2c2c33;color:#ddd;border:1px solid #3a3a42;border-radius:6px;padding:3px 9px;font-size:13px;cursor:pointer}#vl_pcols button:disabled{opacity:.3;cursor:default}' +
    '.vl-ld{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;padding:6px 2px 4px;text-align:left}' +
    '.vl-ld .ll{flex:0 0 auto;border:1px solid #26262c;border-radius:8px}.vl-ld .ll table{width:auto;font-size:13px}' +
    '.vl-ld .ll td,.vl-ld .ll th{padding:3px 8px !important;text-align:right;border-bottom:1px solid #202026}.vl-ld .ll th{color:#888;font-size:11px;position:sticky;top:0;background:#141417}' +
    '.vl-ld .lc{flex:1 1 280px;min-width:260px}.vl-ld .lc svg{width:100%;height:auto;display:block;background:#0f0f12;border:1px solid #24242b;border-radius:8px}' +
    '.vl-ld .lk{font-size:12px;color:#888;margin-top:4px}.vl-ld .lk a{color:#8ab4ff}' +
    '#vl_pres tr.psr{cursor:pointer}#vl_pres tr.psr.on td{background:#2a2614}#vl_pres tr.psr:hover td{background:#1d1d22}' +
    '#vl_pres tr.dgh td{background:#1b1b21;color:#ddd;font-weight:700;text-align:left;cursor:pointer;padding:6px 8px;border-top:1px solid #2c2c33}#vl_pres tr.dgh small{color:#999;font-weight:400;margin-left:8px}' +
    '#vl_pres tr.dgh .dgb{float:right;background:#2c2c33;color:#ddd;border:1px solid #3a3a42;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:400}' +
    '#vl_rb .c-p{text-align:center;font-weight:800;color:#fff;width:26px}#vl_rb td.lapgap{color:#ffb74d;font-weight:700}' +
    '#vl_rb td.pu,#vl_panel b.pu{color:#3ddc84;font-weight:700}#vl_rb td.pd,#vl_panel b.pd{color:#ff6b6b;font-weight:700}' +
    '#vl_rb td.c-bhd small,#vl_rb td.c-last small{font-size:.78em;font-weight:600;margin-left:3px}#vl_rb small.pu{color:#3ddc84}#vl_rb small.pd{color:#ff6b6b}' +
    '#vl_qual .vl-qbox{margin-top:10px;border:1px solid #2a2a30;border-radius:10px;overflow:hidden;background:#0f0f12;width:fit-content;max-width:100%}' +
    '#vl_qual .vl-qh{display:flex;align-items:center;gap:8px;padding:7px 12px;background:#1a1a20;cursor:pointer;flex-wrap:wrap;user-select:none;-webkit-user-select:none}#vl_qual .vl-qar{color:#888}#vl_qual .vl-qtt{color:#e8b400;font-size:14px}' +
    '#vl_qual .vl-qm{font-size:11px;font-weight:800;border-radius:10px;padding:1px 8px;color:#fff;background:#3d7bff}#vl_qual .vl-qm-points{background:#b04ad8}#vl_qual .vl-qi{color:#999;font-size:12px}' +
    '#vl_qual .vl-qb{margin-left:auto;font-size:12px;color:#ccc;border:1px solid #3a3a42;border-radius:12px;padding:1px 10px}' +
    '#vl_qual .vl-qpair{display:flex;flex-wrap:wrap;align-items:flex-start}#vl_qual .vl-qs+.vl-qs{border-left:1px solid #26262c}' +
    '#vl_qual .vl-qsh{font-size:12px;font-weight:800;color:#fff;padding:6px 10px;background:#16161b;border-top:1px solid #26262c}#vl_qual .vl-qsh small{color:#888;font-weight:400}' +
    '#vl_qual .vl-qt{display:table;border-collapse:collapse;width:auto;font-variant-numeric:tabular-nums}#vl_qual .vl-qt tr{display:table-row;float:none;opacity:1}#vl_qual .vl-qt th,#vl_qual .vl-qt td{display:table-cell;padding:5px 10px;text-align:right;white-space:nowrap;border-bottom:1px solid #1c1c21;font-size:14px;color:#e6e6ea;float:none}' +
    '#vl_qual .vl-qt th{background:#202026;color:#aaa;font-size:11px;font-weight:700}#vl_qual .vl-qt tr:nth-child(odd) td{background:#121216}#vl_qual .vl-qt .vl-qn{text-align:left}#vl_qual .vl-qt .vl-qp{text-align:center;font-weight:800}#vl_qual .vl-qt .vl-qc{text-align:center;color:#666}' +
    '#vl_qual .vl-qup{color:#3ddc84 !important;font-weight:700}#vl_qual .vl-qdn{color:#ff6b6b !important;font-weight:700}#vl_qual .vl-qw{color:#777 !important}#vl_qual td.vl-qe,#vl_qual td.vl-qe b{color:#3ddc84}#vl_qual td small{font-size:10px;margin-left:4px;color:#3ddc84}' +
    '#vl_qual tr.vl-ql td{background:#12301f !important}#vl_qual tr.vl-ql .vl-qn{color:#3ddc84;font-weight:700}#vl_qual tr.vl-qv td{background:#2a1838 !important}#vl_qual tr.vl-qv .vl-qn{color:#d27cff;font-weight:800}' +
    '#vl_qual .vl-qd{display:inline-block;width:8px;height:8px;border-radius:50%;background:#3ddc84;margin-right:6px;box-shadow:0 0 6px #3ddc84}#vl_qual .vl-qtq{color:#e8b400 !important;margin-left:2px !important;font-size:11px !important}#vl_qual .vl-qtie{color:#ffb74d !important}' +
    '#vl_bigb{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.35);border-radius:6px;color:inherit;font-size:13px;font-weight:700;padding:2px 7px;cursor:pointer;opacity:.75;align-self:center;white-space:nowrap}#vl_bigb.on{opacity:1;background:rgba(0,0,0,.5)}' +
    '#vl_big{display:none}#vl_rb.vl-bigon #vl_big{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,600px));gap:12px;padding:10px 0;align-items:start}#vl_big .bcol{display:flex;flex-direction:column;gap:8px;min-width:0}#vl_big .bcol>.vl-bc{flex:none;max-width:none;width:100%;box-sizing:border-box}#vl_rb.vl-bigon .tw,#vl_rb.vl-bigon .lgd,#vl_rb.vl-bigon #vl_gbar,#vl_rb.vl-bigon #vl_gsel,#vl_rb.vl-bigon #vl_glg,#vl_rb.vl-bigon #vl_glaps,#vl_rb.vl-bigon #vl_graphs,#vl_rb.vl-bigon #vl_ghint{display:none!important}' +
    '#vl_big .vl-bc{flex:1 1 320px;max-width:560px;background:#141418;border:1px solid #2c2c34;border-radius:14px;padding:12px 14px;box-sizing:border-box}#vl_big .vl-bc.mine{border-color:#6a5a1a}' +
    '#vl_big .bc-top{display:flex;align-items:baseline;gap:10px;min-width:0}#vl_big .bc-p{font-size:44px;font-weight:900;color:#ffd54a;line-height:1}#vl_big .bc-p small{font-size:20px;color:#bbb;margin-right:2px}' +
    '#vl_big .bc-nm{font-size:22px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#vl_big .bc-l{font-size:22px;font-weight:800;color:#ddd;white-space:nowrap}' +
    '#vl_big .bc-k{font-size:12px;color:#999;font-weight:700;letter-spacing:.5px}#vl_big .bc-main{margin:8px 0 6px}#vl_big .bc-last{font-size:64px;font-weight:900;line-height:1.05;font-variant-numeric:tabular-nums}#vl_big .bc-d{font-size:22px;font-weight:800}' +
    '#vl_big .bc-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;border-top:1px solid #2a2a30;padding-top:8px}#vl_big .bc-v{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}#vl_big .bc-v.cl{color:var(--cc)}' +
    '#vl_big .bc-none{color:#999;font-size:14px;padding:6px 2px}@media (max-width:430px){#vl_big .bc-last{font-size:56px}#vl_big .bc-v{font-size:20px}#vl_big .bc-p{font-size:38px}}' +
    '#vl_big .vl-bc.rv{border:2px solid var(--cc);box-shadow:0 0 10px var(--cc);padding:8px 12px;background:#18121a}#vl_big .rv .rv-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#fff;min-width:0}#vl_big .rv .rv-h>span:first-child{text-shadow:0 0 6px var(--cc);white-space:nowrap}' +
    '#vl_big .rv .rv-m{display:flex;align-items:baseline;gap:10px;margin-top:4px}#vl_big .rv .rv-p{font-size:20px;font-weight:900;color:#ddd}#vl_big .rv .rv-n{font-size:16px;color:#eee;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#vl_big .rv .rv-t{font-size:28px;font-weight:900;font-variant-numeric:tabular-nums}#vl_big .rv .rv-g{font-size:20px;font-weight:900;color:var(--cc)}' +
    '#vl_big .bc-q{margin:6px 0 2px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;background:#221d0c;border:1px solid #5a4a12;border-radius:10px;padding:6px 10px}#vl_big .bc-q b{font-size:26px;color:#ffd54a}#vl_big .bc-q span{font-size:15px;color:#ddd;font-weight:700}#vl_big .bc-q .up{color:#3ddc84}#vl_big .bc-q .dn{color:#ff7a7a}' +
    '@media (max-width:700px){#vl_big.two .bc-last{font-size:40px}#vl_big.two .bc-p{font-size:30px}#vl_big.two .bc-nm,#vl_big.two .bc-l{font-size:16px}#vl_big.two .bc-row{grid-template-columns:1fr 1fr}#vl_big.two .bc-v{font-size:18px}#vl_big.two .rv .rv-t{font-size:22px}#vl_big.two .rv .rv-g{font-size:15px}#vl_big.two .bc-q b{font-size:20px}#vl_big.two .bc-q span{font-size:12px}#vl_big.two .bc-d{font-size:16px}}' +
    '@media (max-width:430px){#vl_big.two .bc-last{font-size:30px}#vl_big.two .vl-bc{padding:8px}#vl_big.two .bc-v{font-size:15px}#vl_big.two .rv .rv-h{flex-wrap:wrap;gap:2px 6px}#vl_big.two .rv .rv-t{font-size:18px}}' +
    '#vl_upddot{display:none;position:absolute;top:6px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff5252;box-shadow:0 0 0 2px #111}#vl_upddot.on{display:block}' +
    '#vl_unl{display:none;background:#3a2a06;border-bottom:1px solid #6a5212;color:#ffd54a;font-weight:800;font-size:14px;padding:8px 12px;text-align:center;cursor:pointer}#vl_unl.on{display:block}' +
    '#vl_go .vl-ps{display:none}@media (max-width:430px){#vl_go .vl-pl{display:none}#vl_go .vl-ps{display:inline}#vl_go.vl-st{padding:5px 8px !important}}@media (max-width:350px){#vl_go.vl-st{padding:4px 5px !important;font-size:12px !important}}#vl_go.vl-st{border-radius:999px;padding:5px 10px;font-size:13px;font-weight:800;border:1px solid transparent}#vl_go.vl-st.on{background:#123a22 !important;color:#3ddc84 !important;border-color:#2f6b3d}#vl_go.vl-st.mu{background:#3a1a1a !important;color:#ff9a9a !important;border-color:#6b2f2f}#vl_go.vl-st.no{background:#2a2a30 !important;color:#999 !important;border-color:#444}' +
    '#vl_upd .ub{padding:6px 12px;border-radius:8px;border:1px solid #555;background:#2a2a32;color:#fff;font-size:14px;font-weight:700;cursor:pointer}#vl_upd .ub.go{background:#3ddc84;color:#06240f;border:0;font-weight:800}#vl_updi .nw{margin-top:8px;background:#16261a;border:1px solid #2f6b3d;border-radius:10px;padding:8px 10px;line-height:1.6}#vl_updi ul{margin:4px 0 6px 18px;padding:0;color:#ddd;font-size:13px}' +
    '#vl_qual .vl-qmore{display:none}#vl_panel.wide #vl_qual .vl-qbox.vl-qo{max-width:none}#vl_panel.wide #vl_qual .vl-qo .vl-qt{width:100%}' +
    '#vl_panel.wide #vl_qual .vl-qsc{max-height:var(--qh,none);overflow:auto;overscroll-behavior:contain}#vl_panel.wide #vl_qual .vl-qsc .vl-qt tr:first-child th{position:sticky;top:0;z-index:2}' +
    '#vl_panel.wide #vl_qual .vl-qsc tr.vl-qv td{position:sticky;bottom:0;z-index:1;box-shadow:inset 0 -2px 0 #b04ad8}' +
    '#vl_panel.wide #vl_qual .vl-qmore{display:block;font-size:12px;color:#9aa;padding:5px 12px;text-align:center;background:#16161b;border-top:1px solid #26262c}' +
    '#vl_panel.wide #vl_qual .vl-qo .vl-qpair{gap:12px;padding:12px}#vl_panel.wide #vl_qual .vl-qo .vl-qs{flex:1 1 auto;border:1px solid #3a3a44;border-radius:10px;overflow:hidden;background:#111115}' +
    '#vl_panel.wide #vl_qual .vl-qo .vl-qs+.vl-qs{border-left:1px solid #3a3a44}#vl_panel.wide #vl_qual .vl-qo .vl-qs .vl-qt th,#vl_panel.wide #vl_qual .vl-qo .vl-qs .vl-qt td{padding:5px 7px}' +
    '#vl_panel.wide #vl_qual .vl-qo .vl-qsh{border-top:0;font-size:13px;padding:8px 12px;border-left:4px solid #3d7bff;background:#18182a}#vl_panel.wide #vl_qual .vl-qo .vl-qs+.vl-qs .vl-qsh{border-left-color:#b04ad8;background:#22182a}#vl_panel.wide #vl_qual .vl-qo .vl-qsrc{max-width:none}' +
    '#vl_qual .vl-qfold td{border-top:1px solid #1c1c21;border-bottom:0;text-align:left}#vl_qual .vl-qfold .vl-qn{text-align:left}#vl_qual .vl-qbig{font-size:15px;color:#fff}#vl_qual .vl-qg{color:#3ddc84}' +
    '#vl_qual tr.vl-qtqr td{background:#2a250f !important}#vl_qual tr.vl-qtqr .vl-qn{color:#ffd54a;font-weight:800}#vl_qual .vl-qtqb{display:inline-block;font-size:11px;font-weight:800;color:#000;background:#e8b400;border-radius:4px;padding:0 5px;margin-right:6px}' +
    '#vl_qual td.vl-qx{color:#666 !important;text-decoration:line-through}#vl_qual .vl-qsrc{line-height:1.6;font-size:11px;color:#888;padding:6px 12px;border-top:1px solid #222;max-width:760px}' +
    '#vl_rb th.c-l,#vl_rb td.c-l{text-align:left}#vl_rb td.c-l .ln{display:inline-block;min-width:3.2em;font-weight:600;color:#e6e6ea}#vl_rb td.c-l .ps{display:inline-block;min-width:5.6em;color:#b8b8be}' +
    '#vl_rb td.c-l .lt{font:700 15px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:inline-block;min-width:4.2em}#vl_rb tr.vl-mine td.c-l .ln{color:#ffd54a}#vl_panel:not(.wide) #vl_rb td.c-l .ps{display:none}#vl_panel:not(.wide) #vl_rb td.c-l .ln{min-width:2.4em}#vl_panel:not(.wide) #vl_rb td.c-l .lt{min-width:0;font-size:14px}' +
    '#vl_rb .c-nm{text-align:left;max-width:170px;overflow:hidden;text-overflow:ellipsis;font-weight:600}' +
    '#vl_rb .c-nm small{color:#888;font-weight:400;margin-left:5px}' +
    '#vl_rb td.c-nm{cursor:pointer}#vl_rb td.c-nm .vo{font-size:.8em;margin-right:4px}' +
    '#vl_rb tbody tr.vl-mine td{background:#2b250f}#vl_rb tr.vl-mine .c-nm{color:#ffd54a}' +
    /* LiveRC's own page styles (Bootstrap: .close floats and fades, etc.) must never reach our table */
    '#vl_rb table{display:table;table-layout:auto}#vl_rb thead{display:table-header-group}#vl_rb tbody{display:table-row-group}#vl_rb tr{display:table-row;float:none;opacity:1;position:static;text-shadow:none}#vl_rb th,#vl_rb td{display:table-cell;float:none;opacity:1;text-shadow:none}' +
    '#vl_rb tbody tr.vl-new td{background:#1d4a2a}#vl_rb tbody tr.vl-new td:first-child{background-image:linear-gradient(to right,#3ddc84 0,#3ddc84 3px,transparent 3px)}' +
    '#vl_rb .pb{color:#4fc3f7;font-weight:700}#vl_rb .rf{color:#d27cff;font-weight:700}' +
    '#vl_rb .empty{padding:22px 10px;text-align:center;color:#888;font-size:13px;background:#0b0b0d}' +
    '#vl_rb.vl-cbon td.c-nm,#vl_panel #vl_rb.vl-cbon td.c-nm{padding-left:20px}#vl_rb td.c-p{position:relative;overflow:visible}' +
    '#vl_rb .vl-cbl{position:absolute;right:-13px;bottom:calc(50% + 4px);width:3px;height:calc(100% - 16px);border-radius:2px;background:#fff;box-shadow:0 0 3px var(--cc),0 0 7px var(--cc),0 0 12px var(--cc);pointer-events:none;animation:vlcbp 1.2s ease-in-out infinite alternate}' +
    '#vl_rb .vl-cbl:before{content:"";position:absolute;left:50%;top:-8px;transform:translateX(-50%);border:6px solid transparent;border-top:0;border-bottom:8px solid #fff;filter:drop-shadow(0 0 3px var(--cc)) drop-shadow(0 0 6px var(--cc))}' +
    '#vl_rb .vl-cbl:after{content:"";position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 6px var(--cc),0 0 10px var(--cc)}' +
    '@keyframes vlcbp{from{opacity:.8}to{opacity:1}}#vl_rb .lgd i.vl-cbk{width:auto;height:auto;background:none;font-style:normal;font-weight:900;color:#fff;text-shadow:0 0 3px var(--cc),0 0 7px var(--cc);margin-right:4px}' +
    '#vl_rb .lgd{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:#888;margin-top:7px}' +
    '#vl_rb .lgd i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}' +
    '#vl_panel:not(.wide) #vl_rb td{font-size:14px;padding:8px 5px}#vl_panel:not(.wide) #vl_rb .c-nm{max-width:118px}' +
    '#vl_tab_prac .pr-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:14px}' +
    '#vl_tab_prac input[type=date],#vl_pq{background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:6px 8px;font-size:15px;color-scheme:dark}' +
    '#vl_pq{width:100%;box-sizing:border-box;margin-bottom:6px}' +
    '#vl_dq{width:100%;box-sizing:border-box;margin:0 0 6px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:6px 8px;font-size:15px}' +
    '#vl_tab_prac td.dtop{color:var(--vlTop,#d27cff);font-weight:700}#vl_tab_prac td.csok{color:var(--vlCons,#4fc3f7);font-weight:700}' +
    '#vl_pgbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0 6px;font-size:12px;color:#aaa}' +
    '#vl_pgbar .gch{background:#202026;color:#888;border:1px solid #33333b;border-radius:14px;padding:4px 11px;font-size:12px;cursor:pointer}#vl_pgbar .gch.on{background:#e8b400;color:#000;border-color:#e8b400;font-weight:700}' +
    '#vl_pgraphs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}#vl_pgraphs .card{flex:1 0 300px;min-width:300px;margin-bottom:0}' +
    '#vl_tab_prac .pb{background:#2a2a30;color:#ddd;border:1px solid #3a3a42;border-radius:7px;padding:6px 10px;font-size:13px;cursor:pointer}' +
    '#vl_tab_prac .pb.pri{background:#e8b400;color:#000;border-color:#e8b400;font-weight:700}' +
    '#vl_tab_prac .pb:disabled{opacity:.5;cursor:default}' +
    '#vl_pstat{font-size:12px;color:#aaa;min-height:16px;margin-bottom:6px}#vl_pstat .bar{height:4px;background:#2a2a30;border-radius:2px;margin-top:4px;overflow:hidden}#vl_pstat .bar i{display:block;height:100%;background:#e8b400}' +
    '#vl_pdrv{display:flex;flex-direction:column;gap:5px;max-height:34vh;overflow:auto;margin-bottom:10px}' +
    '#vl_pdrv button.dch{display:grid;grid-template-columns:12px minmax(0,1fr) 150px 58px 22px;gap:8px;align-items:center;width:100%;box-sizing:border-box;text-align:left;background:#202026;color:#ccc;border:1px solid #33333b;border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer}' +
    '#vl_pdrv button.dch .tp{color:#9ab;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}#vl_pdrv button.dch small{text-align:right}' +
    '#vl_pdrv button.dch.on .tp{color:#e8d48a}' +
    '#vl_pdrv button.dch.on{background:#2a2614;color:#fff;border-color:#e8b400;font-weight:700}' +
    '#vl_pdrv .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#vl_pdrv small{color:#888;font-weight:400;white-space:nowrap}' +
    '#vl_pdrv .sw{width:10px;height:10px;border-radius:2px;flex:none}' +
    '#vl_pres .card{background:#0f0f12;border:1px solid #24242b;border-radius:10px;padding:10px;margin-bottom:10px}' +
    '#vl_pres h4{margin:0 0 8px;font-size:14px;color:#e8b400;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}#vl_pres h4 small{color:#888;font-weight:400}' +
    '#vl_pres .tw{overflow-x:auto}' +
    '#vl_pres table{width:auto;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:13px}' +
    '#vl_pres th{color:#999;font-size:11px;font-weight:700;text-align:right;padding:5px 6px;white-space:nowrap;border-bottom:1px solid #2a2a30}' +
    '#vl_pres td{text-align:right;padding:6px;white-space:nowrap;border-bottom:1px solid #1c1c21;color:#e6e6ea}' +
    '#vl_pres th:first-child,#vl_pres td:first-child{text-align:left}' +
    '#vl_pres tr.tot td{color:#fff;font-weight:700;border-top:1px solid #444}' +
    '#vl_pres .l2{white-space:nowrap;line-height:1.5}#vl_pres .l2 small{color:#888}#vl_pres .l2 .lb{font-size:10px;color:#888;margin-right:5px;border:1px solid #33333b;border-radius:4px;padding:0 4px}#vl_pres .l2.pk{color:var(--vlTop,#d27cff);font-weight:700}' +
    '#vl_pres .up{color:var(--vlUp,#3ddc84)}#vl_pres .down{color:var(--vlDown,#ff7a7a)}' +
    '#vl_pres .lg2{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;margin-bottom:4px}#vl_pres .lg2 i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}' +
    '#vl_pres svg{width:100%;height:auto;display:block}' +
    '#vl_pres details{margin-top:6px}#vl_pres summary{cursor:pointer;color:#bbb;font-size:13px}' +
    '#vl_pres a{color:#7fc8ff;text-decoration:none}' +
    '#vl_panel .sm{display:none}#vl_panel:not(.wide) .lg{display:none}#vl_panel:not(.wide) .sm{display:inline}' +
    '#vl_panel textarea{width:100%;box-sizing:border-box;background:#222;color:#fff;border:1px solid #444;border-radius:8px;padding:8px;font-size:16px}' +
    '#vl_panel .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}' +
    '#vl_panel label.ck{background:#1f1f24;border-radius:8px;padding:8px;display:flex;gap:6px;align-items:center;font-size:14px}' +
    '#vl_panel input[type=checkbox]{width:18px;height:18px;accent-color:#e8b400}' +
    '#vl_test{width:100%;padding:10px;border:0;border-radius:8px;background:#333;color:#fff;margin-top:10px;cursor:pointer;font-size:14px}' +
    '#vl_hint{font-size:12px;color:#999;margin-top:8px}' +
    '#vl_panel input.vlcol{width:40px;height:26px;padding:0;border:1px solid #444;border-radius:6px;background:#111;cursor:pointer;vertical-align:middle}' +
    '#vl_drv{display:flex;flex-direction:column;gap:5px;max-height:38vh;overflow:auto}' +
    '#vl_drv .d{background:#1f1f24;border-radius:8px;padding:7px 8px}' +
    '.vl-fv{background:none;border:0;color:#666;font-size:17px;line-height:1;cursor:pointer;padding:0 2px}.vl-fv.on{color:#e8b400}' +
    '.vl-favs{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:0 0 8px;font-size:12px;color:#aaa}.vl-favs button{background:#26220f;color:#e8d48a;border:1px solid #5c4d12;border-radius:14px;padding:3px 10px;font-size:13px;cursor:pointer}' +
    '.vl-favs button.on{background:#e8b400;color:#000;border-color:#e8b400;font-weight:700}.vl-favs button.na{opacity:.55}' +
    '#vl_tab_set .vlver{display:flex;justify-content:space-between;align-items:center;margin:0 0 10px;padding:8px 10px;background:#1b1b20;border:1px solid #2a2a30;border-radius:10px;font-size:13px;color:#bbb}#vl_tab_set .vlver b{color:#e8b400;font-size:15px}' +
    '#vl_drv .r1{display:flex;align-items:center;gap:8px}' +
    '#vl_drv .r2{display:none;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 0 26px;font-size:13px;color:#ccc}' +
    '#vl_drv .d.on .r2{display:flex}' +
    '#vl_drv .r2 label{display:flex;align-items:center;gap:4px;cursor:pointer}' +
    '#vl_drv .r2 input[type=checkbox]{width:16px;height:16px}' +
    '#vl_drv .r2 select{background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 4px;font-size:14px}' +
    '#vl_drv .r2 select:disabled{opacity:.4}' +
    '#vl_team{display:none;background:#17171b;border:1px solid #333;border-radius:10px;padding:10px 12px;margin:12px 0;font-size:16px;color:#eee}' +
    '#vl_team .tmh .now{color:#3ddc84}#vl_team .tmh{font-size:18px;color:#ffc72c;font-weight:700;margin-bottom:6px}#vl_team .tmh small{color:#bbb;font-size:15px;font-weight:400;margin-left:6px}' +
    '#vl_team .tmw{display:flex;flex-wrap:wrap;gap:6px 28px;align-items:flex-start}#vl_team details{margin:0}#vl_team summary{cursor:pointer;color:#ccc;margin:4px 0;font-size:15px}' +
    '#vl_team table.tmt{border-collapse:collapse;width:auto;background:none}#vl_team .tmt th,#vl_team .tmt td{padding:6px 10px;text-align:right;white-space:nowrap;color:#eee;background:none;font-size:16px;border:0;border-top:1px solid #2a2a30}' +
    '#vl_team .tmt th{color:#aaa;font-weight:400;font-size:14px;border-top:0}#vl_team .tmt .l{text-align:left}#vl_team .tmt .now{color:#3ddc84}#vl_team .tmt .pos{color:#ffc72c;font-weight:800;font-size:18px}' +
    '#vl_team .tmt .tot{font-weight:800;font-size:20px}#vl_team .tmt .tot2{font-weight:800;font-size:17px}#vl_team .tmb{height:8px;border-radius:4px;margin-top:3px}' +
    '#vl_team .rs{display:none;color:#aaa;font-size:14px;margin-top:2px}#vl_team .tmn{color:#aaa;font-size:14px;margin-top:6px;line-height:1.6}' +
    '#vl_team .tme{width:52px;background:#111;color:#fff;border:1px solid #555;border-radius:6px;padding:2px 4px;font-size:15px;text-align:right}' +
    '#vl_team .tmx{background:#3a1d1d;color:#ff8a8a;border:0;border-radius:6px;padding:0 6px;font-size:13px;cursor:pointer}#vl_team .tmlink{background:none;border:0;color:#ddd;text-decoration:underline;font-size:14px;cursor:pointer;padding:0}' +
    '@media(max-width:500px){#vl_team .rc{display:none}#vl_team .rs{display:block}#vl_team .tmt th,#vl_team .tmt td{padding:6px 7px}}' +
    '.tmd{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:1px;flex:none}' +
    '#vl_rb td.c-nm .tmdb{width:13px;height:13px;box-shadow:0 0 0 2px #0008;cursor:pointer}' +
    '#vl_teamset .tmrow{display:flex;align-items:center;gap:8px;margin:6px 0}#vl_teamset .tmrow input[type=text]{background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:5px 8px;font-size:16px;width:130px}' +
    '#vl_teamset input[type=color]{width:34px;height:30px;border:0;background:none;padding:0;cursor:pointer}' +
    '#vl_teamset .tmdr{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#1f1f24;border-radius:8px;padding:6px 8px;margin:5px 0;flex-wrap:wrap}' +
    '#vl_teamset #vl_tmq{flex:1;min-width:180px;background:#111;color:#fff;border:1px solid #444;border-radius:8px;padding:7px 10px;font-size:16px}' +
    '#vl_teamset .tmst{color:#aaa;font-size:14px;margin-bottom:4px}#vl_teamset .tmun{font-size:15px;white-space:nowrap}#vl_teamset .tmgh{color:#ffc72c;font-size:15px;margin:10px 0 2px}#vl_teamset .tmgh small{color:#999;font-size:13px}' +
    '#vl_teamset .tmcls{color:#999;margin-left:6px;font-size:13px}#vl_teamset .tmnow{color:#3ddc84;margin-left:6px;font-size:13px;white-space:nowrap}' +
    '#vl_teamset .tmdn{display:flex;align-items:center;flex-wrap:wrap;font-size:15px}#vl_teamset .tmchips{display:flex;gap:5px;flex-wrap:wrap}' +
    '#vl_teamset .tmchip{border:1px solid #555;background:#222;color:#ddd;border-radius:14px;padding:3px 10px;font-size:15px;white-space:nowrap;cursor:pointer}#vl_teamset .tmchip.on{color:#111;font-weight:700}#vl_teamset .tmchip.on.none{background:#888}' +
    '#vl_teamset .tmpts{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:6px 0}#vl_teamset .pt{display:inline-flex;align-items:center;gap:4px;background:#111;border:1px solid #444;border-radius:6px;padding:2px 7px;font-size:15px}' +
    '#vl_teamset .tmpt{width:44px;background:#000;color:#fff;border:1px solid #555;border-radius:4px;padding:1px 3px;font-size:15px}#vl_teamset select{max-width:100%;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px}' +
    '#vl_upd .vl-dlb{display:inline-block;text-decoration:none;background:#ffc72c;color:#111;font-weight:800;border-radius:10px;padding:10px 14px;font-size:16px;margin:6px 0}' +
    '#vl_upd .vl-dlb2{display:inline-block;text-decoration:none;background:#333;color:#ffc72c;border:0;border-radius:8px;padding:8px 12px;font-size:15px;margin-top:8px;cursor:pointer}' +
    '#vl_upd .vl-dlg{background:#1d1d24;border:1px solid #444;border-radius:10px;padding:9px 11px;margin-top:8px;font-size:15px;line-height:1.6;color:#eee}#vl_upd .vl-dls{margin:6px 0 4px;padding-left:22px}' +
    '#vl_mstrip{display:none;background:#17171b;border:1px solid #333;border-radius:10px;padding:7px 10px;margin:6px 0;font-size:15px;color:#eee;cursor:pointer}#vl_mstrip .mlink{color:#aaa;font-size:14px;white-space:nowrap}' +
    '#vl_rb tr.vl-bline td{border-bottom:2px solid #3ddc84 !important}#vl_rb .vl-bmp{color:#3ddc84;font-weight:800;margin-right:4px}' +
    '#vl_main{padding:4px 2px;font-size:16px;color:#eee}#vl_main .mchips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}#vl_main .mchip{border:1px solid #555;background:#1b1b20;border-radius:14px;padding:4px 11px;font-size:14px;color:#ddd;cursor:pointer}#vl_main .mchip.on{background:#4dabf7;color:#111;border-color:#4dabf7;font-weight:700}' +
    '#vl_main .mnote{color:#aaa;font-size:14px;line-height:1.55;margin:4px 0}#vl_main .mnote b{color:#ddd}#vl_main .mnote a{color:#8ec5ff}' +
    '#vl_main .mcard{background:#17171b;border:1px solid #333;border-radius:10px;padding:8px 10px;margin:8px 0}#vl_main .mcard.live{border-color:#3ddc84}' +
    '#vl_main .mt{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;font-weight:800;font-size:17px}#vl_main .mt small{color:#aaa;font-weight:400;font-size:14px}' +
    '#vl_main table.mt2{border-collapse:collapse;width:100%;background:none}#vl_main .mt2 td,#vl_main .mt2 th{padding:5px 6px;border:0;border-top:1px solid #26262c;font-size:15px;white-space:nowrap;color:#eee;background:none;text-align:left}' +
    '#vl_main .mt2 th{color:#aaa;font-weight:400;font-size:14px;border-top:0}#vl_main .mt2 .r{text-align:right}#vl_main .mt2 .g{color:#888;width:24px}#vl_main .mt2 tr.me td{background:#2a2033}' +
    '#vl_main .mt2 tr.emp td{color:#ff8de8;font-style:italic}#vl_main .mt2 tr.bl td{border-top:2px solid #3ddc84}#vl_main .bu{color:#3ddc84;font-weight:700}#vl_main .og{color:#ffa94d}#vl_main .ok{color:#3ddc84}#vl_main .pk{color:#ff8de8}' +
    '#vl_main .mt2 td.x{text-decoration:line-through;color:#777}#vl_main .mt2 td.big{font-size:19px;font-weight:800}' +
    '#vl_main .mgoal{background:#16261a;border:1px solid #2f6b3d;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:15px;line-height:1.6}#vl_main .mgoal small{color:#aaa}' +
    '#vl_tk{padding:4px 2px;font-size:16px;color:#eee}#vl_tk .tktop{background:#141418;border:1px solid #2a2a30;border-radius:10px;padding:8px 10px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}' +
    '#vl_tk .tktop .pb2{margin-left:auto}#vl_tk .tkfrom{width:100%;color:#999;font-size:14px}' +
    '#vl_tk #vl_tkq{width:100%;box-sizing:border-box;background:#111;border:1px solid #555;border-radius:10px;padding:9px 12px;font-size:17px;color:#fff}' +
    '#vl_tk .tkf{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}#vl_tk .tkc{border:1px solid #555;background:#1b1b20;border-radius:14px;padding:4px 11px;font-size:14px;color:#ddd;cursor:pointer}#vl_tk .tkc.on{background:#4dabf7;color:#111;border-color:#4dabf7;font-weight:700}' +
    '#vl_tk .tkgh{color:#ffc72c;font-size:15px;margin:10px 0 4px}#vl_tk .tkgh small{color:#999;font-size:13px}' +
    '#vl_tk .tkr{display:flex;gap:10px;align-items:center;padding:8px 6px;border-top:1px solid #26262c;cursor:pointer}#vl_tk .tkr:hover{background:#1b1b22}#vl_tk .tkr.cur{background:#1d2a1f}' +
    '#vl_tk .tki{width:30px;text-align:center;font-size:18px;flex:none}#vl_tk .tki small{display:block;font-size:11px}#vl_tk .tkn{flex:1;min-width:0}#vl_tk .tks{color:#888;font-size:13px}' +
    '#vl_tk .tke{color:#bbb;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#vl_tk .tkt{color:#999;font-size:13px;text-align:right;white-space:nowrap}' +
    '#vl_tk .tkst{background:none;border:0;color:#666;font-size:22px;line-height:1;cursor:pointer;padding:0}#vl_tk .tkst.on{color:#ffc72c}#vl_tk .tkhl{background:#5a4a00;color:#fff;border-radius:3px}' +
    '#vl_tk .tknote{color:#999;font-size:14px;margin-top:10px;line-height:1.6}#vl_tk .tkman{white-space:nowrap}#vl_tk #vl_tkman{width:130px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px;font-size:15px}' +
    '#vl_panel.tmode #vl_head .tab:not([data-tab=trk]),#vl_panel.tmode #vl_go,#vl_panel.tmode #vl_zm{display:none!important}' +
    '#vl_vlog{display:none;background:#16161a;border:1px solid #333;border-radius:8px;padding:8px 10px;font-size:15px;line-height:1.6;margin-top:8px;color:#ddd}' +
    '#vl_drv .vl-auto{color:#ff8de8;font-size:13px;white-space:nowrap}' +
    '#vl_drv .vl-rm{margin:6px 0 0 26px;font-size:14px;color:#aaa;display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '#vl_drv .vl-rm>*{white-space:nowrap}#vl_drv .d.on .vl-rm{display:none!important}' +
    '#vl_drv .vl-rmt{background:#2a2033;border:1px solid #6a4a80;color:#e6c8ff;border-radius:10px;padding:0 9px}' +
    '#vl_drv .d.on{background:#2a2614;outline:1px solid #e8b400}' +
    '#vl_drv .d.off .nm{color:#777}' +
    '#vl_drv .nm{flex:1;min-width:0;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#vl_drv .nm small{color:#999;margin-right:4px}' +
    '#vl_drv input.al{width:96px;flex:none;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:6px;font-size:16px}' +
    '#vl_drv .empty{color:#999;font-size:13px;padding:6px 2px}' +
    '#vl_panel .sub{font-size:13px;color:#bbb;margin:2px 0 6px;display:flex;justify-content:space-between}' +
    '#vl_panel .gap{background:#1f1f24;border-radius:8px;padding:8px;margin-bottom:6px;font-size:14px}' +
    '#vl_panel .gap label{display:block;line-height:1.7}#vl_panel .gap label>input[type=checkbox]{vertical-align:-3px;margin:0 7px 0 0}#vl_panel .gap label input:not([type=checkbox]),#vl_panel .gap label select{vertical-align:middle;margin:0 3px}' +
    '#vl_panel .gap .lim{margin:6px 0 0 24px;font-size:13px;color:#bbb;display:flex;align-items:center;gap:4px 6px;flex-wrap:wrap}#vl_panel .gap .lim label{line-height:1.5}' +
    '#vl_panel .gap select{background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px}' +
    '#vl_panel details{margin-top:8px;font-size:13px;color:#bbb}#vl_panel summary{cursor:pointer}' +
    '@media (max-width:600px){#vl_root{left:8px;right:auto;width:calc(100vw - 16px)}#vl_panel{width:auto;height:min(78vh,760px);height:min(78svh,760px)}}' +
    /* full-screen mode: the panel fills exactly the visible area (sized from visualViewport in JS) */
    '#vl_root.full{right:auto;bottom:auto}' +
    '#vl_root.full #vl_panel{width:100%;height:100%;margin:0;border-radius:0;border:0;box-shadow:none}' +
    '#vl_root.full #vl_fab{display:none}#vl_root.full #vl_body{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}' +
    '#vl_root.full #vl_head{padding-top:max(6px,env(safe-area-inset-top))}#vl_root.full #vl_body{padding-bottom:max(14px,env(safe-area-inset-bottom))}' +
    'html.vl-lock,html.vl-lock body{overflow:hidden!important;overscroll-behavior:none!important}' +
    '@media (max-width:430px){#vl_head .tab{padding:11px 6px 8px;font-size:14px;letter-spacing:-.3px}#vl_go{padding:7px 9px}#vl_fs{padding:0 3px}#vl_min{padding:6px 2px 6px 6px}}' +
    '#vl_net{display:inline-flex;align-items:center;padding:0 4px 0 8px}#vl_net svg{width:22px;height:22px}' +
    '#vl_fs{background:none;border:0;color:#bbb;font-size:18px;cursor:pointer;padding:0 6px;line-height:1}';
  document.head.appendChild(css);

  /* ---------- UI ---------- */
  var root = document.createElement('div');
  root.id = 'vl_root';
  root.setAttribute('data-vl-ver', String(VER));
  root.innerHTML =
    '<div id="vl_panel">' +
    '<div id="vl_head"><button class="tab" data-tab="board">🏁<span class="vl-tn"> 레이스</span><span class="vl-tl"> 보드</span></button><button class="tab" data-tab="main" id="vl_tmain" style="display:none">🏆<span class="vl-tn"> 메인</span></button><button class="tab" data-tab="prac">📊<span class="vl-tn"> 연습</span><span class="vl-tl"> 기록</span></button><button class="tab" data-tab="trk" title="다른 트랙으로 — LiveRC 트랙 목록에서 검색">📍<span class="vl-tn"> 트랙</span></button><button class="tab" data-tab="set">⚙<span class="vl-tn"> 설정</span><i id="vl_upddot" title="새 버전이 있어요 — 설정 › 일반 › 업데이트"></i></button>' +
    '<span id="vl_zm" title="화면 확대/축소"><i>🔍</i><button data-zs="-1" title="작게">−</button><button id="vl_zv" title="눌러서 퍼센트 고르기">100%</button><button data-zs="1" title="크게">+</button><span id="vl_zl"></span></span>' +
    '<button id="vl_go"></button><span id="vl_net" style="display:none"></span><button id="vl_fs" title="전체 화면"></button><span id="vl_min" title="접기">─</span></div>' +
    '<div id="vl_unl">🔊 화면을 한 번 누르면 음성이 켜져요</div>' +
    '<div id="vl_warn" style="display:none;background:#5a1414;color:#ffd2d2;font-size:12px;line-height:1.45;padding:8px 12px;border-bottom:1px solid #7a2020"></div>' +
    '<div id="vl_body">' +
    '<div id="vl_trk"></div>' +
    '<div id="vl_tab_board"><div id="vl_rb">' +
    '<div class="hdr" id="vl_hdr"><div style="min-width:0"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div class="cls" id="vl_cls">LIVE</div>' +
    '<div style="white-space:nowrap"><span class="sub2 vl-hl vl-hl-rem">남은 시간</span><span class="clk" id="vl_rem">0:00</span></div>' +
    '<div id="vl_fuel"><button id="vl_fbtn" title="주유 타이머 켜기/끄기">⛽</button><span id="vl_fbox"></span><button id="vl_freset" title="수동 리셋 — 지금 주유 (다음 라인 통과 때 피트 타임 계산)">↺</button></div><button id="vl_bigb" title="내 선수 크게 보기 ↔ 표 보기">👤 크게</button></div><div class="sub2" id="vl_rnd"></div></div>' +
    '<div style="text-align:right" id="vl_elab"><div class="sub2 vl-hl vl-hl-ela">경과 시간</div><div class="clk" id="vl_clk"></div></div></div>' +
    '<div id="vl_mstrip"></div><div id="vl_big"></div><div class="tw"><table><thead id="vl_rbh"></thead><tbody id="vl_rbb"></tbody></table></div>' +
    '<div id="vl_qual"></div>' +
    '<div class="lgd"><span id="vl_lgfin" style="display:none">🏁 완주 (남은 시간 0 뒤 통과)</span><span><i style="background:#2b250f;outline:1px solid #ffd54a"></i>안내 중인 선수</span><span><i style="background:#17351f"></i>방금 통과</span><span><b class="pb">하늘색</b> 개인 베스트</span><span><b class="rf">보라</b> 레이스 최고</span><span><b style="color:#ffb74d">+1L</b> Behind 랩 차이</span><span id="vl_lgcl"><i id="vl_lgclc" class="vl-cbk">↑</i>접전 (뒤 선수 → 앞 선수, 설정한 초 이내)</span><span id="vl_lgpc"></span><span id="vl_lgbd">Behind <b class="pu">줄어듦</b>/<b class="pd">늘어남</b> (변한 초)</span></div>' +
    '<div id="vl_team"></div>' +
    '<div id="vl_gbar"><span>그래프</span><button class="gch" data-g="pos">순위</button><button class="gch" data-g="lap">랩타임</button><button class="gch" data-g="avg">평균 랩</button><button class="gch" data-g="list">랩타임 표</button>' +
    '<span id="vl_ghint" style="margin-left:4px"></span></div>' +
    '<div id="vl_gsel"><button class="gch" id="vl_gall">전체 선택</button><button class="gch" id="vl_gclr">선택 해제</button></div>' +
    '<div id="vl_glg"></div><div id="vl_glaps"></div><div id="vl_graphs"></div>' +
    '</div></div>' +
    '<div id="vl_tab_main" style="display:none"><div id="vl_main"></div></div>' +
    '<div id="vl_tab_trk" style="display:none"><div id="vl_tk"></div></div>' +
    '<div id="vl_tab_set">' +
    '<div class="vlver"><span><b>VoiceLab</b> v' + VERSION + '</span><span>Made by <b>NAMO</b></span></div>' +
    '<div class="gtools"><button class="pb2" id="vl_gopen">모두 펼치기</button><button class="pb2" id="vl_gclose">모두 접기</button></div>' +
    '<div class="sec grp" data-g="voice"><div class="gh"><span class="ar"></span><span class="sech">🗣 보이스 알림</span><span class="gs" id="vl_gs_voice"></span><label class="gsw" title="이 그룹 기능 전체 켜기/끄기"><input type="checkbox" id="vl_voiceOn"><i></i></label></div><div class="gb">' +
    '<div class="sub"><span>안내할 선수 체크 · 불러줄 이름</span><span id="vl_cnt"></span></div>' +
    '<input id="vl_dq" type="search" placeholder="선수 검색 — 이름·초성(ㄱㄴㅎ)·부를 이름">' +
    '<div class="vl-favs" id="vl_dfav"></div>' +
    '<div id="vl_drv"></div>' +
    '<details><summary>이름/번호로 직접 추가</summary>' +
    '<div style="margin:4px 0">목록에 없는 선수는 이름 일부나 번호로 (쉼표 구분 · <b>번호=호칭</b>)</div>' +
    '<textarea id="vl_t" rows="2" placeholder="예: 1234=남호, 12"></textarea></details>' +
    '<div class="sub"><span>읽어 줄 내용</span></div>' +
    '<div class="grid">' +
    '<label class="ck"><input type="checkbox" id="vl_all">전체 선수</label>' +
    '<label class="ck"><input type="checkbox" id="vl_lap">랩 수</label>' +
    '<label class="ck"><input type="checkbox" id="vl_time">랩타임</label>' +
    '<label class="ck"><input type="checkbox" id="vl_best">베스트 알림</label>' +
    '<label class="ck" title="랩타임 뒤에 베스트와의 차이 · 베스트를 새로 내면 얼마나 줄었는지"><input type="checkbox" id="vl_delta">베스트와 차이 <small style="color:#999">(+0.4)</small></label>' +
    '</div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_nmulti">이름은 <b>안내 선수가 2명 이상</b> 함께 달릴 때만 부르기</label>' +
    '<div class="lim"><span style="color:#999">1명이면 이름 없이 “23.4” · 2명 이상이면 “남호, 23.4” · 선수 줄의 ‘이름’ 체크를 끈 선수는 항상 안 부름 · 알림음을 고른 선수는 1명이어도 🔔 먼저</span></div></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_selkeep">선수를 <b>해제해도 알림음·부를 이름 기억</b></label>' +
    '<div class="lim"><span style="color:#999">다시 체크하면 같은 알림음으로 · 끄면 해제할 때 그 선수 설정을 지움 · 기억된 선수는 목록에 🔔 표시</span></div>' +
    '<label style="margin-top:6px"><input type="checkbox" id="vl_toneauto">새로 체크한 선수에게 <b>안 겹치는 알림음 자동 지정</b></label>' +
    '<div class="lim"><span style="color:#999">2명 이상 함께 안내할 때 소리만 듣고도 누구인지 구분 · 기억된 알림음이 있으면 그걸 씀</span></div></div>' +
    '<div class="sub"><span>연습 주행 시간</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_run">주행 시간이 <input type="number" id="vl_rmin" min="0" max="120" style="width:56px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">분 <input type="number" id="vl_rsec" min="0" max="59" style="width:56px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 지나면 알림</label>' +
    '<div class="lim"><label><input type="checkbox" id="vl_runsum">요약도 함께 <small style="color:#999">(“베스트 22.9초, 평균 23.4초, 0.5초 이내 70퍼센트”)</small></label></div>' +
    '<div class="lim" style="flex-wrap:wrap">알림 문구 <input type="text" id="vl_rword" style="width:120px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px"></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>안내 중인 선수의 경과 시간 기준, 그 시간이 지난 뒤 첫 라인 통과 때 한 번 · Open Practice에서만 (예선·결승 등 경기에서는 알리지 않음)</div></details></div>' +
    '<div class="sub"><span>목소리</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:8px;flex-wrap:wrap">음성<select id="vl_voice" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="def">기본 (현재 음성)</option><option value="f1">여성 1 · 또렷하게</option><option value="f2">여성 2 · 밝고 높게</option><option value="f3">여성 3 · 차분하게</option></select><span id="vl_vinfo" style="color:#999;font-size:12px"></span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:14px">속도<input type="range" id="vl_rate" min="0.6" max="2" step="0.1" style="flex:1;accent-color:#e8b400"><span id="vl_rv" style="width:28px"></span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:8px">랩타임 소수점<select id="vl_dec" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="0">0자리 (23초)</option><option value="1">1자리 (23.6초)</option><option value="2">2자리 (23.69초)</option><option value="3">3자리 (23.698초)</option></select><span style="color:#999;font-size:12px">아래는 버림</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:8px">앞뒤 여유<select id="vl_pad" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="0">없음</option><option value="1">짧게</option><option value="2">보통</option><option value="3">길게</option></select><span style="color:#999;font-size:12px">앞뒤가 잘리면 늘리세요</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:14px;margin:4px 0">알림음 크기<input type="range" id="vl_tvol" min="20" max="100" step="5" style="flex:1;accent-color:#e8b400"><b id="vl_tvv" style="width:44px"></b><button class="pb2" id="vl_tvt" title="알림음 들어 보기">▶</button></div>' +
    '<div class="lim" style="margin:0 0 8px"><span style="color:#999">음성 크기는 그대로 · 알림음(띵·선수별 소리·출발 총성)만</span></div>' +
    '<div class="sub"><span>여러 명이 함께 지나갈 때</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_vmerge">1.5초 안에 함께 지나가면 <b>한 문장으로 묶어서</b></label>' +
    '<div class="lim"><span style="color:#999">“남호 23.4, 형준 23.6” · 끄면 한 명씩 차례로(앞 안내가 끝난 뒤 다음)</span></div>' +
    '<label style="margin-top:6px"><input type="checkbox" id="vl_vlatest">안내가 밀리면 <b>지난 랩은 건너뛰고 최신 랩만</b></label>' +
    '<div class="lim"><span style="color:#999">같은 선수의 안내가 기다리는 중에 다음 랩이 오면 새 랩으로 바꿈</span></div></div>' +
    '<button id="vl_test">🗣 음성 테스트</button>' +
    '<div id="vl_hint"></div>' +
    '<div id="vl_vlog" class="vl-vlog"></div>' +
    '</div></div>' +
    '<div class="sec grp" data-g="race"><div class="gh"><span class="ar"></span><span class="sech">🏎 레이스 기능</span><span class="gs" id="vl_gs_race"></span><label class="gsw" title="이 그룹 기능 전체 켜기/끄기"><input type="checkbox" id="vl_raceOn"><i></i></label></div><div class="gb">' +
    '<div class="sub"><span>Behind · 접전</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_bhdc"><span>Behind 변화 표시 — 앞차와 차이가 줄면 <b class="pu">초록</b>, 늘면 <b class="pd">빨강</b>, 괄호 안에 변한 초</span></label></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_cl">Behind가 <input type="number" id="vl_cls2" min="0.1" max="30" step="0.1" style="width:64px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 이내면 쫓는 선수 → 앞 선수로 네온 화살표 표시</label>' +
    '<div class="lim">색 <input type="color" id="vl_clc" style="width:44px;height:28px;padding:0;border:1px solid #444;border-radius:6px;background:#111;cursor:pointer"><span style="color:#999">기본 네온 핑크 · Behind 숫자도 이 색 · 같은 랩일 때만 · P 순서로 볼 때 화살표</span></div>' +
    '<div class="lim">↳ 1위가 <input type="number" id="vl_cla" min="0" max="99" step="1" style="width:60px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">랩을 지난 뒤부터 <span style="color:#999">(출발 직후엔 모두 붙어 있어서) · Open Practice에서는 Behind 칸·접전 색·차이 안내 음성 모두 꺼짐</span></div></div>' +
    '<div class="sub"><span>LAPS (랩 수 칸)</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_lpass">LAPS에 통과 시각 표시 <small style="color:#999">(그 랩을 지난 레이스 시간 · Open Practice와 좁은 화면에서는 자동으로 숨김)</small></label></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_llive">LAPS에 진행 중 랩 시간 표시 <small style="color:#999">(예: 12랩 0:14.2 · 라인을 지난 뒤 흐른 시간)</small></label>' +
    '<div class="lim" style="flex-wrap:wrap">평소 <input type="color" id="vl_lvok" class="vlcol"> · 베스트 <input type="number" id="vl_lvs" min="0" max="30" step="0.1" style="width:60px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 전부터 <input type="color" id="vl_lvnr" class="vlcol"> · 베스트를 넘으면 <input type="color" id="vl_lvov" class="vlcol"></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>그 선수의 베스트 랩(F:) 기준 · 페이지를 연 뒤 첫 통과 전에는 “-” · 레이스가 끝나면 멈춤 · 끄면 LAPS는 숫자만</div></details></div>' +
    '<div class="sub"><span>🏁 레이스 종료</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_fin">남은 시간이 끝난 뒤 라인을 통과한 선수 이름 앞에 🏁 표시</label>' +
    '<div class="lim"><label><input type="checkbox" id="vl_finsay">안내 선수가 끝나면 음성 알림</label></div>' +
    '<div class="lim">알림 문구 <input type="text" id="vl_finw" style="width:140px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px"> <label><input type="checkbox" id="vl_finpos">최종 순위도 함께 <small style="color:#999">(“레이스 종료, 3등”)</small></label></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>남은 시간이 0 아래(마이너스)로 내려간 뒤 처음 라인을 통과하면 그 선수는 끝 · 마지막 랩 안내 뒤에 이어서 말하고 그 뒤 랩은 안내하지 않음 · 끝난 선수끼리는 접전 화살표 없음 · Open Practice에서는 표시·알림 없음</div></details></div>' +
    '<div class="sub"><span>🏆 메인전</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_msay">메인전 음성 — 범프권 진입·밖, “A메인 진출 · N번 그리드”, 전동 “종합 N위”</label>' +
    '<div class="lim"><span style="color:#999">오늘 대회에 메인 출전표(Main Events)가 있으면 🏆 메인 탭이 생겨요</span></div></div>' +
    '<div class="sub"><span>🔫 레이스 출발</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_sgun">레이스가 출발하면 <b>출발 총성</b> 한 번</label>' +
    '<div class="lim"><span style="color:#999">남은 시간이 처음 줄기 시작할 때 · 안내 선수가 달리는 경기에서만 · Open Practice 제외</span> <button class="pb2" id="vl_sgunt">▶ 듣기</button></div></div>' +
    '<div class="sub"><span>⏱ 남은 시간 알림</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_remon">남은 시간을 음성으로 알림 <small style="color:#999">(안내 선수가 달리는 경기에서만 · Open Practice 제외)</small></label>' +
    '<div class="lim" id="vl_remat">' + [180, 120, 60, 30, 10].map(function (t) { return '<label><input type="checkbox" data-rt="' + t + '">' + (t >= 60 ? t / 60 + '분' : t + '초') + '</label>'; }).join(' ') + '</div></div>' +
    '<div class="sub"><span>차이 안내 (음성)</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_gl">1위일 때 → 2위와의 차이</label>' +
    '<div class="lim">최대 <select id="vl_gln"><option value="0">같은 랩만</option><option value="1">1랩</option><option value="2">2랩</option><option value="3">3랩</option><option value="4">4랩</option><option value="5">5랩</option></select> 차이까지 안내</div></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_ga">2위 이하일 때 → 앞차와의 차이</label>' +
    '<div class="lim">최대 <select id="vl_gan"><option value="0">같은 랩만</option><option value="1">1랩</option><option value="2">2랩</option><option value="3">3랩</option><option value="4">4랩</option><option value="5">5랩</option></select> 차이까지 안내</div></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_gbh">뒤차가 <input type="number" id="vl_gbs" min="0.1" max="10" step="0.1" style="width:60px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 안으로 붙으면 “뒤차 0.4초”</label></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_posc">순위가 바뀐 랩에 “3등으로 올라감 / 내려감”</label></div>' +
    '<div class="sub"><span>앞차 통과 알림음</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_ding"><span>안내 중인 선수의 <b>앞차</b>가 라인을 통과하면 알림음</span></label>' +
    '<div class="lim">소리 <select id="vl_tone" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px">' + toneOpts() + '</select>' +
    '<button id="vl_dingt" style="background:#333;color:#fff;border:0;border-radius:6px;padding:5px 10px;cursor:pointer">🔔 소리 테스트</button><span style="color:#999">안내 중에만 울립니다</span></div></div>' +
    '<div class="sub" style="margin-top:12px"><span>주유 타이머 · 피트 타임</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_fon">주유 타이머 사용 <small style="color:#999">(레이스 보드 ⛽ 버튼으로도 켜고 끔)</small></label>' +
    '<div class="lim" style="flex-wrap:wrap">주유 시간 <input type="number" id="vl_fmin" min="0" max="60" style="width:56px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">분 <input type="number" id="vl_fsec" min="0" max="59" style="width:56px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초</div>' +
    '<div class="lim" style="flex-wrap:wrap">알림 문구 <input type="text" id="vl_pword" style="width:120px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px"><span style="color:#999">2바퀴 뒤 남은 주유 시간이 마이너스가 될 것 같으면 알림</span></div>' +
    '<div class="lim" style="flex-wrap:wrap">목표 피트 타임 <input type="number" id="vl_ptgt" min="1" max="120" step="0.5" style="width:56px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 · 이내 <input type="color" id="vl_pfast" class="vlcol"> 넘으면 <input type="color" id="vl_pslow" class="vlcol"></div>' +
    '<div class="lim" style="flex-wrap:wrap">폰더 라인 위치 <select id="vl_fline" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px;max-width:100%"><option value="0">피트보다 앞 — 라인을 지나서 피트로 들어감</option><option value="1">피트보다 뒤 — 주유하고 나오면서 바로 라인 통과</option></select></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>안내 중인 선수의 남은 주유 시간을 레이스 보드 남은 시간 옆에 줄여 가며 보여줍니다(0초 아래는 마이너스). <b>피트보다 앞</b>: 알림 뒤 라인 통과 = 주유 시작, 그다음 통과 = 주유 끝 — 그 랩 − 보통 랩 = 피트 타임, 주유 시간에서 (그 랩 − 피트 타임)을 뺀 값부터 다시 줄어듦. <b>피트보다 뒤</b>: 알림 뒤 첫 통과 랩에 피트가 들어 있음 — 그 랩 − 보통 랩 = 피트 타임, 주유 시간 그대로 다시 시작. ↺ 버튼 = 지금 주유(수동 리셋), 다음 통과 때 피트 타임 계산</div></details></div>' +
    '<div class="sub"><span>🏆 예선 순위</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_qon">예선 레이스에서 레이스 보드 아래 예선 순위 표시 <small style="color:#999">(LiveRC 결과 + 지금 레이스 페이스로 예상)</small></label>' +
    '<div class="lim" style="flex-wrap:wrap">TQ·순위 방식 <select id="vl_qmode" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px;max-width:100%"><option value="best">베스트 랩/시간 — 모든 예선 중 가장 좋은 랩/시간</option><option value="points">포인트 — 대회 규칙 자동(그 전엔 1등 0 · 2등 2 · 3등 3 …, 적은 순)</option></select></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div><b>베스트 랩/시간</b>: 모든 예선 라운드 중 각자 가장 좋은 기록(랩 많은 순 → 시간 짧은 순)으로 순위. <b>포인트</b>: 라운드마다 그 클래스 모든 선수를 랩/시간으로 줄 세워 등수별 포인트, 합계로 순위 · 동점이면 모든 예선 중 최고 랩/시간. 1라운드 결과가 올라오면 LiveRC의 이 대회 “Qual Points” 표에서 등수별 포인트, 많은/적은 쪽이 이기는지, 좋은 N라운드만 합산하는지를 읽어 자동으로 적용(그 전엔 기본 1등 0 · 2등 2 · 3등 3 … 적은 순). 지금 레이스 중인 선수는 LiveRC 페이스(예상 랩/시간)로 넣어 랩마다 다시 계산. 결과는 이 트랙 LiveRC 결과 페이지(오늘 대회)에서 1분마다 읽음 · 예선(Qualifier) 레이스에서만 보임</div></details></div>' +
    '</div></div>' +
    '<div class="sec grp" data-g="team"><div class="gh"><span class="ar"></span><span class="sech">👥 팀전</span><span class="gs" id="vl_gs_team"></span><label class="gsw" title="팀전 켜기/끄기"><input type="checkbox" id="vl_teamOn"><i></i></label></div><div class="gb">' +
    '<div id="vl_teamset"></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>팀을 2개 이상 만들고 선수를 팀에 넣으면, 레이스가 끝날 때(🏁 남은 시간 0 뒤 모두 통과, 또는 다음 레이스 시작) 최종 순위로 포인트를 매겨 팀 점수(팀원 전원 합계)를 쌓습니다. 레이스 중에는 지금 순위로 예상 점수를 보여 줍니다. 기록은 이 기기에 저장됩니다.</div></details>' +
    '</div></div>' +
    '<div class="sec grp" data-g="board"><div class="gh"><span class="ar"></span><span class="sech">🏁 레이스 보드 화면</span><span class="gs" id="vl_gs_board"></span></div><div class="gb">' +
    '<div class="sub"><span>표시 항목 · 순서</span></div>' +
    '<div style="font-size:12px;color:#999;margin:-2px 0 6px">체크 = 표시 · ▲▼ = 왼쪽/오른쪽으로 옮기기</div>' +
    '<div id="vl_cols"></div>' +
    '<div style="display:flex;gap:6px;margin:6px 0 10px"><button class="pb2" id="vl_colreset">기본 순서로</button></div>' +
    '<div class="sub"><span>색 표시</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_pcol"><span>변화 색 표시 — 빨라지면 <b class="pu">초록</b>, 느려지면 <b class="pd">빨강</b></span></label>' +
    '<div class="lim"><span style="white-space:nowrap">기준</span> <select id="vl_tsrc" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="pace">Pace (예상 랩 수/시간)</option><option value="avg">평균 랩 (Avg Lap)</option><option value="best">베스트 랩 차이 (Last Lap)</option></select><span style="color:#999" id="vl_tsrch"></span></div></div>' +
    '<div class="sub"><span>평균 랩 · 그래프</span></div>' +
    '<div class="gap"><div class="lim" style="margin:0">평균 랩 계산 <select id="vl_avgm" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="top10">10랩까지 전체 평균 · 이후 빠른 10랩 평균</option><option value="site">LiveRC 값 그대로</option></select></div>' +
    '<div class="lim">크게 다른 랩 제외 <select id="vl_avgo" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="10">보통 랩과 10% 넘게 차이</option><option value="15">15% 넘게 차이</option><option value="20">20% 넘게 차이</option><option value="30">30% 넘게 차이</option><option value="0">제외 안 함</option></select></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>피트 아웃·사고·컷처럼 보통 랩(중앙값)과 크게 다른 랩은 빼고 계산합니다. 시작 전 랩을 모르면 아는 랩 중 빠른 10랩(10랩 이하면 LiveRC 값)을 씁니다</div></details></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_gbf"><span>그래프에 시작 전 기록도 넣기 — 연습 세션은 LiveRC 연습 기록에서 이전 랩을 불러오고, 새로고침해도 같은 세션 기록을 이어서 그립니다</span></label></div>' +
    '<div class="sub"><span>그래프 자동 선택</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_gallp"><span><b>Open Practice</b>에서는 코스에 나온 선수를 <b>모두</b> 그래프에 자동 선택</span></label>' +
    '<div class="lim"><span style="color:#999">끄면 직접 체크한 선수만 · 레이스(예선·결승)는 원래 자동 선택 없음</span></div>' +
    '<label style="margin-top:6px"><input type="checkbox" id="vl_gvoice"><span><b>🔊 보이스 알림 선수</b>는 그래프에 자동 선택 <small style="color:#999">(연습·레이스 모두)</small></span></label>' +
    '<div class="lim"><span style="color:#999">코스에 나오면 자동으로 체크 · 안내를 끄면 자동으로 넣었던 체크도 빠짐 · 직접 체크를 끄면 그 세션 동안은 다시 넣지 않음</span></div>' +
    '<label style="margin-top:6px"><input type="checkbox" id="vl_gvbold"><span>그래프에서 🔊 선수 선을 <b>굵게</b>, 맨 앞에</span></label></div>' +
    '</div></div>' +
    '<div class="sec grp" data-g="prac"><div class="gh"><span class="ar"></span><span class="sech">📊 연습</span><span class="gs" id="vl_gs_prac"></span></div><div class="gb">' +
    '<div class="sub" style="margin-top:12px"><span>세션 목록 — 표시 항목 · 순서</span></div>' +
    '<div style="font-size:12px;color:#999;margin:-2px 0 6px">체크 = 표시 · ▲▼ = 왼쪽/오른쪽으로 옮기기</div>' +
    '<div id="vl_pcols"></div>' +
    '<div style="display:flex;gap:6px;margin:6px 0 10px"><button class="pb2" id="vl_pcolreset">기본 순서로</button></div>' +
    '<div class="gap"><div class="lim" style="margin:0;flex-wrap:wrap">예상 기록 시간 <input type="number" id="vl_pjm" min="1" max="60" step="1" style="width:60px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">분</div>' +
    '<div class="lim">제외할 랩 <select id="vl_pjo" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px;font-size:15px"><option value="0">* 표시(무효) 랩만</option><option value="10">+ 보통 랩과 10% 넘게 다른 랩</option><option value="15">+ 보통 랩과 15% 넘게 다른 랩</option><option value="20">+ 보통 랩과 20% 넘게 다른 랩</option><option value="30">+ 보통 랩과 30% 넘게 다른 랩</option></select></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>세션 처음부터 레이스처럼 랩을 순서대로 더해, 이 시간 동안 몇 랩을 몇 분 몇 초에 마치는지 계산합니다(시간이 지난 뒤 라인을 넘는 랩까지, 그 뒤 랩은 쓰지 않음). LiveRC가 * 표시한 무효 랩은 빼고, 원하면 보통 랩(중앙값)과 크게 다른 랩(피트 아웃·사고 등)도 뺍니다. 세션이 이 시간보다 짧으면 그 랩들의 평균으로 추정해 ≈를 붙입니다</div></details></div>' +
    '<div class="sub" style="margin-top:12px"><span>Consistency</span></div>' +
    '<div class="gap"><label><input type="checkbox" id="vl_cson">세션 목록에서 Consistency가 <input type="number" id="vl_csp" min="0" max="100" step="1" style="width:60px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">% 이상이면 색으로 표시</label>' +
    '<div class="lim">색 <input type="color" id="vl_csc" class="vlcol"></div></div>' +
    '<div class="sub"><span>요약 · 세션 목록 색</span></div>' +
    '<div class="gap"><div class="lim" style="margin:0;flex-wrap:wrap">빨라짐 <input type="color" id="vl_pcu" class="vlcol"> 느려짐 <input type="color" id="vl_pcd" class="vlcol"> 그날 가장 빠른 기록 <input type="color" id="vl_pct" class="vlcol">' +
    '<button class="pb2" id="vl_pcreset">기본 색으로</button></div><div style="color:#999;font-size:12px;margin-top:4px">요약의 변화(▲ 빨라짐 · ▼ 느려짐)와 세션 목록의 그날 최고 기록에 쓰입니다</div></div>' +
    '</div></div>' +
    '<div class="sec grp" data-g="color"><div class="gh"><span class="ar"></span><span class="sech">🎨 랩타임 색</span><span class="gs" id="vl_gs_color"></span></div><div class="gb">' +
    '<div class="gap"><div class="lim" style="margin:0;flex-wrap:wrap">베스트와 차이 <input type="number" id="vl_ldev" min="0.05" max="10" step="0.05" style="width:70px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 6px;font-size:15px">초 이하 <input type="color" id="vl_lnear" class="vlcol"> 그보다 크면 <input type="color" id="vl_lfar" class="vlcol"> 베스트 <input type="color" id="vl_lbest" class="vlcol"></div>' +
    '<div style="color:#999;font-size:12px;margin-top:4px">레이스 보드 랩타임 표 · 세션 랩타임 · PC 앱 저장된 기록에 공통</div></div>' +
    '</div></div>' +
    '<div class="sec grp" data-g="gen"><div class="gh"><span class="ar"></span><span class="sech">⚙ 일반</span><span class="gs" id="vl_gs_gen"></span></div><div class="gb">' +
    '<div class="gap" id="vl_upd"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:15px">🔄 업데이트</b><span style="color:#bbb" id="vl_updv"></span><button class="ub" id="vl_updb" style="margin-left:auto">업데이트 확인</button></div><div id="vl_updi"></div>' +
    '<div style="margin-top:6px;color:#999;font-size:12px">하루 한 번 자동으로 확인하고, 새 버전이 있으면 ⚙ 설정 탭에 빨간 점 · Tampermonkey 자동 업데이트도 그대로</div></div>' +
    '<div class="grid"><label class="ck" style="grid-column:1/3"><input type="checkbox" id="vl_wake">화면 꺼짐 방지 (휴대폰)</label>' +
    '<label class="ck" style="grid-column:1/3"><input type="checkbox" id="vl_trkshow">트랙 이동 줄 표시 (레이스 보드 · 연습 기록 위)</label>' +
    '<label class="ck" style="grid-column:1/3"><input type="checkbox" id="vl_afit"><span>넓은 화면에서 표를 화면 폭에 맞춰 크게 <small style="color:#999">(PC·아이패드, 최대 1.5배)</small></span></label></div>' +
    '<div class="sub"><span>☁ 구글 드라이브 동기화</span><span id="vl_sdot"></span></div>' +
    '<div class="gap"><div class="lim" style="margin:0;flex-wrap:wrap">웹 앱 URL <input type="url" id="vl_surl" placeholder="https://script.google.com/macros/s/…/exec" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:5px 8px;font-size:14px;flex:1;min-width:200px"></div>' +
    '<div class="lim" style="flex-wrap:wrap">비밀 단어 <input type="text" id="vl_skey" placeholder="(넣었을 때만)" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:5px 8px;font-size:14px;width:130px"><button class="pb2" id="vl_stest">연결 확인</button><button class="pb2" id="vl_snow">지금 동기화</button></div>' +
    '<div class="lim" style="flex-wrap:wrap"><button class="pb2" id="vl_sdown">⬇ 드라이브 설정 받기</button><button class="pb2" id="vl_sup">⬆ 이 기기 설정 올리기</button><button class="pb2" id="vl_sprev" style="display:none">↩ 받기 전 설정으로</button></div>' +
    '<div id="vl_sst" style="font-size:14px;color:#aaa;margin-top:6px;line-height:1.5"></div>' +
    '<details class="inf"><summary>ⓘ 설명</summary><div>웹(휴대폰·PC 브라우저)과 PC 앱이 같은 구글 드라이브 폴더에 <b>설정</b>(선수 선택·즐겨찾기·표시 항목·색 등)과 <b>기록</b>(레이스 랩 기록·연습 기록 CSV)을 저장해 함께 씁니다. 설정은 가장 나중에 바꾼 쪽이 다른 기기에 적용되고(열 때 확인), 기록은 같은 랩·같은 세션이 겹치지 않게 합쳐집니다. 처음 한 번 구글 계정에 “VoiceLab 동기화 스크립트”를 설치하고 나온 웹 앱 URL을 여기에 붙여 넣으세요 — 설치 방법은 보이스랩 설치 페이지의 “구글 드라이브 동기화” 안내. 기기·브라우저마다 한 번씩 넣으면 되고, 화면 위 트랙 이동 줄로 다른 트랙에 가면 함께 넘어갑니다. 인터넷이 안 될 때 생긴 기록은 모아 두었다가 연결되면 올립니다. 화면 상태(열린 탭·전체 화면)는 기기마다 따로입니다</div></details></div>' +
    '<div class="sub"><span>설정 파일</span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pb2" id="vl_cfgexp" style="padding:7px 12px;font-size:14px">⬇ 설정 내보내기 (CSV)</button><button class="pb2" id="vl_cfgimp" style="padding:7px 12px;font-size:14px">⬆ 설정 가져오기 (CSV)</button></div>' +
    '<div id="vl_cfgmsg" style="color:#999;font-size:12px;margin-top:6px">선수 선택·부를 이름·알림음·표시 항목·색 등 모든 설정을 CSV 파일로 저장하거나 불러옵니다</div>' +
    '</div></div>' +
    '</div>' +
    '<div id="vl_tab_prac">' +
    '<div class="pr-row"><span>기간</span><input type="date" id="vl_pf"><span>~</span><input type="date" id="vl_pt"></div>' +
    '<div class="pr-row"><button class="pb" data-r="t">오늘</button><button class="pb" data-r="7">7일</button><button class="pb" data-r="30">30일</button><button class="pb" data-r="90">90일</button><button class="pb" data-r="m">이번 달</button>' +
    '<button class="pb pri" id="vl_pload">불러오기</button></div>' +
    '<div id="vl_pstat"></div>' +
    '<div id="vl_pselbox" style="display:none"><div class="sub" style="align-items:center"><span>선수 선택 (눌러서 켜기/끄기 · 여러 명 가능) <span id="vl_pcnt" style="color:#e8b400;margin-left:4px"></span></span><span style="display:flex;gap:6px"><button class="pb" id="vl_pclr">모두 해제</button><button class="pb" id="vl_ptog"></button></span></div>' +
    '<div id="vl_plist"><input id="vl_pq" type="search" placeholder="이름·초성(ㄱㄴㅎ) 또는 트랜스폰더 검색">' +
    '<div class="vl-favs" id="vl_pfav"></div>' +
    '<div id="vl_pdrv"></div></div></div>' +
    '<div id="vl_pres"></div>' +
    '</div>' +
    '</div></div>' +
    '<button id="vl_fab" title="보이스랩">🎙<span class="dot"></span></button>';
  document.body.appendChild(root);
  var $ = function (id) { return root.querySelector('#' + id); };
  var panel = $('vl_panel');
  var trkOnly = !SC() && onTracks;
  var pracOnly = !SC() && onPractice;
  if (pracOnly) panel.classList.add('pmode');
  if (trkOnly) panel.classList.add('tmode');
  var showPanel = function (v) { cfg.open = v; save(); panel.style.display = v ? '' : 'none'; fit(); };
  /* ---- full screen ----
     iPhone Safari cannot make a page element full screen, so on phones the open panel covers exactly the visible
     area (window.visualViewport) and follows it when the address bar shows/hides; the page behind is locked so
     scrolling cannot slide the panel under the toolbars. Where the real Fullscreen API exists (Android, iPad, PC)
     the ⛶ button also asks for it. */
  function isPhone() {
    try { return W.matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 700; } catch (e) { return false; }
  }
  function fullOn() { return cfg.full === true || (cfg.full !== false && isPhone()); }
  function fit() {
    var on = fullOn() && panel.style.display !== 'none', st = root.style;
    root.classList.toggle('full', on);
    document.documentElement.classList.toggle('vl-lock', on);
    if (on) {
      var vv = W.visualViewport;
      st.left = (vv ? vv.offsetLeft : 0) + 'px'; st.top = (vv ? vv.offsetTop : 0) + 'px';
      st.width = (vv ? vv.width : W.innerWidth) + 'px'; st.height = (vv ? vv.height : W.innerHeight) + 'px';
    } else {
      st.left = st.top = st.height = '';
      var vv2 = W.visualViewport, vw = vv2 ? vv2.width : W.innerWidth;
      st.width = vw <= 600 ? Math.max(200, vw - 16) + 'px' : '';   /* phones: never wider than what is actually visible */
      if (vw <= 600 && vv2) st.left = (vv2.offsetLeft + 8) + 'px';
    }
    var b = root.querySelector('#vl_fs'); if (b) { b.textContent = on ? '⤡' : '⛶'; b.title = on ? '전체 화면 끄기' : '전체 화면'; }
  }
  try {
    if (W.visualViewport) { W.visualViewport.addEventListener('resize', fit); W.visualViewport.addEventListener('scroll', fit); }
    W.addEventListener('orientationchange', function () { setTimeout(fit, 300); });
  } catch (e) {}
  $('vl_fs').onclick = function () {
    var on = !fullOn(); cfg.full = on; save();
    var d = document.documentElement;
    try {
      if (on && !document.fullscreenElement) { var rq = d.requestFullscreen || d.webkitRequestFullscreen; if (rq) { var pr = rq.call(d); if (pr && pr.catch) pr.catch(function () {}); } }
      if (!on && (document.fullscreenElement || document.webkitFullscreenElement)) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) {}
    fit(); setTimeout(fit, 400);
  };
  showPanel(cfg.open !== false);
  $('vl_fab').onclick = function () { showPanel(panel.style.display === 'none'); };
  $('vl_min').onclick = function () { showPanel(false); };
  function showWarn() {
    var w = $('vl_warn');
    w.textContent = '⚠ 예전 버전 보이스랩이 함께 실행 중입니다. 설정이 적용되지 않거나 안내가 두 번 나올 수 있어요. Tampermonkey 대시보드에서 예전 “보이스랩” 스크립트를 삭제(또는 끄기)한 뒤 페이지를 새로고침하세요.';
    w.style.display = '';
  }
  function setTab(t) {
    if (pracOnly && t === 'board') { if (curTrk) location.href = 'https://' + curTrk + '.liverc.com/live/scoring/#vl-trk=' + (cfg.trkRecent || []).join(',') + syncHash(); return; }   /* this page has no live data: go to the track's live scoring */
    if (t === 'trk' && !trkOnly) { trkPick(); return; }   /* the picker lives on LiveRC's own track list page */
    if (trkOnly) t = 'trk';
    else if (pracOnly && t !== 'set') t = 'prac';
    if (t === 'main' && !(md.ok && md.classes.length)) t = 'board';
    cfg.tab = t === 'board' || t === 'prac' || t === 'main' || t === 'trk' ? t : 'set'; if (!pracOnly && !trkOnly) save();
    $('vl_tab_board').style.display = cfg.tab === 'board' ? '' : 'none';
    $('vl_tab_set').style.display = cfg.tab === 'set' ? '' : 'none';
    $('vl_tab_prac').style.display = cfg.tab === 'prac' ? '' : 'none';
    $('vl_tab_main').style.display = cfg.tab === 'main' ? '' : 'none';
    $('vl_tab_trk').style.display = cfg.tab === 'trk' ? '' : 'none';
    if (cfg.tab === 'main') try { renderMain(true); } catch (e) {}
    if (cfg.tab === 'trk') try { tkOpen(); } catch (e) {}
    try { fitWidths(); fitPrac(); } catch (e) {}
    $('vl_trk').style.display = cfg.tab === 'set' || cfg.tab === 'trk' || cfg.tab === 'main' ? 'none' : '';
    if (typeof curTrk === 'string') renderTrk();
    root.querySelectorAll('#vl_head .tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === cfg.tab); });
    setWide();
    if (cfg.tab === 'board') renderRaceBoard(true);
    if (cfg.tab === 'prac') pracOpen();
    if (cfg.tab === 'set') try { teamSetRender(); } catch (e) {}
  }
  $('vl_rbb').addEventListener('click', function (e) {
    var td = e.target.closest && e.target.closest('td.c-nm'); if (!td) return;
    var n = td.parentNode.getAttribute('data-n');
    if (e.target.closest('.tmdb')) { if (n) teamCycle(n); return; }   /* the team dot: change team, not voice */
    if (n) toggleVoice(n);
  });
  $('vl_rbb').addEventListener('change', function (e) {
    var n = e.target.getAttribute && e.target.getAttribute('data-g'); if (n === null || n === undefined) return;
    var i = cfg.graphSel.indexOf(n);
    if (e.target.checked && i < 0) { cfg.graphSel.push(n); delete gNo[n]; } else if (!e.target.checked && i >= 0) { cfg.graphSel.splice(i, 1); gNo[n] = 1; if (cfg.graphAuto) delete cfg.graphAuto[n]; }   /* un-ticked by hand: not put back this session */
    save(); renderRaceBoard(true);
  });
  root.querySelectorAll('#vl_gbar .gch[data-g]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-g'); cfg.gShow = cfg.gShow || {}; cfg.gShow[k] = !cfg.gShow[k]; save(); renderGraphs(true); }; });
  $('vl_gclr').onclick = function () { (cfg.graphSel || []).forEach(function (n) { gNo[n] = 1; }); cfg.graphSel = []; cfg.graphAuto = {}; save(); renderRaceBoard(true); };
  /* name in the graph legend / lap list header: lap-time chart for that driver only (best / within / over colours); again = all */
  function gfClick(e) {
    var t = e.target.closest('[data-gf]'); if (!t) return;
    var n = t.getAttribute('data-gf');
    gFocus = gFocus ? null : n;
    lastGSig = ''; renderGraphs(true);
  }
  $('vl_glg').addEventListener('click', gfClick); $('vl_glaps').addEventListener('click', gfClick);
  $('vl_gall').onclick = function () {
    var sc = SC(); if (!sc || !sc.driverData) return;
    list(sc.driverData).sort(function (a, b) { return (+a.position || 999) - (+b.position || 999); }).forEach(function (d) { var n = nameOf(d); if (n && cfg.graphSel.indexOf(n) < 0) cfg.graphSel.push(n); });
    save(); renderRaceBoard(true);
  };
  $('vl_rbh').addEventListener('click', function (e) { var th = e.target.closest ? e.target.closest('th') : null; if (th) onSort(th.getAttribute('data-k')); });
  root.querySelectorAll('#vl_head .tab').forEach(function (b) { b.onclick = function () { setTab(b.getAttribute('data-tab')); }; });
  function setWide() { panel.classList.toggle('wide', W.innerWidth > 640); try { fitWidths(); fitPrac(); } catch (e) {} }
  try { W.addEventListener('resize', function () { setWide(); fit(); renderRaceBoard(true); }); } catch (e) {}

  var bind = function (id, key, fn) { var el = $(id); el.checked = !!cfg[key]; el.onchange = function () { cfg[key] = el.checked; save(); if (fn) fn(); }; };
  $('vl_t').value = cfg.targets;
  $('vl_t').oninput = function () { cfg.targets = this.value; save(); parseTargets(); };
  bind('vl_all', 'all'); bind('vl_lap', 'sayLap'); bind('vl_time', 'sayTime'); bind('vl_best', 'sayBest');
  $('vl_dec').value = String(cfg.dec); $('vl_dec').onchange = function () { cfg.dec = +this.value; save(); };
  $('vl_pad').value = String(cfg.pad); $('vl_pad').onchange = function () { cfg.pad = +this.value; save(); };
  bind('vl_gl', 'gapLead'); bind('vl_ga', 'gapAhead');
  [['vl_gln', 'gapLeadLaps'], ['vl_gan', 'gapAheadLaps']].forEach(function (x) { var el = $(x[0]); el.value = String(cfg[x[1]]); el.onchange = function () { cfg[x[1]] = +el.value; save(); }; });
  bind('vl_cl', 'closeOn', function () { renderRaceBoard(true); });
  $('vl_cla').value = cfg.closeAfter === undefined ? 3 : cfg.closeAfter;
  $('vl_cla').oninput = function () { var v = parseInt(this.value, 10); if (v >= 0) { cfg.closeAfter = v; save(); renderRaceBoard(true); } };
  bind('vl_llive', 'lapLive', function () { renderRaceBoard(true); });
  /* 🔍 zoom of everything inside the panel (this device only) */
  var ZPRE = [80, 90, 100, 110, 125, 150, 175];
  function zoomSet(z) {
    z = Math.max(60, Math.min(200, Math.round(+z || 100)));
    cfg.zoom = z; save();
    try { $('vl_body').style.zoom = z === 100 ? '' : String(z / 100); } catch (e) {}
    try { fitWidths(); fitPrac(); } catch (e) {}
    $('vl_zv').textContent = z + '%';
    $('vl_zl').innerHTML = ZPRE.map(function (p) { return '<button data-zp="' + p + '" class="' + (p === z ? 'sel' : '') + '">' + p + '%' + (p === 100 ? ' 기본' : '') + '</button>'; }).join('');
  }
  $('vl_zm').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'vl_zv') { $('vl_zl').classList.toggle('on'); return; }
    if (b.hasAttribute('data-zp')) { zoomSet(+b.getAttribute('data-zp')); $('vl_zl').classList.remove('on'); return; }
    if (b.hasAttribute('data-zs')) zoomSet((+cfg.zoom || 100) + 10 * +b.getAttribute('data-zs'));
  });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('#vl_zm')) { try { $('vl_zl').classList.remove('on'); } catch (x) {} } }, true);
  zoomSet(cfg.zoom || 100);
  bind('vl_qon', 'qualOn', function () { qd.html = ''; renderQual(); });
  $('vl_qmode').value = cfg.qualMode === 'points' ? 'points' : 'best'; $('vl_qmode').onchange = function () { cfg.qualMode = this.value; save(); qd.html = ''; renderQual(); };
  $('vl_qual').addEventListener('click', function (e) { if (e.target.closest('[data-qt]')) { cfg.qualOpen = cfg.qualOpen === false; save(); qd.html = ''; renderQual(); } });
  bind('vl_lpass', 'lapPass', function () { renderRaceBoard(true); });
  $('vl_lvs').value = cfg.liveSec; $('vl_lvs').oninput = function () { var v = parseFloat(this.value); if (v >= 0) { cfg.liveSec = v; save(); updLive(); } };
  [['vl_lvok', 'liveOk'], ['vl_lvnr', 'liveNear'], ['vl_lvov', 'liveOver']].forEach(function (x) { $(x[0]).value = cfg[x[1]]; $(x[0]).oninput = function () { cfg[x[1]] = this.value; save(); updLive(); }; });
  $('vl_cls2').value = cfg.closeSec; $('vl_cls2').oninput = function () { var v = parseFloat(this.value); if (v > 0) { cfg.closeSec = v; save(); renderRaceBoard(true); } };
  $('vl_clc').value = /^#[0-9a-f]{6}$/i.test(cfg.closeColor) ? cfg.closeColor : '#ff2bd6'; $('vl_clc').oninput = function () { cfg.closeColor = this.value; save(); renderRaceBoard(true); };
  bind('vl_ding', 'dingAhead');
  $('vl_bigb').onclick = function () { cfg.bigView = !cfg.bigView; save(); renderRaceBoard(true); };
  bind('vl_nmulti', 'nameMulti'); bind('vl_selkeep', 'selKeep', function () { Object.keys(rows).forEach(rowSync); }); bind('vl_toneauto', 'toneAuto');
  bind('vl_vmerge', 'voiceMerge'); bind('vl_msay', 'mainSay'); bind('vl_vlatest', 'voiceLatest'); bind('vl_sgun', 'startGun');
  $('vl_sgunt').onclick = function () { playTone(9); };
  (function () {
    var r = $('vl_tvol'), v = $('vl_tvv'); r.value = Math.round(toneVol() * 100); v.textContent = r.value + '%';
    r.oninput = function () { cfg.toneVol = +r.value; v.textContent = r.value + '%'; save(); };
    r.onchange = function () { ding(); };
    $('vl_tvt').onclick = function () { ding(); };
  })(); bind('vl_delta', 'sayDelta'); bind('vl_runsum', 'runSum');
  bind('vl_fin', 'finOn', function () { renderRaceBoard(true); }); bind('vl_finsay', 'finSay'); bind('vl_finpos', 'finPos');
  $('vl_finw').value = cfg.finWord || '레이스 종료'; $('vl_finw').oninput = function () { cfg.finWord = this.value; save(); };
  bind('vl_remon', 'remOn');
  root.querySelectorAll('#vl_remat input[data-rt]').forEach(function (el) {
    var t = el.getAttribute('data-rt'); el.checked = !!(cfg.remAt || {})[t];
    el.onchange = function () { cfg.remAt = Object.assign({}, cfg.remAt); cfg.remAt[t] = el.checked; save(); };
  });
  bind('vl_gbh', 'gapBehind'); bind('vl_posc', 'posChg');
  $('vl_gbs').value = cfg.behindSec; $('vl_gbs').oninput = function () { var v = parseFloat(this.value); if (v > 0) { cfg.behindSec = v; save(); } };
  bind('vl_afit', 'autoFit', function () { try { fitWidths(); fitPrac(); } catch (e) {} });
  $('vl_dingt').onclick = function () { ding(); };
  $('vl_tone').value = String(cfg.dingTone || 0); $('vl_tone').onchange = function () { cfg.dingTone = +this.value; save(); ding(); };
  bind('vl_pcol', 'paceColor', function () { renderRaceBoard(true); });
  bind('vl_gbf', 'gBackfill', function () { bf.next = 0; renderGraphs(true); });
  bind('vl_gallp', 'gAllPrac', function () { gPresent = null; renderGraphs(true); }); bind('vl_gvoice', 'gVoice', function () { renderGraphs(true); }); bind('vl_gvbold', 'gVoiceBold', function () { renderGraphs(true); });
  function tsrcHint() { $('vl_tsrch').textContent = cfg.trendSrc === 'avg' ? 'Last Lap이 평균 랩보다 빠르면 초록, 느리면 빨강 · 괄호 안에 평균과의 차이 (예 21.200 (+0.140))' : cfg.trendSrc === 'best' ? 'Last Lap을 베스트 랩과의 차이로 — 베스트 보라 · 세션 랩타임 기준 초 이하 초록 · 그 이상 주황, 괄호 안에 차이 (기준·색은 🎨 랩타임 색)' : 'Pace가 빨라지면 초록, 느려지면 빨강 (Pace 칸에 표시)'; }
  $('vl_tsrc').value = cfg.trendSrc === 'avg' || cfg.trendSrc === 'best' ? cfg.trendSrc : 'pace'; tsrcHint(); $('vl_tsrc').onchange = function () { cfg.trendSrc = this.value; save(); tsrcHint(); renderRaceBoard(true); };
  bind('vl_bhdc', 'bhdColor', function () { renderRaceBoard(true); });
  $('vl_avgo').value = String(cfg.avgOut === undefined ? 15 : cfg.avgOut); $('vl_avgo').onchange = function () { cfg.avgOut = +this.value; save(); lastGSig = ''; renderRaceBoard(true); };
  $('vl_avgm').value = cfg.avgMode === 'site' ? 'site' : 'top10'; $('vl_avgm').onchange = function () { cfg.avgMode = this.value; save(); lastGSig = ''; renderRaceBoard(true); };
  $('vl_colreset').onclick = function () { cfg.colOrder = null; save(); renderColList(); renderRaceBoard(true); };
  $('vl_cols').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-mv]') : null; if (!b) return;
    var o = colOrder(), k = b.getAttribute('data-k'), i = o.indexOf(k), j = i + (+b.getAttribute('data-mv'));
    if (i < 0 || j < 0 || j >= o.length) return;
    o.splice(i, 1); o.splice(j, 0, k); cfg.colOrder = o; save(); renderColList(); renderRaceBoard(true);
  });
  $('vl_cols').addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-show'); if (!k) return;
    cfg.colHide[k] = !e.target.checked; save(); renderColList(); renderRaceBoard(true);
  });
  bind('vl_wake', 'wake', function () { running && cfg.wake ? wakeOn() : wakeOff(); });
  bind('vl_fon', 'fuelOn', function () { updFuel(list(((SC() || {}).driverData) || {})); });
  bind('vl_run', 'runOn');
  [['vl_fmin', 'fuelMin', 0, 60], ['vl_fsec', 'fuelSec', 0, 59], ['vl_rmin', 'runMin', 0, 120], ['vl_rsec', 'runSec', 0, 59], ['vl_ptgt', 'pitTarget', 0.5, 120]].forEach(function (x) {
    var el = $(x[0]); el.value = cfg[x[1]];
    el.onchange = function () { var v = +this.value; if (!(v >= x[2] && v <= x[3])) v = cfg[x[1]]; cfg[x[1]] = v; this.value = v; save(); };
  });
  $('vl_pword').value = cfg.pitWord || '피트 인'; $('vl_pword').oninput = function () { cfg.pitWord = this.value.trim() || '피트 인'; save(); };
  [['vl_pfast', 'pitFast', '#3ddc84'], ['vl_pslow', 'pitSlow', '#ff5252']].forEach(function (x) {
    var el = $(x[0]); el.value = /^#[0-9a-f]{6}$/i.test(cfg[x[1]]) ? cfg[x[1]] : x[2]; el.oninput = function () { cfg[x[1]] = el.value; save(); };
  });
  $('vl_freset').onclick = fuelReset;
  /* ---- Google Drive sync (through the user's own "VoiceLab sync" Apps Script web app) ---- */
  var SYNC_LOCAL = ['syncUrl', 'syncKey', 'tab', 'open', 'full', '_ts', 'graphSel', 'zoom', 'bigView', 'gOpen', 'syncOk', 'v228s', 'graphAuto'];   /* stay on this device */
  var syncQK = 'vlSyncQ', syncTmr = null, syncBusy = false, syncLast = 0, syncErr = '', syncFolder = '', syncPushT = null;
  function vlSafe(h) { return String(h || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/\.liverc\.com$/, '').slice(0, 60) || 'track'; }
  function vlStamp(d) { var p2 = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  function syncHash() { return cfg.syncUrl ? '&vl-sync=' + encodeURIComponent(cfg.syncUrl + '\n' + (cfg.syncKey || '')) : ''; }
  function syncShared() { var o = {}; Object.keys(cfg).forEach(function (k) { if (SYNC_LOCAL.indexOf(k) < 0) o[k] = cfg[k]; }); return o; }
  function syncSigOf() { return JSON.stringify(syncShared()); }
  function gmGet(cb) {
    try { if (typeof GM_getValue === 'function') { cb(GM_getValue('vlSync', '') || ''); return; } } catch (e) {}
    try { if (typeof GM !== 'undefined' && GM.getValue) { GM.getValue('vlSync', '').then(function (v) { cb(v || ''); }, function () { cb(''); }); return; } } catch (e) {}
    cb('');
  }
  function gmSet(v) {
    try { if (typeof GM_setValue === 'function') { GM_setValue('vlSync', v); return; } } catch (e) {}
    try { if (typeof GM !== 'undefined' && GM.setValue) GM.setValue('vlSync', v); } catch (e) {}
  }
  function syncReq(o) {
    var body = JSON.stringify(Object.assign({ key: cfg.syncKey || '' }, o));
    return fetch(cfg.syncUrl, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', credentials: 'omit' })
      .then(function (r) { return r.json(); }, function () { throw new Error('인터넷 또는 드라이브 스크립트에 연결할 수 없습니다'); })
      .then(function (j) { if (j && j.folder) syncFolder = j.folder; if (!j || !j.ok) throw new Error(j && j.err === 'key' ? '비밀 단어가 스크립트와 다릅니다' : '드라이브 오류: ' + ((j && j.err) || '알 수 없음')); return j; });
  }
  function syncQ() { try { return JSON.parse(localStorage.getItem(syncQK) || '{}') || {}; } catch (e) { return {}; } }
  function syncQSave(q) { try { localStorage.setItem(syncQK, JSON.stringify(q)); } catch (e) {} }
  function syncQN() { var q = syncQ(), n = 0; Object.keys(q).forEach(function (k) { n += q[k].length; }); return n; }
  /* rows waiting for Drive (kept in this browser, so a lost connection at the track only delays them) */
  function syncAdd(name, rows) {
    var q = syncQ(), cur = q[name] || [];
    if (/^practice_/.test(name)) { var by = {}; cur.concat(rows).forEach(function (r) { by[r[0]] = r; }); cur = Object.keys(by).map(function (k) { return by[k]; }); }
    else cur = cur.concat(rows);
    q[name] = cur; syncQSave(q);
    if (!syncTmr) syncTmr = setTimeout(syncFlush, 15000);
    syncShow();
  }
  function syncFlush() {
    syncTmr = null;
    if (!cfg.syncUrl || syncBusy) return Promise.resolve();
    var q = syncQ(), names = Object.keys(q); if (!names.length) return Promise.resolve();
    var name = names[0], rows = q[name];
    syncBusy = true;
    return syncReq({ a: 'add', name: name, rows: rows }).then(function () {
      var q2 = syncQ(), left = (q2[name] || []).slice(rows.length);
      if (/^practice_/.test(name)) { var sent = {}; rows.forEach(function (r) { sent[r[0] + '|' + JSON.stringify(r)] = 1; }); left = (q2[name] || []).filter(function (r) { return !sent[r[0] + '|' + JSON.stringify(r)]; }); }
      if (left.length) q2[name] = left; else delete q2[name];
      syncQSave(q2); syncLast = Date.now(); syncErr = ''; syncBusy = false; syncShow();
      if (Object.keys(q2).length) return syncFlush();
    }, function (e) {
      syncBusy = false; syncErr = (e && e.message) || '연결 안 됨'; syncShow();
      if (!syncTmr) syncTmr = setTimeout(syncFlush, 60000);   /* try again in a minute */
    });
  }
  function syncPushSoon() { clearTimeout(syncPushT); syncPushT = setTimeout(syncPush, 3000); }
  function syncPush() {
    if (!cfg.syncUrl || cfg.syncOk !== cfg.syncUrl) return Promise.resolve();
    var o = syncShared(); o._ts = cfg._ts || Date.now();
    return syncReq({ a: 'cfgSet', cfg: JSON.stringify(o) }).then(function () { syncLast = Date.now(); syncErr = ''; syncShow(); }, function (e) { syncErr = (e && e.message) || '연결 안 됨'; syncShow(); });
  }
  /* on open: the newer settings win — Drive's are applied here (panel rebuilt), or ours go up */
  /* keep this device's settings before Drive's replace them, so they can be put back */
  function syncKeepPrev() { try { localStorage.setItem('vlCfgPrev', JSON.stringify({ t: Date.now(), cfg: syncShared() })); } catch (e) {} }
  function syncApply(r, rts, msg) {
    syncKeepPrev();
    var n = Object.assign({}, r); SYNC_LOCAL.forEach(function (k) { if (k !== '_ts') n[k] = cfg[k]; }); n._ts = rts; n.syncOk = cfg.syncUrl;
    var txt = JSON.stringify(n);
    try { localStorage.setItem(LS, txt); } catch (e) {}
    try { if (DESK && DESK.cfgSet) DESK.cfgSet(txt); } catch (e) {}
    syncLast = Date.now();
    window.__vlSyncNote = msg || '☁ 드라이브의 설정을 적용했습니다';
    root.remove(); stopAll(); main();   /* rebuild the panel with Drive's settings */
  }
  /* on open: the newer settings win — Drive's are applied here (panel rebuilt), or ours go up.
     A device connecting to this Drive for the first time always takes Drive's settings (a fresh device must not overwrite them). */
  function syncStart(manual) {
    if (!cfg.syncUrl) { syncReady = true; syncSig = syncSigOf(); syncShow(); return Promise.resolve(); }
    syncErr = ''; syncShow('연결 중…');
    return syncReq({ a: 'cfgGet' }).then(function (j) {
      var r = null; try { r = j.cfg ? JSON.parse(j.cfg) : null; } catch (e) {}
      var first = cfg.syncOk !== cfg.syncUrl;
      var rts = r ? +r._ts || 0 : 0, lts = manual ? +cfg._ts || 0 : syncTs0;
      if (r && (first || rts > lts)) { syncApply(r, rts, first ? '☁ 드라이브의 설정을 받았습니다 (이 기기 첫 연결)' : ''); return; }
      cfg.syncOk = cfg.syncUrl;
      syncReady = true; syncSig = syncSigOf(); syncLast = Date.now(); save();
      if (!r || lts > rts) { if (!cfg._ts) cfg._ts = Date.now(); return syncPush(); }
      syncShow();
    }).then(function () { return syncFlush(); }, function (e) { syncReady = true; syncSig = syncSigOf(); syncErr = (e && e.message) || '연결 안 됨'; syncShow(); });
  }
  function syncShow(msg) {
    try {
      var el = $('vl_sst'), dot = $('vl_sdot'), n = syncQN(), hh = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
      if (!cfg.syncUrl) { el.textContent = '꺼짐 — 이 기기 안에만 저장합니다'; dot.textContent = ''; return; }
      dot.innerHTML = syncErr ? '<b style="color:#ff6b6b">● 연결 안 됨</b>' : '<b style="color:#3ddc84">● 연결됨</b>';
      el.innerHTML = esc(msg || (syncErr ? '⚠ ' + syncErr : (syncFolder ? '드라이브 폴더 “' + syncFolder + '”' : '드라이브') + (syncLast ? ' · 마지막 동기화 ' + hh(syncLast) : ''))) + (n ? ' · 올릴 기록 ' + n + '줄 대기' : '');
    } catch (e) {}
  }
  $('vl_surl').value = cfg.syncUrl || ''; $('vl_skey').value = cfg.syncKey || '';
  function syncSetAddr() {
    var u = $('vl_surl').value.trim(), k = $('vl_skey').value.trim();
    if (u && !/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) { syncErr = 'script.google.com 으로 시작하는 웹 앱 URL을 넣으세요'; syncShow(); return false; }
    var changed = u !== (cfg.syncUrl || '') || k !== (cfg.syncKey || '');
    cfg.syncUrl = u; cfg.syncKey = k; gmSet(u ? JSON.stringify([u, k]) : ''); save();
    return changed;
  }
  $('vl_surl').onchange = $('vl_skey').onchange = function () { if (syncSetAddr()) { syncReady = false; syncStart(true); } };
  $('vl_stest').onclick = function () {
    if (syncSetAddr() === false && !cfg.syncUrl) return;
    if (!cfg.syncUrl) { syncShow(); return; }
    syncShow('확인 중…');
    syncReq({ a: 'ping' }).then(function (j) { syncFolder = j.folder || ''; syncErr = ''; syncShow('✓ 연결됨 — 드라이브 폴더 “' + syncFolder + '”'); }, function (e) { syncErr = (e && e.message) || '연결 안 됨 — URL과 배포 설정(액세스: 모든 사용자)을 확인하세요'; syncShow(); });
  };
  $('vl_snow').onclick = function () { if (!cfg.syncUrl) return; syncReady = false; syncStart(true); };
  /* two taps to confirm (no browser dialogs on the LiveRC page) */
  function twoTap(b, label, ask, run) {
    b.onclick = function () {
      if (!cfg.syncUrl) { syncErr = '먼저 웹 앱 URL을 넣으세요'; syncShow(); return; }
      if (b.getAttribute('data-ask')) { b.removeAttribute('data-ask'); clearTimeout(b._t); b.textContent = label; run(); return; }
      b.setAttribute('data-ask', '1'); b.textContent = ask; b._t = setTimeout(function () { b.removeAttribute('data-ask'); b.textContent = label; }, 4000);
    };
  }
  twoTap($('vl_sdown'), '⬇ 드라이브 설정 받기', '한 번 더 누르면 이 기기 설정을 바꿈', function () {
    syncShow('받는 중…');
    syncReq({ a: 'cfgGet' }).then(function (j) {
      var r = null; try { r = j.cfg ? JSON.parse(j.cfg) : null; } catch (e) {}
      if (!r) { syncShow('드라이브에 저장된 설정이 없습니다'); return; }
      syncApply(r, +r._ts || Date.now(), '☁ 드라이브의 설정을 받았습니다');
    }, function (e) { syncErr = (e && e.message) || '연결 안 됨'; syncShow(); });
  });
  twoTap($('vl_sup'), '⬆ 이 기기 설정 올리기', '한 번 더 누르면 드라이브 설정을 바꿈', function () {
    syncShow('올리는 중…');
    syncReq({ a: 'ping' }).then(function () {
      cfg.syncOk = cfg.syncUrl; cfg._ts = Date.now(); syncTs0 = cfg._ts; syncReady = true; syncSig = syncSigOf(); save();
      return syncPush().then(function () { if (!syncErr) syncShow('✓ 이 기기 설정을 드라이브에 올렸습니다'); });
    }, function (e) { syncErr = (e && e.message) || '연결 안 됨'; syncShow(); });
  });
  (function () {
    var pv = null; try { pv = JSON.parse(localStorage.getItem('vlCfgPrev') || 'null'); } catch (e) {}
    if (!pv || !pv.cfg || Date.now() - pv.t > 14 * 864e5) return;
    var b = $('vl_sprev'), d = new Date(pv.t);
    var lab = '↩ 받기 전 설정으로 (' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ')';
    b.style.display = ''; b.textContent = lab;
    b.onclick = function () {
      if (!b.getAttribute('data-ask')) { b.setAttribute('data-ask', '1'); b.textContent = '한 번 더 누르면 되돌림'; setTimeout(function () { b.removeAttribute('data-ask'); b.textContent = lab; }, 4000); return; }
      var n = Object.assign({}, pv.cfg); SYNC_LOCAL.forEach(function (k) { n[k] = cfg[k]; }); n._ts = Date.now();
      try { localStorage.removeItem('vlCfgPrev'); localStorage.setItem(LS, JSON.stringify(n)); } catch (e) {}
      try { if (DESK && DESK.cfgSet) DESK.cfgSet(JSON.stringify(n)); } catch (e) {}
      window.__vlSyncNote = '↩ 받기 전 설정으로 되돌렸습니다' + (cfg.syncUrl && cfg.syncOk === cfg.syncUrl ? ' — 드라이브에도 올립니다' : '');
      root.remove(); stopAll(); main();
    };
  })();
  /* run alert word */
  $('vl_rword').value = cfg.runWord || '주행 완료';
  $('vl_rword').onchange = function () { cfg.runWord = this.value.trim() || '주행 완료'; this.value = cfg.runWord; save(); };
  /* track bar show/hide (same flag as the ✕ on the bar) */
  $('vl_trkshow').checked = !cfg.trkHide;
  $('vl_trkshow').onchange = function () { cfg.trkHide = !this.checked; save(); renderTrk(); };
  /* settings groups: fold/unfold (remembered), one-line summary, master switches */
  function grpSet() {
    root.querySelectorAll('#vl_tab_set .grp').forEach(function (g) {
      var k = g.getAttribute('data-g');
      g.classList.toggle('open', !!(cfg.gOpen || {})[k]);
      g.classList.toggle('dim', (k === 'voice' && cfg.voiceOn === false) || (k === 'race' && cfg.raceOn === false) || (k === 'team' && !cfg.teamOn));
    });
  }
  function gsum() {
    try {
      var on = Object.keys(cfg.sel || {}).filter(function (k) { return cfg.sel[k] && cfg.sel[k].on; }), lab = function (k) { return (cfg.sel[k] && cfg.sel[k].alias) || k; };
      var mm = function (m, s2) { return (+m || 0) + ':' + ('0' + (+s2 || 0)).slice(-2); };
      var v = [on.length ? lab(on[0]) + (on.length > 1 ? ' 외 ' + (on.length - 1) + '명' : '') : (cfg.all ? '전체 선수' : '선수 없음')];
      var r = [cfg.sayLap && '랩 수', cfg.sayTime && '랩타임', cfg.sayBest && '베스트', cfg.sayDelta && '베스트 차이'].filter(Boolean);
      if (r.length) v.push(r.join('·'));
      if (cfg.runOn) v.push((cfg.runWord || '주행 완료') + ' ' + mm(cfg.runMin, cfg.runSec));
      v.push({ def: '기본 음성', f1: '여성 1', f2: '여성 2', f3: '여성 3' }[cfg.voice || 'def'] || '기본 음성');
      $('vl_gs_voice').textContent = cfg.voiceOn === false ? '꺼짐 — 음성 안내 모두 쉼' : v.join(' · ');
      var rc = [cfg.closeOn && '접전 ' + cfg.closeSec + '초', cfg.finOn !== false && '🏁 종료', cfg.remOn !== false && '남은 시간', (cfg.gapLead || cfg.gapAhead) && '차이 안내', cfg.gapBehind && '뒤차', cfg.posChg && '순위 변동', cfg.fuelOn && '주유 ' + mm(cfg.fuelMin, cfg.fuelSec), cfg.dingAhead && '앞차 알림음'].filter(Boolean);
      $('vl_gs_race').textContent = cfg.raceOn === false ? '꺼짐 — Behind 색·접전·LAPS 시간·종료·음성 안내·주유 모두 쉼' : (rc.join(' · ') || '켠 기능 없음');
      var nCol = 0; try { nCol = $('vl_cols').querySelectorAll('input[type=checkbox]:checked').length; } catch (e) {}
      var bd = [nCol ? '표시 항목 ' + nCol + '개' : '', cfg.paceColor !== false && '변화 색(' + ({ pace: 'Pace', avg: '평균', best: '베스트 차이' }[cfg.trendSrc] || 'Pace') + ')'].filter(Boolean);
      $('vl_gs_board').textContent = bd.join(' · ');
      $('vl_gs_prac').textContent = ['예상 기록 ' + (cfg.projMin || 5) + '분', cfg.consOn && 'Consistency ' + cfg.consPct + '%'].filter(Boolean).join(' · ');
      var sw = function (c) { return '<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + c + ';margin:0 3px 0 0;vertical-align:0"></i>'; };
      $('vl_gs_color').innerHTML = sw(cfg.lapBest) + '베스트 · ' + sw(cfg.lapNear) + (+cfg.lapDev || 0.5) + '초 이내 · ' + sw(cfg.lapFar) + '그 이상';
      var tcp = null; try { tcp = tcCup(null, false); } catch (e) {}
      $('vl_gs_team').textContent = !cfg.teamOn ? '꺼짐' : ['팀 ' + teams().length, ({ count: '출전 수 기준', custom: '직접 입력' }[cfg.ptsMode] || '고정표'), tcp ? tcp.name + ' · 레이스 ' + tcp.races.length + '개' : ''].filter(Boolean).join(' · ');
      $('vl_gs_gen').textContent = [cfg.wake && '화면 꺼짐 방지', !cfg.trkHide && '트랙 이동 줄', cfg.syncUrl ? '☁ 드라이브 동기화' : '설정 파일'].filter(Boolean).join(' · ');
    } catch (e) {}
  }
  root.querySelectorAll('#vl_tab_set .grp > .gh').forEach(function (h) {
    h.onclick = function (e) {
      if (e.target.closest('.gsw')) return;
      var k = h.parentNode.getAttribute('data-g'); cfg.gOpen = cfg.gOpen || {}; cfg.gOpen[k] = !cfg.gOpen[k]; save(); grpSet();
    };
  });
  $('vl_gopen').onclick = function () { cfg.gOpen = { voice: 1, race: 1, board: 1, prac: 1, color: 1, gen: 1 }; save(); grpSet(); };
  $('vl_gclose').onclick = function () { cfg.gOpen = {}; save(); grpSet(); };
  $('vl_voiceOn').checked = cfg.voiceOn !== false;
  $('vl_voiceOn').onchange = function () { cfg.voiceOn = this.checked; if (!this.checked) try { vqClear(); spCancel(); } catch (e) {} save(); grpSet(); };
  /* 👥 team race: settings and the card */
  $('vl_teamOn').checked = !!cfg.teamOn;
  $('vl_teamOn').onchange = function () { cfg.teamOn = this.checked; if (cfg.teamOn) teamEnsure(); grpSet(); teamChanged(); };
  setTimeout(function () { try { teamSetRender(); gsumSafe(); } catch (e) {} }, 0);   /* after the rest of the panel is set up */
  function tmsg(t) { var m = $('vl_tmsg'); if (m) m.textContent = t; }
  $('vl_teamset').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    var o, cup;
    if (b.id === 'vl_tmadd') { var i = teams().length; cfg.teams = teams().concat([{ id: 't' + Date.now().toString(36), name: TEAM_DEF[i % TEAM_DEF.length], color: TEAM_COLS[i % TEAM_COLS.length] }]); teamChanged(); return; }
    if (b.classList.contains('tmdel')) {
      var t = teams()[+b.getAttribute('data-ti')]; if (!t || teams().length <= 2) return;
      cfg.teams = teams().filter(function (x) { return x !== t; }); cfg.teamOf = Object.assign({}, cfg.teamOf || {});
      Object.keys(cfg.teamOf).forEach(function (n) { if (cfg.teamOf[n] === t.id) delete cfg.teamOf[n]; }); teamChanged(); return;
    }
    if (b.classList.contains('tmchip')) {
      var n = b.getAttribute('data-n'), tid = b.getAttribute('data-t'); cfg.teamOf = Object.assign({}, cfg.teamOf || {});
      if (tid) cfg.teamOf[n] = tid; else delete cfg.teamOf[n]; teamChanged(); return;
    }
    if (b.id === 'vl_tmrf') { tmRosterGet(true); return; }
    if (b.id === 'vl_ptadd' || b.id === 'vl_ptdel') {
      var a = (cfg.ptsCustom || []).slice(); if (b.id === 'vl_ptadd') a.push(Math.max(0, (+a[a.length - 1] || 1) - 1)); else if (a.length > 1) a.pop();
      cfg.ptsCustom = a; teamChanged(); return;
    }
    if (b.id === 'vl_cupnew') { o = tcLoad(); o.cur = ''; tcSave(o); tcCup(o, true); teamChanged(); return; }
    if (b.id === 'vl_tcopy') {
      var txt = teamText('\t'); if (!txt) { tmsg('아직 기록이 없어요'); return; }
      try { navigator.clipboard.writeText(txt).then(function () { tmsg('복사했어요 — 엑셀·메모에 붙여 넣기'); }, function () { tmsg('복사하지 못했어요'); }); } catch (x) { tmsg('복사하지 못했어요'); }
      return;
    }
    if (b.id === 'vl_tcsv') {
      var csv = teamText(','); if (!csv) { tmsg('아직 기록이 없어요'); return; }
      csv = '﻿' + csv; var name = 'voicelab-team-' + todayS() + '.csv';
      if (DESK && DESK.saveSettings) { DESK.saveSettings(csv, name).then(function (p) { if (p) tmsg('저장했습니다: ' + p); }); return; }
      var a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a2.download = name;
      document.body.appendChild(a2); a2.click(); setTimeout(function () { URL.revokeObjectURL(a2.href); a2.remove(); }, 1000); tmsg('내려받았습니다: ' + name); return;
    }
    if (b.id === 'vl_tclr') {
      if (!b.getAttribute('data-ask')) { b.setAttribute('data-ask', '1'); b.textContent = '한 번 더 누르면 비움'; setTimeout(function () { b.removeAttribute('data-ask'); b.textContent = '이 팀전 비우기'; }, 4000); return; }
      o = tcLoad(); cup = tcCup(o, false); if (cup) { cup.races = []; tcSave(o); } teamChanged(); return;
    }
  });
  $('vl_teamset').addEventListener('input', function (e) { if (e.target.id === 'vl_tmq') { tmQ = e.target.value.trim(); teamListRender(); } });
  $('vl_teamset').addEventListener('change', function (e) {
    var el = e.target, o, cup;
    if (el.id === 'vl_tmun') { tmUn = el.checked; teamListRender(); return; }
    if (el.id === 'vl_tmq') return;
    if (el.classList.contains('tmname')) { var t = teams()[+el.getAttribute('data-ti')]; if (t) { t.name = el.value.trim() || t.name; cfg.teams = teams().slice(); teamChanged(); } return; }
    if (el.classList.contains('tmc')) { var t2 = teams()[+el.getAttribute('data-ti')]; if (t2) { t2.color = el.value; cfg.teams = teams().slice(); teamChanged(); } return; }
    if (el.id === 'vl_ptsm') { cfg.ptsMode = el.value; teamChanged(); return; }
    if (el.classList.contains('tmpt')) { var a = (cfg.ptsCustom || []).slice(); a[+el.getAttribute('data-i')] = Math.max(0, +el.value || 0); cfg.ptsCustom = a; teamChanged(); return; }
    if (el.id === 'vl_cupsel') { o = tcLoad(); if (o.cups[el.value]) { o.cur = el.value; tcSave(o); } teamChanged(); return; }
    if (el.id === 'vl_cupname') { o = tcLoad(); cup = tcCup(o, false); if (cup) { cup.name = el.value.trim() || cup.name; tcSave(o); } teamChanged(); return; }
  });
  $('vl_team').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-ed')) { teamEdit = !teamEdit; renderTeam(true); return; }
    var di = b.getAttribute('data-del');
    if (di !== null) {
      if (!b.getAttribute('data-ask')) { b.setAttribute('data-ask', '1'); b.textContent = '빼기?'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-ask'); b.textContent = '✕'; } }, 4000); return; }
      var o = tcLoad(), cup = tcCup(o, false); if (cup) { cup.races.splice(+di, 1); tcSave(o); } renderTeam(true); gsumSafe(); return;
    }
  });
  $('vl_team').addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('tmdrv')) { cfg.teamDrvOpen = e.target.open; save(); } }, true);
  $('vl_team').addEventListener('change', function (e) {
    var el = e.target; if (!el.classList.contains('tme')) return;
    var o = tcLoad(), cup = tcCup(o, false); if (!cup) return;
    var rc = cup.races[+el.getAttribute('data-ri')], n = el.getAttribute('data-n'); if (!rc) return;
    var r = rc.res.filter(function (x) { return x.n === n; })[0];
    if (!r) { r = { n: n, pos: 0, laps: 0, best: 0, fin: false }; rc.res.push(r); }
    if (el.value === '') delete r.adj; else r.adj = +el.value || 0;
    tcSave(o); renderTeam(true);
  });
  $('vl_main').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-mc]'); if (b) { md.sel = b.getAttribute('data-mc'); renderMain(true); } });
  $('vl_mstrip').addEventListener('click', function () { if (md.ok) setTab('main'); });
  $('vl_raceOn').checked = cfg.raceOn !== false;
  $('vl_raceOn').onchange = function () { cfg.raceOn = this.checked; save(); grpSet(); updFuel(list(((SC() || {}).driverData) || {})); };
  var save0 = save; save = function () { save0(); gsum(); };
  root.querySelector('#vl_tab_set').addEventListener('change', function () { setTimeout(gsum, 0); });
  root.querySelector('#vl_tab_set').addEventListener('click', function () { setTimeout(gsum, 0); });
  grpSet(); gsum();
  $('vl_fline').value = cfg.lineAfterPit ? '1' : '0'; $('vl_fline').onchange = function () { cfg.lineAfterPit = this.value === '1'; save(); };
  $('vl_fbtn').onclick = function () { cfg.fuelOn = !cfg.fuelOn; save(); $('vl_fon').checked = !!cfg.fuelOn; updFuel(list(((SC() || {}).driverData) || {})); };
  $('vl_voice').value = VPRESET[cfg.voice] ? cfg.voice : 'def';
  $('vl_voice').onchange = function () { cfg.voice = this.value; save(); voiceInfo(); speak(cfg.voice === 'def' ? '기본 음성입니다' : '보이스랩 여성 음성입니다'); };
  voiceInfo();
  $('vl_rate').value = cfg.rate; $('vl_rv').textContent = cfg.rate;
  $('vl_rate').oninput = function () { cfg.rate = +this.value; $('vl_rv').textContent = cfg.rate; save(); };
  /* ---- online / offline icon (desktop app) ---- */
  var NET_ON = '<svg viewBox="0 0 24 24"><path fill="#3ddc84" d="M19.4 10.1A7 7 0 0 0 6.2 8.2 5.5 5.5 0 0 0 6.5 19h12.4a4.5 4.5 0 0 0 .5-8.9z"/><path fill="none" stroke="#0b3d1f" stroke-width="2" d="M9 14l2 2 4-4"/></svg>';
  var NET_OFF = '<svg viewBox="0 0 24 24"><path fill="#ff6b6b" d="M19.4 10.1A7 7 0 0 0 6.2 8.2 5.5 5.5 0 0 0 6.5 19h12.4a4.5 4.5 0 0 0 .5-8.9z"/><path stroke="#3d0b0b" stroke-width="2" d="M9.5 11.5l5 5M14.5 11.5l-5 5"/></svg>';
  function setNet(on) { var n = $('vl_net'); n.style.display = ''; n.innerHTML = on ? NET_ON : NET_OFF; n.title = on ? '온라인 — LiveRC 실시간 데이터 수신 가능' : '오프라인 — 저장된 CSV 기록만 볼 수 있습니다'; }
  if (DESK) {
    try { var nv = DESK.onNet ? DESK.onNet(function (v) { setNet(!!v); }) : navigator.onLine; setNet(nv === undefined ? navigator.onLine : !!nv); } catch (e) { setNet(navigator.onLine); }
    try { W.addEventListener('online', function () { setNet(true); }); W.addEventListener('offline', function () { setNet(false); }); } catch (e) {}
  }
  /* ---- settings file: CSV with one "key,value" row per setting (value = JSON) ---- */
  function csvCell(v) { v = String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csvParse(text) {
    var rows = [], row = [], cur = '', q = false, i = 0; text = String(text).replace(/^﻿/, '');
    for (; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function cfgCSV() {
    return '﻿key,value\r\n' + CFG_KEYS.map(function (k) { return csvCell(k) + ',' + csvCell(JSON.stringify(cfg[k] === undefined ? null : cfg[k])); }).join('\r\n') + '\r\n';
  }
  function cfgFromCSV(text) {
    var rows = csvParse(text), n = 0, bad = 0;
    if (!rows.length || String(rows[0][0]).trim() !== 'key') throw new Error('보이스랩 설정 CSV가 아닙니다 (첫 줄이 key,value 이어야 함)');
    rows.slice(1).forEach(function (r) {
      var k = (r[0] || '').trim(); if (!k || CFG_KEYS.indexOf(k) < 0) return;
      try { var v = JSON.parse(r[1]); if (v === null && CFG_DEF[k] !== null) v = CFG_DEF[k]; cfg[k] = v; n++; } catch (e) { bad++; }
    });
    return { n: n, bad: bad };
  }
  function cfgMsg(t) { $('vl_cfgmsg').textContent = t; $('vl_cfgmsg').style.color = '#e8b400'; }
  $('vl_cfgexp').onclick = function () {
    var csv = cfgCSV(), name = 'voicelab-settings-' + todayS() + '.csv';
    if (DESK && DESK.saveSettings) { DESK.saveSettings(csv, name).then(function (p) { if (p) cfgMsg('저장했습니다: ' + p); }); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    cfgMsg('내려받았습니다: ' + name);
  };
  function applyImported(text) {
    try {
      var r = cfgFromCSV(text); save();
      cfgMsg('설정 ' + r.n + '개를 가져왔습니다' + (r.bad ? ' (읽지 못한 값 ' + r.bad + '개)' : '') + '. 화면을 새로 고칩니다…');
      setTimeout(function () { location.reload(); }, 900);
    } catch (e) { cfgMsg('가져오기 실패: ' + e.message); }
  }
  $('vl_cfgimp').onclick = function () {
    if (DESK && DESK.openSettings) { DESK.openSettings().then(function (t) { if (t) applyImported(t); }); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = function () { var f = inp.files && inp.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { applyImported(fr.result); }; fr.readAsText(f, 'utf-8'); };
    inp.click();
  };
  /* ---- track bar (race board / practice): go to another LiveRC track, last 5 tracks as buttons, can be hidden ---- */
  var curTrk = (location.host.match(/^([a-z0-9-]+)\.liverc\.com$/i) || [])[1];
  var tkFrom = '', tkPg = '';
  curTrk = curTrk ? curTrk.toLowerCase() : '';
  /* each track is its own site (own storage), so the recent list travels in the address when moving: #vl-trk=a,b,c */
  var hm = location.hash.match(/vl-trk=([a-z0-9,-]*)/i);
  if (hm) {
    var carried = hm[1].toLowerCase().split(',').filter(Boolean);
    cfg.trkRecent = (cfg.trkRecent || []).concat(carried);
    var hf = location.hash.match(/vl-fav=([a-z0-9,-]*)/i);
    if (hf) cfg.trkFav = hf[1].toLowerCase().split(',').filter(Boolean);   /* favourites travel with the address too (every track site keeps its own storage) */
    var hfr = location.hash.match(/vl-from=([a-z0-9-]*)/i), hpg = location.hash.match(/vl-pg=([a-z]*)/i);
    tkFrom = hfr ? hfr[1].toLowerCase() : ''; tkPg = hpg ? hpg[1] : '';
    if (/^#vl-trk=[a-z0-9,-]*(&vl-(fav|from|pg)=[a-z0-9,-]*)*(&vl-sync=[^&]*)?$/i.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  if (curTrk && curTrk !== 'www' && curTrk !== 'live') {
    var seenT = {};
    cfg.trkRecent = (hm ? hm[1].toLowerCase().split(',').filter(Boolean) : []).length ? [curTrk].concat(hm[1].toLowerCase().split(',')) : [curTrk].concat(cfg.trkRecent || []);
    cfg.trkRecent = cfg.trkRecent.filter(function (t) { if (!t || seenT[t]) return false; seenT[t] = 1; return true; }).slice(0, 5); save();
  }
  function trkHash(list) {
    return '#vl-trk=' + list.join(',') + ((cfg.trkFav || []).length ? '&vl-fav=' + cfg.trkFav.join(',') : '');
  }
  function trkGo(t, pg) {
    t = String(t || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\.liverc\.com.*$/, '').replace(/[^a-z0-9-]/g, '');
    if (!t) return;
    var prac = pg ? pg === 'prac' : (pracOnly || cfg.tab === 'prac');
    var keep = [t].concat(cfg.trkRecent || []).filter(function (x, i, a) { return x !== 'live' && a.indexOf(x) === i; }).slice(0, 5);
    location.href = 'https://' + t + '.liverc.com' + (prac ? '/practice/' : '/live/scoring/') + trkHash(keep) + syncHash();
  }
  /* 📍 트랙 tab on a track's page: open LiveRC's track list, where VoiceLab becomes the picker */
  function trkPick() {
    var pg = (pracOnly || cfg.tab === 'prac') ? 'prac' : 'board';
    location.href = 'https://live.liverc.com/' + trkHash((cfg.trkRecent || []).filter(function (x) { return x !== 'live'; }).slice(0, 5)) + (curTrk && curTrk !== 'live' ? '&vl-from=' + curTrk : '') + '&vl-pg=' + pg + syncHash();
  }
  function renderTrk() {
    if (trkOnly) { $('vl_trk').innerHTML = ''; return; }
    var r = (cfg.trkRecent || []).slice(0, 5);
    $('vl_trk').innerHTML = cfg.trkHide
      ? '<div class="tb1">📍 <b>' + esc(curTrk || '-') + '</b><button class="tog" id="vl_ttog">▼ 트랙</button></div>'
      : '<div class="tb1">📍 <b>' + esc(curTrk || '-') + '</b><span style="color:#888;font-size:13px">.liverc.com</span>' +
        '<button class="go" id="vl_tpick" title="LiveRC 트랙 목록에서 검색해서 고르기">🔍 트랙 바꾸기</button><button class="tog" id="vl_ttog">▲ 숨기기</button></div>' +
        (r.length > 1 ? '<div class="tb2">최근 ' + r.map(function (t) { return '<button data-trk="' + esc(t) + '"' + (t === curTrk ? ' class="cur"' : '') + '>' + ((cfg.trkFav || []).indexOf(t) >= 0 ? '★ ' : '') + esc(t) + '</button>'; }).join('') + '</div>' : '');
  }
  $('vl_trk').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.id === 'vl_ttog') { cfg.trkHide = !cfg.trkHide; save(); renderTrk(); try { $('vl_trkshow').checked = !cfg.trkHide; } catch (e) {} return; }
    if (b.id === 'vl_tpick') { trkPick(); return; }
    var t = b.getAttribute('data-trk'); if (t && t !== curTrk) trkGo(t);
  });
  renderTrk();
  /* ---------- 📍 track picker (on live.liverc.com) ----------
     LiveRC's track list page holds every track (1,200+) in one table: row data-href "//sub.liverc.com/live/",
     icons status_2 = racing, status_1 = open practice, status_video_1 = live video, status_featured; "1 minute ago"; name; current event */
  var tk = { list: null, busy: false, q: '', f: 'all', err: '' };
  function tkParse(doc) {
    var out = [];
    [].forEach.call(doc.querySelectorAll('table.track_list tbody tr'), function (tr, i) {
      var a = tr.querySelector('a[href*=".liverc.com"]'), href = tr.getAttribute('data-href') || (a && a.getAttribute('href')) || '';
      var m = href.match(/\/\/([a-z0-9-]+)\.liverc\.com/i); if (!m) return;
      var st = tr.querySelector('.status_2') ? 2 : tr.querySelector('.status_1') ? 1 : 0;
      var nm = tr.querySelector('strong'), ev = tr.querySelector('.indent'), ago = tr.querySelector('small small') || tr.querySelector('td small');
      out.push({ s: m[1].toLowerCase(), n: nm ? nm.textContent.trim() : m[1], e: ev ? ev.textContent.replace(/\s+/g, ' ').trim() : '', st: st, v: !!tr.querySelector('.status_video_1'), ft: !!tr.querySelector('.status_featured'), t: ago ? ago.textContent.trim() : '', i: i });
    });
    return out;
  }
  function tkAgo(t) {
    var m = String(t || '').match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i); if (!m) return t || '';
    return m[1] + ({ second: '초', minute: '분', hour: '시간', day: '일', week: '주', month: '달', year: '년' }[m[2].toLowerCase()]) + ' 전';
  }
  function tkOpen() {
    tkRender();
    if (tk.list || tk.busy) return;
    tk.busy = true;
    var fromDom = function () { return tkParse(document); };
    fetch('/', { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) {
      var l = tkParse(new DOMParser().parseFromString(h, 'text/html')); tk.list = l.length ? l : fromDom();
    }, function () { tk.list = fromDom(); }).then(function () { tk.busy = false; if (!tk.list.length) tk.err = '트랙 목록을 읽지 못했어요'; tkRender(); });
  }
  function tkGoPick(s2) { trkGo(s2, tkPg === 'prac' ? 'prac' : 'board'); }
  function tkRender() {
    var box = $('vl_tk'); if (!box) return;
    var L = tk.list || [], fav = cfg.trkFav || [], rec = (cfg.trkRecent || []).filter(function (x) { return x !== 'live'; });
    var by = {}; L.forEach(function (x) { by[x.s] = x; });
    var nKr = function (x) { return /[가-힣]/.test(x.n + x.e); };
    var pass = function (x) {
      if (tk.f === 'race' && x.st !== 2) return false; if (tk.f === 'prac' && x.st !== 1) return false; if (tk.f === 'kr' && !nKr(x)) return false;
      return !tk.q || kmatch(x.n, tk.q) || kmatch(x.s, tk.q) || kmatch(x.e, tk.q);
    };
    var hl = function (txt) {
      txt = String(txt || ''); var q = tk.q.trim(); if (!q) return esc(txt);
      var i = txt.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(txt);
      return esc(txt.slice(0, i)) + '<span class="tkhl">' + esc(txt.slice(i, i + q.length)) + '</span>' + esc(txt.slice(i + q.length));
    };
    var row = function (x) {
      var on = fav.indexOf(x.s) >= 0, cur = x.s === tkFrom;
      return '<div class="tkr' + (cur ? ' cur' : '') + '" data-s="' + esc(x.s) + '"><span class="tki">' + (x.st === 2 ? '🏁' : x.st === 1 ? '🟢' : '·') + (x.v ? '<small>📹</small>' : '') + '</span>' +
        '<div class="tkn"><b>' + hl(x.n) + '</b> <span class="tks">' + hl(x.s) + '</span>' + (x.e ? '<div class="tke">' + hl(x.e) + '</div>' : '') + '</div>' +
        '<div class="tkt"><button class="tkst' + (on ? ' on' : '') + '" data-fav="' + esc(x.s) + '" title="즐겨찾기">' + (on ? '★' : '☆') + '</button><br>' + esc(tkAgo(x.t)) + '</div></div>';
    };
    var h = '<div class="tktop">🌐 <b>live.liverc.com</b> ' + (tk.busy ? '<span style="color:#aaa">목록 읽는 중…</span>' : tk.err ? '<span style="color:#ff9a9a">⚠ ' + esc(tk.err) + '</span>' : '<span style="color:#3ddc84">● 실시간 목록 ' + L.length.toLocaleString() + '곳</span>') +
      (tkFrom ? '<button class="pb2" id="vl_tkback">↩ ' + esc((by[tkFrom] || {}).n || tkFrom) + '(으)로</button>' : '') +
      '<div class="tkfrom">' + (tkFrom ? '지금 있던 트랙: ' + esc((by[tkFrom] || {}).n || tkFrom) + ' (' + esc(tkFrom) + ') · ' : '') + '고르면 그 트랙 ' + (tkPg === 'prac' ? '연습 기록' : '라이브 스코어링') + '으로</div></div>';
    h += '<input type="search" id="vl_tkq" placeholder="트랙 이름 · 주소 · 대회 이름 · 초성" value="' + esc(tk.q) + '" autocomplete="off">';
    h += '<div class="tkf">' + [['all', '전체'], ['race', '🏁 레이스 중'], ['prac', '🟢 연습 중'], ['kr', '🇰🇷 한글 트랙']].map(function (f) { return '<button class="tkc' + (tk.f === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>';
    h += '<div id="vl_tkl"></div>';
    h += '<div class="tknote">누르면 이동 · ☆ = 즐겨찾기 · 상태와 대회 이름은 이 페이지에서 바로 읽어 실시간<br><span class="tkman">주소 직접 입력 <input id="vl_tkman" placeholder="예: thetrackkr" autocomplete="off"><button class="pb2" id="vl_tkgo">이동</button></span></div>';
    if (!box.querySelector('#vl_tkq')) box.innerHTML = h;
    else { box.querySelector('.tktop').outerHTML = h.match(/^<div class="tktop">[\s\S]*?<\/div><\/div>/)[0]; box.querySelectorAll('.tkc').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-f') === tk.f); }); }
    var top = fav.concat(rec).filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (x2) { return by[x2] || { s: x2, n: x2, e: '', st: 0, t: '', i: 1e9 }; }).filter(pass);
    var topS = {}; top.forEach(function (x) { topS[x.s] = 1; });
    var rest = L.filter(function (x) { return !topS[x.s] && pass(x); });
    var lh = (top.length ? '<div class="tkgh">★ 즐겨찾기 · 최근</div>' + top.map(row).join('') : '') +
      '<div class="tkgh">' + (tk.q || tk.f !== 'all' ? '찾은 트랙 ' + rest.length : '모든 트랙 ' + rest.length) + ' <small>(최근 활동순)</small></div>' +
      rest.slice(0, 150).map(row).join('') + (rest.length > 150 ? '<div class="tknote">… ' + (rest.length - 150) + '곳 더 — 검색으로 좁혀 보세요</div>' : '') +
      (!tk.busy && L.length && !rest.length && !top.length ? '<div class="tknote">찾는 트랙이 없어요</div>' : '');
    $('vl_tkl').innerHTML = lh;
  }
  $('vl_tk').addEventListener('input', function (e) { if (e.target.id === 'vl_tkq') { tk.q = e.target.value.trim(); tkRender(); } });
  $('vl_tk').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'vl_tkman' && !e.isComposing) tkGoPick(e.target.value); });
  $('vl_tk').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button,.tkr'); if (!b) return;
    if (b.id === 'vl_tkback') { tkGoPick(tkFrom); return; }
    if (b.id === 'vl_tkgo') { tkGoPick($('vl_tkman').value); return; }
    var f = b.getAttribute('data-f'); if (f) { tk.f = f; tkRender(); return; }
    var fv = b.getAttribute('data-fav');
    if (fv) { var a = (cfg.trkFav || []).slice(), i = a.indexOf(fv); if (i >= 0) a.splice(i, 1); else a.unshift(fv); cfg.trkFav = a.slice(0, 20); save(); tkRender(); return; }
    var s2 = b.getAttribute('data-s'); if (s2) tkGoPick(s2);
  });
  /* no start/stop button: voice runs whenever at least one driver is picked for announcements (checked, typed in, or "all"),
     the status pill mutes / unmutes for a while without touching the picks */
  var muted = false;
  /* browsers (iPhone Safari above all) only let a page speak after the person has touched it once */
  var unlocked = NB || !hasSpeech || !!DESK || !!(navigator.userActivation && navigator.userActivation.hasBeenActive && !IOS);   /* PC app: speech allowed without a touch (if not, the not-allowed error brings the banner back) */
  function voiceCount() { return cfg.all ? -1 : Object.keys(cfg.sel).filter(function (k) { return cfg.sel[k] && cfg.sel[k].on; }).length + (targets ? targets.length : 0); }
  var paint = function () {
    var b = $('vl_go'), n = voiceCount();
    b.className = 'vl-st ' + (!n ? 'no' : muted ? 'mu' : 'on');
    var L = function (lg, sh) { return '<span class="vl-pl">' + lg + '</span><span class="vl-ps">' + sh + '</span>'; }, cnt = n < 0 ? '전체' : n + '명';   /* long label / short label for phones */
    b.innerHTML = !n ? L('🔇 안내 없음', '🔇 없음') : muted ? L('🔇 음소거', '🔇 음소거') : L('🔊 안내 ' + cnt, '🔊 ' + cnt);
    b.title = !n ? '안내할 선수가 없어요 — 눌러서 선수 고르기' : muted ? '눌러서 다시 켜기' : '눌러서 잠시 음소거';
    $('vl_fab').classList.toggle('on', running);
    $('vl_unl').classList.toggle('on', running && !unlocked);
  };
  function autoRun() {
    var want = voiceCount() !== 0 && !muted;
    if (want !== running) {
      running = want;
      if (running) { seed(); spk.q = 0; if (cfg.wake) wakeOn(); }
      else { vqClear(); if (NB) native({ type: 'stop' }); else if (hasSpeech) spCancel(); wakeOff(); audioOff(); }
    }
    paint();
  }
  $('vl_go').onclick = function () {
    if (!voiceCount()) { setTab('set'); try { var g = root.querySelector('.grp[data-g="voice"]'); if (g && !g.classList.contains('open')) g.querySelector('.gh').click(); g.scrollIntoView({ block: 'start' }); } catch (e) {} return; }
    muted = !muted; autoRun();
  };
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { if (hasSpeech && !NB) { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'ko-KR'; speechSynthesis.speak(u); } } catch (e) {}
    audioOn(); if (running && cfg.wake) wakeOn(); paint();   /* iOS: the tone engine must be started by a touch too */
  }
  document.addEventListener('click', unlock, true); document.addEventListener('touchend', unlock, true); document.addEventListener('keydown', unlock, true);
  $('vl_unl').onclick = function () { unlock(); };

  /* ---------- 🔄 update check (GitHub namogun80/voicelab · version.json) ---------- */
  var GH = 'namogun80/voicelab', UPD_JSON = 'https://raw.githubusercontent.com/' + GH + '/main/version.json';
  var UPD_US = 'https://raw.githubusercontent.com/' + GH + '/main/voicelab.user.js';
  var UPD_LD = 'https://raw.githubusercontent.com/' + GH + '/main/voicelab-auto.user.js';
  /* iPhone (Userscripts app): opening a .user.js only shows its text → hand over a file to download instead (tapped as a real link, so Safari allows it) */
  var dlUrl = {};
  function dlPrep(key, url, cb) {
    if (dlUrl[key]) { cb && cb(); return; }
    fetch(url + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) {
      dlUrl[key] = URL.createObjectURL(new Blob([t], { type: 'application/octet-stream' })); cb && cb();
    }).catch(function (e) { upd.err = String(e && e.message || e).slice(0, 60); cb && cb(); });
  }
  var IOS_STEPS = '<ol class="vl-dls"><li><b>파일</b> 앱 › <b>다운로드</b> 폴더 열기</li><li><b>voicelab.user.js</b> 길게 누르기 › <b>이동</b></li><li><b>Userscripts</b> 폴더 고르기 › <b>이동</b> › <b>대치</b></li><li>이 페이지 새로 고침 → 위 버전 확인</li></ol>' +
    '<div style="color:#aaa;font-size:14px">💡 설정 › Safari › 다운로드 위치를 <b>Userscripts</b> 폴더로 바꿔 두면 1~3번 없이 받기만 하면 돼요 (이름 뒤에 “-2”가 붙으면 예전 파일을 지우기)</div>';
  var upd = { busy: false, err: '', msg: '' };
  /* how this copy was started: PC app, userscript (Tampermonkey / Userscripts) or a bookmark */
  var KIND = DESK ? 'pc' : NB ? 'app' : window.__vlLoader ? 'ld' : window.__vlAuto ? 'us' : 'bm';
  var KIND_TXT = { pc: 'PC 앱', app: '아이폰 앱', ld: '자동 업데이트 유저스크립트', us: '유저스크립트', bm: '북마크' }[KIND];
  var IOSDL = KIND === 'us' && IOS;   /* iPhone + Userscripts app */
  function updGet() { try { return JSON.parse(localStorage.getItem('vlUpd') || '{}') || {}; } catch (e) { return {}; } }
  function updNewer(u) { return +u.ver > VER; }
  function updPaint() {
    var u = updGet(), nw = updNewer(u);
    $('vl_upddot').classList.toggle('on', nw);
    var v = $('vl_updv'); if (!v) return;
    v.innerHTML = '지금 <b style="color:#fff">v' + VERSION + '</b> · ' + KIND_TXT;
    $('vl_updb').textContent = upd.busy ? '확인 중…' : '업데이트 확인';
    var h = '';
    if (upd.err) h = '<div style="margin-top:6px;color:#ff9a9a">확인하지 못했어요 (' + esc(upd.err) + ') — 인터넷 연결을 확인하세요</div>';
    else if (nw) {
      var how = { us: IOSDL ? '아이폰은 파일로 받아서 바꿔요 · 받은 뒤 아래 순서대로' : 'Tampermonkey 설치 창이 열려요 · “업데이트”를 누른 뒤 이 페이지를 새로고침', ld: '페이지를 새로 고치면 새 버전으로 바뀌어요 (열 때마다 자동)', bm: '이 자리에서 바로 새 버전으로 바뀌어요 · 북마크를 “🔄 자동 업데이트 북마크”로 바꾸면 늘 최신', pc: '새 코어를 받아 이 화면을 다시 불러와요', app: '아이폰 앱은 새 앱 파일이 필요해요' }[KIND];
      h = '<div class="nw"><div><b style="color:#3ddc84">새 버전 v' + esc(u.version) + '</b> <small style="color:#9a9">' + esc(u.date || '') + '</small></div>' +
        (u.notes && u.notes.length ? '<ul>' + u.notes.slice(0, 6).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
        (IOSDL ? (dlUrl.us ? '<a class="ub go vl-dlb" id="vl_updgo" href="' + dlUrl.us + '" download="voicelab.user.js">⬇ 새 파일 받기 (voicelab.user.js)</a> ' : '<span class="ub go vl-dlb" style="opacity:.6">파일 준비 중…</span> ')
          : KIND !== 'app' ? '<button class="ub go" id="vl_updgo">지금 업데이트</button> ' : '') + '<small style="color:#aaa">' + how + '</small>' + (upd.msg ? '<div style="margin-top:4px;color:#ffd54a">' + esc(upd.msg) + '</div>' : '') +
        (IOSDL && upd.dl ? '<div class="vl-dlg"><b>✓ 받았어요 — 이렇게 바꾸세요</b>' + IOS_STEPS + '</div>' : '') + '</div>';
      if (IOSDL && !dlUrl.us) dlPrep('us', UPD_US, updPaint);
    } else if (u.t) h = '<div style="margin-top:6px;color:#3ddc84">최신 버전이에요 <small style="color:#888">(' + new Date(u.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' 확인)</small></div>';
    /* iPhone userscript: one-time switch to the self-updating userscript */
    if (IOSDL) h += '<div class="vl-dlg" style="border-color:#6a4a80;background:#1a1726"><b style="color:#e6c8ff">💡 한 번만 바꾸면 끝</b><br><b>자동 업데이트 유저스크립트</b>로 한 번 바꿔 두면, 앞으로는 열 때마다 깃허브의 최신 보이스랩을 받아 실행해서 <b>파일을 다시 바꿀 일이 없어요</b>.<br><span style="color:#aaa;font-size:14px">인터넷이 안 되면 마지막에 받아 둔 버전으로 실행 · 설정·기록은 그대로 · 받는 파일 이름도 voicelab.user.js라 같은 방법으로 대치</span><br>' +
      (dlUrl.ld ? '<a class="ub vl-dlb2" id="vl_updld" href="' + dlUrl.ld + '" download="voicelab.user.js">⬇ 자동 업데이트 유저스크립트 받기</a>' : '<button class="ub vl-dlb2" id="vl_updldp">⬇ 자동 업데이트 유저스크립트 받기</button>') +
      (upd.dlLd ? '<div style="margin-top:6px"><b>✓ 받았어요 — 이렇게 바꾸세요</b>' + IOS_STEPS + '</div>' : '') + '</div>';
    if (KIND === 'ld') h += '<div style="margin-top:6px;color:#aaa;font-size:14px">🔄 자동 업데이트 유저스크립트 — 페이지를 열 때마다 최신 버전을 받아 실행해요</div>';
    $('vl_updi').innerHTML = h;
    var g = $('vl_updgo');
    if (g && IOSDL) g.onclick = function () { setTimeout(function () { upd.dl = true; updPaint(); }, 300); };
    else if (g) g.onclick = updGo;
    var gl = $('vl_updld'); if (gl) gl.onclick = function () { setTimeout(function () { upd.dlLd = true; updPaint(); }, 300); };
    var gp = $('vl_updldp'); if (gp) gp.onclick = function () { gp.textContent = '파일 준비 중…'; dlPrep('ld', UPD_LD, updPaint); };
  }
  function updCheck() {
    if (upd.busy) return; upd.busy = true; upd.err = ''; updPaint();
    fetch(UPD_JSON + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      var o = { t: Date.now(), ver: +j.ver || 0, version: String(j.version || ''), date: String(j.date || ''), notes: Array.isArray(j.notes) ? j.notes.map(String) : [] };
      try { localStorage.setItem('vlUpd', JSON.stringify(o)); } catch (e) {}
    }).catch(function (e) { upd.err = String(e && e.message || e).slice(0, 60); }).then(function () { upd.busy = false; updPaint(); });
  }
  function updGo() {
    if (KIND === 'ld') { location.reload(); return; }
    if (KIND === 'us') { window.open(UPD_US, '_blank'); upd.msg = '설치 창에서 업데이트한 뒤 이 페이지를 새로고침하세요'; updPaint(); return; }
    if (KIND === 'pc') { upd.msg = '새 코어를 받는 중…'; updPaint(); var p = DESK.coreUpdate ? DESK.coreUpdate() : Promise.resolve(); Promise.resolve(p).then(function () { location.reload(); }, function () { upd.msg = '받지 못했어요 — 앱을 다시 열어 보세요'; updPaint(); }); return; }
    /* bookmark: load the newest core of the latest commit right here; the newer copy takes over this panel */
    upd.msg = '새 버전을 불러오는 중…'; updPaint();
    var go = function (v) { var sc2 = document.createElement('script'); sc2.src = 'https://cdn.jsdelivr.net/gh/' + GH + '@' + v + '/voicelab-core.js'; sc2.onerror = function () { if (v !== 'main') go('main'); else { upd.msg = '불러오지 못했어요'; updPaint(); } }; document.head.appendChild(sc2); };
    fetch('https://api.github.com/repos/' + GH + '/commits/main').then(function (r) { return r.json(); }).then(function (j) { go(j && j.sha ? j.sha : 'main'); }, function () { go('main'); });
  }
  if ($('vl_updb')) $('vl_updb').onclick = updCheck;
  updPaint();
  if (Date.now() - (+updGet().t || 0) > 864e5) setTimeout(updCheck, 4000);   /* once a day, a few seconds after start */
  $('vl_test').onclick = function () { say('test', '남호, 28랩, 23.69초, 베스트 랩', -1); };
  paint();
  var hint = function (s) { $('vl_hint').textContent = s; };

  /* ---------- screen wake lock ---------- */
  var wl = null;
  function wakeOn() { if (NB) { native({ type: 'wake', on: true }); return; } try { navigator.wakeLock && navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () {}); } catch (e) {} }
  function wakeOff() { if (NB) { native({ type: 'wake', on: false }); return; } try { wl && wl.release(); } catch (e) {} wl = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (running && cfg.wake) wakeOn();
    if (IOS && hasSpeech && !NB) { try { if (speechSynthesis.paused) speechSynthesis.resume(); if (spk.q) { spk.q = 0; spCancel(); } } catch (e) {} }
  });

  /* ---------- speech ---------- */
  /* Korean voices the device has; female ones by name (Windows Heami/SunHi, Chrome "Google 한국의", Apple Yuna/Sora …) */
  var FEM = /yuna|sora|heami|sun-?hi|seoyeon|ji-?min|yu-?jin|nara|google\s*한국|female|여성|여자/i, MALE = /injoon|hyunsu|bongjin|minsu|gookmin|male|남성|남자/i;
  var pickVoice = function () {
    if (!hasSpeech) return;
    var v = speechSynthesis.getVoices();
    koVoices = v.filter(function (x) { return /^ko/i.test(x.lang); });
    koVoice = koVoices[0] || null;
    femVoices = koVoices.filter(function (x) { return FEM.test(x.name) && !/\bmale\b/i.test(x.name.replace(/female/i, '')); });
    if (!femVoices.length) femVoices = koVoices.filter(function (x) { return !MALE.test(x.name); });
    try { voiceInfo(); } catch (e) {}
  };
  /* 기본 = the voice used so far; 여성 1·2·3 = female Korean voices of this device (several if it has them),
     each with its own tone (pitch / speed) so the three sound different even when the device has only one */
  /* voices that failed on this device (iOS lists voices it cannot actually use, e.g. not downloaded or a second voice of the same language) */
  var badVoice = {};
  function voiceFor() {
    var p = VPRESET[cfg.voice] || VPRESET.def;
    var v = p.i < 0 ? koVoice : (femVoices[p.i] || femVoices[0] || koVoice);
    if (v && badVoice[v.voiceURI]) v = koVoices.filter(function (x) { return !badVoice[x.voiceURI]; })[0] || null;
    return { voice: v, pitch: p.pitch, rate: p.rate };
  }
  /* the same voice taken from the current list (Safari can hand out stale voice objects that then speak nothing) */
  function liveVoice(v) {
    if (!v) return null;
    try { var l = speechSynthesis.getVoices(); for (var i = 0; i < l.length; i++) if (l[i].voiceURI === v.voiceURI) return l[i]; } catch (e) {}
    return null;
  }
  function voiceInfo() {
    var el = root.querySelector('#vl_vinfo'); if (!el) return;
    var vf = voiceFor();
    el.textContent = (vf.voice ? '이 기기: ' + vf.voice.name + (cfg.voice !== 'def' && !femVoices.length ? ' (여성 음성 없음)' : '') : (hasSpeech ? (koVoices.length ? '한국어 기본 음성' : '한국어 음성 목록 없음 — 기본 음성으로 시도') : '이 브라우저는 음성 안내를 지원하지 않음')) +
      (spk && spk.n ? ' · 재생 ' + spk.ok + '/' + spk.n + (spk.err ? ' · 마지막 오류: ' + spk.err : '') : '');
  }
  pickVoice(); if (hasSpeech) speechSynthesis.onvoiceschanged = pickVoice;
  /* keep the audio output awake (Bluetooth / USB / HDMI devices sleep and clip the first syllable) */
  var actx = null;
  function audioOn() {
    try {
      if (!actx) {
        var AC = W.AudioContext || W.webkitAudioContext || window.AudioContext || window.webkitAudioContext; if (!AC) return;
        actx = new AC();
        if (!IOS) {   /* keep-alive hum for Bluetooth/HDMI on computers; on iOS it only fights speech for the audio session */
          var osc = actx.createOscillator(), g = actx.createGain();
          osc.frequency.value = 30; g.gain.value = 0.0005;   /* inaudible */
          osc.connect(g); g.connect(actx.destination); osc.start();
        }
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  function audioOff() { if (IOS) return; try { actx && actx.suspend(); } catch (e) {} }   /* iOS: a suspended context may not wake without a touch */
  /* alert tones, made for earphones: soft attack (no click), nothing sharp (all through a 3 kHz low-pass), under a second.
     p = tones { w wave, f Hz, f2 glide-to Hz over gl s, g peak, a attack s, r decay s, t delay s }, nz = noise bursts { lp | bp Hz, q, g, a, r, t } */
  var TONES = [
    { p: [{ w: 'sine', f: 880, g: .16, a: .012, r: .45 }] },                                   /* 부드러운 띵 */
    { p: [{ w: 'sine', f: 523, g: .20, a: .015, r: .40 }] },                                   /* 낮은 퐁 */
    { p: [{ w: 'triangle', f: 660, g: .12, a: .006, r: .12 }] },                               /* 짧은 톡 */
    { p: [{ w: 'triangle', f: 440, g: .18, a: .004, r: .18 }] },                               /* 나무 똑 */
    { p: [{ w: 'sine', f: 1047, g: .08, a: .010, r: .35 }] },                                  /* 맑은 핑 (quieter: the highest one) */
    { p: [{ w: 'sine', f: 659, g: .13, a: .012, r: .30 }, { w: 'sine', f: 523, g: .13, a: .012, r: .45, t: .17 }] },   /* 띵동 */
    { p: [{ w: 'sine', f: 523, g: .18, a: .005, r: .35 }, { w: 'sine', f: 2093, g: .035, a: .003, r: .05 }] },        /* 마림바 */
    { p: [{ w: 'sine', f: 950, f2: 480, gl: .09, g: .13, a: .004, r: .16 }] },                 /* 물방울 */
    { p: [{ w: 'sine', f: 392, g: .14, a: .010, r: .75 }, { w: 'sine', f: 784, g: .035, a: .010, r: .45 }, { w: 'sine', f: 1082, g: .02, a: .006, r: .25 }] },   /* 낮은 종 */
    { nz: [{ bp: 1400, q: 1.5, g: .22, a: .001, r: .035 }, { bp: 1250, q: 1.5, g: .18, a: .001, r: .04, t: .012 }, { bp: 1100, q: 1.2, g: .16, a: .002, r: .10, t: .024 }] }   /* 출발 총성 (cap gun “팡”) */
  ];
  var toneOut = null, toneCtxOf = null;
  function toneVol() { var v = +cfg.toneVol; return (v > 0 ? Math.min(100, v) : 70) / 100; }
  function ding() { return playTone(+cfg.dingTone || 0); }
  function playToneLen(i) {
    var tn = TONES[Math.max(0, Math.min(TONES.length - 1, +i || 0))], e = 0;
    (tn.p || []).concat(tn.nz || []).forEach(function (x) { e = Math.max(e, (x.t || 0) + x.a + x.r); });
    return Math.round(e * 1000) + 20;
  }
  /* plays tone #i and returns its length in ms (speech waits for it) */
  function playTone(i) {
    var tn = TONES[Math.max(0, Math.min(TONES.length - 1, +i || 0))];
    audioOn(); if (!actx) return 0;
    var end = 0;
    try {
      if (!toneOut || toneCtxOf !== actx) {   /* one shared output: 3 kHz low-pass → volume */
        var lpf = actx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 3000; lpf.Q.value = 0.5;
        var vg = actx.createGain(); lpf.connect(vg); vg.connect(actx.destination);
        toneOut = { lp: lpf, vol: vg }; toneCtxOf = actx;
      }
      toneOut.vol.gain.value = toneVol();
      var c = actx, t0 = c.currentTime + 0.02;
      (tn.p || []).forEach(function (p) {
        var s0 = t0 + (p.t || 0), o = c.createOscillator(), g = c.createGain();
        o.type = p.w; o.frequency.setValueAtTime(p.f, s0); if (p.f2) o.frequency.exponentialRampToValueAtTime(p.f2, s0 + p.gl);
        g.gain.setValueAtTime(0.0001, s0); g.gain.linearRampToValueAtTime(p.g, s0 + p.a); g.gain.exponentialRampToValueAtTime(0.0001, s0 + p.a + p.r);
        o.connect(g); g.connect(toneOut.lp); o.start(s0); o.stop(s0 + p.a + p.r + 0.05);
        end = Math.max(end, (p.t || 0) + p.a + p.r);
      });
      (tn.nz || []).forEach(function (z) {
        var s0 = t0 + (z.t || 0), len = Math.ceil(c.sampleRate * (z.a + z.r + 0.05)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (var k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
        var src = c.createBufferSource(); src.buffer = buf;
        var f = c.createBiquadFilter(); f.type = z.bp ? 'bandpass' : 'lowpass'; f.frequency.value = z.bp || z.lp; f.Q.value = z.q || 0.7;
        var g = c.createGain(); g.gain.setValueAtTime(0.0001, s0); g.gain.linearRampToValueAtTime(z.g, s0 + z.a); g.gain.exponentialRampToValueAtTime(0.0001, s0 + z.a + z.r);
        src.connect(f); f.connect(g); g.connect(toneOut.lp); src.start(s0);
        end = Math.max(end, (z.t || 0) + z.a + z.r);
      });
    } catch (e) {}
    return Math.round(end * 1000) + 20;
  }
  /* silent utterance used as lead-in / tail so the engine and speaker are ready before the words and don't stop on the last one */
  var PAD = ['', '음', '음 음', '음 음 음 음'];
  function silent(n) {
    var u = new SpeechSynthesisUtterance(PAD[n]);
    u.lang = 'ko-KR'; u.volume = 0; u.rate = 1; var v = liveVoice(voiceFor().voice); if (v) u.voice = v;
    return u;
  }
  /* speech health: n = asked, ok = actually started, err = last error, q = time the oldest unstarted words were queued */
  var spk = { n: 0, ok: 0, err: '', q: 0, gen: 0 };
  /* every cancel starts a new generation: words dropped by it are not "failed" and must not be retried */
  function spCancel() { spk.gen++; spk.q = 0; speechSynthesis.cancel(); }
  function spkInfo() { try { voiceInfo(); } catch (e) {} }
  /* iOS Safari can get stuck "speaking" with nothing coming out (after a failed voice, a phone call, going to the background):
     words queued but not started for 8 s → clear the queue so the next announcement plays */
  function speechUnstick() {
    if (!spk.q || Date.now() - spk.q < 8000) return false;
    spk.q = 0; spk.err = '멈춤 → 초기화';
    try { spCancel(); } catch (e) {}
    spkInfo(); return true;
  }
  /* try = 0: chosen voice, 1: first working Korean voice, 2: no voice (language only).
     cb(status) is called once when the words are done: 'ok', 'retry' (said with a fallback voice), 'fail', 'cut' */
  function speak(text, tryN, cb) {
    var doneOnce = false, done = function (st) { if (doneOnce) return; doneOnce = true; clearTimeout(wd); if (cb) try { cb(st); } catch (e) {} };
    var wd = setTimeout(function () { done('fail'); }, 4000 + String(text).length * 220 / Math.max(0.6, +cfg.rate || 1));   /* the engine never reported back */
    if (NB) { native({ type: 'speak', text: text, rate: +cfg.rate || 1, pad: Math.max(0, Math.min(3, cfg.pad === undefined ? 2 : +cfg.pad)) }); clearTimeout(wd); wd = setTimeout(function () { done('ok'); }, 600 + String(text).length * 110 / Math.max(0.6, +cfg.rate || 1)); return; }
    if (!hasSpeech) { done('fail'); return; }
    tryN = tryN || 0;
    if (!koVoices.length) pickVoice();   /* Safari often never fires voiceschanged */
    if (!tryN && speechUnstick()) { clearTimeout(wd); setTimeout(function () { speak(text, 0, cb); }, 300); return; }   /* WebKit drops words queued right after cancel() */
    if (!IOS) audioOn();   /* the keep-alive hum is for Bluetooth/HDMI on computers; on iOS it only fights speech for the audio session */
    try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
    /* silent lead-in / tail: not on iOS (it may ignore volume 0, and every extra utterance is another chance to stall) */
    var n = IOS ? 0 : Math.max(0, Math.min(3, cfg.pad === undefined ? 2 : +cfg.pad));
    if (n) speechSynthesis.speak(silent(n));
    var u = new SpeechSynthesisUtterance(text);
    var vf = voiceFor(), v = null;
    if (tryN === 0) v = liveVoice(vf.voice);
    else if (tryN === 1) v = liveVoice(koVoices.filter(function (x) { return !badVoice[x.voiceURI]; })[0]);
    u.lang = 'ko-KR'; u.rate = Math.min(2, (+cfg.rate || 1) * vf.rate); u.pitch = vf.pitch; try { if (v) u.voice = v; } catch (e) {}
    var started = false, failed = false, gen = spk.gen;
    var fail = function (why) {
      if (failed || started) return; failed = true;
      if (gen !== spk.gen) { done('cut'); return; }
      spk.err = why + (v ? ' (' + v.name + ')' : ''); spk.q = 0;
      if (v) badVoice[v.voiceURI] = 1;
      spkInfo();
      if (tryN < 2) { clearTimeout(wd); setTimeout(function () { speak(text, tryN + 1, function (st) { done(st === 'ok' || st === 'retry' ? 'retry' : st); }); }, 250); }   /* same words with the next fallback voice */
      else done('fail');
    };
    u.onstart = function () { started = true; spk.ok++; spk.q = 0; spk.err = ''; spkInfo(); };
    u.onerror = function (e) { var er = (e && e.error) || 'error'; if (er === 'interrupted' || er === 'canceled') { done('cut'); return; } if (er === 'not-allowed') { unlocked = false; spk.q = 0; try { paint(); } catch (x) {} done('fail'); return; } fail(er); };
    /* WebKit sometimes "ends" an utterance at once without saying anything when the voice is unusable */
    u.onend = function () { if (!started) fail('소리 없이 끝남'); else done(tryN ? 'retry' : 'ok'); };
    if (!tryN) spk.n++;
    if (!spk.q) spk.q = Date.now();
    speechSynthesis.speak(u);
    if (n) speechSynthesis.speak(silent(n));
  }

  /* ---------- announcement queue ----------
     Safari drops or stalls words handed to it while it is still speaking, so only one announcement goes to the engine at a time.
     Drivers crossing together (within 1.5 s) are said as one sentence; a driver whose call is still waiting when the next lap comes
     gets the new lap instead (old one skipped). Each item: { key, text, ti (tone, -1 none), at, hold } */
  var vq = [], vqBusy = false, vqT = null, vlog = [], vqGen = 0;
  function vlogAdd(text, st) {
    vlog.unshift({ t: Date.now(), x: text, s: st }); if (vlog.length > 5) vlog.length = 5;
    var el = $('vl_vlog'); if (!el) return;
    var hh = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); };
    var W = { ok: '<span style="color:#3ddc84">✓ 재생</span>', retry: '<span style="color:#ff6b6b">✕ 소리 없음</span> → 다시 시도 <span style="color:#3ddc84">✓</span>', fail: '<span style="color:#ff6b6b">✕ 소리 없음</span>', skip: '<span style="color:#ffa94d">↷ 건너뜀</span>', cut: '<span style="color:#999">■ 멈춤</span>' };
    el.innerHTML = '<b>최근 안내 기록</b> <span style="color:#999">(소리가 빠질 때 확인용)</span>' + vlog.map(function (e) { return '<div>' + hh(e.t) + ' ' + (W[e.s] || e.s) + ' ' + esc(e.x) + (e.s === 'skip' ? ' <small style="color:#999">(다음 랩으로 바꿈)</small>' : '') + '</div>'; }).join('');
    el.style.display = 'block';
  }
  function vqClear() { vq.forEach(function (it) { vlogAdd(it.text, 'cut'); }); vq = []; clearTimeout(vqT); vqT = null; vqGen++; vqBusy = false; }
  function say(key, text, ti, hold) {
    if (!text && !(ti >= 0)) return;
    if (cfg.voiceLatest !== false && key) {
      for (var i = 0; i < vq.length; i++) if (vq[i].key === key) { vlogAdd(vq[i].text, 'skip'); vq.splice(i, 1); break; }
    }
    vq.push({ key: key, text: text || '', ti: ti >= 0 ? ti : -1, at: Date.now(), hold: hold || 0 });
    vqPump();
  }
  function vqPump() {
    if (vqBusy || !vq.length) return;
    clearTimeout(vqT); vqT = null;
    var now = Date.now(), first = vq[0];
    /* another voice driver is due at the line within 1.5 s: wait a moment so both go in one sentence */
    if (cfg.voiceMerge !== false && first.hold > now) { vqT = setTimeout(vqPump, Math.min(250, first.hold - now)); return; }
    var take = [vq.shift()];
    if (cfg.voiceMerge !== false) while (vq.length && vq[0].at - take[0].at <= 1500 && vq[0].key !== 'rem') take.push(vq.shift());
    vqBusy = true; var gen = vqGen;
    var tones = take.filter(function (it) { return it.ti >= 0; }), wait = 0;
    tones.forEach(function (it, k) { setTimeout(function () { if (gen === vqGen) playTone(it.ti); }, wait); wait += (k < tones.length - 1 ? 260 : 0); });
    if (tones.length) wait += playToneLen(tones[tones.length - 1].ti) + 120;
    var text = take.map(function (it) { return it.text; }).filter(Boolean).join(', ');
    var fin = function (st) { if (gen !== vqGen) return; take.forEach(function (it) { if (it.text) vlogAdd(it.text, st); }); vqBusy = false; setTimeout(vqPump, 120); };
    setTimeout(function () { if (gen !== vqGen) return; if (!text) { fin('ok'); return; } speak(text, 0, fin); }, wait);
  }
  /* ---------- matching ---------- */
  var targets = [];
  function parseTargets() {
    targets = cfg.targets.split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var i = s.indexOf('='); var key = (i > 0 ? s.slice(0, i) : s).trim(); var alias = i > 0 ? s.slice(i + 1).trim() : '';
      return { key: key.toLowerCase(), alias: alias, numeric: /^\d+$/.test(key) };
    });
  }
  parseTargets();
  /* the name LiveRC itself shows (driverName, e.g. "도형준 MBX8Re" — the same as the practice records), not the account name (realName) */
  function clnName(v) { return String(v || '').replace(/<[^>]*>/g, '').trim(); }
  function nameOf(d) { return clnName(d.driverName) || clnName(d.nickName) || clnName(d.realName); }
  /* settings saved before v2.18.2 used realName: move each such driver's voice settings / favourite / graph tick to the shown name once */
  var nameMoved = {};
  function migrateName(d) {
    var oldN = clnName(d.realName), newN = nameOf(d);
    if (!oldN || oldN === newN || nameMoved[oldN]) return;
    nameMoved[oldN] = 1;
    var ch = false;
    if (cfg.sel && cfg.sel[oldN]) { if (!cfg.sel[newN]) cfg.sel[newN] = cfg.sel[oldN]; delete cfg.sel[oldN]; ch = true; }
    ['favs', 'graphSel'].forEach(function (k) {
      var a = cfg[k]; if (!Array.isArray(a)) return;
      var i = a.indexOf(oldN); if (i < 0) return;
      if (a.indexOf(newN) < 0) a[i] = newN; else a.splice(i, 1);
      ch = true;
    });
    if (ch) { save(); try { refreshDrivers(); dfavs(); } catch (e) {} }
  }
  function match(d) {
    var s = cfg.sel[nameOf(d)];
    if (s && s.on) return { alias: (s.alias || '').trim(), nm: s.nm !== false, tone: !!s.tone, ti: +s.ti || 0 };
    var names =[d.realName, d.driverName, d.nickName].map(function (s) { return (s || '').toLowerCase(); });
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.numeric) {
        var re = new RegExp('(^|\\D)' + t.key + '(\\D|$)');
        if (String(d.carNum) === t.key || names.some(function (n) { return re.test(n); })) return t;
      } else if (names.some(function (n) { return n.indexOf(t.key) >= 0; })) return t;
    }
    return cfg.all ? { alias: '', nm: !!cfg.sayName, tone: false } : null;
  }

  /* ---------- driver picker ---------- */
  var rows = {};
  function setSel(name, patch) {
    var was = cfg.sel[name] || {};
    var s = Object.assign({ on: false, alias: '' }, was, patch);
    if (patch.on === false && cfg.selKeep === false) s = { on: false, alias: '' };   /* “forget on un-pick” */
    if (!s.on && !s.alias && s.nm !== false && !s.tone && !s.ti) delete cfg.sel[name]; else cfg.sel[name] = s;
    /* two or more voice drivers: everyone picked without a tone of their own (never set, not switched off) gets one nobody else uses */
    var touched = [name];
    if (patch.on === true && !was.on && cfg.toneAuto !== false) {
      var on = Object.keys(cfg.sel).filter(function (k) { return cfg.sel[k].on; });
      if (on.length >= 2) {
        var used = {}; on.forEach(function (k) { var o = cfg.sel[k]; if (o.tone) used[+o.ti || 0] = 1; });
        on.forEach(function (k) {
          var o = cfg.sel[k]; if (o.tone !== undefined) return;
          for (var i = 0; i < TONE_NAMES.length - 1; i++) if (!used[i]) { used[i] = 1; o.tone = true; o.ti = i; o.auto = true; if (touched.indexOf(k) < 0) touched.push(k); break; }   /* the start gun is never handed out */
        });
      }
    }
    save(); touched.forEach(rowSync);
  }
  /* settings row ↔ saved settings (also after changes made from the race board / favourites) */
  function rowSync(name) {
    var el = rows[name]; if (!el) return;
    var s = cfg.sel[name] || {};
    var ck = el.querySelector('input.o-on'), al = el.querySelector('input.al'), onm = el.querySelector('input.o-nm'), otn = el.querySelector('input.o-tn'), oti = el.querySelector('select.o-ti');
    ck.checked = !!s.on; if (document.activeElement !== al) al.value = s.alias || '';
    onm.checked = s.nm !== false; otn.checked = !!s.tone; oti.value = String(s.ti || 0); oti.disabled = !otn.checked;
    el.classList.toggle('on', !!s.on);
    el.querySelector('.vl-auto').style.display = s.on && s.tone && s.auto ? '' : 'none';
    var rm = el.querySelector('.vl-rm'), bits = [];
    if (!s.on && cfg.selKeep !== false) {
      if (s.tone) bits.push('<span class="vl-rmt">🔔 ' + esc(TONE_NAMES[+s.ti || 0] || '') + '</span>');
      if ((s.alias || '').trim()) bits.push('부를 이름 “' + esc(s.alias.trim()) + '”');
      if (s.nm === false) bits.push('이름 안 부름');
    }
    rm.innerHTML = bits.length ? '<span>해제됨 · 기억</span> ' + bits.join(' ') : '';
    rm.style.display = bits.length ? '' : 'none';
  }
  /* voice on/off for one driver from the race board — kept in step with the settings list */
  function toggleVoice(name) {
    var on = !(cfg.sel[name] && cfg.sel[name].on);
    setSel(name, { on: on });
    var el = rows[name];
    if (el) { el.querySelector('input.o-on').checked = on; el.classList.toggle('on', on); }
    count(); renderRaceBoard(true); if ($('vl_dfav')) dfavs();
  }
  function makeRow(name) {
    var el = document.createElement('div'); el.className = 'd';
    el.innerHTML = '<div class="r1"><input type="checkbox" class="o-on"><div class="nm"><small></small><span></span></div><input class="al" type="text" placeholder="부를 이름"><button class="vl-fv" title="즐겨찾기">☆</button></div>' +
      '<div class="r2"><span style="color:#999">읽기</span><label><input type="checkbox" class="o-nm">이름</label>' +
      '<label><input type="checkbox" class="o-tn">알림음</label><select class="o-ti" title="이 선수의 알림음">' + toneOpts() + '</select><span class="vl-auto">자동 지정</span>' +
      '<span style="color:#888;font-size:12px">둘 다면 알림음 → 이름</span></div><div class="vl-rm"></div>';
    var ck = el.querySelector('input.o-on'), al = el.querySelector('input.al');
    var onm = el.querySelector('input.o-nm'), otn = el.querySelector('input.o-tn'), oti = el.querySelector('select.o-ti');
    el.querySelector('.nm span').textContent = name;
    var fvb = el.querySelector('.vl-fv'); fvb.onclick = function () { favToggle(name); };
    el.querySelector('.nm').onclick = function () { ck.checked = !ck.checked; ck.onchange(); };
    rows[name] = el; rowSync(name);
    onm.onchange = function () { setSel(name, { nm: onm.checked }); };
    otn.onchange = function () { setSel(name, { tone: otn.checked, auto: false }); if (otn.checked) playTone(+oti.value); };
    oti.onchange = function () { setSel(name, { ti: +oti.value, auto: false }); playTone(+oti.value); };
    ck.onchange = function () {
      setSel(name, { on: ck.checked }); dfavs();
      if (ck.checked && !al.value) al.focus();
      count();
    };
    al.oninput = function () {
      var patch = { alias: al.value };
      if (al.value.trim() && !ck.checked) { ck.checked = true; patch.on = true; el.classList.add('on'); }
      setSel(name, patch); count();
    };
    rows[name] = el;
    return el;
  }
  /* Korean-aware search: plain substring, or initial consonants (초성) — 김남호 matches ㄱㄴㅎ, ㄱㄴ, ㄴㅎ, 김ㄴ —
     and the last typed syllable may still be incomplete (김나 → 김남). Spaces and letter case are ignored. */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function kmatch(text, q) {
    q = String(q || '').toLowerCase().replace(/\s+/g, ''); if (!q) return true;
    var t = String(text || '').toLowerCase().replace(/\s+/g, '');
    if (t.indexOf(q) >= 0) return true;
    function one(a, b, last) {
      if (a === b) return true;
      var bc = b.charCodeAt(0) - 0xAC00, ac = a.charCodeAt(0) - 0xAC00;
      if (CHO.indexOf(a) >= 0) return bc >= 0 && bc < 11172 && CHO[Math.floor(bc / 588)] === a;
      /* still typing the last syllable: same initial + vowel, no final consonant yet */
      return last && ac >= 0 && ac < 11172 && ac % 28 === 0 && bc >= 0 && bc < 11172 && Math.floor(ac / 28) === Math.floor(bc / 28);
    }
    for (var i = 0; i + q.length <= t.length; i++) {
      var ok = true;
      for (var j = 0; j < q.length && ok; j++) ok = one(q[j], t[i + j], j === q.length - 1);
      if (ok) return true;
    }
    return false;
  }
  function count() {
    var n = Object.keys(cfg.sel).filter(function (k) { return cfg.sel[k].on; }).length;
    $('vl_cnt').textContent = n ? n + '명 선택' : '';
  }
  function refreshDrivers() {
    var dd = (SC() || {}).driverData || {};
    var present = {};
    Object.keys(dd).forEach(function (k) {
      var d = dd[k]; if (!d || typeof d !== 'object') return;
      var n = nameOf(d); if (n) present[n] = +d.position || 999;
    });
    var names = Object.keys(present).sort(function (a, b) { return present[a] - present[b]; });
    Object.keys(cfg.sel).forEach(function (n) { if (cfg.sel[n].on && !(n in present)) names.push(n); });
    (cfg.favs || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });   /* favourites can be chosen before they are on track */
    var box = $('vl_drv');
    var typing = box.contains(document.activeElement);
    names.forEach(function (n) {
      var el = rows[n] || makeRow(n);
      el.classList.toggle('off', !(n in present));
      el.querySelector('small').textContent = n in present ? present[n] + '위' : (isFav(n) ? '★ 레이스에 없음' : '대기');
      var fb = el.querySelector('.vl-fv'); fb.classList.toggle('on', isFav(n)); fb.textContent = isFav(n) ? '★' : '☆';
      if (!typing || !el.parentNode) box.appendChild(el);
    });
    Object.keys(rows).forEach(function (n) { if (names.indexOf(n) < 0 && rows[n].parentNode && !typing) rows[n].remove(); });
    dfilter();
    var empty = box.querySelector('.empty');
    if (!names.length && !empty) box.innerHTML = '<div class="empty">아직 코스에 나온 선수가 없습니다. 주행이 시작되면 자동으로 나타납니다.</div>';
    else if (names.length && empty) empty.remove();
    count();
  }
  /* ---- favourites (★): kept by name, shown as chips under every driver search ---- */
  function isFav(n) { return (cfg.favs || []).indexOf(n) >= 0; }
  function favToggle(n) {
    var f = cfg.favs || (cfg.favs = []), i = f.indexOf(n);
    if (i < 0) f.push(n); else f.splice(i, 1);
    save(); refreshDrivers(); dfavs(); if (prac.rows && prac.rows.length) renderDrivers();
  }
  function dfavs() {   /* settings: favourite chips = voice on/off */
    var f = cfg.favs || [];
    $('vl_dfav').innerHTML = f.length ? '★ 즐겨찾기 ' + f.map(function (n) { var on = !!(cfg.sel[n] && cfg.sel[n].on); return '<button data-fn="' + esc(n) + '"' + (on ? ' class="on"' : '') + ' title="음성 안내 켜기/끄기">' + esc(n) + '</button>'; }).join('') : '';
  }
  $('vl_dfav').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[data-fn]'); if (b) { toggleVoice(b.getAttribute('data-fn')); dfavs(); } });
  /* settings driver list: filter rows in place (the search box itself is never rebuilt, so Korean input keeps composing) */
  function dfilter() {
    var q = ($('vl_dq').value || '').trim();
    Object.keys(rows).forEach(function (n) {
      var el = rows[n], al = el.querySelector('input[type=text]');
      el.style.display = !q || kmatch(n, q) || (al && kmatch(al.value, q)) ? '' : 'none';
    });
  }
  $('vl_dq').oninput = dfilter;
  refreshDrivers();
  dfavs();
  var timer2 = setInterval(refreshDrivers, 1500);

  /* ---------- lap time to speech ---------- */
  function sayTime(t) {
    if (!t) return '';
    var m = String(t).trim().match(/^(?:(\d+):)?(\d+)(?:\.(\d*))?$/); if (!m) return t;
    var min = +(m[1] || 0), dec = Math.max(0, Math.min(3, +cfg.dec || 0));
    var frac = ((m[3] || '') + '000').slice(0, dec);   /* cut off, never round */
    var s = (+m[2]) + (dec ? '.' + frac : '') + (cfg.unit === false ? '' : '초');
    return min ? min + '분 ' + s : s;
  }

  /* ---------- race board (RC Scoring Pro style) ---------- */
  var lastCross = {}, lastSig = '', paceSt = {}, avgSt = {}, lapHist = {}, lastGSig = '';
  /* one point per lap crossing: l lap, p position, t lap time, a average lap, b site F: so far, e elapsed, w wall clock (ms) */
  function recLap(d, key, lapsDown) {
    var L = +d.laps || 0, h = lapHist[key], E = secs(d.elapsedTime);
    if (!h && cfg.gBackfill !== false) h = lapHist[key] = lhTake(key, L, E);
    if (!h || lapsDown) h = lapHist[key] = [];
    if (L < 1) return;
    var last = h[h.length - 1];
    if (last && last.l === L) { if (+d.position) last.p = +d.position; return; }
    if (last && last.l > L) { h = lapHist[key] = []; last = null; }
    h.push({ l: L, p: +d.position || NaN, t: r3(secs(d.lapTime)), a: r3(secs(d.avgLap)), b: r3(siteFast(d)), e: r3(E), w: Date.now() });
    if ((DESK && DESK.appendLap) || cfg.syncUrl) deskLap(d, h);   /* PC app: the app itself copies its CSV files to Drive */
    if (h.length > 400) h.shift();
    lhDirty = true;
  }
  /* desktop app: every lap crossing goes to the day's CSV (laps_YYYY-MM-DD_<track>.csv) */
  function deskLap(d, h) {
    try {
      var r = (SC() || {}).raceData || {}, L = +d.laps || 0;
      var o = {
        host: location.host, cls: pageText('#class .value') || r.className || r.parsedHeat || '', round: pageText('#round .value') || r.roundNumber || '',
        race: pageText('#race .value') || r.raceNumber || '', pos: d.position || '', name: nameOf(d), car: d.carNum || '', lap: L,
        lapTime: d.lapTime || '', elapsed: d.elapsedTime || '', fast: d.fastLap || '', avgSite: d.avgLap || '', avgRule: (function () { var v = ruleAvg(h, L, secs(d.avgLap)); return v > 0 ? v.toFixed(3) : ''; })(),
        top3: d.top3Consecutive && d.top3Consecutive !== '0' ? d.top3Consecutive : ''
      };
      if (DESK && DESK.appendLap) DESK.appendLap(o);
      if (cfg.syncUrl && !DESK) {
        var st = vlStamp(new Date());
        syncAdd('laps_' + st.slice(0, 10) + '_' + vlSafe(o.host) + '.csv', [[st, vlSafe(o.host), o.cls, o.round, o.race, o.pos, o.name, o.car, o.lap, o.lapTime, o.elapsed, o.fast, o.avgSite, o.avgRule, o.top3].map(function (v) { return v === undefined || v === null ? '' : String(v); })]);
      }
    } catch (e) {}
  }
  function r3(v) { return v > 0 ? Math.round(v * 1000) / 1000 : NaN; }
  /* ---- the lap history survives a page reload within the same session ---- */
  var LHK = 'vlLapHist', lhStore, lhDirty = false, lhSaved = 0;
  function sessSig() { var r = (SC() || {}).raceData || {}; return [location.host, r.className, r.parsedHeat, r.roundNumber, r.raceNumber, r.race, r.heatNumber].join('|'); }
  function lhTake(key, L, E) {
    if (lhStore === undefined) { lhStore = null; try { var o = JSON.parse(localStorage.getItem(LHK) || 'null'); if (o && o.sig === sessSig() && Date.now() - o.ts < 4 * 3600e3) lhStore = o.h; } catch (e) {} }
    var h = lhStore && lhStore[key]; if (!h || !h.length) return undefined;
    var z = h[h.length - 1];
    /* same run = it started at the same moment (wall clock minus elapsed) and has not gone backwards */
    if (!(z.l <= L) || !(z.e > 0) || !(E > 0) || !(z.w > 0)) return undefined;
    if (Math.abs((Date.now() - E * 1000) - (z.w - z.e * 1000)) > 120000) return undefined;
    return h.map(function (x) { if (x.p === null) x.p = NaN; ['t', 'a', 'b', 'e'].forEach(function (k) { if (x[k] === null) x[k] = NaN; }); return x; });
  }
  function lhSave() {
    if (!lhDirty || Date.now() - lhSaved < 4000) return;
    lhDirty = false; lhSaved = Date.now();
    try { localStorage.setItem(LHK, JSON.stringify({ sig: sessSig(), ts: Date.now(), h: lapHist })); } catch (e) {}
  }
  /* ---- practice: laps run before the script started come from LiveRC's practice records ---- */
  var bf = { tried: {}, done: {}, busy: false, next: 0 };
  function isPractice(sc) {
    var r = (sc && sc.raceData) || {};
    return r.roundNumber === 'OP' || /practi/i.test((r.parsedHeat || '') + ' ' + (r.className || '') + ' ' + pageText('#class .value'));
  }
  function localMs(day, hms) { var t = new Date(day + 'T' + hms); return t.getTime(); }
  function backfill() {
    var sc = SC();
    if (cfg.gBackfill === false || bf.busy || Date.now() < bf.next || !sc || !sc.driverData || !isPractice(sc)) return;
    if (!(cfg.graphSel || []).length) return;
    var all = list(sc.driverData);
    var need = all.filter(function (d) {
      var k = keyOf(d), h = lapHist[k];
      return h && h.length && h[0].l > 1 && !bf.done[k] && (bf.tried[k] || 0) < 8;
    });
    if (!need.length) return;
    bf.busy = true; bf.next = Date.now() + 30000;
    var day = todayS();
    getDoc('/practice/?p=session_list&d=' + day).then(function (doc) {
      var rows = parseDay(doc), jobs = [];
      need.forEach(function (d) {
        var k = keyOf(d); bf.tried[k] = (bf.tried[k] || 0) + 1;
        var c = rows.filter(function (r) { return r[1] === nameOf(d); }).sort(function (a, b) { return a[4] < b[4] ? 1 : -1; });
        if (c.length) jobs.push({ d: d, k: k, rows: c.slice(0, 2) });
      });
      return pool(jobs, 3, function (j) {
        return j.rows.reduce(function (pr, r) {
          return pr.then(function (ok) { return ok || fetch(location.origin + '/practice/?p=view_session&id=' + r[0], { credentials: 'same-origin' }).then(function (x) { return x.text(); }).then(function (t) { return mergeRun(j.d, j.k, t, day); }); });
        }, Promise.resolve(false));
      });
    }).catch(function () {}).then(function () { bf.busy = false; rankBackfill(); lhDirty = true; renderGraphs(true); });
  }
  function mergeRun(d, k, html, day) {
    var m = html.match(/lapsObj\s*=\s*(\[[\s\S]*?\])\s*;/); if (!m) return false;
    var laps; try { laps = JSON.parse(m[1]); } catch (e) { return false; }
    laps = laps.map(function (x) { return { l: +x.x, t: parseFloat(x.lap_time), v: x.is_valid !== '0', w: localMs(x.date || day, x.time) }; })
      .filter(function (x) { return x.l > 0 && x.t > 0 && x.w > 0; }).sort(function (a, b) { return a.l - b.l; });
    var h = lapHist[k]; if (!laps.length || !h || !h.length) return false;
    var N = laps[laps.length - 1].l, z = h[h.length - 1], S = 0;
    laps.forEach(function (x) { S += x.t; });
    if (N > z.l) return false;
    /* same run: both started at the same wall-clock moment (first lap may include the pit-out, so allow it) */
    var liveStart = z.w - z.e * 1000, runStart = laps[laps.length - 1].w - S * 1000;
    if (!(Math.abs(liveStart - runStart) < 60000 + laps[0].t * 1000)) return false;
    var have = {}; h.forEach(function (x) { have[x.l] = 1; });
    var sum = 0, n = 0, best = NaN, cum = 0, add = [];
    laps.forEach(function (x) {
      cum += x.t;
      if (x.v) { sum += x.t; n++; if (!(best <= x.t)) best = x.t; }
      if (!have[x.l]) add.push({ l: x.l, p: NaN, t: r3(x.t), a: n ? r3(sum / n) : NaN, b: r3(best), e: r3(cum), w: x.w, bf: 1 });
    });
    if (add.length) { lapHist[k] = add.concat(h).sort(function (a, b) { return a.l - b.l; }); }
    if (N >= h[0].l - 1) bf.done[k] = true;
    return true;
  }
  /* positions for filled-in laps: rebuild the board at each crossing from everyone's history,
     ordered the way the board orders right now (practice usually by fast lap, races by laps then time) */
  function rankBackfill() {
    var sc = SC(); if (!sc || !sc.driverData) return;
    var all = list(sc.driverData), keys = all.map(keyOf);
    var byF = all.slice().sort(function (a, b) { var x = siteFast(a), y = siteFast(b); return (x > 0 ? x : 1e9) - (y > 0 ? y : 1e9); });
    var hit = byF.filter(function (d, i) { return +d.position === i + 1; }).length, fastRule = all.length > 1 && hit >= all.length * 0.8;
    keys.forEach(function (k) {
      (lapHist[k] || []).forEach(function (x) {
        if (!x.bf) return;
        var T = x.w, mine = fastRule ? x.b : x.l, better = 0;
        keys.forEach(function (o) {
          if (o === k) return;
          var oh = lapHist[o] || [], cur = null;
          for (var i = 0; i < oh.length && oh[i].w <= T; i++) cur = oh[i];
          if (!cur) return;
          if (fastRule ? (cur.b > 0 && (!(mine > 0) || cur.b < mine)) : (cur.l > mine || (cur.l === mine && cur.w < T))) better++;
        });
        x.p = better + 1;
      });
    });
  }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[Math.floor(b.length / 2)] : NaN; }
  /* small line chart over laps; smaller values (1st place, faster times) are drawn higher up */
  function lapChart(series, kind) {
    var W2 = 300, H = 170, L = 38, R = 8, T = 8, B = 20, pts = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { pts.push(p); }); });
    if (!pts.length) return '<div style="color:#777;font-size:12px;padding:30px 6px;text-align:center">아직 기록이 없습니다<br>선수가 라인을 지나면 그려집니다</div>';
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x0 === x1) { x0 -= 1; x1 += 1; }
    var y0, y1, cap = Infinity;
    if (kind === 'pos') { y0 = 1; y1 = Math.max(2, Math.max.apply(null, ys)); y0 -= 0.3; y1 += 0.3; }
    else {
      y0 = Math.min.apply(null, ys); cap = median(ys) * 1.35;   /* crash / pit laps would flatten everything else */
      y1 = Math.min(Math.max.apply(null, ys), cap); if (y1 - y0 < 0.2) { y0 -= 0.1; y1 += 0.1; }
      var pd = (y1 - y0) * 0.08; y0 -= pd; y1 += pd;
    }
    var X = function (x) { return L + (x - x0) / (x1 - x0) * (W2 - L - R); }, Y = function (y) { return T + (Math.min(y, y1) - y0) / (y1 - y0) * (H - T - B); };
    var g = '', i;
    if (kind === 'pos') {
      var step = Math.max(1, Math.ceil((Math.round(y1) - 1) / 5));
      for (i = 1; i <= Math.round(y1); i += step) g += '<line x1="' + L + '" x2="' + (W2 - R) + '" y1="' + Y(i) + '" y2="' + Y(i) + '" stroke="#24242a"/><text x="' + (L - 5) + '" y="' + (Y(i) + 4) + '" fill="#888" font-size="10" text-anchor="end">' + i + '위</text>';
    } else {
      for (i = 0; i <= 3; i++) { var yv = y0 + (y1 - y0) * i / 3; g += '<line x1="' + L + '" x2="' + (W2 - R) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '" stroke="#24242a"/><text x="' + (L - 5) + '" y="' + (Y(yv) + 4) + '" fill="#888" font-size="10" text-anchor="end">' + (yv < 60 ? yv.toFixed(1) : fmtS(yv).replace(/\.\d+$/, '')) + '</text>'; }
    }
    var nx = Math.min(5, x1 - x0 + 1);
    for (i = 0; i < nx; i++) { var xv = Math.round(x0 + (x1 - x0) * i / Math.max(1, nx - 1)); g += '<text x="' + X(xv) + '" y="' + (H - 6) + '" fill="#888" font-size="10" text-anchor="middle">' + xv + '</text>'; }
    series.filter(function (s) { return !s.v; }).concat(series.filter(function (s) { return s.v; })).forEach(function (s) {   /* 🔊 drivers on top, thicker */
      if (!s.pts.length) return;
      g += '<path d="' + s.pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.v ? 3.4 : 1.8) + '"/>';
      s.pts.forEach(function (p) {
        var out = p.y > y1;   /* clipped slow lap: hollow marker at the edge */
        g += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (s.v ? 3.4 : 2.6) + '" fill="' + (out ? '#0f0f12' : s.color) + '" stroke="' + s.color + '"><title>' +
          esc(s.name + ' · ' + p.x + '랩 · ' + (kind === 'pos' ? p.y + '위' : fmtS(p.y))) + '</title></circle>';
      });
    });
    return '<svg viewBox="0 0 ' + W2 + ' ' + H + '">' + g + '</svg>';
  }
  /* Open Practice: a driver who comes on track is ticked for the graphs by itself, one who leaves is taken off */
  var gPresent = null, gFocus = null, gFocusSel = '';
  /* graph ticks chosen for the user: everyone on track in Open Practice (setting), and the 🔊 voice drivers (setting).
     cfg.graphAuto = names ticked by the voice rule (taken off again when their voice goes off); gNo = names the user un-ticked this session */
  var gNo = {}, gNoSid = '';
  function autoGraph(sc, present, presentD) {
    var sel = cfg.graphSel || (cfg.graphSel = []), ch = false, sid = sc ? sessId(sc) : '';
    if (sid !== gNoSid) { gNo = {}; gNoSid = sid; }
    if (sc && isPractice(sc) && cfg.gAllPrac !== false) {
      Object.keys(present).forEach(function (n) { if ((!gPresent || !gPresent[n]) && sel.indexOf(n) < 0 && !gNo[n]) { sel.push(n); ch = true; } });
      for (var i = sel.length - 1; i >= 0; i--) if (!present[sel[i]]) { sel.splice(i, 1); ch = true; }
      gPresent = Object.assign({}, present);
    } else gPresent = null;
    var ga = cfg.graphAuto || (cfg.graphAuto = {});
    Object.keys(presentD || {}).forEach(function (n) {
      var v = cfg.gVoice !== false && !!match(presentD[n]);
      if (v && !gNo[n] && sel.indexOf(n) < 0) { sel.push(n); ga[n] = 1; ch = true; }
      else if (!v && ga[n]) { var j = sel.indexOf(n); if (j >= 0) { sel.splice(j, 1); ch = true; } delete ga[n]; ch = true; }
    });
    if (ch) save();
  }
  function renderGraphs(force) {
    var show = cfg.gShow || {};
    var sc = SC(), present = {};
    var presentD = {}, vmap = {};
    if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { if (nameOf(d)) { present[nameOf(d)] = keyOf(d); presentD[nameOf(d)] = d; if (match(d)) vmap[nameOf(d)] = 1; } });
    autoGraph(sc, present, presentD);
    var sel = cfg.graphSel || [];
    /* only drivers still on the timing screen get a column / a line (colour stays with the tick order) */
    var ser = sel.map(function (n, i) { var k = present[n]; return { name: n, color: PCOL[i % PCOL.length], k: k, h: (k && lapHist[k]) || [], v: cfg.gVoiceBold !== false && !!vmap[n] }; }).filter(function (s) { return s.k; });
    if (sel.join('\n') !== gFocusSel) { gFocusSel = sel.join('\n'); gFocus = null; }   /* ticking someone else = back to all */
    if (gFocus && !ser.some(function (s) { return s.name === gFocus; })) gFocus = null;
    if (show.list === undefined) show.list = true;
    var gsig = JSON.stringify([gFocus, show, ser.map(function (s) { return s.v ? 1 : 0; }), cfg.avgMode, cfg.avgOut, cfg.lapDev, cfg.lapNear, cfg.lapFar, cfg.lapBest, ser.map(function (s) { return [s.name, s.h.length, s.h.length ? s.h[0] : 0, s.h.length ? s.h[s.h.length - 1] : 0]; })]);
    if (gsig === lastGSig && !force) return;
    lastGSig = gsig;
    root.querySelectorAll('#vl_gbar .gch[data-g]').forEach(function (b) { b.classList.toggle('on', !!show[b.getAttribute('data-g')]); });
    $('vl_gclr').style.display = sel.length ? '' : 'none';
    sel = ser.map(function (s) { return s.name; });

    $('vl_ghint').textContent = sel.length ? '' : '표에서 ☐를 체크한 선수가 그래프에 그려집니다';
    $('vl_glg').innerHTML = ser.map(function (s) { return '<span data-gf="' + esc(s.name) + '" class="' + (gFocus ? (gFocus === s.name ? 'on' : 'off') : '') + '" title="눌러서 랩타임 변화를 이 선수만 보기 (다시 누르면 전체)"><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') +
      (ser.length > 1 && show.lap ? '<span class="gfh">' + (gFocus ? '이름을 다시 누르면 전체 보기' : '이름을 누르면 랩타임 변화를 그 선수만') + '</span>' : '');
    /* lap lists like the practice session list: one column per selected driver, side by side, newest lap in view */
    var dByKey = {}; if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { dByKey[keyOf(d)] = d; });
    var siteBest = function (s, lst) {
      var d = dByKey[s.k], f = d ? siteFast(d) : NaN;
      /* LiveRC's F: of this session; if the site has none right now, the last F: seen in this session (the lap history starts over with every session) */
      if (!(f > 0)) for (var i = s.h.length - 1; i >= 0; i--) if (s.h[i].b > 0) { f = s.h[i].b; break; }
      lst.best = f; lst.bestOn = d ? +d.fastLapOn || 0 : 0; return lst;
    };
    $('vl_glaps').innerHTML = !sel.length || !show.list ? '' : '<div class="glrow">' + ser.map(function (s) {
      var lst = siteBest(s, s.h.filter(function (e) { return e.t > 0; }).map(function (e) { return { n: e.l, v: e.t, p: e.p }; }));
      return '<div class="glc"><h5 data-gf="' + esc(s.name) + '" title="눌러서 랩타임 변화를 이 선수만 보기"><i style="background:' + s.color + '"></i>' + esc(s.name) + '<small>' + (lst.length ? lst.length + '랩' : '') + '</small></h5>' + lapSum(lst) + '<div class="ll">' +
        (lst.length ? lapTbl(lst, !isPractice(sc)) : '<div style="color:#777;font-size:12px;padding:12px">아직 기록이 없습니다</div>') + '</div></div>';
    }).join('') + '</div><div class="glk">' + lapKey(null, true) + '</div>';
    fitWidths();
    var kinds = [['pos', '순위 변화', function (e) { return e.p; }], ['lap', '랩타임 변화', function (e) { return e.t; }], ['avg', '평균 랩 변화', null]];
    $('vl_graphs').innerHTML = !sel.length ? '' : kinds.filter(function (k) { return show[k[0]]; }).map(function (k) {
      var series = ser.map(function (s) { return { name: s.name, color: s.color, v: s.v, pts: s.h.map(function (e, i) { return { x: e.l, y: k[2] ? k[2](e) : ruleAvg(s.h.slice(0, i + 1), e.l, e.a) }; }).filter(function (p) { return p.y > 0; }) }; });
      /* one driver: the lap-time chart looks like the session one (best / within / over colours, dashed best + seconds) */
      var one = k[0] === 'lap' && (ser.length === 1 || gFocus) ? (ser.filter(function (s) { return s.name === gFocus; })[0] || ser[0]) : null;
      var body = one ? lapSvg(siteBest(one, one.h.filter(function (e) { return e.t > 0; }).map(function (e) { return { n: e.l, v: e.t }; })), 300, 170) : lapChart(series, k[0]);
      return '<div class="gc"><h5><span>' + k[1] + (one && ser.length > 1 ? ' · <b style="color:' + one.color + '">' + esc(one.name) + '</b>' : '') + '</span><small>X = 랩 · 위쪽이 ' + (k[0] === 'pos' ? '앞 순위' : '빠름') + (one ? ' · 점선 = 베스트 + ' + lapCols().dev + '초' : '') + '</small></h5>' + body + '</div>';
    }).join('');
  }
  function paceVal(p) { var m = String(p || '').match(/^(\d+)\/(.+)$/); if (!m) return NaN; var t = secs(m[2]); return t >= 0 ? +m[1] * 1e6 - t : NaN; }
  /* bigger value = faster. dir: 1 faster, -1 slower, 0 none (kept until the value changes again) */
  function trend(store, key, raw, val, lapsDown) {
    var st = store[key], v = val(raw);
    if (!st || lapsDown) { store[key] = { p: raw, dir: 0 }; return; }   /* first sight / new session: no colour yet */
    if (String(raw) === String(st.p) || !(v === v)) return;
    var pv = val(st.p);
    st.dir = pv === pv ? (v > pv + 0.0005 ? 1 : (v < pv - 0.0005 ? -1 : 0)) : 0;
    st.p = raw;
  }
  function avgVal(a) { var v = secs(a); return v > 0 ? -v : NaN; }
  function trackPace(d, key, lapsDown) { trend(paceSt, key, d.pace, paceVal, lapsDown); trend(avgSt, key, d.avgLap, avgVal, lapsDown); }
  function trendCls(st) { return st ? (st.dir > 0 ? 'pu' : (st.dir < 0 ? 'pd' : '')) : ''; }
  function fmtAvg(a) { var v = secs(a); return v > 0 ? fmtS(v) : '-'; }
  /* average lap: up to 10 laps = mean of all laps, after that = mean of the 10 fastest laps.
     h = this driver's lap history (lap numbers 1..L when complete); site = LiveRC's own average as fallback */
  function ruleAvg(h, L, site) {
    if (cfg.avgMode === 'site' || !(L > 0)) return site;
    var ts = [], seen = {};
    for (var i = 0; i < h.length; i++) { var e = h[i]; if (e.l <= L && e.t > 0 && !seen[e.l]) { seen[e.l] = 1; ts.push(e.t); } }
    if (L <= 10) { if (ts.length < L) return site; }
    else { if (ts.length < 10) return site; ts = dropOut(ts).sort(function (a, b) { return a - b; }).slice(0, 10); }
    ts = dropOut(ts);
    var sum = 0; ts.forEach(function (x) { sum += x; });
    return Math.round(sum / ts.length * 1000) / 1000;
  }
  /* leave out laps far from the typical lap (pit-out, crash, cut): more than avgOut % from the median */
  function dropOut(ts) {
    var pct = +cfg.avgOut || 0; if (!pct || ts.length < 2) return ts;
    var b = ts.slice().sort(function (x, y) { return x - y; }), med = b[Math.floor((b.length - 1) / 2)];
    var keep = ts.filter(function (x) { return Math.abs(x - med) <= med * pct / 100; });
    return keep.length ? keep : ts;
  }
  function avgOf(d) { return ruleAvg(lapHist[keyOf(d)] || [], +d.laps || 0, secs(d.avgLap)); }
  /* behind of each car vs the car right ahead: v = same-lap seconds, or NaN when a lap or more down */
  var bhdSt = {};
  function bhdNow(d, prev, T) {
    if (!prev || !(+d.laps > 0)) return null;
    var gi = gapInfo(d, prev, T);
    if (gi && gi.laps > 0) return { lap: gi.laps, v: NaN, t: gi.time };
    if (gi && gi.time >= 0) return { lap: 0, v: gi.time };
    return null;
  }
  function trackBhd(all) {
    var T = raceClock(all), srt = all.slice().sort(function (a, b) { return (+a.position || 999) - (+b.position || 999); });
    srt.forEach(function (d, i) {
      var k = keyOf(d), L = +d.laps || 0, b = bhdNow(d, srt[i - 1], T), st = bhdSt[k];
      if (st && L < st.L) st = bhdSt[k] = null;
      if (!b) { if (st) st.L = L; return; }
      if (!st) { bhdSt[k] = { L: L, v: b.v, dl: NaN }; return; }
      var changed = (b.v >= 0) !== (st.v >= 0) || (b.v >= 0 && Math.abs(b.v - st.v) > 0.0005);
      if (changed) { st.dl = b.v >= 0 && st.v >= 0 ? Math.round((b.v - st.v) * 1000) / 1000 : NaN; st.v = b.v; }
      st.L = L;
    });
  }
  function short(t) { return t ? String(t).replace(/^0:/, '') : '-'; }
  function fmtS(v) {
    if (!(v > 0)) return '-';
    if (v < 60) return v.toFixed(3);
    var m = Math.floor(v / 60), r = v - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(3);
  }
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pageText(sel) { try { var w = SCW(); var el = w && w.document.querySelector(sel); return el ? el.textContent.trim() : ''; } catch (e) { return ''; } }
  var COLDEF = {
    p: { lg: 'P', sm: 'P', ko: '순위 (P)', fixed: 1 }, nm: { lg: 'Name', sm: 'Name', ko: '이름 (Name)', fixed: 1 }, l: { lg: 'Laps', sm: 'L', ko: '랩 수 (Laps) — 랩 · 통과 시각 · 진행 중 시간' },
    el: { lg: '경과 시간', sm: '경과', ko: '경과 시간 (Elapsed)' }, bhd: { lg: 'Behind', sm: 'Bhd', ko: '앞차와 차이 (Behind)' },
    pace: { lg: 'Pace', sm: 'Pace', ko: '페이스 (Pace)' }, avg: { lg: 'Avg Lap', sm: 'Avg', ko: '평균 랩 (Avg Lap)' },
    last: { lg: 'Last Lap', sm: 'Last', ko: '마지막 랩 (Last Lap)' }, fast: { lg: 'Fast Lap', sm: 'Fast', ko: '베스트 랩 (Fast Lap)' },
    t3: { lg: 'Top 3', sm: 'Top3', ko: '연속 3랩 (Top 3)' }
  };
  var COLDEFAULT = ['p', 'nm', 'l', 'last', 'bhd', 'avg', 't3', 'fast', 'pace', 'el'];
  function colOrder() {   /* saved order, plus any column added in a later version */
    var o = (cfg.colOrder || COLDEFAULT).filter(function (k) { return COLDEF[k]; });
    COLDEFAULT.forEach(function (k, i) {   /* a new column goes right after the one it follows by default */
      if (o.indexOf(k) >= 0) return;
      var at = i > 0 ? o.indexOf(COLDEFAULT[i - 1]) : -1;
      if (at >= 0) o.splice(at + 1, 0, k); else o.push(k);
    });
    return o;
  }
  function COLS() {
    var o = colOrder().filter(function (k) { return COLDEF[k].fixed || !cfg.colHide[k]; });
    return [{ k: 'sel', lg: '', sm: '' }].concat(o.map(function (k) { return { k: k, lg: COLDEF[k].lg, sm: COLDEF[k].sm }; }));   /* graph checkbox column always first */
  }
  function renderColList() {
    var o = colOrder();
    $('vl_cols').innerHTML = o.map(function (k, i) {
      var d = COLDEF[k], show = d.fixed || !cfg.colHide[k];
      return '<div class="cr' + (show ? '' : ' off') + '"><input type="checkbox" data-show="' + k + '"' + (show ? ' checked' : '') + (d.fixed ? ' disabled title="항상 표시"' : '') + '>' +
        '<span class="cl">' + d.ko + '</span>' +
        '<button data-mv="-1" data-k="' + k + '"' + (i === 0 ? ' disabled' : '') + ' title="왼쪽으로">▲</button>' +
        '<button data-mv="1" data-k="' + k + '"' + (i === o.length - 1 ? ' disabled' : '') + ' title="오른쪽으로">▼</button></div>';
    }).join('');
  }
  /* sorting: dir 1 = ascending; empty values ('-') always go last */
  var SORT_DEF = { p: 1, nm: 1, l: -1, el: 1, bhd: 1, pace: -1, avg: 1, last: 1, fast: 1, t3: 1 };
  function sortVal(r, k) {
    if (k === 'nm') return r.nm;
    if (k === 'pace') { var m = String(r.pace).match(/^(\d+)\/(.+)$/); return m ? +m[1] * 1e6 - secs(m[2]) : NaN; }   /* more laps first, then faster */
    if (k === 'bhd') return r.bhdN;   /* lap gaps sort after any same-lap time gap */
    if (k === 'p' || k === 't3') return parseFloat(r[k]);
    if (k === 'l') { var pe = secs(r.el); return parseFloat(r.l) * 1e6 - (pe >= 0 ? pe : 0); }   /* more laps first, then the one that crossed first */
    return secs(r[k]);
  }
  function sortRows(rows) {
    var k = cfg.sortK || 'p', d = cfg.sortD || 1;
    return rows.slice().sort(function (a, b) {
      if (k === 'nm') return d * String(a.nm).localeCompare(String(b.nm), 'ko');
      var x = sortVal(a, k), y = sortVal(b, k), xn = isNaN(x), yn = isNaN(y);
      if (xn || yn) return xn && yn ? (+a.p || 999) - (+b.p || 999) : (xn ? 1 : -1);
      return x === y ? (+a.p || 999) - (+b.p || 999) : d * (x - y);
    });
  }
  function onSort(k) {
    if (!k) return;
    if (cfg.sortK === k) cfg.sortD = -(cfg.sortD || 1); else { cfg.sortK = k; cfg.sortD = SORT_DEF[k] || 1; }
    save(); renderRaceBoard(true);
  }
  /* colour c over the board background at strength a, as an opaque rgb() */
  function mix(c, a, bg) {
    var h = /^#([0-9a-f]{6})$/i.exec(c) || ['', 'ff5252'], g = /^#([0-9a-f]{6})$/i.exec(bg || '#0b0b0d');
    var x = parseInt(h[1], 16), y = parseInt(g[1], 16);
    function ch(sh) { var p = (x >> sh) & 255, q = (y >> sh) & 255; return Math.round(q + (p - q) * a); }
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }
  /* 👤 big view: one large card per voice driver on track (pit wall / phone on a stand) — position, laps, last lap, lap in progress, best, gaps */
  function renderBig(rows, closeCol) {
    var on = !!cfg.bigView, mine = rows.filter(function (r) { return r.mine; }), box = $('vl_big');
    $('vl_bigb').classList.toggle('on', on);
    $('vl_rb').classList.toggle('vl-bigon', on && mine.length > 0);
    if (!on || !mine.length) { if (box.innerHTML) box.innerHTML = ''; return; }
    var C = lapCols(), wide = panel.classList.contains('wide'), n = Math.min(mine.length, wide ? 3 : 2);
    box.style.setProperty('--n', n); box.classList.toggle('two', mine.length > 1);
    var pred = (qd && qd.pred) || {}, tq = qd && qd.tq;
    var col = function (r) { return r.ls > 0 && r.bn > 0 ? lapCol(r.ls, r.bn, C) : '#fff'; };
    /* the car ahead / behind gets its own card only while it is a close battle with this driver */
    var rival = function (r, cls, lab, gap) {
      return '<div class="vl-bc rv ' + cls + '" style="--cc:' + closeCol + '"><div class="rv-h"><span>' + lab + '</span><span class="rv-p">P' + esc(r.p || '-') + '</span><span class="rv-n">' + (r.fin ? '🏁 ' : '') + esc(r.nm) + '</span></div>' +
        '<div class="rv-m"><span class="rv-t" style="color:' + col(r) + '">' + esc(r.last) + '</span><span class="rv-g">' + esc(gap) + '</span></div></div>';
    };
    box.innerHTML = mine.map(function (r) {
      var i = rows.indexOf(r), ahead = rows[i - 1], back = rows[i + 1], lc = col(r), dl = r.ls > 0 && r.bn > 0 ? r.ls - r.bn : NaN;
      var dTxt = dl === dl ? (dl < -0.0005 ? '제외' : dl < 0.0005 ? '베스트' : '+' + dl.toFixed(3)) : '';
      var gapA = r.p == 1 ? '선두' : r.bhd, gapB = back ? back.bhd : '-';
      var cell = function (k, v, cls, st) { return '<div><div class="bc-k">' + k + '</div><div class="bc-v' + (cls ? ' ' + cls : '') + '"' + (st || '') + '>' + v + '</div></div>'; };
      var q = pred[nmKey(r.nm)], qTxt = '';
      if (q) qTxt = '<div class="bc-q">🏆 <span>예선 예상</span><b>' + (q.rank ? q.rank + '위' : '대기') + '</b>' + (q.chg ? '<span class="' + (q.chg > 0 ? 'up' : 'dn') + '">' + (q.chg > 0 ? '▲' : '▼') + Math.abs(q.chg) + '</span>' : '') +
        (q.rank === 1 ? '<span class="up">TQ</span>' : tq ? '<span>· TQ 예상 ' + esc(tq) + '</span>' : '') + '</div>';
      return '<div class="bcol">' +
        (r.closeTo && ahead ? rival(ahead, 'ah', '▲ 앞차', r.bhd + '초 앞') : '') +
        '<div class="vl-bc mine">' +
        '<div class="bc-top"><span class="bc-p"><small>P</small>' + esc(r.p || '-') + '</span><span class="bc-nm">' + (r.tc ? '<i class="tmd" style="background:' + esc(r.tc) + ';width:.6em;height:.6em"></i>' : '') + (r.fin ? '🏁 ' : '') + esc(r.alias || r.nm) + '</span><span class="bc-l">' + (+r.l || 0) + '랩</span></div>' + qTxt +
        '<div class="bc-main"><div class="bc-k">LAST LAP</div><div class="bc-last" style="color:' + lc + '">' + esc(r.last) + '</div><div class="bc-d" style="color:' + lc + '">' + dTxt + '</div></div>' +
        '<div class="bc-row">' +
          cell('진행 중', '-', 'lt', ' data-lt="' + esc(r.key) + '"') +
          cell('베스트', esc(r.fast)) +
          cell('앞차', esc(gapA), r.closeTo ? 'cl' : '', r.closeTo ? ' style="--cc:' + closeCol + '"' : '') +
          cell('뒤차', esc(gapB), back && back.closeTo ? 'cl' : '', back && back.closeTo ? ' style="--cc:' + closeCol + '"' : '') +
        '</div></div>' +
        (back && back.closeTo ? rival(back, 'bh', '▼ 뒤차', back.bhd + '초 뒤') : '') +
        '</div>';
    }).join('');
  }
  function renderRaceBoard(force) {
    if (cfg.tab !== 'board' && !force) return;
    renderGraphs(force);
    var sc = SC(), dd = sc && sc.driverData, now = Date.now();
    var all = dd ? list(dd).filter(function (d) { return nameOf(d); }) : [];
    all.sort(function (a, b) { return (+a.position || 999) - (+b.position || 999); });
    var bests = all.map(siteFast);
    var raceBest = Math.min.apply(null, bests.filter(function (x) { return x > 0; }).concat([Infinity]));
    var prc = isPractice(sc), raceT = raceClock(all);
    var fin = cfg.raceOn !== false && cfg.finOn !== false && !prc && rs && rs.id === sessId(sc) ? rs.fin : {};
    var leadL = all.length ? (+all[0].laps || 0) : 0, closeOk = !prc && leadL >= (cfg.closeAfter === undefined ? 3 : +cfg.closeAfter);
    var cols = COLS().filter(function (c) { return !(prc && c.k === 'bhd'); });   /* open practice: no Behind at all */
    var rowsData = all.map(function (d, i) {
      var key = keyOf(d), prev = all[i - 1], best = bests[i], lapS = secs(d.lapTime);
      var bhd = '-', bhdN = NaN;
      if (prev && +d.laps > 0) {
        var gi = gapInfo(d, prev, raceT);   /* brought up to date whenever any car crosses */
        if (gi && gi.laps > 0) { bhd = '+' + gi.laps + 'L'; bhdN = gi.laps * 1e5 + (gi.time > 0 ? gi.time : 0); }
        else if (gi && gi.time >= 0) { bhd = gi.time.toFixed(3); bhdN = gi.time; }
      }
      var m = match(d), av = avgOf(d), bs = bhdSt[key], bm = cfg.paceColor !== false && cfg.trendSrc === 'best';
      var bd = cfg.raceOn !== false && cfg.bhdColor !== false && bs && bhd.charAt(0) !== '+' && bhd !== '-' && bs.dl === bs.dl && Math.abs(bs.dl) >= 0.0005 ? bs.dl : NaN;
      return {
        key: key, p: d.position || '', nm: nameOf(d), car: d.carNum || '', l: d.laps || '0', el: short(d.elapsedTime), bhd: bhd, bhdN: bhdN, pace: d.pace || '-', avg: av > 0 ? fmtS(av) : '-',
        bhdD: bd, bhdCls: bd < 0 ? 'pu' : (bd > 0 ? 'pd' : ''),
        lastD: cfg.paceColor !== false && cfg.trendSrc === 'avg' && lapS > 0 && av > 0 ? Math.round((lapS - av) * 1000) / 1000 : NaN,
        /* "베스트 랩 차이": this lap against the driver's best (site F:), coloured like the session lap lists */
        lastBD: bm && lapS > 0 && best > 0 ? Math.round((lapS - best) * 1000) / 1000 : NaN, lastBC: bm && lapS > 0 && best > 0 ? lapCol(lapS, best, lapCols()) : '',
        paceCls: cfg.paceColor !== false && cfg.trendSrc !== 'avg' ? trendCls(paceSt[key]) : '',
        avgCls: '',
        last: short(d.lapTime), fast: fmtS(best), t3: d.top3Consecutive && d.top3Consecutive !== '0' ? d.top3Consecutive : '-',
        lastCls: lapS > 0 && Math.abs(lapS - raceBest) < 0.0005 ? 'rf' : (lapS > 0 && Math.abs(lapS - best) < 0.0005 ? 'pb' : '') ||
          /* "평균 랩" colour source: last lap against the driver's average */
          (cfg.paceColor !== false && cfg.trendSrc === 'avg' && lapS > 0 && av > 0 && Math.abs(lapS - av) >= 0.0005 ? (lapS < av ? 'pu' : 'pd') : ''),
        fastCls: best > 0 && Math.abs(best - raceBest) < 0.0005 ? 'rf' : '',
        mine: !!m, isNew: now - (lastCross[key] || 0) < 2500, ls: lapS > 0 ? lapS : 0, bn: best > 0 ? best : 0, alias: m && m.alias ? m.alias : '',
        fin: fin[key] || 0, tc: cfg.teamOn && teams().length >= 2 ? ((teamOfName(nameOf(d)) || {}).color || '#444') : '', close: false, closeTo: !!(cfg.raceOn !== false && cfg.closeOn && closeOk && bhd.charAt(0) !== '+' && bhdN >= 0 && bhdN <= (+cfg.closeSec || 0) + 0.0005)
      };
    });
    /* a close gap colours both cars: the chaser and the car right ahead */
    rowsData.forEach(function (r, i) { if (r.closeTo && r.fin && rowsData[i - 1] && rowsData[i - 1].fin) r.closeTo = false; });   /* both finished: no battle any more */
    rowsData.forEach(function (r, i) { if (r.closeTo) { r.close = true; if (rowsData[i - 1]) rowsData[i - 1].close = true; } });
    var bE = 0; try { bE = mainBumpE(); } catch (e) {}
    rowsData.forEach(function (r, i) { r.bmp = bE > 0 && i < bE; r.bline = bE > 0 && i === bE - 1; });   /* 🏆 lower main: places that move up */
    var closeCol = /^#[0-9a-f]{6}$/i.test(cfg.closeColor) ? cfg.closeColor : '#ff2bd6';
    var hdr = { cls: pageText('#class .value') || (sc && sc.raceData && sc.raceData.className) || 'LIVE',
      rnd: [pageText('#round .value') && 'Round ' + pageText('#round .value'), pageText('#race .value') && 'Race ' + pageText('#race .value')].filter(Boolean).join(' · '),
      rem: pageText('#time_remaining .value'), ela: pageText('#time_elapsed .value'),
      color: (sc && sc.raceData && sc.raceData.raceClassColor) || '#01B2F0' };
    renderBig(rowsData, closeCol);
    rowsData = sortRows(rowsData);   /* Behind was computed in position order above; only the display order changes */
    var sig = JSON.stringify([rowsData, hdr, cols.map(function (c) { return c.k; }), cfg.sortK, cfg.sortD, closeCol, cfg.trendSrc, cfg.paceColor, cfg.graphSel, cfg.lapLive, cfg.lapPass, cfg.raceOn, cfg.finOn, cfg.bigView, prc, cfg.lapDev, cfg.lapNear, cfg.lapFar, cfg.lapBest]);
    if (sig === lastSig && !force) return;
    lastSig = sig;
    var hb = $('vl_hdr'), col = /^#?[0-9a-f]{6}$/i.test(hdr.color.replace('#', '')) ? (hdr.color[0] === '#' ? hdr.color : '#' + hdr.color) : '#01B2F0';
    var rgb = parseInt(col.slice(1), 16), lum = ((rgb >> 16) * 299 + ((rgb >> 8) & 255) * 587 + (rgb & 255) * 114) / 1000;
    hb.style.background = col; hb.style.color = lum > 140 ? '#000' : '#fff';
    $('vl_cls').textContent = hdr.cls;
    $('vl_rnd').textContent = hdr.rnd;
    $('vl_rem').textContent = hdr.rem || '0:00';
    var cbOn = cfg.raceOn !== false && !!cfg.closeOn && !prc;
    $('vl_lgcl').style.display = cbOn ? '' : 'none'; $('vl_rb').classList.toggle('vl-cbon', cbOn);
    $('vl_lgfin').style.display = rowsData.some(function (r) { return r.fin; }) ? '' : 'none'; $('vl_lgpc').style.display = cfg.paceColor !== false ? '' : 'none'; $('vl_lgpc').innerHTML = cfg.trendSrc === 'best' ? (function () { var C = lapCols(); return 'Last Lap 베스트와 차이 <b style="color:' + C.B + '">베스트</b>/<b style="color:' + C.N + '">' + C.dev + '초 이하</b>/<b style="color:' + C.F + '">그 이상</b>'; })() : cfg.trendSrc === 'avg' ? 'Last Lap 평균보다 <b class="pu">빠름</b>/<b class="pd">느림</b>' : 'Pace <b class="pu">빨라짐</b>/<b class="pd">느려짐</b>'; $('vl_lgbd').style.display = cfg.raceOn !== false && cfg.bhdColor !== false ? '' : 'none'; $('vl_lgclc').style.setProperty('--cc', closeCol);
    $('vl_clk').textContent = hdr.ela || '';
    $('vl_elab').style.display = hdr.ela ? '' : 'none';
    $('vl_rbh').innerHTML = '<tr>' + cols.map(function (c) {
      if (c.k === 'sel') return '<th class="c-sel" title="체크한 선수를 아래 그래프에 표시">📈</th>';
      var on = (cfg.sortK || 'p') === c.k;
      return '<th class="c-' + c.k + (on ? ' sorted' : '') + '" data-k="' + c.k + '" title="눌러서 정렬"><span class="lg">' + c.lg + '</span><span class="sm">' + c.sm + '</span>' + (on ? '<span class="ar">' + ((cfg.sortD || 1) > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr>';
    if (!rowsData.length) { $('vl_rbb').innerHTML = '<tr><td class="empty" colspan="' + cols.length + '">코스에 나온 선수가 없습니다. 주행이 시작되면 자동으로 표시됩니다.</td></tr>'; renderQual(); return; }
    $('vl_rbb').innerHTML = rowsData.map(function (r, ri) {
      var cs = '';   /* close battles: no row colour any more (it clashed with the lap-update colours) → neon arrow in the P cell */
      var prv = rowsData[ri - 1], chase = r.closeTo && prv && +prv.p === +r.p - 1;
      return '<tr class="' + (r.mine ? 'vl-mine ' : '') + (r.isNew ? 'vl-new ' : '') + (r.close ? 'vl-close ' : '') + (r.bline ? 'vl-bline' : '') + '" data-n="' + esc(r.nm) + '">' + cols.map(function (c) {
        if (c.k === 'sel') { var gi = cfg.graphSel.indexOf(r.nm); return '<td class="c-sel"' + cs + '><input type="checkbox" data-g="' + esc(r.nm) + '"' + (gi >= 0 ? ' checked' : '') + ' title="그래프에 표시">' + (gi >= 0 ? '<i style="background:' + PCOL[gi % PCOL.length] + '"></i>' : '') + '</td>'; }
        if (c.k === 'p') return '<td class="c-p">' + esc(r.p) + (chase ? '<span class="vl-cbl" style="--cc:' + closeCol + '" title="접전: 앞 선수와 ' + esc(r.bhd) + '초"></span>' : '') + '</td>';
        if (c.k === 'pace') return '<td class="c-pace ' + r.paceCls + '"' + cs + '>' + esc(r.pace) + '</td>';
        if (c.k === 'avg') return '<td class="c-avg ' + r.avgCls + '"' + cs + '>' + esc(r.avg) + '</td>';
        var dtx = r.bhdD === r.bhdD ? '<small class="' + r.bhdCls + '">(' + (r.bhdD > 0 ? '+' : '−') + Math.abs(r.bhdD).toFixed(3) + ')</small>' : '';
        if (c.k === 'bhd' && r.closeTo) return '<td class="c-bhd"' + cs + '><b style="color:' + closeCol + '">' + esc(r.bhd) + '</b>' + dtx + '</td>';
        if (c.k === 'nm') return '<td class="c-nm" title="눌러서 음성 안내 켜기/끄기"' + cs + '>' + (r.tc ? '<i class="tmd tmdb" style="background:' + esc(r.tc) + '" title="팀 — 눌러서 바꾸기"></i>' : '') + (r.bmp ? '<span class="vl-bmp" title="위 메인으로 범프 업">⬆</span>' : '') + (r.fin ? '<span class="vl-fin" title="완주 — 남은 시간이 끝난 뒤 라인 통과 (' + r.fin + '등)">🏁</span>' : '') + (r.mine ? '<span class="vo">🔊</span>' : '') + esc(r.nm) + (r.car ? '<small>#' + esc(r.car) + '</small>' : '') + '</td>';
        if (c.k === 'last' && r.lastBC) return '<td class="c-last"' + cs + '><b style="color:' + r.lastBC + '">' + esc(r.last) + '</b><small style="color:' + r.lastBC + '">(' + (r.lastBD < 0.0005 ? '베스트' : '+' + r.lastBD.toFixed(3)) + ')</small>' +
          (r.lastD === r.lastD ? '<small class="' + (r.lastD < 0 ? 'pu' : (r.lastD > 0 ? 'pd' : '')) + '">(평균 ' + (r.lastD > 0 ? '+' : (r.lastD < 0 ? '−' : '±')) + Math.abs(r.lastD).toFixed(3) + ')</small>' : '') + '</td>';
        if (c.k === 'last') return '<td class="c-last ' + r.lastCls + '"' + cs + '>' + esc(r.last) + (r.lastD === r.lastD ? '<small class="' + (r.lastD < 0 ? 'pu' : (r.lastD > 0 ? 'pd' : '')) + '">(' + (r.lastD > 0 ? '+' : (r.lastD < 0 ? '−' : '±')) + Math.abs(r.lastD).toFixed(3) + ')</small>' : '') + '</td>';
        if (c.k === 'fast') return '<td class="c-fast ' + r.fastCls + '"' + cs + '>' + esc(r.fast) + '</td>';
        /* LAPS: laps completed (same number as 통과, 0 before the first crossing) + time since the line (live, see updLive) */
        /* LAPS = laps completed · race time that lap was completed at (not in open practice, hidden when narrow) · time on the lap in progress (live) */
        if (c.k === 'l') return '<td class="c-l"' + cs + '><span class="ln">' + (+r.l || 0) + '랩</span>' +
          (cfg.raceOn !== false && cfg.lapPass !== false && !prc ? '<span class="ps">' + (+r.l > 0 ? esc(r.el) : '-') + '</span>' : '') +
          (cfg.raceOn !== false && cfg.lapLive !== false ? '<span class="lt" data-lt="' + esc(r.key) + '">-</span>' : '') + '</td>';
        if (c.k === 'bhd') return '<td class="c-bhd' + (r.bhd.charAt(0) === '+' ? ' lapgap' : ' ' + r.bhdCls) + '"' + cs + '>' + esc(r.bhd) + dtx + '</td>';
        return '<td class="c-' + c.k + '"' + cs + '>' + esc(r[c.k]) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    updLive();
    renderQual();
    renderTeam();
    fitWidths();
  }
  /* wide panel: the header bar and the colour keys follow the width of the table they belong to (narrow: tables fill the screen anyway) */
  /* big screens (PC, iPad): a table much narrower than the panel is scaled up (CSS zoom, at most 1.5×) to fill ~95 % of the width,
     the rest of the width goes between the columns. The 🔍 setting multiplies on top. Narrow screens: untouched */
  var fitS = {};
  function autoFit(el, tbls, key, stretch) {
    if (!el) return 1;
    var on = panel.classList.contains('wide') && cfg.autoFit !== false;
    if (!on) { el.style.zoom = ''; tbls.forEach(function (t) { t.style.width = ''; }); fitS[key] = 1; return 1; }
    var z0 = fitS[key] || 1;
    el.style.zoom = ''; tbls.forEach(function (t) { t.style.width = ''; });
    var avail = el.clientWidth, nat = 0;
    tbls.forEach(function (t) { nat = Math.max(nat, t.offsetWidth); });
    if (!avail || !nat) { if (z0 > 1.001) el.style.zoom = String(z0); return z0; }   /* tab hidden: keep what we had */
    var s = Math.max(1, Math.min(1.5, avail * 0.95 / nat));
    if (Math.abs(s - z0) / z0 < 0.04) s = z0;   /* small content changes (a longer name, a new time) must not make the board twitch */
    fitS[key] = s; if (s > 1.001) el.style.zoom = String(s);
    if (stretch) { var tw = Math.floor(avail / s) - 4; tbls.forEach(function (t) { if (tw > t.offsetWidth) t.style.width = tw + 'px'; }); }
    return s;
  }
  /* wide panel: the header bar, the colour keys and the open qualifier box follow the width of the board table (narrow: tables fill the screen anyway) */
  function fitWidths() {
    var wide = panel.classList.contains('wide');
    var t = root.querySelector('#vl_rb .tw table'), h = $('vl_hdr'), l = root.querySelector('#vl_rb .lgd');
    if (t && !$('vl_rb').classList.contains('vl-bigon')) autoFit($('vl_rb'), [t], 'rb', true); else { $('vl_rb').style.zoom = ''; fitS.rb = 1; }
    var w = wide && t ? t.offsetWidth : 0;   /* offsetWidth: CSS px, unaffected by the zoom setting */
    if (h) { h.style.width = w ? w + 'px' : ''; h.style.boxSizing = w ? 'border-box' : ''; h.style.flexWrap = w ? 'wrap' : ''; }
    if (l) l.style.maxWidth = w ? w + 'px' : '';
    var r = root.querySelector('#vl_glaps .glrow'), k = root.querySelector('#vl_glaps .glk');
    if (k) { var cw = 0; if (r) [].forEach.call(r.querySelectorAll('.glc'), function (c, i) { cw += c.offsetWidth + (i ? 8 : 0); }); k.style.maxWidth = cw ? cw + 'px' : ''; }   /* colour key as wide as the lap cards */
    var qb = root.querySelector('#vl_qual .vl-qbox');
    if (qb) qb.style.width = w && qb.classList.contains('vl-qo') ? w + 'px' : '';
    [].forEach.call(root.querySelectorAll('#vl_qual .vl-qsc'), function (sc) {
      var tb = sc.querySelector('table'), rows = tb ? tb.rows : [];
      sc.style.setProperty('--qh', wide && rows.length > 11 ? rows[11].offsetTop + 'px' : 'none');   /* header + 10 places */
    });
  }
  /* practice records: the same scale-up for the results area (summary, session list, lap lists) */
  function fitPrac() {
    var el = $('vl_pres'); if (!el) return;
    var tb = [].filter.call(el.querySelectorAll('table'), function (t) { return !(t.parentNode.closest && t.parentNode.closest('table')); });
    autoFit(el, tb, 'pres', false);
  }
  /* ---------- 🏆 qualifier standings (race board, qualifier rounds only) ----------
     LiveRC results of today's event on this track (/results/ → "Qualifier Round N Rankings") + the drivers racing now,
     put in with their LiveRC pace (projected laps/time). best: best laps/time of all qualifiers. points: round position 1st 0, 2nd 1 …, lowest total, tie → best laps/time */
  var qd = { key: '', at: 0, busy: false, ok: false, err: '', rounds: {}, html: '' };
  function ltParse(v) { var m = String(v || '').trim().match(/^(\d+)\/(\d[\d:.]*)$/); if (!m) return null; var t = secs(m[2]); return t >= 0 ? { L: +m[1], T: t, s: m[1] + '/' + m[2] } : null; }
  function ltCmp(a, b) { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return a.L !== b.L ? b.L - a.L : a.T - b.T; }
  function nmKey(n) { return String(n || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function qualRound(sc) {
    var r = (sc && sc.raceData) || {};
    if (!sc || isPractice(sc) || /main|final/i.test((r.parsedHeat || '') + ' ' + (r.roundType || '') + ' ' + (r.race || ''))) return 0;
    /* "2" on some tracks, "Q4" (roundType "q") on others; mains / other round types are not qualifiers */
    var rn = String(r.roundNumber || '').trim(), rt = String(r.roundType || '').trim();
    if (rt && !/^q/i.test(rt)) return 0;
    if (/^[a-z]/i.test(rn) && !/^q/i.test(rn)) return 0;
    var m = rn.match(/(\d+)/), n = m ? +m[1] : 0; return n > 0 ? n : 0;
  }
  function parseRanking(html, cls) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), want = nmKey(cls), out = [];
    var tbl = [].slice.call(doc.querySelectorAll('table')).filter(function (t) { var h = t.querySelector('.class_header'); return h && nmKey(h.textContent) === want; })[0];
    if (!tbl) return out;
    [].forEach.call(tbl.querySelectorAll('.hidden'), function (e) { e.remove(); });   /* sort keys hidden in each cell */
    var heads = [].slice.call(tbl.querySelectorAll('tr')).filter(function (tr) { return /driver/i.test(tr.textContent) && tr.querySelector('th'); })[0];
    if (!heads) return out;
    var hs = [].map.call(heads.children, function (c) { return c.textContent.trim().toLowerCase(); });
    var iN = hs.indexOf('driver'), iLT = hs.indexOf('laps/time'), iT3 = hs.indexOf('top 3 consecutive'), iF = hs.indexOf('fastest lap');
    if (iN < 0 || iLT < 0) return out;
    [].forEach.call(tbl.querySelectorAll('tr'), function (tr) {
      var td = tr.querySelectorAll('td'); if (td.length <= iLT) return;
      var lt = ltParse(td[iLT].textContent), nm = td[iN].textContent.replace(/\s+/g, ' ').trim();
      if (lt && !(lt.L > 0)) lt = null;
      if (nm) out.push({ name: nm, lt: lt, t3: iT3 >= 0 && td[iT3] ? td[iT3].textContent.trim() : '', fast: iF >= 0 && td[iF] ? td[iF].textContent.trim() : '' });
    });
    return out;
  }
  /* LiveRC "Qual Points" page: per round "points : laps/time" for each driver; title "(best 2 of 3)" */
  function parsePoints(html, cls) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), want = nmKey(cls), out = { rounds: {} };
    var tbl = [].slice.call(doc.querySelectorAll('table')).filter(function (t) { var h = t.querySelector('tr'); return h && nmKey(h.textContent).indexOf(want) === 0; })[0];
    if (!tbl) return null;
    var heads = [].slice.call(tbl.querySelectorAll('tr')).filter(function (tr) { return /driver/i.test(tr.textContent) && tr.querySelector('th'); })[0];
    if (!heads) return null;
    var hs = [].map.call(heads.children, function (c) { return c.textContent.trim().toLowerCase(); }), iN = hs.indexOf('driver'), rc = {};
    hs.forEach(function (h, i) { var m = h.match(/^round\s*(\d+)/); if (m) rc[i] = +m[1]; });
    [].forEach.call(tbl.querySelectorAll('tr'), function (tr) {
      var td = tr.querySelectorAll('td'); if (td.length <= iN || iN < 0) return;
      var nm = td[iN].textContent.replace(/\s+/g, ' ').trim(); if (!nm) return;
      Object.keys(rc).forEach(function (i) {
        var m = td[i] && td[i].textContent.replace(/\s+/g, ' ').match(/(-?\d+(?:\.\d+)?)\s*:\s*(\d+\/[\d:.]+)/); if (!m) return;
        var lt = ltParse(m[2]); if (!lt || !(lt.L > 0)) return;   /* "0 : 0/0.000" = round not run yet */
        (out.rounds[rc[i]] || (out.rounds[rc[i]] = [])).push({ name: nm, pts: +m[1], lt: lt });
      });
    });
    return Object.keys(out.rounds).length ? out : null;
  }
  /* points rule: read from the event once round 1 is scored (position → points, which way wins, best N rounds), default 1st 0, 2nd 2, 3rd 3 … lowest wins */
  function ptsRule() {
    var P = qd.points, best = qd.bestN || 0, map = null, low = true, src = 'def';
    if (P) {
      var big = Object.keys(P.rounds).map(function (n) { return P.rounds[n]; }).sort(function (a, b) { return b.length - a.length; })[0];
      if (big && big.length > 1) {
        var srt = big.filter(function (x) { return x.lt; }).sort(function (a, b) { return ltCmp(a.lt, b.lt); });
        map = srt.map(function (x) { return x.pts; }); low = map[0] <= map[map.length - 1]; src = 'event';
      }
    }
    var at = function (i) {
      if (map) { if (i < map.length) return map[i]; var st = map.length > 1 ? map[map.length - 1] - map[map.length - 2] : (low ? 1 : -1); return Math.max(0, map[map.length - 1] + st * (i - map.length + 1)); }
      return i === 0 ? 0 : i + 1;
    };
    return { at: at, low: low, best: best, src: src, txt: [0, 1, 2, 3].map(function (i) { return (i + 1) + '등 ' + at(i); }).join(' · ') + ' …' };
  }
  function qualFetch(cls, round, key) {
    if (qd.busy) return; qd.busy = true;
    fetch('/results/', { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) {
      var doc = new DOMParser().parseFromString(h, 'text/html'), links = {}, sheet = false, today = false;
      /* only today's event (the date heading of the newest event) */
      [].forEach.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (x) { var t = Date.parse(x.textContent.trim()); if (t > 0 && Math.abs(Date.now() - t) < 2 * 86400e3) today = true; });
      [].forEach.call(doc.querySelectorAll('a[href*="view_round_ranking"]'), function (a) { var m = a.textContent.match(/Qualifier Round\s*(\d+)\s*Rankings/i); if (m) links[+m[1]] = a.getAttribute('href'); });
      [].forEach.call(doc.querySelectorAll('a[href*="view_heat_sheet"]'), function (a) { var m = a.textContent.match(/Qualifier Round\s*(\d+)/i); if (m && +m[1] === round) sheet = true; });
      var pl = [].slice.call(doc.querySelectorAll('a[href*="view_points"]')).filter(function (a) { return /qual/i.test(a.textContent); })[0];
      var bm = pl && pl.textContent.match(/(\d+)\s*of\s*(\d+)/i);
      if (!today || !(sheet || links[round])) { qd.ok = false; return null; }
      var ns = Object.keys(links).map(Number).filter(function (n) { return n <= round; }), got = {}, pts = null;
      var jobs = ns.map(function (n) { return fetch(links[n], { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) { got[n] = parseRanking(t, cls); }); });
      if (pl) jobs.push(fetch(pl.getAttribute('href'), { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) { pts = parsePoints(t, cls); }, function () {}));
      return Promise.all(jobs).then(function () { if (qd.key === key) { qd.rounds = got; qd.points = pts; qd.bestN = bm ? +bm[1] : 0; qd.ofN = bm ? +bm[2] : 0; qd.ok = true; } });
    }).then(function () { qd.busy = false; qd.at = Date.now(); qd.err = ''; qd.html = ''; renderQual(); },
      function () { qd.busy = false; qd.at = Date.now(); qd.err = 'LiveRC 결과 페이지를 읽지 못했습니다'; qd.html = ''; renderQual(); });
  }
  /* everyone in the class this qualifier: rounds n → laps/time, live estimate for the round being raced now */
  function qualEntries(sc, R, withLive) {
    var by = {}, get = function (nm) { var k = nmKey(nm); return by[k] || (by[k] = { name: nm, r: {}, live: false, est: {}, voice: false }); };
    for (var n = 1; n <= R; n++) (qd.rounds[n] || []).forEach(function (x) { if (x.lt) get(x.name).r[n] = x.lt; else get(x.name); });
    var running = /running|start/i.test(String(((sc || {}).raceData || {}).raceStatus || '')) || !/complete|finish|stop|ended/i.test(String(((sc || {}).raceData || {}).raceStatus || ''));
    if (sc && sc.driverData) list(sc.driverData).forEach(function (d) {
      var nm = nameOf(d); if (!nm) return;
      var e = get(nm); e.live = true; e.voice = !!match(d); e.name = nm;
      if (!withLive) { if (running) delete e.r[R]; return; }
      var lt = ltParse(d.pace) || (+d.laps > 0 ? ltParse(d.laps + '/' + short(d.elapsedTime)) : null);
      if (lt && (running || !e.r[R])) { e.r[R] = lt; e.est[R] = true; }
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }
  function bestOf(e, R) { var b = null, bn = 0; for (var n = 1; n <= R; n++) if (e.r[n] && ltCmp(e.r[n], b) < 0) { b = e.r[n]; bn = n; } return { lt: b, n: bn }; }
  function qualRank(list, R, mode) {
    list.forEach(function (e) { var b = bestOf(e, R); e.best = b.lt; e.bestN = b.n; e.pts = {}; e.tot = 0; e.wait = !e.r[R]; });
    if (mode === 'points') {
      var PR = ptsRule(), off = {};
      if (qd.points) Object.keys(qd.points.rounds).forEach(function (n) { qd.points.rounds[n].forEach(function (x) { off[n + '|' + nmKey(x.name)] = x.pts; }); });
      for (var n = 1; n <= R; n++) list.filter(function (e) { return e.r[n]; }).sort(function (a, b) { return ltCmp(a.r[n], b.r[n]); }).forEach(function (e, i) {
        var o = off[n + '|' + nmKey(e.name)];
        e.pts[n] = n < R && o !== undefined && !e.est[n] ? o : PR.at(i);   /* finished rounds: the event's own points */
      });
      list.forEach(function (e) {
        var ks = Object.keys(e.pts).map(Number), use = ks.slice();
        if (PR.best > 0 && ks.length > PR.best) use = ks.slice().sort(function (a, b) { return PR.low ? e.pts[a] - e.pts[b] : e.pts[b] - e.pts[a]; }).slice(0, PR.best);
        e.drop = {}; ks.forEach(function (k) { if (use.indexOf(k) < 0) e.drop[k] = 1; });
        e.tot = use.reduce(function (t, k) { return t + e.pts[k]; }, 0);
      });
      return list.filter(function (e) { return Object.keys(e.pts).length; }).sort(function (a, b) { return a.tot !== b.tot ? (PR.low ? a.tot - b.tot : b.tot - a.tot) : ltCmp(a.best, b.best); })
        .concat(list.filter(function (e) { return !Object.keys(e.pts).length; }));
    }
    return list.slice().sort(function (a, b) { return ltCmp(a.best, b.best); });
  }
  /* ---------- 👥 team race ----------
     Teams (cfg.teams: [{id, name, color}]) and drivers' teams (cfg.teamOf: name → id) are settings.
     The races of a team cup live on this device (localStorage vlTeamCup): { cur, cups: { id: { name, races: [ { id, label, at, res: [ { n, pos, laps, best, fin, adj } ] } ] } } } */
  var TEAM_COLS = ['#ff5a5f', '#4dabf7', '#3ddc84', '#ffc72c', '#c77dff', '#ff922b', '#20c997', '#f06595'];
  var TEAM_DEF = ['레드', '블루', '그린', '옐로', '퍼플', '오렌지', '민트', '핑크'];
  var TCK = 'vlTeamCup', tcur = { id: '', res: null, said: '' }, teamEdit = false;
  function tcLoad() { var o = null; try { o = JSON.parse(localStorage.getItem(TCK) || 'null'); } catch (e) {} if (!o || !o.cups) o = { cur: '', cups: {} }; return o; }
  function tcSave(o) { try { localStorage.setItem(TCK, JSON.stringify(o)); } catch (e) {} }
  function tcCup(o, make) {
    o = o || tcLoad();
    if (!o.cur || !o.cups[o.cur]) {
      if (!make) return null;
      var d = new Date(), id = 'c' + d.getTime();
      o.cups[id] = { name: (d.getMonth() + 1) + '월 ' + d.getDate() + '일 팀전', races: [] }; o.cur = id; tcSave(o);
    }
    return o.cups[o.cur];
  }
  function teams() { return Array.isArray(cfg.teams) ? cfg.teams : []; }
  function teamById(id) { return teams().filter(function (t) { return t.id === id; })[0] || null; }
  function teamOfName(n) { var id = (cfg.teamOf || {})[n]; return id ? teamById(id) : null; }
  function teamEnsure() {
    if (teams().length >= 2) return;
    cfg.teams = teams().slice();
    while (cfg.teams.length < 2) { var i = cfg.teams.length; cfg.teams.push({ id: 't' + Date.now().toString(36) + i, name: TEAM_DEF[i], color: TEAM_COLS[i] }); }
    save();
  }
  /* points for finishing position pos (1-based) among n starters */
  function ptsFor(pos, n) {
    if (!(pos > 0)) return 0;
    if (cfg.ptsMode === 'count') return Math.max(0, n - pos + 1);
    var tb = cfg.ptsMode === 'custom' ? cfg.ptsCustom : cfg.ptsFixed;
    if (!Array.isArray(tb)) tb = [10, 8, 6, 5, 4, 3, 2, 1];
    return +tb[pos - 1] || 0;
  }
  /* one race → { driverName: points } (DNS = no laps → 0; bonuses; hand-set points win) */
  function racePts(res) {
    var started = res.filter(function (r) { return r.laps > 0; }), n = started.length, out = {};
    var fast = Math.min.apply(null, started.map(function (r) { return r.best > 0 ? r.best : Infinity; }).concat([Infinity]));
    res.forEach(function (r) {
      var p = r.laps > 0 ? ptsFor(r.pos, n) : 0;
      if (r.laps > 0 && cfg.bonusBest && r.best > 0 && Math.abs(r.best - fast) < 0.0005) p += 1;
      if (r.laps > 0 && cfg.bonusFin && r.fin) p += 1;
      out[r.n] = typeof r.adj === 'number' ? r.adj : p;
    });
    return out;
  }
  /* the race on track as a result list (positions as they stand) */
  function liveRes(all) {
    return all.filter(function (d) { return nameOf(d); }).map(function (d) {
      return { n: nameOf(d), pos: +d.position || 0, laps: +d.laps || 0, best: siteFast(d) || 0, fin: !!(rs.fin && rs.fin[keyOf(d)]) };
    }).sort(function (a, b) { return (a.pos || 999) - (b.pos || 999); });
  }
  function hasTeamDriver(res) { return res.some(function (r) { return r.laps > 0 && teamOfName(r.n); }); }
  /* standings over the cup's races (+ the race on track, if given) */
  function teamTable(cup, live) {
    var T = {}; teams().forEach(function (t) { T[t.id] = { t: t, tot: 0, races: [], wins: 0, best: Infinity, now: null }; });
    var D = {};
    var races = (cup ? cup.races : []).concat(live ? [live] : []);
    races.forEach(function (rc, ri) {
      var pts = racePts(rc.res), sums = {}, win = rc.res.filter(function (r) { return r.pos === 1 && r.laps > 0; })[0];
      rc.res.forEach(function (r) {
        var tm = teamOfName(r.n); if (!tm || !T[tm.id]) return;
        sums[tm.id] = (sums[tm.id] || 0) + (pts[r.n] || 0);
        if (r.best > 0) T[tm.id].best = Math.min(T[tm.id].best, r.best);
        var dd = D[r.n] || (D[r.n] = { n: r.n, t: tm, races: {}, tot: 0 });
        dd.races[ri] = pts[r.n] || 0; dd.tot += pts[r.n] || 0;
      });
      if (win) { var wt = teamOfName(win.n); if (wt && T[wt.id]) T[wt.id].wins++; }
      Object.keys(T).forEach(function (id) { var v = sums[id] || 0; T[id].tot += v; if (rc === live) T[id].now = v; else T[id].races.push(v); });
    });
    var list2 = Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.tot - a.tot || b.wins - a.wins || a.best - b.best; });
    var drv = Object.keys(D).map(function (k) { return D[k]; }).sort(function (a, b) { return b.tot - a.tot; });
    return { teams: list2, drivers: drv, nRaces: cup ? cup.races.length : 0, live: !!live };
  }
  /* called every tick: keeps the race on track, stores it in the cup when it is over */
  function teamTick(all, sc, sid, prc, over) {
    if (!cfg.teamOn || teams().length < 2) { tcur = { id: '', res: null, said: tcur.said }; return; }
    var res = prc ? null : liveRes(all);
    if (tcur.id && tcur.id !== sid && tcur.res && tcur.over) teamStore(tcur);   /* the next race started: the last one is final */
    if (tcur.id !== sid) tcur = { id: sid, res: null, over: false, said: tcur.said };
    if (!res || !res.some(function (r) { return r.laps > 0; })) return;
    tcur.res = res; tcur.over = tcur.over || over; var rd = sc.raceData || {}, rn = pageText('#round .value') || rd.roundNumber || '', rc = pageText('#race .value') || rd.raceNumber || '';
    tcur.label = [pageText('#class .value') || rd.className || '', rn && 'R' + rn, rc && '#' + rc].filter(Boolean).join(' ');
    /* everyone still on track has crossed after the clock ran out → final now */
    if (over && res.filter(function (r) { return r.laps > 0; }).every(function (r) { return r.fin; })) teamStore(tcur);
  }
  function teamStore(c) {
    if (!c || !c.res || c.stored || cfg.teamAuto === false || !hasTeamDriver(c.res)) return;
    c.stored = true;
    var o = tcLoad(), cup = tcCup(o, true), rid = c.id + '|' + new Date().toDateString();
    if (cup.races.some(function (r) { return r.id === rid; })) return;
    cup.races.push({ id: rid, label: c.label || '레이스', at: Date.now(), res: c.res.map(function (r) { return { n: r.n, pos: r.pos, laps: r.laps, best: r.best, fin: r.fin }; }) });
    tcSave(o);
    if (cfg.teamSay !== false && cfg.voiceOn !== false && running) {
      var tt = teamTable(cup, null).teams;
      say('team', '팀 순위, ' + tt.map(function (x, i) { return (i + 1) + '위 ' + x.t.name + ' ' + x.tot + '점'; }).join(', '), -1);
    }
    renderTeam(true);
  }
  function teamLiveSay(tb) {
    if (!cfg.teamSayLive || !tb.live || cfg.voiceOn === false || !running) return;
    var lead = tb.teams[0], sig = lead && tb.teams[1] && lead.tot > tb.teams[1].tot ? lead.t.id : '';
    if (sig && tcur.said && sig !== tcur.said) say('team', lead.t.name + ' 팀 1위로', -1);
    if (sig) tcur.said = sig;
  }
  var teamSig = '';
  function renderTeam(force) {
    var box = $('vl_team'); if (!box) return;
    if (!cfg.teamOn || teams().length < 2) { box.innerHTML = ''; box.style.display = 'none'; teamSig = ''; return; }
    var o = tcLoad(), cup = tcCup(o, false);
    var live = tcur.res && !tcur.stored && hasTeamDriver(tcur.res) ? { res: tcur.res, label: tcur.label } : null;
    if (!cup && !live) { box.style.display = 'block'; box.innerHTML = '<div class="tmh">👥 팀 순위 <small>레이스가 끝나면 자동으로 점수가 쌓여요 · 설정 › 👥 팀전에서 선수를 팀에 넣으세요</small></div>'; teamSig = ''; return; }
    var tb = teamTable(cup, live);
    teamLiveSay(tb);
    var sig = JSON.stringify([tb, teamEdit, cfg.teams, cup && cup.name]);
    if (sig === teamSig && !force) return; teamSig = sig;
    var races = (cup ? cup.races : []), nR = races.length, max = Math.max(1, tb.teams[0] ? tb.teams[0].tot : 1);
    var dot = function (t) { return '<i class="tmd" style="background:' + esc(t.color) + '"></i>'; };
    var h = '<div class="tmh">👥 팀 순위 <small>' + esc(cup ? cup.name : '새 팀전') + (live ? ' · 레이스 ' + (nR + 1) + ' 진행 중 <b class="now">● 지금 순위로 예상</b>' : ' · 레이스 ' + nR + '개') + '</small></div>';
    h += '<div class="tmw"><table class="tmt"><tr><th class="l">#</th><th class="l">팀</th><th>합계</th>' + (live ? '<th class="now">레이스 ' + (nR + 1) + '</th>' : '') +
      races.map(function (r, i) { return '<th class="rc">' + (i + 1) + '</th>'; }).join('') + '<th class="l">1등</th></tr>';
    tb.teams.forEach(function (x, i) {
      h += '<tr><td class="l pos">' + (i + 1) + '</td><td class="l">' + dot(x.t) + '<b>' + esc(x.t.name) + '</b><div class="tmb" style="width:' + Math.max(4, Math.round(x.tot / max * 140)) + 'px;background:' + esc(x.t.color) + '"></div>' +
        (nR ? '<div class="rs">레이스별 ' + x.races.join(' · ') + '</div>' : '') + '</td><td class="tot">' + x.tot + '</td>' + (live ? '<td class="now">+' + (x.now || 0) + '</td>' : '') +
        x.races.map(function (v) { return '<td class="rc">' + v + '</td>'; }).join('') + '<td class="l">' + (x.wins ? new Array(x.wins + 1).join('🏆') : '') + '</td></tr>';
    });
    h += '</table>';
    h += '<details class="tmdrv"' + (cfg.teamDrvOpen === false ? '' : ' open') + '><summary>선수별 점수</summary><table class="tmt"><tr><th class="l">선수</th><th>합계</th>' + (live ? '<th class="now">레이스 ' + (nR + 1) + '</th>' : '') +
      races.map(function (r, i) { return '<th class="rc">' + (i + 1) + '</th>'; }).join('') + '</tr>' +
      tb.drivers.map(function (d) {
        return '<tr><td class="l">' + dot(d.t) + esc(d.n) + (nR ? '<div class="rs">레이스별 ' + races.map(function (r, i) { return d.races[i] !== undefined ? d.races[i] : '-'; }).join(' · ') + '</div>' : '') + '</td><td class="tot2">' + d.tot + '</td>' +
          (live ? '<td class="now">+' + (d.races[nR] || 0) + '</td>' : '') +
          races.map(function (r, i) {
            if (!teamEdit) return '<td class="rc">' + (d.races[i] !== undefined ? d.races[i] : '-') + '</td>';
            return '<td class="rc"><input class="tme" type="number" data-ri="' + i + '" data-n="' + esc(d.n) + '" value="' + (d.races[i] !== undefined ? d.races[i] : '') + '"></td>';
          }).join('') + '</tr>';
      }).join('') + '</table></details></div>';
    h += '<div class="tmn">' + ({ count: '출전 수 기준', custom: '직접 입력' }[cfg.ptsMode] || '고정표 ' + (cfg.ptsFixed || []).join('·')) + ' · 팀 점수 = 팀원 전원 합계' + (live ? ' · 레이스가 끝나면 확정' : '') + '</div>';
    if (nR) h += '<div class="tmn">' + races.map(function (r, i) { return (i + 1) + ' = ' + esc(r.label) + (teamEdit ? ' <button class="tmx" data-del="' + i + '" title="이 레이스 빼기">✕</button>' : ''); }).join(' · ') +
      ' · <button class="tmlink" data-ed="1">' + (teamEdit ? '✓ 고치기 끝' : '✎ 점수 고치기') + '</button></div>';
    box.style.display = 'block'; box.innerHTML = h;
  }
  /* settings › 👥 팀전 (rebuilt when teams change) */
  function teamSetRender() {
    var el = $('vl_teamset'); if (!el) return;
    var T = teams(), names = {};
    Object.keys(rows || {}).forEach(function (n) { names[n] = 1; });
    Object.keys(cfg.teamOf || {}).forEach(function (n) { names[n] = 1; });
    var cup = tcCup(null, false), o = tcLoad();
    var h = '<div class="sub"><span>팀 (2개 이상)</span></div>';
    T.forEach(function (t, i) {
      var cnt = Object.keys(cfg.teamOf || {}).filter(function (n) { return cfg.teamOf[n] === t.id; }).length;
      h += '<div class="tmrow"><input type="color" class="tmc" data-ti="' + i + '" value="' + esc(t.color) + '" title="색"><input type="text" class="tmname" data-ti="' + i + '" value="' + esc(t.name) + '"><span style="color:#aaa">' + cnt + '명</span>' +
        (T.length > 2 ? '<button class="pb2 tmdel" data-ti="' + i + '" title="팀 지우기">✕</button>' : '') + '</div>';
    });
    h += '<div class="tmrow"><button class="pb2" id="vl_tmadd">＋ 팀 추가</button></div>';
    h += '<div class="sub"><span>선수 배정</span><span style="color:#999">레이스 보드에서 팀 색 점을 눌러도 바뀌어요</span></div>';
    h += '<div class="lim" style="margin:0 0 6px;flex-wrap:wrap"><input type="search" id="vl_tmq" placeholder="선수 검색 — 이름·초성(ㄱㄴㅎ)" value="' + esc(tmQ) + '"><button class="pb2" id="vl_tmrf">↻ 다시 받기</button></div>' +
      '<div id="vl_tmst" class="tmst"></div><div style="margin-bottom:4px"><label class="tmun"><input type="checkbox" id="vl_tmun"' + (tmUn ? ' checked' : '') + '> 배정 안 된 선수만</label></div><div id="vl_tmlist"></div>';
    var tb = cfg.ptsMode === 'custom' ? cfg.ptsCustom : cfg.ptsFixed;
    h += '<div class="sub"><span>포인트 규칙</span></div><div class="gap"><div class="lim" style="margin:0">방식 <select id="vl_ptsm"><option value="fixed">고정표 (기본)</option><option value="count">출전 수 기준 (N명 → 1등 N점)</option><option value="custom">직접 입력</option></select></div>';
    if (cfg.ptsMode === 'count') h += '<div class="lim"><span style="color:#999">출전한 선수가 N명이면 1등 N점, 2등 N−1점 … 꼴찌 1점</span></div>';
    else h += '<div class="tmpts">' + (tb || []).map(function (v, i) { return '<span class="pt">' + (i + 1) + '등 ' + (cfg.ptsMode === 'custom' ? '<input type="number" class="tmpt" data-i="' + i + '" value="' + v + '">' : '<b>' + v + '</b>') + '</span>'; }).join('') +
      (cfg.ptsMode === 'custom' ? '<button class="pb2" id="vl_ptadd" title="등수 추가">＋</button><button class="pb2" id="vl_ptdel" title="마지막 등수 빼기">−</button>' : '') + '<span class="pt" style="color:#999">그 아래 0</span></div>';
    h += '<div class="lim"><span style="color:#999">못 달린 선수(랩 0) 0점' + (cfg.ptsMode === 'fixed' ? ' · 직접 입력을 고르면 칸마다 숫자를 바꿀 수 있어요' : '') + '</span></div>' +
      '<label style="margin-top:6px"><input type="checkbox" id="vl_bbest">보너스 · 베스트랩 +1</label> <label><input type="checkbox" id="vl_bfin">완주 +1 <small style="color:#999">(🏁 종료 뒤 통과)</small></label></div>';
    h += '<div class="sub"><span>팀 점수</span></div><div class="gap"><div>팀원 <b>전원 합계</b> · 동점이면 1등 횟수 → 팀 베스트랩</div></div>';
    h += '<div class="sub"><span>팀전 묶음</span></div><div class="gap"><div class="lim" style="margin:0;flex-wrap:wrap"><select id="vl_cupsel">' +
      Object.keys(o.cups).map(function (id) { return '<option value="' + id + '"' + (id === o.cur ? ' selected' : '') + '>' + esc(o.cups[id].name) + ' (레이스 ' + o.cups[id].races.length + '개)</option>'; }).join('') +
      (Object.keys(o.cups).length ? '' : '<option value="">(아직 없음 — 첫 레이스가 끝나면 만들어져요)</option>') + '</select><button class="pb2" id="vl_cupnew">＋ 새 팀전</button></div>' +
      (cup ? '<div class="lim">이름 <input type="text" id="vl_cupname" value="' + esc(cup.name) + '" style="background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px;font-size:15px;width:180px"></div>' : '') +
      '<label><input type="checkbox" id="vl_tauto">끝난 레이스 <b>자동으로 넣기</b></label><div class="lim"><span style="color:#999">🏁 레이스 종료 때 최종 순위 저장 · 팀 선수가 달린 레이스만 · 연습(Open Practice) 제외 · 클래스 상관없음</span></div>' +
      '<label style="margin-top:6px"><input type="checkbox" id="vl_tsay">레이스가 끝나면 <b>팀 순위 음성</b></label><div class="lim"><span style="color:#999">“팀 순위, 1위 레드 54점, 2위 블루 51점”</span></div>' +
      '<label style="margin-top:6px"><input type="checkbox" id="vl_tsayl">레이스 중 팀 순위가 바뀌면 음성 <small style="color:#999">(“블루 팀 1위로”)</small></label>' +
      '<div class="lim" style="margin-top:8px;flex-wrap:wrap"><button class="pb2" id="vl_tcopy">📋 표 복사</button><button class="pb2" id="vl_tcsv">⬇ CSV</button><button class="pb2" id="vl_tclr">이 팀전 비우기</button><span id="vl_tmsg" style="color:#999"></span></div></div>';
    el.innerHTML = h;
    teamListRender(); tmRosterGet(false);
    $('vl_ptsm').value = cfg.ptsMode === 'count' || cfg.ptsMode === 'custom' ? cfg.ptsMode : 'fixed';
    bind('vl_bbest', 'bonusBest', teamChanged); bind('vl_bfin', 'bonusFin', teamChanged);
    $('vl_tauto').checked = cfg.teamAuto !== false; $('vl_tauto').onchange = function () { cfg.teamAuto = this.checked; save(); };
    $('vl_tsay').checked = cfg.teamSay !== false; $('vl_tsay').onchange = function () { cfg.teamSay = this.checked; save(); };
    bind('vl_tsayl', 'teamSayLive');
  }
  /* today's practice list (/practice/?p=session_list&d=today) → everyone who ran today, for team picking */
  var tmRoster = { t: 0, busy: false, names: {}, err: '' }, tmQ = '', tmUn = false;
  function tmRosterGet(force) {
    if (tmRoster.busy || (!force && Date.now() - tmRoster.t < 300000)) return;
    tmRoster.busy = true; tmStatus();
    getDoc('/practice/?p=session_list&d=' + todayS()).then(function (doc) {
      var nm = {}; parseDay(doc).forEach(function (r) { if (r[1] && !nm[r[1]]) nm[r[1]] = r[2] || ''; });
      tmRoster.names = nm; tmRoster.err = '';
    }).catch(function () { tmRoster.err = '오늘 연습 기록을 읽지 못했어요'; }).then(function () { tmRoster.busy = false; tmRoster.t = Date.now(); teamListRender(); });
  }
  function tmStatus() {
    var st = $('vl_tmst'); if (!st) return;
    var nT = Object.keys(tmRoster.names).length, nA = Object.keys(cfg.teamOf || {}).filter(function (n) { return teamById(cfg.teamOf[n]); }).length;
    var hh = tmRoster.t ? ('0' + new Date(tmRoster.t).getHours()).slice(-2) + ':' + ('0' + new Date(tmRoster.t).getMinutes()).slice(-2) : '';
    st.innerHTML = tmRoster.busy ? '📋 오늘 연습 기록을 받는 중…' : tmRoster.err ? '<span style="color:#ff9a9a">⚠ ' + esc(tmRoster.err) + '</span> · 배정 ' + nA + '명'
      : '📋 오늘 연습 기록에서 <b style="color:#fff">' + nT + '명</b> · 배정 ' + nA + '명' + (hh ? ' · ' + hh + ' 받음' : '');
  }
  function teamListRender() {
    var box = $('vl_tmlist'); if (!box) return;
    tmStatus();
    var T = teams(), info = {}, now = {};
    Object.keys(tmRoster.names).forEach(function (n) { info[n] = tmRoster.names[n]; });
    try { var sc = SC(); if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { var n = nameOf(d); if (n) { now[n] = 1; if (!(n in info)) info[n] = ''; } }); } catch (e) {}
    Object.keys(rows || {}).forEach(function (n) { if (!(n in info)) info[n] = ''; });
    Object.keys(cfg.teamOf || {}).forEach(function (n) { if (!(n in info)) info[n] = ''; });
    var all = Object.keys(info).filter(function (n) { return !tmQ || kmatch(n, tmQ); });
    var cmp = function (a, b) { return a.localeCompare(b, 'ko'); };
    var asg = all.filter(function (n) { return teamById((cfg.teamOf || {})[n]); }).sort(cmp), un = all.filter(function (n) { return !teamById((cfg.teamOf || {})[n]); }).sort(cmp);
    var line = function (n) {
      var cur = (cfg.teamOf || {})[n] || '', ct = teamById(cur);
      return '<div class="tmdr"><span class="tmdn"><i class="tmd" style="background:' + (ct ? esc(ct.color) : '#444') + '"></i>' + esc(n) +
        (info[n] ? '<small class="tmcls">' + esc(info[n]) + '</small>' : '') + (now[n] ? '<small class="tmnow">● 코스</small>' : '') + '</span><span class="tmchips">' +
        T.map(function (t) { return '<button class="tmchip' + (cur === t.id ? ' on' : '') + '" data-n="' + esc(n) + '" data-t="' + t.id + '"' + (cur === t.id ? ' style="background:' + esc(t.color) + ';border-color:' + esc(t.color) + '"' : '') + '>' + esc(t.name) + '</button>'; }).join('') +
        '<button class="tmchip' + (ct ? '' : ' on none') + '" data-n="' + esc(n) + '" data-t="">없음</button></span></div>';
    };
    var h = '';
    if (!tmUn && asg.length) h += '<div class="tmgh">배정된 선수 ' + asg.length + '</div>' + asg.map(line).join('');
    h += '<div class="tmgh">배정 안 됨 ' + un.length + ' <small>(오늘 연습한 선수 · 가나다순)</small></div>' + (un.length ? un.map(line).join('') : '<div class="lim"><span style="color:#999">' + (tmQ ? '찾는 선수가 없어요' : '모두 배정했어요') + '</span></div>');
    box.innerHTML = h;
  }
  function teamChanged() { save(); teamSetRender(); renderTeam(true); try { renderRaceBoard(true); } catch (e) {} gsumSafe(); }
  function gsumSafe() { try { gsum(); } catch (e) {} }
  function teamCycle(n) {   /* race board: tap the team dot → next team → … → none */
    var T = teams(), cur = (cfg.teamOf || {})[n] || '', i = -1;
    T.forEach(function (t, k) { if (t.id === cur) i = k; });
    cfg.teamOf = Object.assign({}, cfg.teamOf || {});
    var nx = T[i + 1]; if (nx) cfg.teamOf[n] = nx.id; else delete cfg.teamOf[n];
    teamChanged();
  }
  function teamText(sep) {
    var cup = tcCup(null, false); if (!cup) return '';
    var tb = teamTable(cup, null), R = cup.races;
    var L = [['순위', '팀', '합계'].concat(R.map(function (r, i) { return '레이스' + (i + 1) + ' ' + r.label; })).concat(['1등']).join(sep)];
    tb.teams.forEach(function (x, i) { L.push([i + 1, x.t.name, x.tot].concat(x.races).concat([x.wins]).join(sep)); });
    L.push('');
    L.push(['선수', '팀', '합계'].concat(R.map(function (r, i) { return '레이스' + (i + 1); })).join(sep));
    tb.drivers.forEach(function (d) { L.push([d.n, d.t.name, d.tot].concat(R.map(function (r, i) { return d.races[i] !== undefined ? d.races[i] : ''; })).join(sep)); });
    return L.join('\n');
  }
  /* ---------- 🏆 main events ----------
     Results site of today's event: "Main Events" heat sheet (every main of every class in table.heat_sheet; rows filled by a lower main
     show Seed Result "Bump-Up"), and "… Triple A-Main Results" (table.multi_main: leg cells "1st (1pts) : 20/8:02.016").
     Nitro-style classes (A/B/C-Main): the free places of an upper main are taken by the top finishers of the main below, at the back of the grid.
     Electric-style classes (A1/A2/A3-Main): points per leg (the event's own table, read from the results once a leg is done), best legs count. */
  function mainParseSheet(doc) {
    var out = [], cur = null;
    [].forEach.call(doc.querySelectorAll('table.heat_sheet tr'), function (tr) {
      var h = tr.querySelector('.class_header');
      if (h) {
        var full = h.textContent.replace(/\s+/g, ' ').trim(), mm = full.match(/^(.*?)\s+([A-Z])(\d*)-Main\s*$/i);
        if (!mm) { cur = null; return; }
        var st = tr.querySelector('.race_status'), a = st && st.querySelector('a'), ln = tr.querySelector('.race_length');
        cur = { full: full, cls: mm[1].trim(), letter: mm[2].toUpperCase(), leg: +mm[3] || 0, code: mm[2].toUpperCase() + (mm[3] || ''), num: +((tr.querySelector('.race_num') || {}).textContent || 0),
          len: ln ? ln.textContent.replace(/Length:\s*/i, '').trim() : '', done: !!(st && /complete/i.test(st.textContent)), res: a ? a.getAttribute('href') : '', rows: [] };
        out.push(cur); return;
      }
      var td = tr.querySelectorAll('td'); if (!cur || td.length < 3) return;
      var nc = td[1].cloneNode(true); [].forEach.call(nc.querySelectorAll('.car_num'), function (x) { x.remove(); });
      var name = nc.textContent.replace(/\s+/g, ' ').trim(), seedRes = td[td.length - 1].textContent.replace(/\s+/g, ' ').trim(), seed = td[td.length - 2].textContent.trim();
      cur.rows.push({ pos: +td[0].textContent.trim() || cur.rows.length + 1, name: name, seed: seed, bump: /bump/i.test(seedRes), empty: !name });
    });
    return out;
  }
  function mainParseMulti(doc) {
    var t = doc.querySelector('table.multi_main'); if (!t) return null;
    var head = (doc.body.textContent.match(/Completed:\s*(\d+)\s*of\s*(\d+)/i) || []), rows = [];
    [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
      var td = [].map.call(tr.querySelectorAll('td'), function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); }); if (td.length < 5) return;
      var nc = tr.querySelectorAll('td')[2].cloneNode(true); [].forEach.call(nc.querySelectorAll('.car_num,.hidden'), function (x) { x.remove(); });
      rows.push({ pos: +td[0] || 0, name: nc.textContent.replace(/\s+/g, ' ').trim(), points: +td[3] || 0, legs: td.slice(4).map(function (c) {
        var m = c.match(/(\d+)\w*\s*\(\s*(-?[\d.]+)\s*pts?\s*\)\s*:\s*(\d+)\/([\d:.]+)/i);
        return m ? { pos: +m[1], pts: +m[2], L: +m[3], T: secs(m[4]) } : null;
      }) });
    });
    return { done: +head[1] || 0, of: +head[2] || 0, rows: rows };
  }
  var md = { ok: false, classes: [], at: 0, busy: false, err: '', ev: '', sel: '', said: {} };
  function mainFetch() {
    if (md.busy) return; md.busy = true;
    getDoc('/results/').then(function (doc) {
      var today = false;
      [].forEach.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (x) { var t = Date.parse(x.textContent.trim()); if (t > 0 && Math.abs(Date.now() - t) < 2 * 86400e3) today = true; });
      var sheet = [].filter.call(doc.querySelectorAll('a[href*="view_heat_sheet"]'), function (a) { return /main\s*events/i.test(a.textContent); })[0];
      var multis = [].filter.call(doc.querySelectorAll('a[href*="view_multi_main_result"]'), function (a) { return true; });
      md.ev = ((doc.querySelector('h3,h2') || {}).textContent || '').trim();
      if (!today || !sheet) { md.ok = false; md.classes = []; return; }
      var mains = [], mult = {};
      var jobs = [fetch(sheet.getAttribute('href'), { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) { mains = mainParseSheet(new DOMParser().parseFromString(h, 'text/html')); })];
      multis.forEach(function (a) {
        var cls = a.textContent.replace(/\s+/g, ' ').replace(/\s*(Double|Triple|Quad\w*|Multi)?\s*A-Main\s*Results\s*$/i, '').trim();
        jobs.push(fetch(a.getAttribute('href'), { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) { mult[nmKey(cls)] = mainParseMulti(new DOMParser().parseFromString(h, 'text/html')); }, function () {}));
      });
      return Promise.all(jobs).then(function () {
        var by = {};
        mains.forEach(function (m) { var k = nmKey(m.cls); (by[k] = by[k] || { name: m.cls, key: k, mains: [] }).mains.push(m); });
        md.classes = Object.keys(by).map(function (k) {
          var c = by[k]; c.kind = c.mains.some(function (m) { return m.leg > 0; }) ? 'pts' : 'bump';
          c.mains.sort(function (a, b) { return a.letter === b.letter ? a.leg - b.leg : a.letter < b.letter ? -1 : 1; });
          c.multi = mult[k] || null; return c;
        });
        md.ok = md.classes.length > 0;
      });
    }).then(function () { md.busy = false; md.at = Date.now(); md.err = ''; mainTabShow(); renderMain(true); },
      function () { md.busy = false; md.at = Date.now(); md.err = 'LiveRC 결과 페이지를 읽지 못했습니다'; renderMain(true); });
  }
  function mainTabShow() { var b = $('vl_tmain'); if (b) b.style.display = md.ok && !trkOnly && !pracOnly ? '' : 'none'; if (!md.ok && cfg.tab === 'main') setTab('board'); }
  /* which main is on track now: the one whose line-up holds most of the drivers on the timing screen (legs A1/A2/A3 share a line-up: the first one not done) */
  function mainNow(sc) {
    if (!md.ok || !sc || !sc.driverData || isPractice(sc)) return null;
    var live = list(sc.driverData).map(function (d) { return nmKey(nameOf(d)); }).filter(Boolean); if (!live.length) return null;
    var txt = nmKey([pageText('#class .value'), (sc.raceData || {}).className, (sc.raceData || {}).parsedHeat, (sc.raceData || {}).heatName].join(' '));
    var best = null, bs = 0;
    md.classes.forEach(function (c) {
      c.mains.forEach(function (m) {
        var names = {}; m.rows.forEach(function (r) { if (r.name) names[nmKey(r.name)] = 1; });
        var hit = live.filter(function (n) { return names[n]; }).length / live.length;
        if (txt.indexOf(nmKey(m.code + '-main')) >= 0) hit += 0.3;
        if (m.leg && m.done) hit -= 0.2;
        if (hit > bs) { bs = hit; best = { c: c, m: m }; }
      });
    });
    return bs >= 0.5 ? best : null;
  }
  /* free places of the main above m (bump spots) */
  function mainUpper(c, m) { return c.mains.filter(function (x) { return !x.leg && x.letter === String.fromCharCode(m.letter.charCodeAt(0) - 1); })[0] || null; }
  function mainSlots(up) { return up ? up.rows.filter(function (r) { return r.bump || r.empty; }).length : 0; }
  var mainLive = null;   /* { c, m, E } for this tick */
  function mainBumpE() { return mainLive && mainLive.c.kind === 'bump' ? mainLive.E : 0; }
  /* ---- electric: points ---- */
  function mainRule(c) {
    var map = {}, maxP = 0;
    if (c.multi) c.multi.rows.forEach(function (r) { r.legs.forEach(function (l) { if (l && l.pos > 0) { map[l.pos] = l.pts; maxP = Math.max(maxP, l.pos); } }); });
    var ks = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });
    var src = ks.length > 1 ? 'ev' : 'def';
    var at = function (pos) {
      if (src === 'def') return pos;
      if (map[pos] !== undefined) return map[pos];
      var a = ks[ks.length - 2], b = ks[ks.length - 1], step = (map[b] - map[a]) / (b - a);
      return pos > b ? map[b] + step * (pos - b) : map[ks[0]];
    };
    var low = src === 'def' || at(1) <= at(Math.max(2, maxP));
    return { at: at, low: low, src: src };
  }
  function mainBestK(c) {
    var n = c.mains.filter(function (m) { return m.leg > 0; }).length || (c.multi ? c.multi.of : 0) || 3;
    return n >= 3 ? n - 1 : n;
  }
  /* standings: finished legs from the results + the leg on track (live order) */
  function mainStand(c, liveLeg, override) {
    var R = mainRule(c), K = mainBestK(c), by = {}, nLegs = Math.max(c.mains.filter(function (m) { return m.leg > 0; }).length, c.multi ? c.multi.of : 0);
    var get = function (nm) { var k = nmKey(nm); return by[k] || (by[k] = { name: nm, legs: [], L: 0, T: 0, est: {} }); };
    var doneN = c.multi ? c.multi.done : 0;
    if (c.multi) c.multi.rows.forEach(function (r) { var e = get(r.name); e.off = r.pos; for (var i = 0; i < doneN; i++) if (r.legs[i]) { e.legs[i] = r.legs[i].pts; e.L += r.legs[i].L; e.T += r.legs[i].T; } });
    var li = -1;
    if (liveLeg && liveLeg.length) {
      li = doneN;
      var order = override || liveLeg;
      order.forEach(function (x, i) { var e = get(x.name); e.legs[li] = R.at(i + 1); e.est[li] = true; e.L += x.L || 0; e.T += x.T || 0; e.live = true; e.lpos = i + 1; e.voice = x.voice; });
    }
    var arr = Object.keys(by).map(function (k) {
      var e = by[k], got = e.legs.map(function (v, i) { return { v: v, i: i }; }).filter(function (x) { return x.v !== undefined; });
      got.sort(function (a, b) { return R.low ? a.v - b.v : b.v - a.v; });
      var use = got.slice(0, Math.min(K, got.length)); e.use = {}; use.forEach(function (x) { e.use[x.i] = 1; });
      e.tot = use.reduce(function (s, x) { return s + x.v; }, 0); e.n = got.length; return e;
    });
    var allDone = doneN && doneN >= nLegs && li < 0;
    arr.sort(function (a, b) {
      if (allDone && a.off && b.off) return a.off - b.off;   /* final: the event's own order (its tie-breaker) */
      if (b.n !== a.n) return b.n - a.n;
      if (a.tot !== b.tot) return R.low ? a.tot - b.tot : b.tot - a.tot;
      return b.L !== a.L ? b.L - a.L : a.T - b.T;
    });
    return { list: arr, rule: R, K: K, nLegs: nLegs, done: doneN, li: li };
  }
  function mainLiveLeg(sc) {
    return list(sc.driverData).filter(function (d) { return nameOf(d); }).sort(function (a, b) { return (+a.position || 99) - (+b.position || 99); })
      .map(function (d) { return { name: nameOf(d), L: +d.laps || 0, T: secs(d.elapsedTime) || 0, voice: !!match(d) }; });
  }
  /* what a voice driver needs in the leg on track for overall 1st / 2nd / 3rd (others keep their current order) */
  function mainGoals(c, live, who) {
    var others = live.filter(function (x) { return nmKey(x.name) !== nmKey(who); }), me = live.filter(function (x) { return nmKey(x.name) === nmKey(who); })[0]; if (!me) return null;
    var rankAt = function (p) {
      var o = others.slice(0, p - 1).concat([me]).concat(others.slice(p - 1));
      var st = mainStand(c, live, o).list; for (var i = 0; i < st.length; i++) if (nmKey(st[i].name) === nmKey(who)) return i + 1; return 99;
    };
    var ranks = []; for (var p = 1; p <= live.length; p++) ranks[p] = rankAt(p);
    return [1, 2, 3].map(function (k) {
      var worst = 0; for (var p2 = 1; p2 <= live.length; p2++) if (ranks[p2] <= k) worst = p2;
      return { k: k, p: worst, all: worst === live.length, none: !worst };
    });
  }
  function gapTxt(a, b) {   /* a ahead of b */
    if (!a || !b) return '';
    var la = +a.laps || 0, lb = +b.laps || 0;
    if (la > lb) return '+' + (la - lb) + 'L';
    var d = (secs(b.elapsedTime) || 0) - (secs(a.elapsedTime) || 0); return d >= 0 ? d.toFixed(1) + '초' : '';
  }
  /* every tick: which main is on track; voice for bump spots / overall standing */
  function mainTick(sc, all, fin) {
    mainLive = null;
    if (!md.ok) return;
    var w = mainNow(sc); if (!w) return;
    var up = w.c.kind === 'bump' ? mainUpper(w.c, w.m) : null;
    mainLive = { c: w.c, m: w.m, up: up, E: mainSlots(up) };
    if (!running || cfg.voiceOn === false || cfg.mainSay === false) return;
    var ord = all.slice().sort(function (a, b) { return (+a.position || 99) - (+b.position || 99); });
    if (w.c.kind === 'bump' && mainLive.E > 0) {
      ord.forEach(function (d, i) {
        if (!match(d) || !(+d.laps > 0)) return;
        var k = keyOf(d), inZ = i < mainLive.E, prev = md.said['z' + k];
        if (fin && fin[k]) {
          if (!md.said['f' + k]) { md.said['f' + k] = 1; say('main' + k, inZ ? up.code + '메인 진출, ' + (up.rows.filter(function (r) { return !r.bump && !r.empty; }).length + i + 1) + '번 그리드' : w.m.code + '메인 ' + (i + 1) + '등', -1); }
          return;
        }
        if (prev !== undefined && prev !== inZ) say('main' + k, inZ ? '범프권' : '범프권 밖', -1);
        md.said['z' + k] = inZ;
      });
    }
    if (w.c.kind === 'pts') {
      var live = mainLiveLeg(sc), st = mainStand(w.c, live).list;
      st.forEach(function (e, i) {
        if (!e.voice || !e.live) return;
        var d = ord.filter(function (x) { return nmKey(nameOf(x)) === nmKey(e.name); })[0]; if (!d || !(+d.laps > 0)) return;
        var k = keyOf(d), prev = md.said['o' + k];
        if (fin && fin[k]) { if (!md.said['of' + k]) { md.said['of' + k] = 1; say('main' + k, '종합 ' + (i + 1) + '위', -1); } return; }
        if (prev !== undefined && prev !== i + 1) say('main' + k, '종합 ' + (i + 1) + '위', -1);
        md.said['o' + k] = i + 1;
      });
    }
  }
  /* race tab: one line above the board */
  function mainStrip() {
    var el = $('vl_mstrip'); if (!el) return;
    if (!mainLive) { el.style.display = 'none'; return; }
    var c = mainLive.c, m = mainLive.m, h;
    if (c.kind === 'bump') h = '🏆 <b>' + esc(m.code) + '메인</b>' + (mainLive.E ? ' · 상위 ' + mainLive.E + '명 ' + esc(mainLive.up.code) + '메인 범프 업' : '') + ' <span class="mlink">메인 탭에서 자세히 ▸</span>';
    else {
      var st = mainStand(c, mainLiveLeg(SC())).list, v = st.filter(function (e) { return e.voice; }).map(function (e) { return '🔊 ' + esc(e.name) + ' 종합 <b>' + (st.indexOf(e) + 1) + '위</b>'; });
      h = '🏆 <b>' + esc(m.code) + '</b> · ' + esc(c.name) + (v.length ? ' · ' + v.join(' · ') : '') + ' <span class="mlink">메인 탭에서 자세히 ▸</span>';
    }
    el.innerHTML = h; el.style.display = 'block';
  }
  var mainSig = '';
  function renderMain(force) {
    var box = $('vl_main'); if (!box) return;
    if (!md.ok) { box.innerHTML = '<div class="mnote">' + (md.busy ? '메인 정보를 읽는 중…' : md.err ? '⚠ ' + esc(md.err) : '오늘 대회의 메인 출전표(Main Events)가 아직 없어요') + '</div>'; return; }
    var sc = SC(), voiceNames = {};
    if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { if (match(d)) voiceNames[nmKey(nameOf(d))] = 1; });
    Object.keys(cfg.sel || {}).forEach(function (n) { if (cfg.sel[n].on) voiceNames[nmKey(n)] = 1; });
    if (mainLive && mainLive.c.key !== md.liveKey) { md.liveKey = mainLive.c.key; md.sel = mainLive.c.key; }   /* a new main on track: show its class */
    if (!md.sel || !md.classes.some(function (c) { return c.key === md.sel; })) {
      var pick = md.classes.filter(function (c) { return c.mains.some(function (m) { return m.rows.some(function (r) { return voiceNames[nmKey(r.name)]; }); }); })[0];
      md.sel = (mainLive && mainLive.c.key) || (pick || md.classes[0]).key;
    }
    var c = md.classes.filter(function (x) { return x.key === md.sel; })[0];
    var liveD = {}; if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { liveD[nmKey(nameOf(d))] = d; });
    var h = '<div class="mchips">' + md.classes.map(function (x) {
      var hasV = x.mains.some(function (m) { return m.rows.some(function (r) { return voiceNames[nmKey(r.name)]; }); });
      return '<button class="mchip' + (x.key === md.sel ? ' on' : '') + '" data-mc="' + esc(x.key) + '">' + esc(x.name.replace(/^1\/\d+\s*/, '')) + (hasV ? ' 🔊' : '') + '</button>';
    }).join('') + '</div>';
    var vn = function (n) { return voiceNames[nmKey(n)] ? '🔊 ' : ''; };
    if (c.kind === 'bump') {
      h += '<div class="mnote">' + esc(md.ev) + ' · 🔧 범프업 방식 (위 메인의 빈 자리 = 아래 메인에서 올라오는 수, 맨 뒤 그리드에 아래 메인 순위대로)</div>';
      c.mains.forEach(function (m) {
        var isLive = mainLive && mainLive.m === m, up = mainUpper(c, m), E = mainSlots(up), lower = c.mains.filter(function (x) { return x.letter === String.fromCharCode(m.letter.charCodeAt(0) + 1); })[0];
        var fixed = m.rows.filter(function (r) { return !r.bump && !r.empty; }), slots = m.rows.filter(function (r) { return r.bump || r.empty; });
        h += '<div class="mcard' + (isLive ? ' live' : '') + '"><div class="mt">' + esc(m.code) + '메인 <small>' + esc(m.len) + ' · ' + (isLive ? '<span class="ok">● 진행 중</span>' : m.done ? '✓ 끝남' : '대기') +
          (slots.length ? ' · ' + fixed.length + '명 + <span class="pk">' + (slots.some(function (r) { return r.bump && r.name; }) ? '범프업 ' : '빈 자리 ') + slots.length + '</span>' : '') + (E ? ' · 상위 ' + E + '명 범프 업' : '') + '</small></div>';
        var rowsH = '';
        if (isLive) {
          var ord = Object.keys(liveD).map(function (k) { return liveD[k]; }).sort(function (a, b) { return (+a.position || 99) - (+b.position || 99); });
          ord.forEach(function (d, i) {
            rowsH += '<tr class="' + (match(d) ? 'me' : '') + (E && i === E ? ' bl' : '') + '"><td class="g">' + (i + 1) + '</td><td>' + vn(nameOf(d)) + esc(nameOf(d)) + '</td><td class="r">' +
              (E && i < E ? '<span class="bu">⬆' + (match(d) ? ' 범프권' : '') + '</span>' : E && i === E ? '<span class="og">범프까지 ' + esc(gapTxt(ord[E - 1], d)) + '</span>' : '') + '</td></tr>';
          });
          var me = ord.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return match(x.d) && E && x.i < E; });
          if (me.length && up) rowsH += '<tr><td colspan="3" class="mnote">' + me.map(function (x) { return '지금 순위면 🔊 ' + esc(nameOf(x.d)) + ' → ' + esc(up.code) + '메인 <b>' + (up.rows.filter(function (r) { return !r.bump && !r.empty; }).length + x.i + 1) + '번 그리드</b>'; }).join('<br>') + '</td></tr>';
        } else if (m.done && !slots.length && !isLive && m.letter !== 'A') {
          rowsH = '<tr><td colspan="3" class="mnote">' + (m.res ? '<a href="' + esc(m.res) + '" target="_blank" rel="noopener">결과 보기 ▸</a>' : '') + '</td></tr>';
        } else {
          var lowerLive = lower && mainLive && mainLive.m === lower, lowOrd = lowerLive ? Object.keys(liveD).map(function (k) { return liveD[k]; }).sort(function (a, b) { return (+a.position || 99) - (+b.position || 99); }) : null;
          m.rows.forEach(function (r) {
            if (!r.bump && !r.empty) { rowsH += '<tr class="' + (voiceNames[nmKey(r.name)] ? 'me' : '') + '"><td class="g">' + r.pos + '</td><td>' + vn(r.name) + esc(r.name) + '</td><td class="r">' + (r.seed === '1' ? 'TQ' : '') + '</td></tr>'; return; }
            var j = slots.indexOf(r), guess = r.name || (lowOrd && lowOrd[j] ? nameOf(lowOrd[j]) : '');
            rowsH += '<tr class="emp' + (guess && voiceNames[nmKey(guess)] ? ' me' : '') + '"><td class="g">' + r.pos + '</td><td>⬆ ' + esc(lower ? lower.code : '') + '메인 ' + (j + 1) + '등' + (r.name ? ' — ' + vn(r.name) + esc(r.name) : guess ? ' 자리 — 예상: ' + vn(guess) + esc(guess) : ' 자리') + '</td><td></td></tr>';
          });
        }
        h += '<table class="mt2">' + rowsH + '</table></div>';
      });
    } else {
      var live = mainLive && mainLive.c === c && sc ? mainLiveLeg(sc) : null, S = mainStand(c, live), legs = [];
      for (var i = 0; i < Math.max(S.nLegs, S.done + (live ? 1 : 0)); i++) legs.push(i);
      h += '<div class="mnote">' + esc(md.ev) + ' · ⚡ 포인트 방식 · ' + (S.rule.src === 'ev' ? '<b>대회 규칙: 결과에서 읽음</b> (' + [1, 2, 3].map(function (p) { return p + '등 ' + S.rule.at(p) + '점'; }).join(' · ') + ' …, ' + (S.rule.low ? '적은' : '많은') + ' 순)' : '기본 규칙 1등 1점 · 2등 2점 … 적은 순 <span class="og">— A1이 끝나면 대회 규칙으로 바꿈</span>') +
        ' · ' + (S.nLegs >= 3 ? '좋은 ' + S.K + '레그 합산' : '레그 ' + S.nLegs + '번 모두 합산') + ' · 같으면 레그 전체 랩/시간</div>';
      h += '<div class="mcard' + (live ? ' live' : '') + '"><div class="mt">메인 종합 <small>' + (live ? 'A' + (S.li + 1) + ' <span class="ok">● 진행 중 — 지금 순위로 예상</span>' : S.done ? '레그 ' + S.done + '/' + S.nLegs + ' 끝남' : '아직 시작 전') + '</small></div>';
      h += '<table class="mt2"><tr><th class="g">#</th><th>선수</th>' + legs.map(function (i) { return '<th class="r' + (i === S.li ? ' ok' : '') + '">A' + (i + 1) + '</th>'; }).join('') + '<th class="r">합</th></tr>' +
        S.list.map(function (e, k) {
          return '<tr class="' + (voiceNames[nmKey(e.name)] ? 'me' : '') + '"><td class="g">' + (k + 1) + '</td><td>' + vn(e.name) + esc(e.name) + '</td>' +
            legs.map(function (i) { var v = e.legs[i]; return '<td class="r' + (e.est[i] ? ' ok' : '') + (v !== undefined && !e.use[i] ? ' x' : '') + '">' + (v === undefined ? '-' : v) + '</td>'; }).join('') +
            '<td class="r big">' + e.tot + '</td></tr>';
        }).join('') + '</table><div class="mnote">줄 그은 칸 = 버리는 레그</div>';
      if (live) live.filter(function (x) { return x.voice; }).forEach(function (x) {
        var G = mainGoals(c, live, x.name); if (!G) return;
        var cur = live.indexOf(x) + 1;
        h += '<div class="mgoal"><b>🔊 ' + esc(x.name) + ' 목표</b> <small>(다른 선수가 지금 순위로 끝난다고 보면 · 지금 ' + cur + '등)</small>' + G.map(function (g) {
          return '<div>' + ['🏆', '🥈', '🥉'][g.k - 1] + ' 종합 ' + g.k + '위: ' + (g.none ? '<span style="color:#ff9a9a">어려움</span>' : g.all ? '이미 <b class="ok">확정</b>' : g.p === 1 ? '이번 레그 <b>1등</b> 해야 함' : '<b>' + g.p + '등 안</b>이면 됨') + '</div>';
        }).join('') + '</div>';
      });
      h += '</div>';
    }
    if (h === mainSig && !force) return; mainSig = h;
    box.innerHTML = h;
  }
  function renderQual() {
    var box = $('vl_qual'); if (!box) return;
    var sc = SC(), R = qualRound(sc), cls = ((sc || {}).raceData || {}).className || pageText('#class .value') || '';
    if (!cfg.qualOn || cfg.raceOn === false || !R || !cls) { if (box.innerHTML) box.innerHTML = ''; qd.html = ''; qd.pred = {}; qd.tq = ''; return; }
    var key = location.host + '|' + nmKey(cls) + '|' + R;
    if (qd.key !== key) { qd = { key: key, at: 0, busy: false, ok: false, err: '', rounds: {}, html: '' }; }
    if (!qd.busy && Date.now() - qd.at > 60000) qualFetch(cls, R, key);
    if (!qd.ok) { if (box.innerHTML) box.innerHTML = ''; qd.html = ''; qd.pred = {}; qd.tq = ''; return; }
    var mode = cfg.qualMode === 'points' ? 'points' : 'best';
    var now = qualRank(qualEntries(sc, R, true), R, mode), before = qualRank(qualEntries(sc, R, false), R, mode), pos0 = {};
    before.forEach(function (e, i) { pos0[nmKey(e.name)] = i + 1; });
    /* for the 👤 big cards: predicted standing (and change) per driver, predicted TQ */
    qd.pred = {}; qd.tq = now[0] && now[0].best ? now[0].name : '';
    now.forEach(function (e, i) { var p0 = pos0[nmKey(e.name)]; qd.pred[nmKey(e.name)] = { rank: e.best ? i + 1 : 0, chg: e.best && p0 ? p0 - (i + 1) : 0 }; });
    var rowCls = function (e) { return e.voice ? ' class="vl-qv"' : e.live ? ' class="vl-ql"' : ''; };
    var nmCell = function (e, tq) { return '<td class="vl-qn">' + (e.live ? '<i class="vl-qd"></i>' : '') + (e.voice ? '🔊 ' : '') + (tq ? '🏁 ' : '') + esc(e.name) + (tq ? ' <small class="vl-qtq">TQ</small>' : '') + '</td>'; };
    var chg = function (e, i) { var p0 = pos0[nmKey(e.name)]; if (!p0 || p0 === i + 1) return '<td class="vl-qc">–</td>'; return p0 > i + 1 ? '<td class="vl-qc vl-qup">▲' + (p0 - i - 1) + '</td>' : '<td class="vl-qc vl-qdn">▼' + (i + 1 - p0) + '</td>'; };
    var ltCell = function (e, n, bold) { var v = e.r[n]; if (!v) return '<td class="vl-qw">' + (n === R && e.wait ? '대기' : '-') + '</td>'; return '<td' + (e.est[n] ? ' class="vl-qe"' : '') + '>' + (bold ? '<b>' + esc(v.s) + '</b>' : esc(v.s)) + (e.est[n] && bold ? '<small>예상</small>' : '') + '</td>'; };
    var rs = []; for (var n = 1; n <= R; n++) rs.push(n);
    var h, sum = '', mine = now.filter(function (e) { return e.voice; });
    /* wide screens: each table shows 10 places, the rest scrolls inside (CSS + fitWidths); the voice driver's row stays pinned at the bottom */
    var qsc = function (tbl, n) { return '<div class="vl-qsc">' + tbl + '</div>' + (n > 10 ? '<div class="vl-qmore">아래로 ' + (n - 10) + '명 더 — 표 안에서 스크롤</div>' : ''); };
    var qscIn = function (card, n) { var a = card.indexOf('<table class="vl-qt">'), b = card.lastIndexOf('</table>') + 8; return card.slice(0, a) + qsc(card.slice(a, b), n) + card.slice(b); };
    if (mode === 'best') {
      h = '<table class="vl-qt"><tr><th>예상</th><th>변동</th><th class="vl-qn">NAME</th><th>최고 기록</th><th class="vl-qn">라운드</th>' + rs.map(function (n) { return '<th>R' + n + '</th>'; }).join('') + '</tr>' +
        now.map(function (e, i) {
          return '<tr' + rowCls(e) + '><td class="vl-qp">' + (e.best ? i + 1 : '-') + '</td>' + chg(e, i) + nmCell(e, i === 0 && e.best) +
            (e.best ? '<td' + (e.est[e.bestN] ? ' class="vl-qe"' : '') + '><b>' + esc(e.best.s) + '</b>' + (e.est[e.bestN] ? '<small>예상</small>' : '') + '</td><td class="vl-qn">R' + e.bestN + '</td>' : '<td class="vl-qw">대기</td><td></td>') +
            rs.map(function (n) { return ltCell(e, n, false); }).join('') + '</tr>';
        }).join('') + '</table>';
      h = qsc(h, now.length);
      sum = mine.map(function (e) { var i = now.indexOf(e), p0 = pos0[nmKey(e.name)]; return esc(e.name) + ' 예상 ' + (e.best ? (i + 1) + '위' : '대기') + (p0 && e.best && p0 !== i + 1 ? (p0 > i + 1 ? ' ▲' + (p0 - i - 1) : ' ▼' + (i + 1 - p0)) : ''); }).join(' · ');
    } else {
      var rr = now.filter(function (e) { return e.r[R]; }).sort(function (a, b) { return ltCmp(a.r[R], b.r[R]); }).concat(now.filter(function (e) { return !e.r[R]; }));
      var PR = ptsRule();
      var t1 = '<div class="vl-qs"><div class="vl-qsh">이번 라운드 예상 <small>— ' + R + '라운드 · 모든 선수 랩/시간 순 → 포인트</small></div><table class="vl-qt"><tr><th>순위</th><th class="vl-qn">NAME</th><th>랩/시간</th><th>포인트</th></tr>' +
        rr.map(function (e, i) { var w = !e.r[R]; return '<tr' + rowCls(e) + (w ? ' style="color:#777"' : '') + '><td class="vl-qp">' + (w ? '-' : i + 1) + '</td>' + nmCell(e, false) + ltCell(e, R, false) + '<td class="' + (e.est[R] ? 'vl-qe' : '') + '"><b>' + (w ? '-' : e.pts[R] + '점') + '</b></td></tr>'; }).join('') + '</table></div>';
      var t2 = '<div class="vl-qs"><div class="vl-qsh">포인트 합계 예상 순위 <small>— 합계 ' + (PR.low ? '적은' : '많은') + ' 순' + (PR.best ? ' · 좋은 ' + PR.best + '라운드만' : '') + ' · 동점이면 최고 랩/시간</small></div><table class="vl-qt"><tr><th>예상</th><th>변동</th><th class="vl-qn">NAME</th>' + rs.map(function (n) { return '<th>R' + n + '</th>'; }).join('') + '<th>합계</th><th>최고 기록</th></tr>' +
        now.map(function (e, i) {
          var has = Object.keys(e.pts).length, tie = has && !e.wait && now.filter(function (x) { return Object.keys(x.pts).length && !x.wait && x.tot === e.tot; });
          var tieTxt = tie && tie.length > 1 ? '<small class="vl-qtie">동점 ' + e.tot + ' → 기록 ' + (tie.indexOf(e) + 1) + '위</small>' : '';
          return '<tr' + rowCls(e) + '><td class="vl-qp">' + (has ? i + 1 : '-') + '</td>' + chg(e, i) + nmCell(e, i === 0 && has) +
            rs.map(function (n) { return e.pts[n] !== undefined ? '<td class="' + (e.est[n] ? 'vl-qe' : '') + (e.drop && e.drop[n] ? ' vl-qx' : '') + '"' + (e.drop && e.drop[n] ? ' title="합계에 안 들어감 (좋은 ' + qd.bestN + '라운드만)"' : '') + '>' + e.pts[n] + '</td>' : '<td class="vl-qw">' + (n === R ? '대기' : '-') + '</td>'; }).join('') +
            '<td><b>' + (has ? e.tot + (e.wait ? '+' : '') : '-') + '</b></td><td>' + (e.best ? esc(e.best.s) : '-') + tieTxt + '</td></tr>';
        }).join('') + '</table></div>';
      h = '<div class="vl-qpair">' + qscIn(t1, rr.length) + qscIn(t2, now.length) + '</div>';
      sum = mine.map(function (e) { var i = now.indexOf(e), j = rr.indexOf(e), p0 = pos0[nmKey(e.name)]; return esc(e.name) + ' ' + R + '라운드 ' + (e.r[R] ? (j + 1) + '등(' + e.pts[R] + '점)' : '대기') + ' → 합계 예상 ' + (Object.keys(e.pts).length ? (i + 1) + '위' : '-') + (p0 && p0 !== i + 1 ? (p0 > i + 1 ? ' ▲' + (p0 - i - 1) : ' ▼' + (i + 1 - p0)) : ''); }).join(' · ');
    }
    /* folded: the predicted TQ always, then every voice driver, one per row at table size */
    var foldRows = '', tq = now[0] && (mode === 'points' ? Object.keys(now[0].pts).length : now[0].best) ? now[0] : null;
    var rrF = mode === 'points' ? now.filter(function (e) { return e.r[R]; }).sort(function (a, b) { return ltCmp(a.r[R], b.r[R]); }) : null;
    var foldRow = function (e, isTq) {
      var i = now.indexOf(e), p0 = pos0[nmKey(e.name)], ch = p0 && p0 !== i + 1 ? (p0 > i + 1 ? '<td class="vl-qup">▲' + (p0 - i - 1) + '</td>' : '<td class="vl-qdn">▼' + (i + 1 - p0) + '</td>') : '<td class="vl-qc">–</td>';
      var nm = '<td class="vl-qn">' + (isTq ? '<span class="vl-qtqb">TQ</span>' : '') + (e.live ? '<i class="vl-qd"></i>' : '') + (e.voice ? '🔊 ' : (isTq ? '🏁 ' : '')) + esc(e.name) + '</td>';
      var body;
      if (mode === 'points') {
        var j = rrF.indexOf(e);
        body = '<td>' + R + '라운드 ' + (e.r[R] ? '<b class="vl-qbig">' + (j + 1) + '등</b> <span class="' + (e.est[R] ? 'vl-qg' : '') + '">' + e.pts[R] + '점</span>' : '<span class="vl-qw">대기</span>') + '</td>' +
          '<td>→ 합계 예상 ' + (Object.keys(e.pts).length ? '<b class="vl-qbig">' + (i + 1) + '위</b>' + (isTq && !e.voice ? ' · ' + e.tot : '') : '-') + '</td>';
      } else {
        body = '<td>예상 ' + (e.best ? '<b class="vl-qbig">' + (i + 1) + '위</b>' : '<span class="vl-qw">대기</span>') + '</td><td>' + (e.best ? esc(e.best.s) + (e.est[e.bestN] ? ' <span class="vl-qg">예상</span>' : '') : '<span class="vl-qw">대기</span>') + '</td>';
      }
      return '<tr class="' + (e.voice ? 'vl-qv' : isTq ? 'vl-qtqr' : '') + '">' + nm + body + ch + '</tr>';
    };
    if (tq) foldRows += foldRow(tq, true);
    mine.forEach(function (e) { if (e !== tq) foldRows += foldRow(e, false); });
    var open = cfg.qualOpen !== false;
    var html = '<div class="vl-qbox' + (open ? ' vl-qo' : '') + '"><div class="vl-qh" data-qt="1"><span class="vl-qar">' + (open ? '▾' : '▸') + '</span><b class="vl-qtt">🏆 예선 순위</b><span class="vl-qm vl-qm-' + mode + '">' + (mode === 'points' ? '포인트' : '베스트 랩/시간') + '</span>' +
      '<span class="vl-qi">' + esc(cls) + ' · ' + R + '라운드' + (open ? ' · ' + now.length + '명' : '') + '</span><span class="vl-qb">' + (open ? '숨기기' : '보기') + '</span></div>' +
      (!open && foldRows ? '<table class="vl-qt vl-qfold">' + foldRows + '</table>' : '') +
      (open ? h + '<div class="vl-qsrc">' + (mode === 'points' ? (function () { var r = ptsRule(); return '포인트 규칙: ' + (r.src === 'event' ? '이 대회(LiveRC Qual Points)' : '기본 — 1라운드 결과가 올라오면 대회 규칙으로 자동 변경') + ' · ' + r.txt + ' · ' + (r.low ? '적은' : '많은') + ' 순' + (r.best ? ' · 좋은 ' + r.best + '/' + (qd.ofN || '?') + '라운드 합산(회색 취소선 = 제외)' : '') + '<br>'; })() + '초록 숫자 = 지금 레이스 기록으로 예상한 값 · 대기 = 이번 라운드 아직 안 뜀(합계 뒤 +)' : '최고 기록 = 모든 예선 라운드 중 가장 좋은 랩/시간 · 지금 뛰는 선수는 예상 기록 반영') + ' · 변동 = 이번 레이스 시작 전과 비교' + (qd.err ? ' · ⚠ ' + esc(qd.err) : '') + '</div>' : '') + '</div>';
    if (html !== qd.html) {
      var st = [].map.call(box.querySelectorAll('.vl-qsc'), function (e) { return e.scrollTop; });   /* live updates must not jump the list back to the top */
      qd.html = html; box.innerHTML = html;
      try { fitWidths(); } catch (e) {}
      [].forEach.call(box.querySelectorAll('.vl-qsc'), function (e, k) { if (st[k]) e.scrollTop = st[k]; });
    }
  }
  /* running time of the lap in progress: green, orange within liveSec of the driver's best, red past the best; stops when the race is over */
  function fmtRun(t) { var m = Math.floor(t / 60), r = t - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }
  function updLive() {
    if (cfg.raceOn === false || cfg.lapLive === false || cfg.tab !== 'board') return;
    var els = root.querySelectorAll('#vl_rb .lt[data-lt]'); if (!els.length) return;
    var sc = SC(), st = String(((sc || {}).raceData || {}).raceStatus || '');
    if (/complete|finish|stop|ended/i.test(st)) return;
    var byKey = {}; if (sc && sc.driverData) list(sc.driverData).forEach(function (d) { byKey[keyOf(d)] = d; });
    var now = Date.now(), ns = +cfg.liveSec; if (!(ns >= 0)) ns = 2;
    els.forEach(function (el) {
      var k = el.getAttribute('data-lt'), t0 = lastCross[k], d = byKey[k];
      if (!t0 || !d || (rs && rs.fin[k])) { el.textContent = rs && rs.fin[k] ? '🏁' : '-'; el.style.color = ''; return; }   /* finished: the clock stops */
      var t = (now - t0) / 1000, best = siteFast(d);
      el.textContent = fmtRun(t);
      el.style.color = best > 0 && t > best ? (cfg.liveOver || '#ff5252') : best > 0 && t >= best - ns ? (cfg.liveNear || '#ffa94d') : (cfg.liveOk || '#3ddc84');
    });
  }


  /* ---------- practice history (📊 연습 기록) ----------
     LiveRC practice pages on the same site:
       /practice/?d=YYYY-MM                      → dates in that month that have sessions
       /practice/?p=session_list&d=YYYY-MM-DD    → every session that day (driver, class (transponder), start, laps, length, fast, avg)
       /practice/?p=view_session&id=N            → one session (Top 3 Consec)
     Past days never change, so they are cached in localStorage. */
  var PK = 'vlPracCache';
  var pc = { days: {}, months: {}, t3: {} };
  try { var pcs = JSON.parse(localStorage.getItem(PK) || 'null'); if (pcs && pcs.days) pc = pcs; } catch (e) {}
  if (!pc.t3) pc.t3 = {}; if (!pc.cons) pc.cons = {}; if (!pc.laps || pc.lv !== 2) { pc.laps = {}; pc.lv = 2; }   /* v2: lap validity kept */
  function pcSave() {
    var dk = Object.keys(pc.days).sort();
    while (dk.length > 150) delete pc.days[dk.shift()];   /* keep the newest 150 days */
    try { localStorage.setItem(PK, JSON.stringify(pc)); }
    catch (e) { pc.days = {}; try { localStorage.setItem(PK, JSON.stringify(pc)); } catch (e2) {} }
  }
  var PCOL = ['#e8b400', '#4fc3f7', '#3ddc84', '#ff7a7a', '#d27cff', '#ffa94d', '#8bd3c7', '#f06292', '#c5e1a5', '#b0bec5'];
  var prac = { rows: [], lseq: 0, aseq: 0, loaded: '', busy: false };
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function todayS() { return ymd(new Date()); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function getDoc(path) {
    return fetch(location.origin + path, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (h) { return new DOMParser().parseFromString(h, 'text/html'); });
  }
  function pool(items, n, fn, onStep) {   /* run fn over items with n at a time */
    var i = 0, done = 0;
    return new Promise(function (res) {
      if (!items.length) return res();
      function next() {
        if (i >= items.length) return;
        var it = items[i++];
        Promise.resolve().then(function () { return fn(it); }).catch(function () {}).then(function () {
          done++; if (onStep) onStep(done, items.length);
          if (done === items.length) res(); else next();
        });
      }
      for (var k = 0; k < Math.min(n, items.length); k++) next();
    });
  }
  function parseDay(doc) {
    var out = [];
    doc.querySelectorAll('table.practice_session_list tbody tr').forEach(function (tr) {
      var td = tr.children; if (td.length < 4) return;
      var a = td[0].querySelector('a'), sm = td[0].querySelector('small');
      var id = a && (a.getAttribute('href').match(/id=(\d+)/) || [])[1]; if (!id) return;
      var cls = sm ? sm.textContent.trim() : '', tp = (cls.match(/\((\d+)\)\s*$/) || [])[1] || '';
      var hid = td[1].querySelector('.hidden');
      var lp = td[2].innerHTML.split(/<br\s*\/?>/i).map(function (x) { return x.replace(/<[^>]*>/g, '').trim(); });
      var fa = td[3].textContent.match(/Fast:\s*([\d:.]+)/), av = td[3].textContent.match(/Avg:\s*([\d:.]+)/);
      out.push([id, a.textContent.trim(), cls.replace(/\s*\(\d+\)\s*$/, ''), tp, hid ? hid.textContent.trim() : '', +lp[0] || 0, lp[1] || '', fa ? fa[1] : '', av ? av[1] : '']);
    });
    return out;
  }
  function monthsBetween(f, t) {
    var out = [], y = +f.slice(0, 4), m = +f.slice(5, 7), ty = +t.slice(0, 4), tm = +t.slice(5, 7);
    while (y < ty || (y === ty && m <= tm)) { out.push(y + '-' + ('0' + m).slice(-2)); m++; if (m > 12) { m = 1; y++; } }
    return out;
  }
  function pstat(msg, frac) {
    $('vl_pstat').innerHTML = esc(msg) + (frac >= 0 ? '<div class="bar"><i style="width:' + Math.round(frac * 100) + '%"></i></div>' : '');
  }
  function setRange(r) {
    var t = todayS(), f;
    if (r === 'm') f = t.slice(0, 8) + '01'; else if (r === 't') f = t; else f = addDays(t, -(+r - 1));
    $('vl_pf').value = f; $('vl_pt').value = t;
    cfg.pracFrom = f; cfg.pracTo = t; save();
  }
  function pracOpen() {
    if (!$('vl_pf').value) {
      $('vl_pf').value = cfg.pracFrom || addDays(todayS(), -29);
      $('vl_pt').value = cfg.pracTo || todayS();
    }
    if (!prac.loaded && !prac.busy) pracLoad();
  }
  function pracLoad() {
    var f = $('vl_pf').value, t = $('vl_pt').value;
    if (!f || !t) { pstat('기간을 선택하세요.'); return; }
    if (f > t) { var x = f; f = t; t = x; $('vl_pf').value = f; $('vl_pt').value = t; }
    cfg.pracFrom = f; cfg.pracTo = t; save();
    var seq = ++prac.lseq, today = todayS(), curMonth = today.slice(0, 7);
    prac.busy = true; $('vl_pload').disabled = true;
    var months = monthsBetween(f, t), dates = [];
    pstat('날짜 목록 확인 중…', 0);
    pool(months, 3, function (ym) {
      if (ym < curMonth && pc.months[ym]) { dates = dates.concat(pc.months[ym]); return; }
      return getDoc('/practice/?d=' + ym).then(function (doc) {
        var ds = {};
        doc.querySelectorAll('a[href*="session_list&d="]').forEach(function (a) { var m = a.getAttribute('href').match(/d=(\d{4}-\d{2}-\d{2})/); if (m && m[1].slice(0, 7) === ym) ds[m[1]] = 1; });
        var list = Object.keys(ds).sort();
        if (ym < curMonth) pc.months[ym] = list;
        dates = dates.concat(list);
      });
    }).then(function () {
      if (seq !== prac.lseq) return;
      dates = dates.filter(function (d) { return d >= f && d <= t; }).sort();
      var need = dates.filter(function (d) { return !(d < today && pc.days[d]); });
      var fresh = {};
      pstat('세션 목록 불러오는 중… (' + dates.length + '일)', 0);
      return pool(need, 3, function (d) {
        return getDoc('/practice/?p=session_list&d=' + d).then(function (doc) {
          var rows = parseDay(doc); fresh[d] = rows;
          if (d < today) pc.days[d] = rows;
        });
      }, function (n, all) { if (seq === prac.lseq) pstat('세션 목록 불러오는 중… ' + n + '/' + all + '일', n / all); })
        .then(function () {
          if (seq !== prac.lseq) return;
          pcSave();
          var rows = [];
          dates.forEach(function (d) { (fresh[d] || pc.days[d] || []).forEach(function (r) { rows.push(r); }); });
          prac.rows = rows; prac.loaded = f + '~' + t; deskPrac();
          pstat(dates.length ? f + ' ~ ' + t + ' · 연습한 날 ' + dates.length + '일 · 세션 ' + rows.length + '개' : f + ' ~ ' + t + ' 기간에 연습 기록이 없습니다.');
          renderDrivers(); pracAnalyze();
        });
    }).catch(function (e) { pstat('불러오기 실패: ' + e.message + ' (LiveRC 페이지에서 실행 중인지 확인하세요)'); })
      .then(function () { if (seq === prac.lseq) { prac.busy = false; $('vl_pload').disabled = false; } });
  }
  function driverStats() {
    var by = {};
    prac.rows.forEach(function (r) {
      var o = by[r[1]] || (by[r[1]] = { name: r[1], n: 0, tps: {} });
      o.n++; if (r[3]) o.tps[r[3]] = 1;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
  }
  function selColor(name) { var i = cfg.pracSel.indexOf(name); return i < 0 ? '' : PCOL[i % PCOL.length]; }
  function renderDrivers() {
    var ds = driverStats(), q = ($('vl_pq').value || '').trim();
    $('vl_pselbox').style.display = ds.length ? '' : 'none';
    var present = {}; ds.forEach(function (d) { present[d.name] = 1; });
    $('vl_pcnt').textContent = cfg.pracSel.length ? cfg.pracSel.length + '명 선택' : '';
    $('vl_pclr').disabled = !cfg.pracSel.length;
    $('vl_pdrv').innerHTML = ds.filter(function (d) {
      return !q || kmatch(d.name, q) || kmatch(Object.keys(d.tps).join(' '), q);
    }).map(function (d) {
      var on = cfg.pracSel.indexOf(d.name) >= 0, tp = Object.keys(d.tps);
      return '<button class="dch' + (on ? ' on' : '') + '" data-n="' + esc(d.name) + '" title="' + esc(d.name) + '">' +
        '<span class="sw" style="background:' + (on ? selColor(d.name) : 'transparent') + ';border:1px solid ' + (on ? 'transparent' : '#44444c') + '"></span>' +
        '<span class="nm">' + esc(d.name) + '</span><span class="tp">' + (tp.length ? '#' + esc(tp.join(', #')) : '폰더 번호 없음') + '</span><small>세션 ' + d.n + '</small>' +
        '<span class="vl-fv' + (isFav(d.name) ? ' on' : '') + '" data-fav="' + esc(d.name) + '" title="즐겨찾기">' + (isFav(d.name) ? '★' : '☆') + '</span></button>';
    }).join('') || '<div style="color:#888;font-size:13px;padding:6px">검색 결과가 없습니다.</div>';
    var f = cfg.favs || [];
    $('vl_pfav').innerHTML = f.length ? '★ 즐겨찾기 ' + f.map(function (n) { return '<button data-pf="' + esc(n) + '" class="' + (cfg.pracSel.indexOf(n) >= 0 ? 'on' : '') + (present[n] ? '' : ' na') + '"' + (present[n] ? '' : ' title="이 기간에 기록 없음"') + '>' + esc(n) + '</button>'; }).join('') : '';
  }
  function hms(sec) {
    sec = Math.round(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = sec % 60;
    return h ? h + '시간 ' + m + '분' : (m ? m + '분 ' + s2 + '초' : s2 + '초');
  }
  function pracAnalyze() {
    var sel = cfg.pracSel.filter(function (n) { return prac.rows.some(function (r) { return r[1] === n; }); });
    if (!sel.length) { $('vl_pres').innerHTML = prac.rows.length ? '<div style="color:#888;font-size:13px;padding:8px 2px">위에서 선수 버튼을 누르면 기록을 정리해서 보여줍니다.</div>' : ''; return; }
    var seq = ++prac.aseq, rows = prac.rows.filter(function (r) { return sel.indexOf(r[1]) >= 0; });
    var need = rows.filter(function (r) { return pc.t3[r[0]] === undefined || pc.cons[r[0]] === undefined || pc.laps[r[0]] === undefined; }).map(function (r) { return r[0]; });
    function draw() { if (seq === prac.aseq) renderPractice(sel, rows); }
    if (!need.length) return draw();
    draw();
    pstat('세션 기록(Top 3 · Consistency · 랩타임) 불러오는 중… 0/' + need.length, 0);
    var last = Date.now();
    pool(need, 4, function (id) {
      return getDoc('/practice/?p=view_session&id=' + id).then(function (doc) {
        var v = '';
        doc.querySelectorAll('table tr').forEach(function (tr) { var th = tr.querySelector('th'), td = tr.querySelector('td'); if (th && td && /Top\s*3\s*Consec/i.test(th.textContent)) v = td.textContent.trim(); });
        pc.t3[id] = v;
        /* Consistency (%) sits with the averages; read the first "N%" after the word, whatever the table layout */
        var cells = [].map.call(doc.querySelectorAll('th,td'), function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).join(' | ');
        var cm = (cells + ' | ' + (doc.body ? doc.body.innerText || '' : '')).match(/Consistency[^%]{0,300}?(?:^|[\s|:])(\d+(?:\.\d+)?)\s*%/i);
        pc.cons[id] = cm ? cm[1] : '';
        var lm = [].map.call(doc.querySelectorAll('script'), function (sc) { return sc.textContent; }).join('\n').match(/lapsObj\s*=\s*(\[[\s\S]*?\])\s*;/), la = [];
        try { if (lm) la = JSON.parse(lm[1]).map(function (x) { var v = Math.round(parseFloat(x.lap_time) * 1000) / 1000; return v > 0 ? (x.is_valid === '0' || x.is_valid === 0 ? -v : v) : 0; }).filter(function (v) { return v; }); } catch (e2) {}   /* invalid (*) laps stored negative */
        pc.laps[id] = la;
      });
    }, function (n, all) {
      if (seq !== prac.aseq) return;
      pstat('세션 기록(Top 3 · Consistency · 랩타임) 불러오는 중… ' + n + '/' + all, n / all);
      if (Date.now() - last > 1500) { last = Date.now(); draw(); }
    }).then(function () {
      if (seq !== prac.aseq) return;
      pcSave(); draw(); deskPrac();
      pstat(prac.loaded.replace('~', ' ~ ') + ' · 세션 ' + prac.rows.length + '개 중 선택한 선수 ' + rows.length + '개');
    });
  }
  function f3(v) { return v > 0 ? v.toFixed(3) : '-'; }
  function lineChart(series, title, fmt, timeAxis, width) {
    fmt = fmt || fmtS;
    var pts = []; series.forEach(function (s) { s.pts.forEach(function (p) { pts.push(p); }); });
    if (!pts.length) return '<div style="color:#888;font-size:12px;padding:6px 0">' + esc(title) + ': 데이터 없음</div>';
    var W2 = width || 720, H = width ? 250 : 230, L = 58, R = 14, T = 12, B = 30;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x0 === x1) { var padX = timeAxis ? 1800000 : 86400000; x0 -= padX; x1 += padX; }
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), pad = Math.max((y1 - y0) * 0.12, 0.05); y0 -= pad; y1 += pad;
    var X = function (x) { return L + (x - x0) / (x1 - x0) * (W2 - L - R); }, Y = function (y) { return T + (y - y0) / (y1 - y0) * (H - T - B); };  /* faster (smaller) is higher up */
    var g = '';
    for (var i = 0; i <= 4; i++) { var yv = y0 + (y1 - y0) * i / 4, yy = Y(yv); g += '<line x1="' + L + '" x2="' + (W2 - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#26262c"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" fill="#888" font-size="11" text-anchor="end">' + fmt(yv) + '</text>'; }
    var nx = timeAxis ? 6 : Math.min(6, Math.max(2, Math.round((x1 - x0) / 86400000) + 1));
    for (var j = 0; j < nx; j++) {
      var xv = x0 + (x1 - x0) * j / (nx - 1), d = new Date(xv);
      var lab = timeAxis ? d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) : (d.getMonth() + 1) + '/' + d.getDate();
      g += '<text x="' + X(xv) + '" y="' + (H - 10) + '" fill="#888" font-size="11" text-anchor="middle">' + lab + '</text>';
    }
    series.forEach(function (s) {
      if (!s.pts.length) return;
      var path = s.pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
      g += '<path d="' + path + '" fill="none" stroke="' + s.color + '" stroke-width="2"/>';
      s.pts.forEach(function (p) { g += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3.5" fill="' + s.color + '"><title>' + esc(s.name + ' · ' + p.label + ' · ' + fmt(p.y)) + '</title></circle>'; });
    });
    return '<svg viewBox="0 0 ' + W2 + ' ' + H + '" role="img" aria-label="' + esc(title) + '">' + g + '</svg>';
  }
  /* session-list columns (order / show set in the settings tab) */
  var PCDEF = { d: { ko: '시간 (원본 세션 링크)', fixed: 1 }, l: { ko: '랩 수' }, st: { ko: '세션 시간' }, b: { ko: '베스트 랩' }, t3: { ko: 'Top 3 Consec' },
    pj: { ko: 'N분 예상 (설정한 시간에 몇 랩 · 몇 분 몇 초)' }, a: { ko: '평균 랩' }, c: { ko: 'Consistency' } };
  var PCDEFAULT = ['d', 'l', 'st', 'b', 't3', 'pj', 'a', 'c'];
  function pcolOrder() {
    var o = (cfg.pcolOrder || PCDEFAULT).filter(function (k) { return PCDEF[k]; });
    PCDEFAULT.forEach(function (k) { if (o.indexOf(k) < 0) o.push(k); });
    return o;
  }
  function pcolHead(k) { return { d: '시간', l: '랩', st: '세션 시간', b: '베스트', t3: 'Top 3', pj: (+cfg.projMin || 5) + '분 예상', a: '평균', c: 'Consistency' }[k]; }
  function renderPColList() {
    var o = pcolOrder(), hide = cfg.pcolHide || {};
    $('vl_pcols').innerHTML = o.map(function (k, i) {
      var d = PCDEF[k], show = d.fixed || !hide[k];
      return '<div class="cr' + (show ? '' : ' off') + '"><input type="checkbox" data-pshow="' + k + '"' + (show ? ' checked' : '') + (d.fixed ? ' disabled title="항상 표시"' : '') + '>' +
        '<span class="cl">' + d.ko + '</span>' +
        '<button data-pmv="-1" data-k="' + k + '"' + (i === 0 ? ' disabled' : '') + ' title="왼쪽으로">▲</button>' +
        '<button data-pmv="1" data-k="' + k + '"' + (i === o.length - 1 ? ' disabled' : '') + ' title="오른쪽으로">▼</button></div>';
    }).join('');
  }
  /* "N minutes" projection from a session's own lap times, counted from the start of the session like a race:
     add the laps in order until the total first reaches N minutes (the lap that crosses after the time is up counts).
     Only those laps are used — nothing after the projected lap count. Left out: laps LiveRC marks invalid (*), and —
     only if chosen in the settings (cfg.projOut %) — laps that far from the typical lap. If the session ends first,
     the laps it has give the average for an estimate marked ≈ (all of them lie before the projected lap count). */
  var projC = {};
  function projOf(id) {
    var laps = pc.laps[id]; if (laps === undefined) return undefined;
    var T = (+cfg.projMin || 5) * 60, pct = +cfg.projOut || 0, ck = id + '|' + T + '|' + pct; if (projC[ck]) return projC[ck];
    var clean = laps.filter(function (x) { return x > 0; });
    if (pct && clean.length) {
      var srt = clean.slice().sort(function (x, y) { return x - y; }), med = srt[Math.floor((srt.length - 1) / 2)];
      clean = clean.filter(function (x) { return Math.abs(x - med) <= med * pct / 100; });
    }
    if (!clean.length) return (projC[ck] = null);
    var sum = 0;
    for (var i = 0; i < clean.length; i++) { sum += clean[i]; if (sum >= T) return (projC[ck] = { n: i + 1, t: sum }); }
    var a = sum / clean.length, n = Math.floor(T / a) + 1;
    return (projC[ck] = { n: n, t: n * a, est: true });
  }
  function fmtProj(p) { return p ? (p.est ? '≈' : '') + p.n + '랩 ' + Math.floor(p.t / 60) + '분 ' + (p.t % 60).toFixed(3) + '초' : '-'; }
  /* one session's laps, top to bottom, coloured against the session's best lap, with a chart beside them.
     laps: signed numbers (negative = invalid on LiveRC, shown grey with *) */
  function lapCols() { return { B: cfg.lapBest || '#d27cff', N: cfg.lapNear || '#3ddc84', F: cfg.lapFar || '#ffa94d', dev: +cfg.lapDev || 0.5 }; }
  /* list.best (race board): LiveRC's own fast lap (F:) — a very short first lap (start right at the line) must not become the best */
  function lapBest(list) { if (list.best > 0) return list.best; var g = list.filter(function (x) { return x.v > 0; }).map(function (x) { return x.v; }); return g.length ? Math.min.apply(null, g) : NaN; }
  function lapCol(v, best, C) { if (v < 0) return '#777'; var d = v - best; if (d < -0.0005) return '#777';   /* shorter than LiveRC's fast lap: not counted */ return d < 0.0005 ? C.B : (d <= C.dev + 1e-9 ? C.N : C.F); }
  /* laps top to bottom: lap · time · gap to the best (best purple, within the set seconds green, more orange, invalid grey) */
  /* pos: also the position each lap was completed in (heats / mains) — up green, down red */
  function lapTbl(list, pos) {
    var C = lapCols(), best = lapBest(list);
    return '<table><thead><tr><th>랩</th><th>랩타임</th>' + (pos ? '<th>순위</th>' : '') + '<th>베스트와 차이</th></tr></thead><tbody>' + list.map(function (x, i) {
      var t = Math.abs(x.v), c = lapCol(x.v, best, C), d = t - best;
      var pp = '', pv = i > 0 ? list[i - 1].p : NaN;
      if (pos) pp = '<td' + (x.p > 0 && pv > 0 && x.p !== pv ? ' style="color:' + (x.p < pv ? '#3ddc84' : '#ff6b6b') + ';font-weight:700"' : '') + '>' + (x.p > 0 ? x.p + '등' : '-') + '</td>';
      var sh = x.v > 0 && d < -0.0005;
      return '<tr><td>' + x.n + '</td><td style="color:' + c + ';font-weight:' + (x.v > 0 && !sh && d < 0.0005 ? 800 : 600) + '"' + (sh ? ' title="LiveRC Fast Lap보다 짧은 랩 (출발 직후 등) — 베스트로 치지 않음"' : '') + '>' + fmtS(t) + (x.v < 0 ? '*' : '') + '</td>' + pp + '<td style="color:' + c + '">' +
        (x.v < 0 ? '무효' : sh ? '제외' : d < 0.0005 ? '베스트' : '+' + d.toFixed(3)) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  /* summary above a lap list: best lap, how many laps within the set seconds / beyond (count + % of valid laps), invalid, and a bar */
  function lapSum(list) {
    var C = lapCols(), best = lapBest(list), nb = 0, nn = 0, nf = 0, nx = 0, ns = 0, bn = 0;
    list.forEach(function (x) {
      if (!(x.v > 0)) { nx++; return; }
      var d = x.v - best;
      if (d < -0.0005) { ns++; return; }   /* shorter than LiveRC's fast lap */
      if (d < 0.0005) { nb++; if (!bn) bn = x.n; } else if (d <= C.dev + 1e-9) nn++; else nf++;
    });
    if (!bn && list.bestOn > 0) bn = list.bestOn;
    var tot = nb + nn + nf; if (!tot) return '';
    var pc = function (n) { return Math.round(n / tot * 100); }, sw = function (c) { return '<i style="background:' + c + '"></i>'; };
    return '<div class="vl-ls"><div class="lsc">' +
      '<span title="베스트 (LiveRC Fast)">' + sw(C.B) + '<b>' + fmtS(best) + '</b> <small>(' + (nb ? bn + '랩' + (nb > 1 ? ' 외 ' + (nb - 1) : '') : 'LiveRC Fast' + (bn > 0 ? ' · ' + bn + '랩' : '') + ', 표에 없음') + ')</small></span>' +
      '<span title="베스트 + ' + C.dev + '초 이내">' + sw(C.N) + '<b>' + nn + '랩</b> <small>' + pc(nn) + '%</small></span>' +
      '<span title="그보다 느린 랩">' + sw(C.F) + '<b>' + nf + '랩</b> <small>' + pc(nf) + '%</small></span>' +
      (nx ? '<span class="lx">무효 ' + nx + '랩</span>' : '') + (ns ? '<span class="lx" title="LiveRC Fast Lap보다 짧은 랩 (출발 직후 등)">제외 ' + ns + '랩</span>' : '') + '</div>' +
      '<div class="lsb"><i style="width:' + (nb / tot * 100) + '%;background:' + C.B + '"></i><i style="width:' + (nn / tot * 100) + '%;background:' + C.N + '"></i><i style="width:' + (nf / tot * 100) + '%;background:' + C.F + '"></i></div></div>';
  }
  /* chart in the same colours: x = lap, faster higher; values outside the range sit on the edge as hollow dots */
  function lapSvg(list, W2, H) {
    W2 = W2 || 420; H = H || 220;
    var C = lapCols(), best = lapBest(list), L = 50, R = 10, T = 10, B = 24;
    var srt = list.filter(function (x) { return x.v > 0; }).map(function (x) { return x.v; }).sort(function (a, b) { return a - b; });
    if (!srt.length) return '<div style="color:#777;font-size:12px;padding:30px 6px;text-align:center">아직 기록이 없습니다</div>';
    var y0 = best, y1 = Math.min(srt[srt.length - 1], srt[Math.floor(srt.length / 2)] * 1.25); if (!(y1 - y0 > 0.2)) y1 = y0 + 0.4;
    var pd = (y1 - y0) * 0.08; y0 -= pd; y1 += pd;
    var n0 = list[0].n, n1 = list[list.length - 1].n;
    var X = function (n) { return L + (n1 > n0 ? (n - n0) / (n1 - n0) : 0.5) * (W2 - L - R); }, Y = function (v) { return T + (Math.max(y0, Math.min(v, y1)) - y0) / (y1 - y0) * (H - T - B); };
    var g = '', k;
    for (k = 0; k <= 4; k++) { var yv = y0 + (y1 - y0) * k / 4; g += '<line x1="' + L + '" x2="' + (W2 - R) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '" stroke="#24242a"/><text x="' + (L - 5) + '" y="' + (Y(yv) + 4) + '" fill="#888" font-size="10" text-anchor="end">' + fmtS(yv) + '</text>'; }
    g += '<line x1="' + L + '" x2="' + (W2 - R) + '" y1="' + Y(best + C.dev) + '" y2="' + Y(best + C.dev) + '" stroke="' + C.N + '" stroke-dasharray="4 4" opacity=".6"/>';
    var nx = Math.min(8, n1 - n0 + 1);
    for (k = 0; k < nx; k++) { var ln = Math.round(n0 + (n1 - n0) * k / Math.max(1, nx - 1)); g += '<text x="' + X(ln) + '" y="' + (H - 7) + '" fill="#888" font-size="10" text-anchor="middle">' + ln + '</text>'; }
    var pts = list.filter(function (x) { return x.v > 0; }).map(function (x) { return [X(x.n), Y(x.v)]; });
    if (pts.length > 1) g += '<path d="' + pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#666" stroke-width="1.4"/>';
    list.forEach(function (x) {
      var t = Math.abs(x.v), c = lapCol(x.v, best, C), out = t > y1 || t < y0;
      g += '<circle cx="' + X(x.n).toFixed(1) + '" cy="' + Y(t).toFixed(1) + '" r="3.2" fill="' + (out || x.v < 0 ? '#0f0f12' : c) + '" stroke="' + c + '"><title>' + x.n + '랩 · ' + fmtS(t) + (x.v < 0 ? ' (무효)' : '') + '</title></circle>';
    });
    return '<svg viewBox="0 0 ' + W2 + ' ' + H + '">' + g + '</svg>';
  }
  function lapKey(link, noDash) {
    var C = lapCols();
    return '<div class="lk"><b style="color:' + C.B + '">■</b> 베스트 · <b style="color:' + C.N + '">■</b> ' + C.dev + '초 이하 · <b style="color:' + C.F + '">■</b> 그 이상' + (noDash ? '' : ' · 점선 = 베스트 + ' + C.dev + '초') +
      (link ? ' · <a href="' + link + '" target="_blank" rel="noopener">LiveRC 원본 ↗</a>' : '') + '</div>';
  }
  /* one session's laps, top to bottom, with the chart beside them. laps: signed numbers (negative = invalid on LiveRC) */
  function lapDetail(laps, link) {
    if (laps === undefined) return '<div style="color:#888;padding:6px">랩타임 불러오는 중…</div>';
    if (!laps || !laps.length) return '<div style="color:#888;padding:6px">이 세션의 랩타임이 없습니다</div>' + (link ? '<div class="lk"><a href="' + link + '" target="_blank" rel="noopener">LiveRC 원본 ↗</a></div>' : '');
    var list = laps.map(function (v, i) { return { n: i + 1, v: v }; });
    return lapSum(list) + '<div class="vl-ld"><div class="ll">' + lapTbl(list) + '</div><div class="lc">' + lapSvg(list) + lapKey(link) + '</div></div>';
  }
  var psOpen = null;   /* session whose laps are unfolded in the session list */
  var dgOpen = {};   /* date groups the user collapsed: key name|date → false */
  /* desktop app: practice sessions of each loaded day go to practice_YYYY-MM-DD_<track>.csv for offline viewing */
  function deskPrac() {
    if (!(DESK && DESK.savePractice) && !cfg.syncUrl) return;
    try {
      var byDay = {};
      prac.rows.forEach(function (r) {
        var d = r[4].slice(0, 10), lp = pc.laps[r[0]];
        (byDay[d] || (byDay[d] = [])).push({ id: r[0], date: d, time: r[4].slice(11, 19), name: r[1], tp: r[3], cls: r[2], laps: r[5], len: r[6], best: r[7], avg: r[8],
          top3: pc.t3[r[0]] || '', cons: pc.cons[r[0]] || '', lapTimes: lp ? lp.map(function (v) { return v < 0 ? (-v).toFixed(3) + '*' : v.toFixed(3); }).join(' ') : '' });
      });
      Object.keys(byDay).forEach(function (d) {
        if (DESK && DESK.savePractice) DESK.savePractice(location.host, d, byDay[d]);
        if (cfg.syncUrl && !DESK) syncAdd('practice_' + d + '_' + vlSafe(location.host) + '.csv', byDay[d].map(function (o) { return [o.id, o.date, o.time, o.name, o.tp, o.cls, o.laps, o.len, o.best, o.avg, o.top3, o.cons, o.lapTimes].map(function (v) { return v === undefined || v === null ? '' : String(v); }); }));
      });
    } catch (e) {}
  }
  var lastPrac = null;
  function renderPractice(sel, rows) {
    lastPrac = [sel, rows];
    var per = sel.map(function (n, i) {
      var rs = rows.filter(function (r) { return r[1] === n; }).sort(function (a, b) { return a[4] < b[4] ? -1 : 1; });
      var o = { name: n, color: PCOL[i % PCOL.length], rs: rs, n: rs.length, sec: 0, laps: 0, best: NaN, bestD: '', t3: NaN, t3D: '', days: {} };
      rs.forEach(function (r) {
        var day = r[4].slice(0, 10), f = secs(r[7]), t3 = secs(pc.t3[r[0]]);
        o.sec += secs(r[6]) || 0; o.laps += r[5] || 0;
        var dd = o.days[day] || (o.days[day] = { best: NaN, t3: NaN });
        if (f > 0) { if (!(f >= o.best)) { o.best = f; o.bestD = day; } if (!(f >= dd.best)) dd.best = f; }
        if (t3 > 0) { if (!(t3 >= o.t3)) { o.t3 = t3; o.t3D = day; } if (!(t3 >= dd.t3)) dd.t3 = t3; }
      });
      o.ndays = Object.keys(o.days).length;
      return o;
    });
    /* one practice day → compare and chart session by session; otherwise day by day (each day's best) */
    var dayset = {}; rows.forEach(function (r) { dayset[r[4].slice(0, 10)] = 1; });
    var oneDay = Object.keys(dayset).length === 1;
    function seriesOf(o, key) {   /* ordered points {x, y, label} */
      if (oneDay) return o.rs.map(function (r) { return { x: new Date(r[4].replace(' ', 'T')).getTime(), y: key === 'best' ? secs(r[7]) : secs(pc.t3[r[0]]), label: r[4].slice(11, 16) }; })
        .filter(function (p) { return p.y > 0; });
      return Object.keys(o.days).sort().filter(function (d) { return o.days[d][key] > 0; })
        .map(function (d) { return { x: new Date(d + 'T12:00:00').getTime(), y: o.days[d][key], label: md(d) }; });
    }
    function changeOf(pts) { return pts.length > 1 ? pts[pts.length - 1].y - pts[0].y : NaN; }
    per.forEach(function (o) { o.bestPts = seriesOf(o, 'best'); o.t3Pts = seriesOf(o, 't3'); o.change = changeOf(o.bestPts); o.t3change = changeOf(o.t3Pts); });
    var tot = per.reduce(function (a, o) { a.n += o.n; a.sec += o.sec; a.laps += o.laps; return a; }, { n: 0, sec: 0, laps: 0 });
    function md(d) { return d ? (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)) : ''; }
    function chg(v) {   /* colour only: faster = green ▲, slower = red ▼ */
      if (!(v === v)) return '-';
      if (Math.abs(v) < 0.0005) return '<span style="color:#aaa">0.000</span>';
      return v < 0 ? '<span class="up">▲' + (-v).toFixed(3) + '</span>' : '<span class="down">▼' + v.toFixed(3) + '</span>';
    }
    /* two lines: the driver's last practice day, then the fastest in the whole period (each with its date) */
    function two(o, key, pv, pd, fmt) {
      var ld = Object.keys(o.days).sort().pop(), lv = ld ? o.days[ld][key] : NaN;
      return '<div class="l2"><span class="lb">마지막</span>' + (lv > 0 ? fmt(lv) : '-') + (ld ? ' <small>' + md(ld) + '</small>' : '') + '</div>' +
        '<div class="l2 pk"><span class="lb">최고</span>' + (pv > 0 ? fmt(pv) : '-') + (pd ? ' <small>' + md(pd) + '</small>' : '') + '</div>';
    }
    var h = '<div class="card"><h4><span>요약</span><small>' + esc(prac.loaded.replace('~', ' ~ ')) + '</small></h4><div class="tw"><table><thead><tr>' +
      '<th>선수</th><th>베스트 랩</th><th>Top 3 Consec</th><th>베스트 변화</th><th>Top 3 변화</th><th>세션</th><th>연습일</th><th>총 세션 시간</th><th>총 랩</th></tr></thead><tbody>';
    per.forEach(function (o) {
      h += '<tr><td><span style="color:' + o.color + '">●</span> ' + esc(o.name) + '</td>' +
        '<td>' + two(o, 'best', o.best, o.bestD, fmtS) + '</td>' +
        '<td>' + two(o, 't3', o.t3, o.t3D, f3) + '</td><td>' + chg(o.change) + '</td><td>' + chg(o.t3change) + '</td>' +
        '<td>' + o.n + '</td><td>' + o.ndays + '</td><td>' + hms(o.sec) + '</td><td>' + o.laps.toLocaleString() + '</td></tr>';
    });
    if (per.length > 1) h += '<tr class="tot"><td>합계</td><td></td><td></td><td></td><td></td><td>' + tot.n + '</td><td></td><td>' + hms(tot.sec) + '</td><td>' + tot.laps.toLocaleString() + '</td></tr>';
    h += '</tbody></table></div><div style="font-size:11px;color:#888;margin-top:6px">' + (oneDay
      ? '변화 = 그날 마지막 세션 기록 − 첫 세션 기록 (기록이 하루뿐이라 세션별로 비교)'
      : '변화 = 기간 중 마지막 연습일의 최고 기록 − 첫 연습일의 최고 기록') + ' · 베스트·Top 3: <b>마지막</b> = 마지막 연습일 기록, <b>최고</b> = 기간 중 가장 빠른 기록 · <span class="up">초록 ▲ 빨라짐</span> · <span class="down">빨강 ▼ 느려짐</span></div></div>';
    var legend = '<div class="lg2">' + per.map(function (o) { return '<span><i style="background:' + o.color + '"></i>' + esc(o.name) + '</span>'; }).join('') + '</div>';
    function ser(key) { return per.map(function (o) { return { name: o.name, color: o.color, pts: key === 'best' ? o.bestPts : o.t3Pts }; }); }
    var sub = (oneDay ? md(Object.keys(dayset)[0]) + ' 세션별 기록' : '연습일별 최고 기록') + ' · 위로 갈수록 빠름';
    /* session list: per driver, grouped by date (each date can be hidden), sortable by any column;
       the fastest best lap / Top 3 / projection of each day gets the "day best" colour */
    var psK = cfg.psK || 'd', psD = cfg.psD || -1, cols = pcolOrder().filter(function (k) { return PCDEF[k].fixed || !(cfg.pcolHide || {})[k]; });
    if (cols.indexOf(psK) < 0) psK = 'd';
    function psv(r, k) {
      if (k === 'd') return r[4]; if (k === 'l') return +r[5];
      if (k === 'st') return secs(r[6]); if (k === 'b') return secs(r[7]);
      if (k === 't3') return secs(pc.t3[r[0]]); if (k === 'c') return parseFloat(pc.cons[r[0]]);
      if (k === 'pj') { var q = projOf(r[0]); return q ? -q.n * 1e5 + q.t : NaN; }
      return secs(r[8]);
    }
    function consTd(v) {
      if (v === undefined) return '<td>…</td>';
      var x = parseFloat(v); if (!(x >= 0)) return '<td>-</td>';
      return '<td' + (cfg.consOn && x >= (+cfg.consPct || 0) ? ' class="csok"' : '') + '>' + x.toFixed(1) + '%</td>';
    }
    var WD = ['일', '월', '화', '수', '목', '금', '토'];
    h += '<div class="card"><h4><span>세션 목록</span><small>선수별 · 날짜별 · 머리글을 누르면 정렬 · <b style="color:var(--vlTop,#d27cff)">이 색</b> = 그날 가장 빠른 기록' +
      (cfg.consOn ? ' · <b style="color:var(--vlCons,#4fc3f7)">이 색</b> = Consistency ' + (+cfg.consPct || 0) + '% 이상' : '') + '</small></h4>';
    per.forEach(function (o) {
      var byDay = {};
      o.rs.forEach(function (r) { var d = r[4].slice(0, 10); (byDay[d] || (byDay[d] = [])).push(r); });
      var days = Object.keys(byDay).sort(); if (!(psK === 'd' && psD > 0)) days.reverse();
      h += '<details data-pn="' + esc(o.name) + '"><summary><span style="color:' + o.color + '">●</span> ' + esc(o.name) + ' · 세션 ' + o.n + '개 · ' + days.length + '일</summary><div class="tw"><table><thead><tr>' +
        cols.map(function (k) { return '<th data-ps="' + k + '" style="cursor:pointer;white-space:nowrap' + (k === psK ? ';color:#e8b400' : '') + '">' + pcolHead(k) + (k === psK ? (psD > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') +
        '</tr></thead>';
      days.forEach(function (d) {
        var rs = byDay[d], bB = NaN, bT = NaN, bP = null, laps = 0;
        rs.forEach(function (r) {
          var b = secs(r[7]), t = secs(pc.t3[r[0]]), q = projOf(r[0]); laps += +r[5] || 0;
          if (b > 0 && !(b >= bB)) bB = b; if (t > 0 && !(t >= bT)) bT = t;
          if (q && (!bP || q.n > bP.n || (q.n === bP.n && q.t < bP.t))) bP = q;
        });
        rs = rs.slice().sort(function (x, y) {
          var a = psv(x, psK), b = psv(y, psK), an = a === '' || a !== a, bn = b === '' || b !== b;
          if (an || bn) return an && bn ? (x[4] < y[4] ? 1 : -1) : (an ? 1 : -1);   /* empty values last */
          if (a === b) return x[4] < y[4] ? 1 : -1;
          return (a < b ? -1 : 1) * psD;
        });
        var gk = o.name + '|' + d, open = dgOpen[gk] !== false;
        h += '<tbody><tr class="dgh" data-dg="' + esc(gk) + '"><td colspan="' + cols.length + '">' + (open ? '▼ ' : '▶ ') + md(d) + ' (' + WD[new Date(d + 'T12:00:00').getDay()] + ')' +
          '<small>세션 ' + rs.length + '개 · ' + laps + '랩' + (bB > 0 ? ' · 베스트 ' + fmtS(bB) : '') + '</small><span class="dgb">' + (open ? '숨기기' : '보이기') + '</span></td></tr>';
        if (open) rs.forEach(function (r) {
          var b = secs(r[7]), t = secs(pc.t3[r[0]]), q = projOf(r[0]);
          h += '<tr class="psr' + (psOpen === r[0] ? ' on' : '') + '" data-sid="' + r[0] + '" title="눌러서 랩타임 보기">' + cols.map(function (k) {
            if (k === 'd') return '<td style="color:#8ab4ff">' + (psOpen === r[0] ? '▼ ' : '▸ ') + esc(r[4].slice(11, 16)) + '</td>';
            if (k === 'l') return '<td>' + r[5] + '</td>';
            if (k === 'st') return '<td>' + esc(r[6]) + '</td>';
            if (k === 'b') return '<td' + (b > 0 && Math.abs(b - bB) < 0.0005 ? ' class="dtop"' : '') + '>' + esc(r[7] || '-') + '</td>';
            if (k === 't3') return '<td' + (t > 0 && Math.abs(t - bT) < 0.0005 ? ' class="dtop"' : '') + '>' + esc(pc.t3[r[0]] || (pc.t3[r[0]] === '' ? '-' : '…')) + '</td>';
            if (k === 'pj') return '<td style="white-space:nowrap"' + (q && bP && q.n === bP.n && Math.abs(q.t - bP.t) < 0.0005 && !q.est ? ' class="dtop"' : '') + '>' + (q === undefined ? '…' : fmtProj(q)) + '</td>';
            if (k === 'c') return consTd(pc.cons[r[0]]);
            return '<td>' + esc(r[8] || '-') + '</td>';
          }).join('') + '</tr>';
          if (psOpen === r[0]) h += '<tr class="ldr"><td colspan="' + cols.length + '" style="text-align:left;white-space:normal;padding:4px 6px 10px">' + lapDetail(pc.laps[r[0]], location.origin + '/practice/?p=view_session&id=' + r[0]) + '</td></tr>';
        });
        h += '</tbody>';
      });
      h += '</table></div></details>';
    });
    h += '</div>';
    var pg = cfg.pgShow || {};
    h += '<div class="card"><h4><span>그래프</span><small>' + sub + '</small></h4>' +
      '<div id="vl_pgbar"><button class="gch' + (pg.best ? ' on' : '') + '" data-pg="best">베스트 랩</button><button class="gch' + (pg.t3 ? ' on' : '') + '" data-pg="t3">Top 3 Consec</button></div>' + legend +
      '<div id="vl_pgraphs">' +
      (pg.best ? '<div class="card"><h4><span>베스트 랩 변화</span></h4>' + lineChart(ser('best'), '베스트 랩 변화', fmtS, oneDay, 420) + '</div>' : '') +
      (pg.t3 ? '<div class="card"><h4><span>Top 3 Consec 변화</span></h4>' + lineChart(ser('t3'), 'Top 3 Consec 변화', f3, oneDay, 420) + '</div>' : '') +
      '</div></div>';
    var open = {}; root.querySelectorAll('#vl_pres details[open]').forEach(function (e) { open[e.getAttribute('data-pn')] = 1; });
    $('vl_pres').innerHTML = h;
    try { fitPrac(); } catch (e) {}
    root.querySelectorAll('#vl_pres details').forEach(function (e) { if (open[e.getAttribute('data-pn')]) e.open = true; });
  }
  $('vl_pres').addEventListener('click', function (e) {
    var sr = e.target.closest && e.target.closest('tr[data-sid]');
    if (sr && lastPrac) { var sid = sr.getAttribute('data-sid'); psOpen = psOpen === sid ? null : sid; renderPractice(lastPrac[0], lastPrac[1]); return; }
    var dg = e.target.closest && e.target.closest('tr[data-dg]');
    if (dg && lastPrac) { var dk = dg.getAttribute('data-dg'); dgOpen[dk] = dgOpen[dk] === false; renderPractice(lastPrac[0], lastPrac[1]); return; }
    var gb = e.target.closest && e.target.closest('button[data-pg]');
    if (gb && lastPrac) { var gk = gb.getAttribute('data-pg'); cfg.pgShow = cfg.pgShow || {}; cfg.pgShow[gk] = !cfg.pgShow[gk]; save(); renderPractice(lastPrac[0], lastPrac[1]); return; }
    var th = e.target.closest && e.target.closest('th[data-ps]'); if (!th || !lastPrac) return;
    var k = th.getAttribute('data-ps');
    if (cfg.psK === k) cfg.psD = -(cfg.psD || -1); else { cfg.psK = k; cfg.psD = k === 'd' || k === 'c' ? -1 : 1; }   /* pj: most laps / least time first */   /* times: fastest first; date: newest first; consistency: highest first */
    save(); renderPractice(lastPrac[0], lastPrac[1]);
  });
  $('vl_pload').onclick = pracLoad;
  var PDEF = { pcUp: '#3ddc84', pcDown: '#ff7a7a', pcTop: '#d27cff' };
  function applyPracColors() {
    var st = $('vl_tab_prac').style;
    st.setProperty('--vlUp', cfg.pcUp || PDEF.pcUp); st.setProperty('--vlDown', cfg.pcDown || PDEF.pcDown);
    st.setProperty('--vlTop', cfg.pcTop || PDEF.pcTop); st.setProperty('--vlCons', cfg.consCol || '#4fc3f7');
  }
  function rePrac() { if (lastPrac) renderPractice(lastPrac[0], lastPrac[1]); }
  [['vl_pcu', 'pcUp'], ['vl_pcd', 'pcDown'], ['vl_pct', 'pcTop'], ['vl_csc', 'consCol']].forEach(function (x) {
    var el = $(x[0]); el.value = /^#[0-9a-f]{6}$/i.test(cfg[x[1]]) ? cfg[x[1]] : (PDEF[x[1]] || '#4fc3f7');
    el.oninput = function () { cfg[x[1]] = el.value; save(); applyPracColors(); };
  });
  $('vl_pcreset').onclick = function () { Object.keys(PDEF).forEach(function (k) { cfg[k] = PDEF[k]; }); $('vl_pcu').value = PDEF.pcUp; $('vl_pcd').value = PDEF.pcDown; $('vl_pct').value = PDEF.pcTop; save(); applyPracColors(); };
  bind('vl_cson', 'consOn', rePrac);
  $('vl_csp').value = cfg.consPct; $('vl_csp').onchange = function () { var v = +this.value; if (!(v >= 0 && v <= 100)) v = 90; cfg.consPct = v; this.value = v; save(); rePrac(); };
  applyPracColors();
  renderPColList();
  $('vl_pcolreset').onclick = function () { cfg.pcolOrder = null; save(); renderPColList(); rePrac(); };
  $('vl_pcols').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-pmv]') : null; if (!b) return;
    var o = pcolOrder(), k = b.getAttribute('data-k'), i = o.indexOf(k), j = i + (+b.getAttribute('data-pmv'));
    if (i < 0 || j < 0 || j >= o.length) return;
    o.splice(i, 1); o.splice(j, 0, k); cfg.pcolOrder = o; save(); renderPColList(); rePrac();
  });
  $('vl_pcols').addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-pshow'); if (!k) return;
    cfg.pcolHide = cfg.pcolHide || {}; cfg.pcolHide[k] = !e.target.checked; save(); renderPColList(); rePrac();
  });
  [['vl_lnear', 'lapNear', '#3ddc84'], ['vl_lfar', 'lapFar', '#ffa94d'], ['vl_lbest', 'lapBest', '#d27cff']].forEach(function (x) {
    var el = $(x[0]); el.value = /^#[0-9a-f]{6}$/i.test(cfg[x[1]]) ? cfg[x[1]] : x[2];
    el.oninput = function () { cfg[x[1]] = el.value; save(); rePrac(); };
  });
  $('vl_ldev').value = cfg.lapDev || 0.5;
  $('vl_ldev').onchange = function () { var v = Math.round(+this.value * 1000) / 1000; if (!(v > 0 && v <= 10)) v = 0.5; cfg.lapDev = v; this.value = v; save(); rePrac(); };
  $('vl_pjo').value = String(+cfg.projOut || 0); $('vl_pjo').onchange = function () { cfg.projOut = +this.value; save(); rePrac(); };
  $('vl_pjm').value = cfg.projMin || 5;
  $('vl_pjm').onchange = function () { var v = Math.round(+this.value); if (!(v >= 1 && v <= 60)) v = 5; cfg.projMin = v; this.value = v; save(); rePrac(); };
  root.querySelectorAll('#vl_tab_prac .pb[data-r]').forEach(function (b) { b.onclick = function () { setRange(b.getAttribute('data-r')); pracLoad(); }; });
  $('vl_pf').onchange = $('vl_pt').onchange = function () { cfg.pracFrom = $('vl_pf').value; cfg.pracTo = $('vl_pt').value; save(); };
  $('vl_pq').oninput = renderDrivers;
  function pdrvVis() {
    $('vl_plist').style.display = cfg.pdrvHide ? 'none' : '';
    $('vl_ptog').textContent = cfg.pdrvHide ? '▼ 선수 목록 보기' : '▲ 선수 목록 숨기기';
  }
  $('vl_ptog').onclick = function () { cfg.pdrvHide = !cfg.pdrvHide; save(); pdrvVis(); };
  pdrvVis();
  $('vl_pclr').onclick = function () { cfg.pracSel = []; save(); renderDrivers(); pracAnalyze(); };
  $('vl_pfav').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-pf]'); if (!b) return;
    var n = b.getAttribute('data-pf'), i = cfg.pracSel.indexOf(n);
    if (i < 0) { if (!prac.rows.some(function (r) { return r[1] === n; })) return; cfg.pracSel.push(n); } else cfg.pracSel.splice(i, 1);
    save(); renderDrivers(); pracAnalyze();
  });
  $('vl_pdrv').addEventListener('click', function (e) {
    var fv = e.target.closest && e.target.closest('[data-fav]'); if (fv) { e.stopPropagation(); favToggle(fv.getAttribute('data-fav')); return; }
    var bt = e.target.closest && e.target.closest('button[data-n]'); if (!bt) return;
    var n = bt.getAttribute('data-n'), i = cfg.pracSel.indexOf(n);
    if (i < 0) cfg.pracSel.push(n); else cfg.pracSel.splice(i, 1);
    save(); renderDrivers(); pracAnalyze();
  });

  /* ---------- watcher ---------- */
  var state = {}, hist = {};
  function keyOf(d) { return (d.driverID || '') + '|' + nameOf(d); }
  function secs(t) {
    if (t === undefined || t === null || t === '') return NaN;
    var p = String(t).split(':'), v = 0;
    for (var i = 0; i < p.length; i++) v = v * 60 + parseFloat(p[i]);
    return v;
  }
  /* fast lap = the site's own "F:" value (LiveRC already leaves out laps outside its valid lap range) */
  function siteFast(d) { var v = secs(d.fastLap); return v > 0 ? v : NaN; }
  function list(dd) { return Object.keys(dd).map(function (k) { return dd[k]; }).filter(function (d) { return d && typeof d === 'object'; }); }
  function record(d) {
    migrateName(d);
    var k = keyOf(d), L = +d.laps || 0, E = secs(d.elapsedTime);
    if (!hist[k] || (hist[k].maxLap || 0) > L) hist[k] = { maxLap: 0 };   /* new session: laps went down */
    if (L > 0 && !isNaN(E) && hist[k][L] === undefined) hist[k][L] = E;
    hist[k].maxLap = Math.max(hist[k].maxLap, L);
  }
  function seed() {
    state = {}; hist = {};
    list((SC() || {}).driverData || {}).forEach(function (d) { state[keyOf(d)] = { laps: +d.laps || 0, fast: siteFast(d) }; record(d); });
  }
  /* time gap of car B behind car A, measured when B last crossed the line */
  /* race time of the latest line crossing on the board (any car) */
  function raceClock(all) { var t = 0; (all || []).forEach(function (d) { var e = secs(d.elapsedTime); if (e > t) t = e; }); return t; }
  /* B's gap to A. Measured when B last crossed, then brought up to date whenever any car crosses (T = race time):
     if A has passed the line B hasn't reached yet, B is at least (T − that moment) behind, and a lap down for every further lap A completes */
  function gapInfo(B, A, T) {
    var g = gapAt(B, A);
    var Lb = +B.laps || 0, Eb = secs(B.elapsedTime), La = +A.laps || 0, hA = hist[keyOf(A)] || {}, nx = hA[Lb + 1];
    if (!(T > 0) || !Lb || isNaN(Eb) || nx === undefined || !(nx > Eb) || !(T > nx)) return g;
    var down = Math.max(0, La - Lb - 1), live = T - nx;
    if (!g) return { laps: down, time: live };
    return { laps: Math.max(g.laps, down), time: Math.max(g.time, live) };
  }
  function gapAt(B, A) {
    var Lb = +B.laps || 0, Eb = secs(B.elapsedTime), La = +A.laps || 0, Ea = secs(A.elapsedTime);
    if (!Lb || isNaN(Eb) || isNaN(Ea)) return null;
    var hA = hist[keyOf(A)] || {}, lapA = secs(A.lapTime) || +A.avgLap || NaN;
    var ref = hA[Lb];
    if (ref === undefined) {
      if (La === Lb) ref = Ea;
      else if (La === Lb + 1 && !isNaN(lapA)) ref = Ea - lapA;
      else if (La > Lb + 1) return { laps: La - Lb - 1, time: NaN };
      else return null;
    }
    var time = Eb - ref;
    if (!(time >= 0)) return null;
    var laps = 0;
    for (var k = Lb + 1; k <= La; k++) { if (hA[k] !== undefined) { if (hA[k] <= Eb) laps++; } else if (!isNaN(lapA) && ref + (k - Lb) * lapA <= Eb) laps++; }
    return { laps: laps, time: time };
  }
  function gapText(g, who) {
    if (g.laps > 0) return who + ' ' + g.laps + '랩 차이';
    return who + ' ' + g.time.toFixed(1) + '초 차이';
  }
  function gapFor(d, all) {
    var pos = +d.position || 0; if (!pos) return '';
    var byPos = function (p) { return all.filter(function (x) { return +x.position === p; })[0]; };
    var g = null, who = '', lim = 0;
    if (cfg.raceOn === false || isPractice(SC())) return '';   /* no gap talk in open practice */
    if (pos === 1) {
      if (!cfg.gapLead) return '';
      var p2 = byPos(2); if (!p2) return '';
      g = gapInfo(p2, d, raceClock(all)); who = '2등과'; lim = cfg.gapLeadLaps;
    } else {
      if (!cfg.gapAhead) return '';
      var a = byPos(pos - 1); if (!a) return '';
      g = gapInfo(d, a, raceClock(all)); who = '앞차와'; lim = cfg.gapAheadLaps;
    }
    if (!g || g.laps > lim || (g.laps === 0 && isNaN(g.time))) return '';
    return gapText(g, who);
  }
  function guard() {
    if (!root.isConnected) { stopAll(); return false; }
    var list2 = document.querySelectorAll('#vl_root');
    for (var gi = 0; gi < list2.length; gi++) {
      var r = list2[gi]; if (r === root) continue;
      var v = +r.getAttribute('data-vl-ver') || 0;
      if (v > VER) { root.remove(); stopAll(); return false; }   /* a newer copy took over */
      if (v === VER) { if (r.compareDocumentPosition(root) & 4) { root.remove(); stopAll(); return false; } continue; }   /* same version: the first one stays */
      r.remove(); if (!v) showWarn();   /* older copy: hide its panel and warn */
    }
    return true;
  }
  /* ---------- fuel timer + practice run time (for drivers that are being announced) ---------- */
  var fuel = {}, runDone = {};
  function fuelT() { return Math.max(0, (+cfg.fuelMin || 0) * 60 + (+cfg.fuelSec || 0)); }
  function normAvg(key, d) {   /* typical lap of the last laps, pit / crash laps left out */
    var h = lapHist[key] || [], ts = h.slice(-12).map(function (e) { return e.t; }).filter(function (v) { return v > 0; });
    if (ts.length >= 2) { ts = dropOut(ts); var a = 0; ts.forEach(function (v) { a += v; }); return a / ts.length; }
    var v = secs(d.avgLap); return v > 0 ? v : (ts[0] || NaN);
  }
  /* run → (2 laps before the fuel runs out) 'called' → next line = into the pits 'pitting' → next line = out:
     pit time = that lap − typical lap, the timer restarts at fuel time − (that lap − pit time) */
  function fuelStep(d, key, crossed, reset, E, lapS) {
    var f = fuel[key];
    if (!f || reset) f = fuel[key] = { base: 0, phase: 'run', pit: NaN };
    if (!crossed) return '';
    var T = fuelT(); if (!(T > 0)) return '';
    var avg = normAvg(key, d), say = '';
    /* the lap that contains the stop: pit = that lap − typical lap. Line after the pits: the stop just ended → full fuel time now.
       Line before the pits: the car has already driven (that lap − pit) since leaving → subtract it */
    function out() {
      var pit = avg > 0 && lapS > 0 ? Math.max(0, lapS - avg) : 0;
      f.pit = pit; f.base = cfg.lineAfterPit ? E : E - (lapS > 0 ? lapS - pit : 0); f.phase = 'run';
    }
    if (f.phase === 'run') {
      if (avg > 0 && T - (E - f.base) - 2 * avg < 0) { f.phase = 'called'; say = (cfg.pitWord || '피트 인'); }
    } else if (f.phase === 'called') { if (cfg.lineAfterPit) out(); else f.phase = 'pitting'; }
    else if (f.phase === 'pitting' || f.phase === 'manual') out();
    return say;
  }
  /* ↺ manual reset = "refuelling now": full fuel time from this moment, the next line crossing gives the pit time */
  var fuelCur = null;
  function fuelReset() {
    if (!fuelCur) return;
    var f = fuel[fuelCur.key] || (fuel[fuelCur.key] = { base: 0, phase: 'run', pit: NaN });
    f.base = fuelCur.E; f.phase = 'manual';
    updFuel(list(((SC() || {}).driverData) || {}));
  }
  function fmtClock(v) { var n = v < 0; v = Math.abs(v); var m = Math.floor(v / 60), sx = Math.floor(v % 60); return (n ? '-' : '') + m + ':' + (sx < 10 ? '0' : '') + sx; }
  function updFuel(all) {
    var b = $('vl_fbtn'); b.classList.toggle('on', !!cfg.fuelOn);
    $('vl_fuel').style.display = cfg.raceOn === false ? 'none' : '';
    var fOn = cfg.fuelOn && cfg.raceOn !== false;
    $('vl_freset').style.display = fOn ? '' : 'none';
    $('vl_fuel').classList.toggle('on', !!fOn);
    if (!fOn) { $('vl_fbox').innerHTML = ''; fuelCur = null; return; }
    var T = fuelT(), mine = all.filter(function (d) { return match(d); }).sort(function (a, c) { return (+a.position || 999) - (+c.position || 999); });
    var d = mine[0];
    if (!d) { fuelCur = null; $('vl_fbox').innerHTML = '<span class="fl">FUEL<small>선수 없음</small></span><span class="fc">' + fmtClock(T) + '</span><span class="fs">안내할 선수를 체크하세요</span>'; return; }
    var key = keyOf(d), f = fuel[key] || { base: 0, phase: 'run', pit: NaN }, E = secs(d.elapsedTime) || 0;
    var st = String(((SC() || {}).raceData || {}).raceStatus || ''), live = !/complete|finish|stop|ended/i.test(st);
    if (live && lastCross[key] && +d.laps > 0) E += Math.min(120, (Date.now() - lastCross[key]) / 1000);   /* keep counting between line crossings */
    fuelCur = { key: key, E: E };
    var left = T - (E - f.base), t = match(d), name = (t && t.alias) || nameOf(d);
    var ph = f.phase === 'called' ? esc(cfg.pitWord || '피트 인') : f.phase === 'pitting' ? '주유 중' : f.phase === 'manual' ? '리셋됨' : '';
    $('vl_fbox').innerHTML = '<span class="fl">FUEL<small>' + esc(name) + '</small></span><span class="fc' + (left < 0 ? ' neg' : '') + '">' + fmtClock(left) + '</span>' +
      (ph ? '<span class="ftag"' + (f.phase === 'manual' ? ' title="다음 라인 통과 때 피트 타임 계산"' : '') + '>' + ph + '</span>' : '') +
      (f.pit === f.pit ? '<span class="fp"><small>PIT</small><b style="color:' + (f.pit <= (+cfg.pitTarget || 10) ? (cfg.pitFast || '#3ddc84') : (cfg.pitSlow || '#ff5252')) + '">' + f.pit.toFixed(1) + '초</b></span>' : '');
  }
  /* one heat at a time: finish flags, positions at the last crossing, remaining-time alerts all start over with each new heat */
  var rs = { id: '', fin: {}, pos: {}, rem: NaN, remMax: 0, remAnn: {} };
  function sessId(sc) {
    var rd = (sc && sc.raceData) || {};
    return [pageText('#class .value') || rd.className || '', pageText('#round .value') || rd.roundNumber || '', pageText('#race .value') || rd.raceNumber || ''].join('|');
  }
  /* LiveRC's "time remaining" in seconds, negative once the clock has run out (e.g. "-0:08") */
  function remSecs() {
    var t = pageText('#time_remaining .value');
    if (!t) { try { var c = (SC() || {}).clockData; if (c && c.timeRemaining !== undefined) t = String(c.timeRemaining); } catch (e) {} }
    var m = String(t || '').trim().match(/^(-)?\s*(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/); if (!m) return NaN;
    var v = m[3] !== undefined ? (+m[2] || 0) * 3600 + (+m[3]) * 60 + (+m[4]) : (+m[2] || 0) * 60 + (+m[4]);
    return m[1] ? -v : v;
  }
  function remWord(T) { return T >= 60 ? (T % 60 ? Math.floor(T / 60) + '분 ' + (T % 60) + '초' : T / 60 + '분') : T + '초'; }
  function fixD(x) { return x.toFixed(Math.max(1, Math.min(2, +cfg.dec || 1))); }
  /* practice run summary: best (site F:), VoiceLab average, share of laps within the set seconds of the best */
  function runSummary(d, key) {
    var best = siteFast(d), av = avgOf(d), h = (lapHist[key] || []).filter(function (e) { return e.t > 0; }), dev = +cfg.lapDev || 0.5, out = [];
    if (best > 0) out.push('베스트 ' + sayTime(best.toFixed(3)));
    if (av > 0) out.push('평균 ' + sayTime(av.toFixed(3)));
    var ok = h.filter(function (e) { return !(best > 0) || e.t >= best - 0.0005; });
    if (best > 0 && ok.length) out.push(dev + '초 이내 ' + Math.round(ok.filter(function (e) { return e.t - best <= dev + 1e-9; }).length / ok.length * 100) + '퍼센트');
    return out.join(', ');
  }
  function tick() {
    if (!guard()) return;
    var sc = SC(); var dd = sc && sc.driverData; if (!dd) return;
    var all = list(dd);
    all.forEach(record);
    var aheadKeys = {}, dingNow = false;
    autoRun();
    var sid = sessId(sc), prcNow = isPractice(sc), remNow = remSecs();
    if (sid !== rs.id) rs = { id: sid, fin: {}, pos: {}, rem: NaN, remMax: 0, remAnn: {} };
    if (remNow > 0) rs.remMax = Math.max(rs.remMax, remNow);
    var over = !prcNow && rs.remMax > 0 && remNow <= 0;   /* the clock ran out in this heat */
    var nVoice = all.filter(function (d) { return match(d); }).length;   /* voice drivers out on track in this heat */
    var remMsg = '';
    if (running && cfg.voiceOn !== false && cfg.raceOn !== false && cfg.remOn !== false && !prcNow && nVoice && remNow > 0 && rs.rem === rs.rem) {
      [180, 120, 60, 30, 10].forEach(function (T) { if ((cfg.remAt || {})[T] && !rs.remAnn[T] && rs.rem > T && remNow <= T) { rs.remAnn[T] = 1; remMsg = remWord(T) + ' 남음'; } });
    }
    /* 🔫 race start: the clock sat still at the full time, then starts running down (not when the page is opened mid-race) */
    if (remNow > 0 && remNow === rs.rem) rs.still = (rs.still || 0) + 1;
    if (running && cfg.startGun && cfg.voiceOn !== false && cfg.raceOn !== false && !prcNow && nVoice && !rs.gun && remNow > 0 && rs.rem === rs.rem && remNow < rs.rem && (rs.still || 0) >= 4 &&
        !all.some(function (d) { return (+d.laps || 0) > 0; })) { rs.gun = 1; playTone(9); }
    if (remNow > 0 && remNow < rs.rem) rs.still = 0;
    rs.rem = remNow;
    /* another voice driver due at the line within 1.5 s → hold this call a moment so both are said together */
    var holdFor = function (k) {
      if (cfg.voiceMerge === false) return 0;
      var now = Date.now(), h = 0;
      all.forEach(function (d) {
        var k2 = keyOf(d); if (k2 === k || !match(d)) return;
        var lc = lastCross[k2], ls = secs(d.lapTime); if (!lc || !(ls > 0)) return;
        var due = lc + ls * 1000; if (due > now - 300 && due - now <= 1500) h = Math.max(h, Math.min(now + 1500, due + 400));
      });
      return h;
    };
    if (running && cfg.dingAhead && cfg.raceOn !== false) all.forEach(function (d) {
      var pos = +d.position || 0; if (pos < 2 || !match(d)) return;
      var a = all.filter(function (x) { return +x.position === pos - 1; })[0];
      if (a) aheadKeys[keyOf(a)] = 1;
    });
    all.forEach(function (d) {
      var key = keyOf(d); var laps = +d.laps || 0; var prev = state[key];
      var lapS = secs(d.lapTime);
      var prevFast = prev && laps >= prev.laps ? prev.fast : NaN, curFast = siteFast(d);
      state[key] = { laps: laps, fast: curFast };
      if (prev && laps > prev.laps) { lastCross[key] = Date.now(); if (aheadKeys[key]) dingNow = true; }
      trackPace(d, key, !!(prev && laps < prev.laps));
      recLap(d, key, !!(prev && laps < prev.laps));
      var t = match(d), crossed = !!(prev && laps > prev.laps), E = secs(d.elapsedTime) || 0, extra = [];
      if (prev && laps < prev.laps) { delete runDone[key]; delete rs.fin[key]; delete rs.pos[key]; }
      var pos = +d.position || 0, prevPos = rs.pos[key], finNow = false;
      if (crossed && over && !rs.fin[key]) { rs.fin[key] = pos || 1; finNow = true; }
      if (pos && (crossed || prevPos === undefined)) rs.pos[key] = pos;
      if (t && cfg.fuelOn && cfg.raceOn !== false) { var fw = fuelStep(d, key, crossed, !!(prev && laps < prev.laps), E, lapS); if (fw) extra.push(fw); }
      /* practice run time: once, at the first line crossing after the set time — Open Practice only */
      if (t && crossed && cfg.runOn && cfg.voiceOn !== false && !runDone[key] && isPractice(sc)) {
        var RT = (+cfg.runMin || 0) * 60 + (+cfg.runSec || 0);
        if (RT > 0 && E >= RT) { runDone[key] = 1; extra.push(cfg.runWord || '주행 완료'); if (cfg.runSum !== false) { var rsum = runSummary(d, key); if (rsum) extra.push(rsum); } }
      }
      if (!running || !prev || laps === prev.laps || laps < 1) return;
      if (!t || cfg.voiceOn === false) return;
      if (rs.fin[key] && !finNow) return;   /* finished: no more lap calls (cool-down laps) */
      /* best lap = the site's F: got faster on this lap and it is this lap's time */
      var isBest = curFast > 0 && prevFast > 0 && curFast < prevFast - 0.0005 && lapS > 0 && Math.abs(lapS - curFast) < 0.0005;
      var name = t.alias || nameOf(d);
      var gap = gapFor(d, all);
      var parts = [];
      var race = cfg.raceOn !== false && !prcNow;
      var many = !cfg.nameMulti || nVoice > 1;   /* one voice driver on track: the name is obvious, leave it out */
      if ((t.nm === undefined ? cfg.sayName : t.nm) && many) parts.push(name);
      var moved = race && cfg.posChg && prevPos > 0 && pos > 0 && pos !== prevPos && !finNow ? pos + '등으로 ' + (pos < prevPos ? '올라감' : '내려감') : '';
      if (cfg.sayPos && !moved) parts.push(d.position + '등');
      if (cfg.sayLap) parts.push(laps + '랩');
      if (cfg.sayTime) parts.push(sayTime(d.lapTime));
      if (isBest && cfg.sayBest) parts.push('베스트 랩' + (cfg.sayDelta && prevFast > curFast ? ', ' + fixD(prevFast - curFast) + ' 단축' : ''));
      else if (cfg.sayDelta && cfg.sayTime && curFast > 0 && lapS - curFast >= 0.005) parts.push('플러스 ' + fixD(lapS - curFast));
      if (moved) parts.push(moved);
      if (gap) parts.push(gap);
      if (race && cfg.gapBehind && pos >= 2 && !finNow) {   /* the car behind is close (pos 1 already hears the gap to 2nd) */
        var bc = all.filter(function (x) { return +x.position === pos + 1; })[0], bg = bc ? gapInfo(bc, d, raceClock(all)) : null;
        if (bg && bg.laps === 0 && bg.time >= 0 && bg.time <= (+cfg.behindSec || 1) + 0.0005) parts.push('뒤차 ' + bg.time.toFixed(1) + '초');
      }
      if (finNow && race && cfg.finSay !== false) extra.push((cfg.finWord || '레이스 종료') + (cfg.finPos !== false ? ', ' + (pos || rs.fin[key]) + '등' : ''));
      extra.forEach(function (x) { parts.push(x); });
      if (extra.length && !(t.nm === undefined ? cfg.sayName : t.nm) && parts.indexOf(name) < 0 && nVoice > 1) parts.unshift(name);   /* several drivers: say whose pit / run it is */
      var msg = parts.filter(Boolean).join(', ');
      say(key, msg, t.tone ? +t.ti || 0 : -1, holdFor(key));   /* tone first, then the words — through the queue */
    });
    if (dingNow) ding();
    if (remMsg) say('rem', remMsg, -1);
    try { teamTick(all, sc, sid, prcNow, over); } catch (e) {}
    if (!prcNow && Date.now() - md.at > 60000 && !md.busy) mainFetch();
    try { mainTick(sc, all, rs.fin); mainStrip(); if (cfg.tab === 'main') renderMain(); } catch (e) {}
    trackBhd(all);
    updFuel(all);
    backfill(); lhSave();
    renderRaceBoard();
  }
  seed();
  renderColList();
  setTab(trkOnly ? 'trk' : pracOnly ? 'prac' : cfg.tab === 'trk' ? 'board' : cfg.tab);
  var timer = setInterval(tick, 250), timerL = setInterval(updLive, 200);
  function stopAll() {
    clearInterval(timer); clearInterval(timer2); clearInterval(timerL); try { vq = []; clearTimeout(vqT); vqGen++; } catch (e) {}
    if (running) { running = false; try { if (NB) native({ type: 'stop' }); else if (hasSpeech) spCancel(); } catch (e) {} wakeOff(); audioOff(); }
    try { css.remove(); } catch (e) {}
    if (window.__voiceLap === api) delete window.__voiceLap;
  }
  var api = {
    ver: VER,
    toggle: function () { showPanel(panel.style.display === 'none'); },
    stop: function () { root.remove(); stopAll(); }
  };
  window.__voiceLap = api;
  if (cfg.syncUrl) syncStart();
  else gmGet(function (v) {   /* userscript: the Drive address is shared by every track's site */
    try { var a = v ? JSON.parse(v) : null; if (a && a[0]) { cfg.syncUrl = a[0]; cfg.syncKey = a[1] || ''; $('vl_surl').value = cfg.syncUrl; $('vl_skey').value = cfg.syncKey; } } catch (e) {}
    syncStart();
  });
  if (warnOld) showWarn();
  hint(SC() ? '선수를 체크하면 바로 안내가 시작돼요. 탭은 열어두세요.' : pracOnly ? '' : '⚠ 아직 스코어링 데이터를 찾지 못했습니다. LiveRC 트랙의 라이브 스코어링 화면(…liverc.com/live/scoring/)을 열어주세요.');
  if (window.__vlSyncNote) { hint(window.__vlSyncNote); delete window.__vlSyncNote; }
  }
})();
