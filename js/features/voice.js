/**
 * Voice Manager - Text-to-Speech for Arabic content
 * Uses Web Speech API
 */
const VoiceManager = (() => {
  const synth = window.speechSynthesis;
  let isEnabled = true;
  let currentUtterance = null;

  function speak(text) {
    if (!isEnabled || !synth) return;
    
    // Cancel any ongoing speech
    stop();
    
    // Clean text from HTML tags
    const cleanText = text.replace(/<[^>]+>/g, '');
    
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = CONFIG.VOICE.LANG;
    currentUtterance.rate = CONFIG.VOICE.RATE;
    currentUtterance.pitch = CONFIG.VOICE.PITCH;
    
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
    CONFIG.VOICE.LANG = lang;
  }
  
  return { speak, stop, toggle, isSpeaking, setLang };
})();