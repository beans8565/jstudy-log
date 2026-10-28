# J·Study 기록장

학생 기록 · 캘린더 · 운영 매뉴얼 앱 (PC 브라우저 + 휴대폰 홈 화면 설치)

- 화면: `index.html` (정적 파일, 빌드 없음)
- 데이터: Supabase 프로젝트 **Jstudy Web** (`iycizvicqwjfdygwqxjk`)
- 연결 계층: `db.js` — 앱의 collection/doc 호출을 Supabase 테이블로 변환
- 설정: `config.js` (URL + publishable key. 공개돼도 되는 키이며 실제 접근은 로그인 + RLS로 제한)
- 설치형 앱: `manifest.json`, `sw.js`, `icons/`

## 권한

| 역할 | 누가 | 할 수 있는 것 |
|---|---|---|
| owner (관리자) | 처음 가입한 1명 | 전부 + 사용자 승인, 매뉴얼·목차·담당자·프로그램 수정, 백업, 학생 삭제 |
| staff (승인) | 관리자가 승인한 실장·조교 | 학생·학생 기록·일정 작성/수정, 매뉴얼 열람 |
| pending (대기) | 가입 직후 | 아무것도 못 봄 (승인 대기 화면) |

## 배포

Vercel에서 이 저장소를 Import → Deploy. 이후 `main`에 push하면 자동 반영.
화면 파일을 바꾼 뒤에는 `sw.js`의 `VERSION` 값을 올린다(설치된 앱이 새 화면을 받도록).
