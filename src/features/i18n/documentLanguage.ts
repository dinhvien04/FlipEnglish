import { UiLanguageMode } from './i18nTypes';

export function getDocumentLang(mode: UiLanguageMode): 'vi' | 'en' {
  // Guided bilingual uses 'vi' because the supporting UI is primarily Vietnamese for the learner
  return mode === 'en' ? 'en' : 'vi';
}

export function updateDocumentLanguageMetadata(mode: UiLanguageMode): void {
  if (typeof document === 'undefined') return;
  const lang = getDocumentLang(mode);
  document.documentElement.lang = lang;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (mode === 'en') {
    document.title = 'FlipEnglish — Learn English Vocabulary A1–C2';
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Structured English vocabulary learning from A1 to C2 with real-world context and spaced repetition.');
    }
  } else {
    document.title = 'FlipEnglish — Học từ vựng tiếng Anh A1–C2';
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Học từ vựng tiếng Anh theo ngữ cảnh thực tế từ A1 đến C2, ôn tập ngắt quãng thông minh và luyện thi.');
    }
  }
}
