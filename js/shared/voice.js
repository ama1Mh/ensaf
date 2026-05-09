// Text-to-speech management
const Voice = (() => {
  let synthesis = window.speechSynthesis;
  let currentUtterance = null;
  let isEnabled = true;
  let voiceElement = null;
  
  function init() {
    voiceElement = document.getElementById('vi');
    if (voiceElement) {
      voiceElement.addEventListener('click', toggle);
    }
  }
  
  function speak(text) {
    if (!isEnabled || !synthesis) return;
    
    // Cancel any ongoing speech
    if (currentUtterance) {
      synthesis.cancel();
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'ar-SA';
    currentUtterance.rate = 0.92;
    currentUtterance.pitch = 1.04;
    
    currentUtterance.onstart = () => {
      if (voiceElement) voiceElement.classList.add('on');
    };
    
    currentUtterance.onend = () => {
      if (voiceElement) voiceElement.classList.remove('on');
      currentUtterance = null;
    };
    
    currentUtterance.onerror = () => {
      if (voiceElement) voiceElement.classList.remove('on');
      currentUtterance = null;
    };
    
    synthesis.speak(currentUtterance);
  }
  
  function stop() {
    if (synthesis) {
      synthesis.cancel();
      if (voiceElement) voiceElement.classList.remove('on');
      currentUtterance = null;
    }
  }
  
  function toggle() {
    isEnabled = !isEnabled;
    if (!isEnabled) {
      stop();
    }
    if (voiceElement) {
      voiceElement.style.opacity = isEnabled ? '1' : '0.5';
    }
  }
  
  function isSpeaking() {
    return currentUtterance !== null;
  }
  
  return { init, speak, stop, toggle, isSpeaking };
})();