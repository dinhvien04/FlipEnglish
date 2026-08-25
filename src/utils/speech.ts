/**
 * Native Text-to-Speech utility using Web Speech API.
 * Returns true if speech synthesis was successfully initiated, false otherwise.
 */
export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
};

export const speakWord = (text: string, rate: number = 0.9): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    stopSpeech(); // Stop any pending or ongoing utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate; // 0.9 normal, ~0.65 slow
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('US'))
    );
    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    return false;
  }
};

