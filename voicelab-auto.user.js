// ==UserScript==
// @name         보이스랩 - LiveRC 음성 랩타임
// @namespace    voicelab
// @version      3.2.28
// @description  LiveRC 라이브 스코어링 음성 랩타임 (자동 업데이트 — 열 때마다 깃허브의 최신 보이스랩을 받아 실행)
// @match        https://*.liverc.com/*
// @match        http://*.liverc.com/*
// @match        https://liverc.com/*
// @updateURL    https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-auto.user.js
// @downloadURL  https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-auto.user.js
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
/* 보이스랩 자동 업데이트 유저스크립트 (로더)
   - 마지막에 받아 둔 보이스랩(이 기기 저장)을 바로 실행하고,
   - 깃허브의 최신 voicelab-core.js를 받아 더 새 버전이면 저장한 뒤 실행합니다 (새 버전이 화면을 이어받음).
   - 인터넷이 안 되면 받아 둔 버전으로만 실행합니다. 한 번 설치하면 파일을 다시 바꿀 필요가 없습니다. */
(function () {
  if (window.__vlLoaderRan) return; window.__vlLoaderRan = true;
  window.__vlAuto = true; window.__vlLoader = true;
  var K = 'vlCoreCache', RAW = 'https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-core.js', CDN = 'https://cdn.jsdelivr.net/gh/namogun80/voicelab@main/voicelab-core.js';
  var G = {
    gv: typeof GM_getValue !== 'undefined' ? GM_getValue : undefined,
    sv: typeof GM_setValue !== 'undefined' ? GM_setValue : undefined,
    gm: typeof GM !== 'undefined' ? GM : undefined,
    uw: typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined
  };
  function verOf(code) { var m = /var VER0 = (\d+)/.exec(code) || /var VER = (\d+)/.exec(code); return m ? +m[1] : 0; }
  var ranVer = 0;
  function run(code) {
    var v = verOf(code); if (!v || v <= ranVer) return;
    try { new Function('GM_getValue', 'GM_setValue', 'GM', 'unsafeWindow', code)(G.gv, G.sv, G.gm, G.uw); ranVer = v; } catch (e) { try { console.error('VoiceLab', e); } catch (x) {} }
  }
  var cache = null; try { cache = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {}
  if (cache && cache.code) run(cache.code);
  function get(url) { return fetch(url + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }); }
  get(RAW).catch(function () { return get(CDN); }).then(function (code) {
    var v = verOf(code); if (!v || (cache && cache.ver >= v)) return;
    try { localStorage.setItem(K, JSON.stringify({ ver: v, t: Date.now(), code: code })); } catch (e) {}
    run(code);
  }).catch(function () {});
})();
