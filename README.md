# GitHub Rehberi

Vibe coder'lar için GitHub'ı ~8 dakikada görsel olarak öğreten interaktif rehber + sandbox.
Türkçe, tek sayfa, hiçbir git bilgisi gerektirmez.

- **Rehber:** 7 bölüm — repo, commit, geri dönme, push, branch, pull request, özet. Her adım tek büyük buton; animasyon anlatır.
- **Sandbox:** aynı sahne, serbest oyun — boz, kaydet, geri dön, branch aç, push'la, bilgisayarı çökert.

## Geliştirme

```
npm run dev     # localhost:5173
npm test        # model unit testleri
npm run build   # tsc + vite build → dist/
```

Mimari: `src/model.ts` (küçük görüntü-durumu; git motoru DEĞİL) → `src/Scene.tsx` (tek SVG sahne) → `src/chapters.ts` (rehber senaryosu) → `src/App.tsx` (rehber + sandbox kabuğu). Tasarım kararları: `docs/superpowers/specs/2026-07-17-github-rehberi-v2-design.md`.
