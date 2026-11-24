/* 보이스랩 라이트 (VoiceLab Lite) — thetrackkr 전용, 선수 한 명, 랩타임 음성만.
   화면: 선수 등록 입력 칸 → 크게 보기 카드(프로와 같은 모양, 앞차·뒤차 없음) → 랩 타임표(프로와 같은 색).
   음성: 라인을 지날 때마다 랩타임만, 소수 1자리(버림), "초" 없이 — 23.640 → "23.6". 안드로이드·아이폰 사파리용. */
(function () {
  var VER0 = 3;   /* = LVER below; the loader compares it */
  var LVERSION = '1.2.0';
  var TRACK = 'thetrackkr', HOME = 'https://' + TRACK + '.liverc.com/live/scoring/';
  if (window.__vlLite && !((+window.__vlLite.ver || 0) < VER0)) return;   /* same or newer copy already running */
  var W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  var hasSpeech = typeof speechSynthesis !== 'undefined';
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var onTrack = location.hostname.toLowerCase() === TRACK + '.liverc.com';
  var onScoring = onTrack && /^\/live\/scoring/i.test(location.pathname);
  /* a bookmark pressed on another page: go to the fixed track (press the bookmark again there) */
  if (!onScoring) {
    if (window.__vlLiteLoader) { if (onTrack) fab(); return; }   /* userscript: only the scoring page gets the screen; elsewhere on thetrackkr a small button */
    if (confirm('보이스랩 라이트는 thetrackkr 라이브 스코어링 화면에서 동작합니다.\n지금 이동할까요? (이동한 뒤 북마크를 한 번 더 누르세요)')) location.href = HOME;
    return;
  }
  function fab() {
    if (!document.body || document.getElementById('vll_fab')) return;
    var a = document.createElement('a'); a.id = 'vll_fab'; a.href = HOME; a.textContent = '🔊 보이스랩 라이트';
    a.style.cssText = 'position:fixed;right:12px;bottom:16px;z-index:2147483647;background:#ffd54a;color:#111;font:800 15px/1 -apple-system,sans-serif;padding:12px 14px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px #0008';
    document.body.appendChild(a);
  }
  function SCW() {
    try { if (W.scoring && W.scoring.driverData) return W; } catch (e) {}
    for (var i = 0; i < W.frames.length; i++) { try { var f = W.frames[i]; if (f.scoring && f.scoring.driverData) return f; } catch (e) {} }
    return null;
  }
  function SC() { var w = SCW(); return w ? w.scoring : null; }
  /* the page builds its live data after load: wait for it (up to 30 min) */
  if (!SC()) { var tries = 0, wt = setInterval(function () { if (SC() || ++tries > 1800) { clearInterval(wt); if (SC()) main(); } }, 1000); return; }
  main();

  function main() {
  if (!document.body || document.getElementById('vll_root')) return;
  var LVER = VER0;
  /* ---------- settings: one driver, kept on this device ---------- */
  var CK = 'vlLite', cfg = { name: '', muted: false };
  try { var o = JSON.parse(localStorage.getItem(CK) || 'null'); if (o) { cfg.name = String(o.name || ''); cfg.muted = !!o.muted; } } catch (e) {}
  function save() { try { localStorage.setItem(CK, JSON.stringify(cfg)); } catch (e) {} }
  /* lap colours = Pro's lap lists; the "near" band is fixed at 1 second here */
  var C = { B: '#d27cff', N: '#3ddc84', F: '#ffa94d', dev: 1 };

  /* ---------- helpers (same rules as Pro) ---------- */
  function clnName(v) { return String(v || '').replace(/<[^>]*>/g, '').trim(); }
  function nameOf(d) { return clnName(d.driverName) || clnName(d.nickName) || clnName(d.realName); }
  function keyOf(d) { return (d.driverID || '') + '|' + nameOf(d); }
  function list(dd) { return Object.keys(dd || {}).map(function (k) { return dd[k]; }).filter(function (d) { return d && typeof d === 'object' && nameOf(d); }); }
  function secs(t) {
    if (t === undefined || t === null || t === '') return NaN;
    var p = String(t).split(':'), v = 0;
    for (var i = 0; i < p.length; i++) v = v * 60 + parseFloat(p[i]);
    return v;
  }
  function siteFast(d) { var v = secs(d.fastLap); return v > 0 ? v : NaN; }
  function fmtS(v) { if (!(v > 0)) return '-'; if (v < 60) return v.toFixed(3); var m = Math.floor(v / 60), r = v - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(3); }
  function short(t) { return t ? String(t).replace(/^0:/, '') : '-'; }
  function r3(v) { return v > 0 ? Math.round(v * 1000) / 1000 : NaN; }
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nmKey(n) { return String(n || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function pageText(sel) { try { var w = SCW(); var el = w && w.document.querySelector(sel); return el ? el.textContent.trim() : ''; } catch (e) { return ''; } }
  /* Korean-aware search (Pro's kmatch): substring or initial consonants (ㄴㅎ → 남호), the last syllable may be half typed; case and spaces ignored */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function kmatch(text, q) {
    q = String(q || '').toLowerCase().replace(/\s+/g, ''); if (!q) return true;
    var t = String(text || '').toLowerCase().replace(/\s+/g, '');
    if (t.indexOf(q) >= 0) return true;
    function one(a, b, last) {
      if (a === b) return true;
      var bc = b.charCodeAt(0) - 0xAC00, ac = a.charCodeAt(0) - 0xAC00;
      if (CHO.indexOf(a) >= 0) return bc >= 0 && bc < 11172 && CHO[Math.floor(bc / 588)] === a;
      return last && ac >= 0 && ac < 11172 && ac % 28 === 0 && bc >= 0 && bc < 11172 && Math.floor(ac / 28) === Math.floor(bc / 28);
    }
    for (var i = 0; i + q.length <= t.length; i++) {
      var ok = true;
      for (var j = 0; j < q.length && ok; j++) ok = one(q[j], t[i + j], j === q.length - 1);
      if (ok) return true;
    }
    return false;
  }
  /* where the typed letters sit in the name, for highlighting the suggestion (substring or initials) */
  function hit(text, q) {
    q = String(q || '').toLowerCase().replace(/\s+/g, ''); if (!q) return null;
    var chars = [], idx = []; String(text).split('').forEach(function (c, i) { if (!/\s/.test(c)) { chars.push(c.toLowerCase()); idx.push(i); } });
    for (var i = 0; i + q.length <= chars.length; i++) if (kmatch(chars.slice(i, i + q.length).join(''), q)) return [idx[i], idx[i + q.length - 1] + 1];
    return null;
  }
  /* lap time to speech: 1 decimal, cut off (never rounded), no "초" — 23.689 → "23.6", 1:05.32 → "1분 5.3" */
  function sayTime(t) {
    var m = String(t || '').trim().match(/^(?:(\d+):)?(\d+)(?:\.(\d*))?$/); if (!m) return '';
    var s = (+m[2]) + '.' + ((m[3] || '') + '0').slice(0, 1), min = +(m[1] || 0);
    return min ? min + '분 ' + s : s;
  }

  /* ---------- screen ---------- */
  var css =
    '#vll_root{position:fixed;inset:0;z-index:2147483646;background:#0b0b0d;color:#eee;overflow-y:auto;-webkit-overflow-scrolling:touch;font:15px/1.35 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;text-align:left;letter-spacing:0}' +
    '#vll_root *{box-sizing:border-box;font-family:inherit}html.vll-lock,html.vll-lock body{overflow:hidden!important}' +
    '#vll_root .vll-in{max-width:720px;margin:0 auto;padding:calc(8px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left))}' +
    '#vll_root .vll-hd{display:flex;align-items:center;gap:8px;padding:4px 2px 8px;border-bottom:1px solid #222}' +
    '#vll_root .vll-lg{font-weight:900;font-size:15px;color:#ffd54a;white-space:nowrap}#vll_root .vll-lg small{color:#888;font-weight:700;font-size:11px;margin-left:3px}#vll_root .vll-lg em{display:block;font-style:normal;font-size:10px;font-weight:700;color:#8a7a3a;letter-spacing:.3px;margin-top:1px}' +
    '#vll_root .vll-trk{font-size:12px;color:#aaa;white-space:nowrap}#vll_root .vll-sp{flex:1;min-width:0}' +
    '#vll_root .vll-rem{font-size:12px;color:#999;white-space:nowrap}#vll_root .vll-rem b{color:#fff;font-size:15px;font-variant-numeric:tabular-nums}' +
    '#vll_root button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;margin:0;line-height:1.2}' +
    '#vll_root #vll_mu{border:1px solid #3a3a42;background:#1a1a20;color:#3ddc84;border-radius:8px;padding:5px 9px;font-size:14px;font-weight:800;min-width:40px}#vll_root #vll_mu.off{color:#ff6b6b;border-color:#5a2a2a}' +
    '#vll_root .vll-cls{display:flex;gap:8px;align-items:center;font-size:13px;color:#ccc;padding:6px 2px 0;min-width:0}#vll_root .vll-cls i{flex:none;width:10px;height:10px;border-radius:2px;display:inline-block}#vll_root .vll-cls span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#vll_root .vll-warn{margin-top:8px;background:#3a1418;border:1px solid #7a2a32;color:#ffc8cc;border-radius:10px;padding:8px 10px;font-size:13px}' +
    '#vll_root #vll_move{margin-top:10px;background:#1d1a17;border:1px solid #ff7a1a;border-radius:14px;padding:12px 14px;font-size:15px;line-height:1.55;color:#eee}#vll_root #vll_move b{font-size:17px}#vll_root #vll_move b span{color:#ff7a1a}#vll_root #vll_move p{margin:6px 0}#vll_root #vll_move p.s{font-size:14px;color:#ccc}' +
    '#vll_root #vll_mvdl{display:block;background:#ff7a1a;color:#111;font-weight:800;text-align:center;border-radius:10px;padding:11px;text-decoration:none;margin:8px 0}#vll_root #vll_mvx{background:none;border:0;color:#bbb;font-size:14px;display:block;margin-left:auto;cursor:pointer;padding:2px 0}' +
    '#vll_root #vll_unl{display:none;margin-top:10px;width:100%;background:#2a2614;border:1px solid #6a5a1a;color:#ffd54a;border-radius:12px;padding:12px;font-size:16px;font-weight:800}#vll_root #vll_unl.on{display:block}' +
    '#vll_root .vll-reg{margin:10px 0 4px;position:relative}#vll_root .vll-row{display:flex;gap:6px}' +
    '#vll_q{flex:1;min-width:0;font-size:17px;padding:10px 12px;border-radius:10px;border:1px solid #444;background:#141418;color:#fff;outline:none;margin:0;-webkit-appearance:none;appearance:none}#vll_q:focus{border-color:#ffd54a}#vll_q::placeholder{color:#777}' +
    '#vll_root #vll_add{font-size:15px;font-weight:800;padding:0 14px;border-radius:10px;border:0;background:#ffd54a;color:#111;white-space:nowrap}' +
    '#vll_sug{display:none;position:absolute;left:0;right:0;top:48px;background:#1b1b21;border:1px solid #3a3a42;border-radius:10px;z-index:3;overflow:hidden;box-shadow:0 6px 18px #000a}#vll_sug.on{display:block}' +
    '#vll_sug .vll-s{padding:10px 12px;font-size:15px;border-bottom:1px solid #26262c;display:flex;gap:8px;align-items:baseline;cursor:pointer}#vll_sug .vll-s:last-child{border-bottom:0}#vll_sug .vll-s.sel{background:#2a2614}' +
    '#vll_sug .vll-s span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#vll_sug b{color:#ffd54a;font-weight:800}#vll_sug small{margin-left:auto;color:#888;white-space:nowrap;flex:none}#vll_sug .vll-none{padding:10px 12px;color:#999;font-size:14px}' +
    '#vll_chip{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}#vll_chip:empty{display:none}' +
    '#vll_root .vll-chip{display:inline-flex;align-items:center;gap:6px;background:#221d0c;border:1px solid #5a4a12;border-radius:999px;padding:4px 6px 4px 10px;font-size:14px;font-weight:700;max-width:100%}#vll_root .vll-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#vll_root .vll-chip.off{opacity:.6;border-style:dashed}#vll_root .vll-chip small{color:#aaa;font-weight:400;white-space:nowrap}' +
    '#vll_x{flex:none;width:22px;height:22px;border-radius:50%;background:#3a3218;color:#ccc;border:0;padding:0;font-size:12px}' +
    '#vll_big{padding:10px 0}' +
    '#vll_root .vll-bc{background:#141418;border:1px solid #6a5a1a;border-radius:14px;padding:12px 14px;min-width:0;overflow:hidden}' +
    '#vll_root .bc-top{display:flex;align-items:baseline;gap:10px;min-width:0}#vll_root .bc-p{font-size:44px;font-weight:900;color:#ffd54a;line-height:1}#vll_root .bc-p small{font-size:20px;color:#bbb;margin-right:2px}' +
    '#vll_root .bc-nm{font-size:22px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#vll_root .bc-l{font-size:22px;font-weight:800;color:#ddd;white-space:nowrap}' +
    '#vll_root .bc-k{font-size:12px;color:#999;font-weight:700;letter-spacing:.5px}#vll_root .bc-main{margin:8px 0 6px}#vll_root .bc-last{font-size:64px;font-weight:900;line-height:1.05;font-variant-numeric:tabular-nums}#vll_root .bc-d{font-size:22px;font-weight:800;min-height:1.2em}' +
    '#vll_root .bc-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;border-top:1px solid #2a2a30;padding-top:8px}#vll_root .bc-v{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '#vll_root .bc-none{color:#aaa;font-size:15px;padding:18px 4px;text-align:center;line-height:1.6}' +
    '@media (max-width:430px){#vll_root .bc-last{font-size:56px}#vll_root .bc-v{font-size:20px}#vll_root .bc-p{font-size:38px}}' +
    '@media (max-width:340px){#vll_root .bc-last{font-size:46px}#vll_root .bc-nm,#vll_root .bc-l{font-size:18px}#vll_root .vll-trk{display:none}}' +
    '#vll_root .vll-sec{font-size:13px;color:#aaa;font-weight:800;margin:6px 2px}' +
    '#vll_root .vll-lc{background:#0f0f12;border:1px solid #24242b;border-radius:14px;padding:10px 14px}' +
    '#vll_root .vll-lc h5{margin:0 0 4px 2px;font-size:13px;color:#ddd;display:flex;align-items:center;gap:6px;font-weight:800}#vll_root .vll-lc h5 small{margin-left:auto;color:#777;font-weight:400}' +
    '#vll_root .vl-ls{font-size:12px;margin:2px 0 6px}#vll_root .lsc{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}#vll_root .lsc i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px}#vll_root .lsc small{color:#999}#vll_root .lsc .lx{color:#999}' +
    '#vll_root .lsb{display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:4px;background:#222}#vll_root .lsb i{display:block;height:100%}' +
    '#vll_root table{border-collapse:collapse;width:100%;table-layout:fixed;margin:0;background:none}' +
    '#vll_root td,#vll_root th{padding:3px 6px;font-size:14px;text-align:center;border:0;border-bottom:1px solid #1d1d22;height:24px;font-variant-numeric:tabular-nums;background:none;color:inherit;vertical-align:middle}' +
    '#vll_root th{color:#888;font-size:11px;font-weight:700}#vll_root td:first-child,#vll_root th:first-child{width:20%}' +
    '#vll_root .vll-empty{color:#777;font-size:13px;padding:14px 4px;text-align:center}' +
    '#vll_root .vll-key{font-size:11px;color:#888;margin:8px 2px 0}#vll_root .vll-ver{font-size:11px;color:#555;margin:14px 2px 0;text-align:center}';
  var st = document.createElement('style'); st.id = 'vll_css'; st.textContent = css; document.head.appendChild(st);
  var root = document.createElement('div'); root.id = 'vll_root'; root.setAttribute('data-vll-ver', LVER);
  root.innerHTML = '<div class="vll-in">' +
    '<div class="vll-hd"><span class="vll-lg">VoiceLab<small>Lite</small><em>Made by NAMO</em></span><span class="vll-trk">📍 ' + TRACK + '</span><span class="vll-sp"></span><span class="vll-rem" id="vll_rem"></span><button id="vll_mu" title="음성 켜기/끄기">🔊</button></div>' +
    '<div class="vll-cls" id="vll_cls"></div><div id="vll_warn"></div>' +
    '<div id="vll_move"><b>보이스랩 라이트는 이제 <span>LAP X Pit</span>로 바뀝니다</b><p>라이트 기능 그대로 + 모든 트랙 · 대회 중 크게 보기(앞차·뒤차·예선 예상·TQ) · 내 대회. 라이트는 더 이상 업데이트되지 않아요.</p>' +
    '<a id="vll_mvdl" href="https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-auto.user.js" target="_blank" rel="noopener">⬇ LAP X Pit 받기 (voicelab-auto.user.js)</a>' +
    '<p class="s">아이폰: 받은 파일을 파일 앱 › Userscripts 폴더로 옮기고, 예전 voicelab-lite 파일은 지우세요. 안드로이드: 유저스크립트 앱에서 열어 설치하세요.</p><button id="vll_mvx">오늘은 그만 보기 ✕</button></div>' +
    '<button id="vll_unl">👆 여기를 눌러 음성 켜기</button>' +
    '<div class="vll-reg"><div class="vll-row"><input id="vll_q" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="선수 한 명 · 이름 또는 초성 (예: ㄴㅎ)"><button id="vll_add">등록</button></div>' +
    '<div id="vll_sug"></div><div id="vll_chip"></div></div>' +
    '<div id="vll_big"></div>' +
    '<div class="vll-sec">랩 타임표</div><div id="vll_laps"></div>' +
    '<div class="vll-key"><b style="color:' + C.B + '">■</b> 베스트 · <b style="color:' + C.N + '">■</b> 1초 이하 · <b style="color:' + C.F + '">■</b> 그 이상</div>' +
    '<div class="vll-ver">VoiceLab Lite v' + LVERSION + ' · Made by NAMO</div></div>';
  document.body.appendChild(root);
  document.documentElement.classList.add('vll-lock');
  var $ = function (id) { return document.getElementById(id); };
  window.__vlLite = { ver: LVER, version: LVERSION };
  /* v1.2.0: Lite is retired — point to LAP X Pit (hidden for the day when closed) */
  (function () {
    var mv = document.getElementById('vll_move'); if (!mv) return;
    var day = new Date().toISOString().slice(0, 10), hid = false;
    try { hid = localStorage.getItem('vlLiteMoveHide') === day; } catch (e) {}
    if (hid) mv.style.display = 'none';
    document.getElementById('vll_mvx').onclick = function () { mv.style.display = 'none'; try { localStorage.setItem('vlLiteMoveHide', day); } catch (e) {} };
  })();
  /* Pro running on the same page would speak too */
  function proWarn() {
    var pro = !!(document.getElementById('vl_root') || window.__voiceLap);
    var h = pro ? '<div class="vll-warn">⚠ 보이스랩 프로도 함께 켜져 있어요. 음성이 두 번 나올 수 있으니 하나만 켜 주세요.</div>' : '';
    if ($('vll_warn').innerHTML !== h) $('vll_warn').innerHTML = h;
  }

  /* ---------- speech (Pro's iPhone-safe way: one utterance at a time, fallback voices, unstick) ---------- */
  var koVoices = [], badVoice = {}, unlocked = false, actx = null;
  function pickVoice() { if (!hasSpeech) return; try { koVoices = speechSynthesis.getVoices().filter(function (x) { return /^ko/i.test(x.lang); }); } catch (e) {} }
  pickVoice(); if (hasSpeech) try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  function liveVoice(v) { if (!v) return null; try { var l = speechSynthesis.getVoices(); for (var i = 0; i < l.length; i++) if (l[i].voiceURI === v.voiceURI) return l[i]; } catch (e) {} return null; }
  function goodVoice() { return koVoices.filter(function (x) { return !badVoice[x.voiceURI]; })[0] || null; }
  /* keep Bluetooth earphones awake on Android (not on iOS: it fights speech for the audio session) */
  function audioOn() {
    try {
      if (!actx) {
        var AC = W.AudioContext || W.webkitAudioContext || window.AudioContext || window.webkitAudioContext; if (!AC) return;
        actx = new AC();
        if (!IOS) { var osc = actx.createOscillator(), g = actx.createGain(); osc.frequency.value = 30; g.gain.value = 0.0005; osc.connect(g); g.connect(actx.destination); osc.start(); }
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  var spk = { q: 0, gen: 0 };
  function spCancel() { spk.gen++; spk.q = 0; try { speechSynthesis.cancel(); } catch (e) {} }
  function speechUnstick() { if (!spk.q || Date.now() - spk.q < 8000) return false; spk.q = 0; spCancel(); return true; }
  function silent() { var u = new SpeechSynthesisUtterance('음 음'); u.lang = 'ko-KR'; u.volume = 0; var v = liveVoice(goodVoice()); if (v) u.voice = v; return u; }
  function speak(text, tryN, cb) {
    var once = false, done = function (s) { if (once) return; once = true; clearTimeout(wd); if (cb) try { cb(s); } catch (e) {} };
    var wd = setTimeout(function () { done('fail'); }, 4000 + text.length * 220);
    if (!hasSpeech) { done('fail'); return; }
    tryN = tryN || 0;
    if (!koVoices.length) pickVoice();
    if (!tryN && speechUnstick()) { clearTimeout(wd); setTimeout(function () { speak(text, 0, cb); }, 300); return; }
    if (!IOS) audioOn();
    try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
    try { if (!IOS) speechSynthesis.speak(silent()); } catch (e) {}   /* silent lead-in so the first syllable is not clipped (Bluetooth) */
    var u = new SpeechSynthesisUtterance(text), v = tryN < 2 ? liveVoice(goodVoice()) : null;
    u.lang = 'ko-KR'; u.rate = 1.1; try { if (v) u.voice = v; } catch (e) {}
    var started = false, failed = false, gen = spk.gen;
    var fail = function () {
      if (failed || started) return; failed = true; spk.q = 0;
      if (gen !== spk.gen) { done('cut'); return; }
      if (v) badVoice[v.voiceURI] = 1;
      if (tryN < 2) { clearTimeout(wd); setTimeout(function () { speak(text, tryN + 1, done); }, 250); } else done('fail');
    };
    u.onstart = function () { started = true; spk.q = 0; };
    u.onerror = function (e) { var er = (e && e.error) || ''; if (er === 'interrupted' || er === 'canceled') { done('cut'); return; } if (er === 'not-allowed') { unlocked = false; paint(); done('fail'); return; } fail(); };
    u.onend = function () { if (!started) fail(); else done('ok'); };
    if (!spk.q) spk.q = Date.now();
    try { speechSynthesis.speak(u); } catch (e) { spk.q = 0; done('fail'); }
  }
  /* one call at a time; a lap that comes while the previous one is still waiting replaces it */
  var vq = null, vBusy = false, vGen = 0;
  function say(text) { vq = text; pump(); }
  function pump() {
    if (vBusy || !vq) return;
    var t = vq, g = vGen; vq = null; vBusy = true;
    speak(t, 0, function () { if (g !== vGen) return; vBusy = false; setTimeout(pump, 120); });
  }
  function vClear() { vq = null; vGen++; vBusy = false; try { spCancel(); } catch (e) {} }
  /* iPhone: speech only works after the page has been touched once */
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { if (hasSpeech) { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'ko-KR'; speechSynthesis.speak(u); } } catch (e) {}
    audioOn(); wakeOn(); paint();
  }
  document.addEventListener('click', unlock, true); document.addEventListener('touchend', unlock, true); document.addEventListener('keydown', unlock, true);
  $('vll_unl').onclick = function () { unlock(); };
  /* keep the screen on */
  var wl = null;
  function wakeOn() { try { if (navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener && l.addEventListener('release', function () { wl = null; }); }).catch(function () {}); } catch (e) {} }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (unlocked) wakeOn();
    if (IOS && hasSpeech) { try { if (speechSynthesis.paused) speechSynthesis.resume(); if (spk.q) spCancel(); } catch (e) {} }
  });
  $('vll_mu').onclick = function () { cfg.muted = !cfg.muted; save(); if (cfg.muted) vClear(); paint(); };
  function paint() {
    var m = $('vll_mu'); m.textContent = cfg.muted ? '🔇' : '🔊'; m.classList.toggle('off', cfg.muted);
    /* phones only let a page speak after it has been touched once (iPhone Safari, Android Chrome) */
    $('vll_unl').classList.toggle('on', !unlocked && !cfg.muted && !!cfg.name && hasSpeech);
  }

  /* ---------- the one driver ---------- */
  /* registered name → the driver on track: same name first; otherwise the only one the typed letters fit (초성 too) */
  function findMine(all) {
    if (!cfg.name) return null;
    var k = nmKey(cfg.name), same = all.filter(function (d) { return nmKey(nameOf(d)) === k; });
    if (same.length) return same[0];
    var fit = all.filter(function (d) { return kmatch(nameOf(d), cfg.name); });
    return fit.length === 1 ? fit[0] : null;
  }
  var sugSel = 0, sugList = [];
  function suggest() {
    var q = $('vll_q').value.trim(), box = $('vll_sug');
    $('vll_add').textContent = cfg.name ? '바꾸기' : '등록';
    if (!q) { box.classList.remove('on'); box.innerHTML = ''; sugList = []; return; }
    var all = list((SC() || {}).driverData).sort(function (a, b) { return (+a.position || 999) - (+b.position || 999); });
    sugList = all.filter(function (d) { return kmatch(nameOf(d), q); }).slice(0, 6);
    if (sugSel >= sugList.length) sugSel = 0;
    box.innerHTML = sugList.length ? sugList.map(function (d, i) {
      var n = nameOf(d), h = hit(n, q), nm = h ? esc(n.slice(0, h[0])) + '<b>' + esc(n.slice(h[0], h[1])) + '</b>' + esc(n.slice(h[1])) : esc(n);
      var tag = nmKey(n) === nmKey(cfg.name) ? '등록됨' : (cfg.name ? 'P' + (d.position || '-') + ' · ' + esc(cfg.name) + ' → 바꾸기' : 'P' + (d.position || '-'));
      return '<div class="vll-s' + (i === sugSel ? ' sel' : '') + '" data-i="' + i + '"><span>' + nm + '</span><small>' + tag + '</small></div>';
    }).join('') : '<div class="vll-none">지금 코스에 맞는 선수가 없어요 · <b>' + esc(cfg.name ? '바꾸기' : '등록') + '</b>를 누르면 “' + esc(q) + '”(으)로 기다려요</div>';
    box.classList.add('on');
  }
  function register(n) {
    n = String(n || '').trim(); if (!n) return;
    if (nmKey(n) !== nmKey(cfg.name)) { cfg.name = n; save(); vClear(); seen = {}; }
    $('vll_q').value = ''; suggest(); try { $('vll_q').blur(); } catch (e) {}
    unlock(); draw(true);
  }
  $('vll_q').oninput = function () { sugSel = 0; suggest(); };
  $('vll_q').onfocus = suggest;
  $('vll_q').onkeydown = function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (sugList.length) { sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : sugList.length - 1)) % sugList.length; suggest(); } e.preventDefault(); }
    else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('vll_add').click(); }
    else if (e.key === 'Escape') { this.value = ''; suggest(); }
  };
  $('vll_add').onclick = function () { var q = $('vll_q').value.trim(); if (!q) { $('vll_q').focus(); return; } register(sugList[sugSel] ? nameOf(sugList[sugSel]) : q); };
  $('vll_sug').addEventListener('mousedown', function (e) { e.preventDefault(); });   /* keep the keyboard until the tap lands */
  $('vll_sug').onclick = function (e) { var el = e.target.closest('.vll-s'); if (el && sugList[+el.getAttribute('data-i')]) register(nameOf(sugList[+el.getAttribute('data-i')])); };
  document.addEventListener('click', function (e) { if (!e.target.closest('.vll-reg')) { $('vll_sug').classList.remove('on'); } }, true);
  $('vll_chip').onclick = function (e) { if (e.target.id === 'vll_x') { cfg.name = ''; save(); vClear(); draw(true); suggest(); paint(); } };

  /* ---------- laps of the driver: one entry per line crossing, kept across a page reload within the same run ---------- */
  var LK = 'vlLiteLaps', laps = { key: '', run: 0, h: [] }, seen = {}, seenF = NaN, lastCross = 0, fresh = true;
  try { var lo = JSON.parse(localStorage.getItem(LK) || 'null'); if (lo && lo.h && Date.now() - (lo.ts || 0) < 4 * 3600e3) laps = lo; } catch (e) {}
  function lapSave() { try { laps.ts = Date.now(); localStorage.setItem(LK, JSON.stringify(laps)); } catch (e) {} }
  /* same run = started at the same wall-clock moment (now − elapsed), within 2 minutes */
  function runStart(d) { var E = secs(d.elapsedTime); return E > 0 ? Date.now() - E * 1000 : 0; }
  function recLap(d) {
    var key = keyOf(d), L = +d.laps || 0, lt = r3(secs(d.lapTime));
    var rsn = runStart(d);
    /* the saved laps (from before a reload) count only if they are the same run: started at the same moment, within 2 minutes */
    if (fresh && rsn) { fresh = false; if (laps.run && Math.abs(rsn - laps.run) > 120000) laps = { key: key, run: rsn, h: [] }; }
    if (laps.key !== key || (laps.h.length && L < laps.h[laps.h.length - 1].l)) laps = { key: key, run: rsn, h: [] };   /* another driver or a new heat */
    if (!laps.run && rsn) laps.run = rsn;
    if (L < 1) return;
    var z = laps.h[laps.h.length - 1];
    if (z && z.l === L) return;
    laps.h.push({ l: L, t: lt, b: r3(siteFast(d)), w: Date.now() });
    if (laps.h.length > 400) laps.h.shift();
    lapSave();
  }

  /* ---------- lap table (Pro: lapSum + lapTbl, no position column) ---------- */
  function lapCol(v, best) { if (v < 0) return '#777'; var d = v - best; if (d < -0.0005) return '#777'; return d < 0.0005 ? C.B : (d <= C.dev + 1e-9 ? C.N : C.F); }
  function lapSum(lst, best) {
    var nb = 0, nn = 0, nf = 0, ns = 0, bn = 0;
    lst.forEach(function (x) { var d = x.v - best; if (d < -0.0005) { ns++; return; } if (d < 0.0005) { nb++; if (!bn) bn = x.n; } else if (d <= C.dev + 1e-9) nn++; else nf++; });
    var tot = nb + nn + nf; if (!tot) return '';
    var pc = function (n) { return Math.round(n / tot * 100); }, sw = function (c) { return '<i style="background:' + c + '"></i>'; };
    return '<div class="vl-ls"><div class="lsc">' +
      '<span>' + sw(C.B) + '<b>' + fmtS(best) + '</b> <small>(' + (nb ? bn + '랩' + (nb > 1 ? ' 외 ' + (nb - 1) : '') : 'LiveRC Fast, 표에 없음') + ')</small></span>' +
      '<span>' + sw(C.N) + '<b>' + nn + '랩</b> <small>' + pc(nn) + '%</small></span>' +
      '<span>' + sw(C.F) + '<b>' + nf + '랩</b> <small>' + pc(nf) + '%</small></span>' +
      (ns ? '<span class="lx">제외 ' + ns + '랩</span>' : '') + '</div>' +
      '<div class="lsb"><i style="width:' + (nb / tot * 100) + '%;background:' + C.B + '"></i><i style="width:' + (nn / tot * 100) + '%;background:' + C.N + '"></i><i style="width:' + (nf / tot * 100) + '%;background:' + C.F + '"></i></div></div>';
  }
  function lapTbl(lst, best) {
    return '<table><thead><tr><th>랩</th><th>랩타임</th><th>베스트와 차이</th></tr></thead><tbody>' + lst.map(function (x) {
      var c = lapCol(x.v, best), d = x.v - best, sh = d < -0.0005;
      return '<tr><td>' + x.n + '</td><td style="color:' + c + ';font-weight:' + (!sh && d < 0.0005 ? 800 : 600) + '">' + fmtS(x.v) + '</td><td style="color:' + c + '">' + (sh ? '제외' : d < 0.0005 ? '베스트' : '+' + d.toFixed(3)) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  /* ---------- draw ---------- */
  var lastSig = '';
  function draw(force) {
    var sc = SC(), all = list((sc || {}).driverData), d = findMine(all);
    /* header: class · round · race, time left */
    var rd = (sc && sc.raceData) || {}, cls = pageText('#class .value') || rd.className || '';
    var rnd = [pageText('#round .value') && 'Round ' + pageText('#round .value'), pageText('#race .value') && 'Race ' + pageText('#race .value')].filter(Boolean).join(' · ');
    var ch = cls || rnd ? '<i style="background:' + esc(rd.raceClassColor || '#01B2F0') + '"></i><span>' + esc([cls, rnd].filter(Boolean).join(' · ')) + '</span>' : '';
    if ($('vll_cls').innerHTML !== ch) $('vll_cls').innerHTML = ch;
    var rem = pageText('#time_remaining .value'), rh = rem ? '남은 <b>' + esc(rem) + '</b>' : '';
    if ($('vll_rem').innerHTML !== rh) $('vll_rem').innerHTML = rh;
    var chip = cfg.name ? '<span class="vll-chip' + (d ? '' : ' off') + '">🔊 <span>' + esc(d ? nameOf(d) : cfg.name) + '</span>' + (d ? '' : '<small>· 코스에 없음</small>') + '<button id="vll_x" title="등록 지우기">✕</button></span>' : '';
    var lst = d && laps.key === keyOf(d) ? laps.h.filter(function (x) { return x.t > 0; }).map(function (x) { return { n: x.l, v: x.t }; }) : [];
    var best = d ? siteFast(d) : NaN;
    if (!(best > 0) && d) for (var i = laps.h.length - 1; i >= 0; i--) if (laps.h[i].b > 0) { best = laps.h[i].b; break; }
    var sig = JSON.stringify([cfg.name, chip, d ? [d.position, d.laps, d.lapTime, d.fastLap, nameOf(d)] : 0, lst.length, best]);
    if (sig === lastSig && !force) return; lastSig = sig;
    if ($('vll_chip').innerHTML !== chip) $('vll_chip').innerHTML = chip;
    var big, lapsH;
    if (!cfg.name) {
      big = '<div class="vll-bc"><div class="bc-none">위 칸에 선수 이름이나 초성을 입력해 등록하세요<br><small style="color:#777">예: 남호 · ㄴㅎ · NAMO — 대소문자 상관없음</small></div></div>';
      lapsH = '<div class="vll-lc"><div class="vll-empty">선수를 등록하면 랩타임이 쌓여요</div></div>';
    } else if (!d) {
      var n = all.filter(function (x) { return kmatch(nameOf(x), cfg.name); }).length;
      big = '<div class="vll-bc"><div class="bc-none"><b style="color:#ffd54a">' + esc(cfg.name) + '</b><br>' + (n > 1 ? '지금 코스에 맞는 선수가 ' + n + '명이에요 — 이름을 더 입력해 주세요' : '지금 코스에 없어요 · 나오면 자동으로 안내해요') + '</div></div>';
      lapsH = '<div class="vll-lc"><div class="vll-empty">아직 기록이 없습니다</div></div>';
    } else {
      var ls = secs(d.lapTime), lc = ls > 0 && best > 0 ? lapCol(ls, best) : '#fff', dl = ls > 0 && best > 0 ? ls - best : NaN;
      var dTxt = dl === dl ? (dl < -0.0005 ? '제외' : dl < 0.0005 ? '베스트' : '+' + dl.toFixed(3)) : '';
      big = '<div class="vll-bc"><div class="bc-top"><span class="bc-p"><small>P</small>' + esc(d.position || '-') + '</span><span class="bc-nm">' + esc(nameOf(d)) + '</span><span class="bc-l">' + (+d.laps || 0) + '랩</span></div>' +
        '<div class="bc-main"><div class="bc-k">LAST LAP</div><div class="bc-last" style="color:' + lc + '">' + esc(short(d.lapTime)) + '</div><div class="bc-d" style="color:' + lc + '">' + dTxt + '</div></div>' +
        '<div class="bc-row"><div><div class="bc-k">진행 중</div><div class="bc-v" id="vll_lt">-</div></div><div><div class="bc-k">베스트</div><div class="bc-v">' + fmtS(best) + '</div></div></div></div>';
      lapsH = '<div class="vll-lc"><h5>' + esc(nameOf(d)) + '<small>P' + esc(d.position || '-') + ' · ' + (+d.laps || 0) + '랩</small></h5>' +
        (lst.length && best > 0 ? lapSum(lst, best) + lapTbl(lst, best) : '<div class="vll-empty">아직 기록이 없습니다 · 다음 랩부터 쌓여요</div>') + '</div>';
    }
    $('vll_big').innerHTML = big; $('vll_laps').innerHTML = lapsH;
    updLive();
  }
  /* lap in progress: green, orange within 2 s of the best, red past the best; stops when the race is over */
  function fmtRun(t) { var m = Math.floor(t / 60), r = t - m * 60; return m ? m + ':' + (r < 10 ? '0' : '') + r.toFixed(1) : r.toFixed(1); }
  function updLive() {
    var el = $('vll_lt'); if (!el) return;
    var sc = SC(), d = findMine(list((sc || {}).driverData)), stt = String(((sc || {}).raceData || {}).raceStatus || '');
    if (!d || !lastCross || /complete|finish|stop|ended/i.test(stt)) { el.textContent = '-'; el.style.color = ''; return; }
    var t = (Date.now() - lastCross) / 1000, best = siteFast(d);
    el.textContent = fmtRun(t);
    el.style.color = best > 0 && t > best ? '#ff5252' : best > 0 && t >= best - 2 ? '#ffa94d' : '#3ddc84';
  }

  /* ---------- watcher ---------- */
  function tick() {
    if (!root.isConnected) { clearInterval(timer); clearInterval(timerL); return; }
    var sc = SC(); if (!sc || !sc.driverData) return;
    var d = findMine(list(sc.driverData));
    if (d) {
      var key = keyOf(d), L = +d.laps || 0, prev = seen[key], f = siteFast(d), pf = seenF;
      seen = {}; seen[key] = L; seenF = f;
      recLap(d);
      if (prev !== undefined && L > prev) {
        lastCross = Date.now();
        /* best lap = LiveRC's F: got faster on this lap and it is this lap's time (Pro's rule; the very first lap is not a "new" best) */
        var ls = secs(d.lapTime), isBest = f > 0 && pf > 0 && f < pf - 0.0005 && ls > 0 && Math.abs(ls - f) < 0.0005;
        if (!cfg.muted && L >= 1) { var t = sayTime(d.lapTime); if (t) try { say(t + (isBest ? ', 베스트 랩' : '')); } catch (e) {} }
      } else if (prev !== undefined && L < prev) lastCross = 0;   /* a new heat */
    }
    draw(false); proWarn(); paint();
  }
  var timer = setInterval(tick, 250), timerL = setInterval(updLive, 200);
  tick(); suggest(); paint();
  }
})();
