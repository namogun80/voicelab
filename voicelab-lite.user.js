// ==UserScript==
// @name         보이스랩 라이트 - thetrackkr 음성 랩타임
// @namespace    voicelab-lite
// @version      1.0.0
// @description  thetrackkr LiveRC 라이브 스코어링 — 선수 한 명의 랩타임을 음성으로 (자동 업데이트: 열 때마다 깃허브의 최신 라이트를 받아 실행)
// @match        https://thetrackkr.liverc.com/*
// @match        http://thetrackkr.liverc.com/*
// @updateURL    https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-lite.user.js
// @downloadURL  https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-lite.user.js
// @homepageURL  https://github.com/namogun80/voicelab
// @noframes
// @grant        unsafeWindow
// @inject-into  page
// @run-at       document-idle
// ==/UserScript==
/* 보이스랩 라이트 자동 업데이트 유저스크립트 (로더)
   - 마지막에 받아 둔 라이트(이 기기 저장)를 바로 실행하고,
   - 깃허브의 최신 voicelab-lite-core.js를 받아 더 새 버전이면 저장합니다 (다음에 열 때부터 새 버전, 처음 설치 때는 바로 실행).
   - 인터넷이 안 되면 받아 둔 버전으로만 실행합니다. 한 번 설치하면 파일을 다시 바꿀 필요가 없습니다. */
(function () {
  if (window.__vlLiteLoaderRan) return; window.__vlLiteLoaderRan = true;
  window.__vlLiteLoader = true;
  var K = 'vlLiteCoreCache', RAW = 'https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-lite-core.js', CDN = 'https://cdn.jsdelivr.net/gh/namogun80/voicelab@main/voicelab-lite-core.js';
  var UW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined;
  function verOf(code) { var m = /var VER0 = (\d+)/.exec(code); return m ? +m[1] : 0; }
  var ranVer = 0;
  function run(code) {
    var v = verOf(code); if (!v || v <= ranVer || ranVer) return;   /* one copy per page; a newer one waits for the next page load */
    try { new Function('unsafeWindow', code)(UW); ranVer = v; } catch (e) { try { console.error('VoiceLab Lite', e); } catch (x) {} }
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
