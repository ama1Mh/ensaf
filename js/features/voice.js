/**
 * Voice Manager - Text-to-Speech for Arabic content
 * Uses Web Speech API
 */
const VoiceManager = (() => {
  const synth = window.speechSynthesis;
  let isEnabled = true;
  let currentUtterance = null;
  let voices = [];
  let currentLang = CONFIG?.VOICE?.LANG || 'ar-SA';

  const MIN_RATE = 0.85;
  const MAX_RATE = 1.15;
  const MIN_PITCH = 0.9;
  const MAX_PITCH = 1.2;

  function loadVoices() {
    voices = synth.getVoices() || [];
  }

  function getVoiceByLang(lang) {
    if (!voices.length) loadVoices();
    const normalized = lang.toLowerCase();
    const baseLang = normalized.split('-')[0];

    const exact = voices.find(v => v.lang.toLowerCase() === normalized);
    if (exact) return exact;

    const partial = voices.find(v => v.lang.toLowerCase().startsWith(baseLang));
    if (partial) return partial;

    return voices.find(v => v.default) || voices[0] || null;
  }

  function speak(text) {
    if (!isEnabled || !synth) return;
    stop();

    const cleanText = text.replace(/<[^>]+>/g, '').trim().replace(/\s{2,}/g, ' ');
    if (!cleanText) return;

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = currentLang;
    currentUtterance.rate = Math.min(MAX_RATE, Math.max(MIN_RATE, CONFIG.VOICE.RATE));
    currentUtterance.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, CONFIG.VOICE.PITCH));

    const selectedVoice = getVoiceByLang(currentLang);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }

    const vi = document.getElementById('vi');
    if (vi) {
      currentUtterance.onstart = () => vi.classList.add('on');
      currentUtterance.onend = () => {
        vi.classList.remove('on');
        currentUtterance = null;
      };
      currentUtterance.onerror = () => {
        vi.classList.remove('on');
        currentUtterance = null;
      };
    }

    synth.speak(currentUtterance);
  }
  
  function stop() {
    if (synth) {
      synth.cancel();
      const vi = document.getElementById('vi');
      if (vi) vi.classList.remove('on');
      currentUtterance = null;
    }
  }
  
  function toggle() {
    isEnabled = !isEnabled;
    if (!isEnabled) stop();
    const vi = document.getElementById('vi');
    if (vi) vi.style.opacity = isEnabled ? '1' : '0.5';
  }
  
  function isSpeaking() {
    return synth && synth.speaking;
  }
  
  function setLang(lang) {
    currentLang = lang;
    CONFIG.VOICE.LANG = lang;
  }

  function init() {
    if (!synth) return;
    loadVoices();
    if (typeof synth.onvoiceschanged === 'function') {
      synth.onvoiceschanged = () => loadVoices();
    }
  }

  init();
  
  return { speak, stop, toggle, isSpeaking, setLang };
})();