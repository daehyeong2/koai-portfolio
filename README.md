# 권대형 KOAI Portfolio Viewer

GitHub Pages에 바로 올릴 수 있는 정적 PDF 포트폴리오 뷰어입니다.

## 로컬 실행

```sh
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 열면 됩니다.

## 배포

이 저장소를 GitHub에 올린 뒤 Settings → Pages에서 배포 브랜치를 선택하세요. 빌드 과정은 필요하지 않습니다.

## PDF 교체

새 PDF로 바꿀 때는 `assets/portfolio.pdf`를 같은 이름으로 교체하면 됩니다.

## GIF 또는 영상 오버레이

현재 PDF 파일 내부에는 애니메이션 GIF 데이터가 들어 있지 않습니다. PDF로 내보내는 과정에서 GIF는 보통 정지 이미지로 변환됩니다.

원본 GIF 또는 MP4 파일이 있다면 `assets/` 아래에 넣고 `assets/media-overlays.json`에 위치를 추가하면 웹 페이지에서 애니메이션으로 재생됩니다.

```json
{
  "overlays": [
    {
      "page": 4,
      "type": "gif",
      "src": "./assets/demo.gif",
      "left": 12,
      "top": 18,
      "width": 42,
      "height": 24,
      "alt": "프로젝트 데모"
    }
  ]
}
```
