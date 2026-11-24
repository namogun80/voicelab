# LAP X (예전 이름: 보이스랩 VoiceLab)

v3.0.0부터 이름이 **LAP X**로 바뀌었습니다. PC·아이패드 가로 화면은 왼쪽 메뉴(Live Race · 대회 결과 · 연습 기록)로 보여 줍니다. 파일 이름(`voicelab-*.js`)은 자동 업데이트를 위해 그대로 둡니다.

LiveRC 라이브 스코어링 화면에서 선택한 선수의 랩타임·순위·차이를 음성으로 알려 주고, 레이스 보드·예선 순위·연습 기록을 보여 주는 도구입니다.

이 저장소는 **자동 업데이트용 배포 파일**만 담고 있습니다. 설치 방법은 보이스랩 설치 페이지를 보세요.

| 파일 | 용도 |
|---|---|
| `voicelab.user.js` | Tampermonkey·Userscripts용 유저스크립트. 머리말의 `@updateURL`로 새 버전을 자동으로 받습니다 |
| `voicelab-core.js` | 북마크(북마클릿)용 코어. "자동 업데이트 북마크"가 매번 최신 커밋의 이 파일을 불러옵니다 |
| `voicelab-lite.user.js` | **보이스랩 라이트** 자동 업데이트 유저스크립트 (아이폰 Userscripts 앱 · 안드로이드 Tampermonkey) |
| `voicelab-lite-core.js` | 라이트 코어. 위 유저스크립트와 라이트 북마크가 불러옵니다 |
| `lite-bookmark.txt` | 라이트 북마크 주소 (안드로이드 크롬 등) |

## 자동 업데이트 설치

- **PC·안드로이드 (Tampermonkey)**: [voicelab.user.js 설치](https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab.user.js)를 열고 설치를 누릅니다. 예전에 붙여넣기로 설치한 보이스랩은 먼저 지워 주세요. 이후 Tampermonkey가 하루에 한 번 새 버전을 확인합니다.
- **북마크**: 설치 페이지의 "자동 업데이트 북마크"를 쓰면 누를 때마다 최신 버전이 실행됩니다.

개인 설정(선수 선택·드라이브 동기화 주소 등)은 코드가 아니라 각 기기에 저장되므로 이 저장소에는 들어 있지 않습니다.

## 보이스랩 라이트

thetrackkr 전용 간단 버전입니다. 탭 하나, 선수 한 명, 랩타임 음성만 있습니다(안드로이드·아이폰 사파리용).

- 맨 위 칸에 선수 이름이나 초성(예: ㄴㅎ)을 입력해 등록합니다. 대소문자는 상관없습니다.
- 라인을 지날 때마다 랩타임을 소수 1자리까지 "초" 없이 불러 줍니다 (23.640 → "23.6"). 베스트 랩을 새로 세우면 "23.4, 베스트 랩".
- 아래에 크게 보기 카드와 랩 타임표(베스트 보라 · 1초 이하 초록 · 그 이상 주황)가 나옵니다.
- **아이폰**: Userscripts 앱 폴더에 `voicelab-lite.user.js`를 넣습니다. 이후 열 때마다 최신 라이트를 받아 실행합니다.
- **안드로이드**: 파이어폭스 + Tampermonkey면 [voicelab-lite.user.js 설치](https://raw.githubusercontent.com/namogun80/voicelab/main/voicelab-lite.user.js), 크롬이면 `lite-bookmark.txt`의 주소로 북마크를 만들어 스코어링 화면에서 누릅니다.
- 프로와 라이트를 같은 페이지에서 함께 켜지 마세요(음성이 두 번 나옴).
