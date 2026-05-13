/**
 * Voice Manager - Text-to-Speech for Arabic content
 * Uses Web Speech API
 */
const VoiceManager = (() => {
  const synth = window.speechSynthesis;
  let isEnabled = true;
  let currentUtterance = null;
  let voiceIndicator = null;
  let selectedVoice = null;

  /**
   * Initialize voice system
   */
  function init() {
    voiceIndicator = document.getElementById('vi');
    
    if (!synth) {
      console.warn('[Voice] Speech Synthesis not supported');
      return false;
    }
    
    // Find Arabic voice
    const voices = synth.getVoices();
    selectedVoice = voices.find(v => v.lang.startsWith('ar')) || null;
    
    // Listen for voice changes (some browsers load voices async)
    synth.onvoiceschanged = () => {
      const updatedVoices = synth.getVoices();
      selectedVoice = updatedVoices.find(v => v.lang.startsWith('ar')) || null;
    };
    
    // Setup click handler for voice toggle
    if (voiceIndicator) {
      voiceIndicator.addEventListener('click', toggle);
      voiceIndicator.style.cursor = 'pointer';
    }
    
    console.log('[Voice] Initialized - Arabic voice:', selectedVoice?.name || 'Not found');
    return true;
  }

  /**
   * Speak text aloud
   * @param {string} text - Text to speak (Arabic)
   * @param {Object} options - Speech options
   */
  function speak(text, options = {}) {
    if (!isEnabled || !synth) return;
    
    // Cancel any ongoing speech
    stop();
    
    // Clean text from HTML tags
    const cleanText = text.replace(/<[^>]+>/g, '');
    
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = options.lang || 'ar-SA';
    currentUtterance.rate = options.rate || 0.92;
    currentUtterance.pitch = options.pitch || 1.04;
    currentUtterance.volume = options.volume || 1.0;
    
    // Use Arabic voice if available
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
    
    // Events
    currentUtterance.onstart = () => {
      EVENTS.emit(EVENT_NAMES.VOICE_START, { text: cleanText });
      if (voiceIndicator) {
        voiceIndicator.classList.add('on');
      }
    };
    
    currentUtterance.onend = () => {
      EVENTS.emit(EVENT_NAMES.VOICE_END);
      if (voiceIndicator) {
        voiceIndicator.classList.remove('on');
      }
      currentUtterance = null;
    };
    
    currentUtterance.onerror = (e) => {
      console.error('[Voice] Speech error:', e);
      if (voiceIndicator) {
        voiceIndicator.classList.remove('on');
      }
      currentUtterance = null;
    };
    
    synth.speak(currentUtterance);
  }

  /**
   * Stop current speech
   */
  function stop() {
    if (synth) {
      synth.cancel();
      if (voiceIndicator) {
        voiceIndicator.classList.remove('on');
      }
      currentUtterance = null;
    }
  }

  /**
   * Toggle voice on/off
   */
  function toggle() {
    isEnabled = !isEnabled;
    
    if (!isEnabled) {
      stop();
    }
    
    if (voiceIndicator) {
      voiceIndicator.style.opacity = isEnabled ? '1' : '0.5';
    }
    
    EVENTS.emit('voice:toggle', { enabled: isEnabled });
  }

  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  function isSpeaking() {
    return synth && synth.speaking;
  }

  /**
   * Check if voice is enabled
   * @returns {boolean}
   */
  function getEnabled() {
    return isEnabled;
  }

  /**
   * Set voice enabled state
   * @param {boolean} enabled
   */
  function setEnabled(enabled) {
    isEnabled = enabled;
    if (!enabled) stop();
    if (voiceIndicator) {
      voiceIndicator.style.opacity = enabled ? '1' : '0.5';
    }
  }

  /**
   * Get available voices
   * @returns {Array} SpeechSynthesisVoice array
   */
  function getVoices() {
    return synth ? synth.getVoices() : [];
  }

  return {
    init,
    speak,
    stop,
    toggle,
    isSpeaking,
    getEnabled,
    setEnabled,
    getVoices
  };
})();

// Rename to match existing references
const Voice = VoiceManager;