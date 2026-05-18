/**
 * Quiz Engine - Handles question flow, scoring, and hints
 */
const QuizEngine = (() => {
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let hesitations = 0;
  let startTime = 0;
  let subjectId = null;
  let hesitationTimer = null;
  
  const HESITATION_TIMEOUT = 6000;

  /**
   * Start a new quiz for a subject
   * @param {string} subjId - Subject ID
   * @returns {Object} First question data
   */
 function start(subjId) {
  subjectId = subjId;
  currentIndex = 0;
  score = 0;
  hesitations = 0;
  startTime = Date.now();
  
  if (typeof DB !== 'undefined') {
    questions = [...DB.q[subjId]];
    shuffleArray(questions);
  } else {
    questions = [];
  }
  
  EVENTS.emit(EVENT_NAMES.QUIZ_START, {
    subject: subjId,
    totalQuestions: questions.length
  });
  
  const firstQuestion = getCurrentQuestion();
  startHesitationTimer(firstQuestion); // ← ADD THIS
  return firstQuestion;
}

  /**
   * Get current question data
   * @returns {Object|null} Question object
   */
  function getCurrentQuestion() {
    if (currentIndex >= questions.length) return null;
    return questions[currentIndex];
  }

  /**
   * Submit an answer
   * @param {number} answerIndex - Selected answer index
   * @returns {Object} Result object
   */
  function submitAnswer(answerIndex) {
    clearTimeout(hesitationTimer);
    
    const question = questions[currentIndex];
    const isCorrect = answerIndex === question.ans;
    
    if (isCorrect) score++;
    
    const result = {
      question: currentIndex,
      correct: isCorrect,
      correctAnswer: question.ans,
      score: score,
      total: questions.length
    };
    
    EVENTS.emit(EVENT_NAMES.QUIZ_ANSWER, result);
    
    return result;
  }

  /**
   * Move to next question
   * @returns {Object|null} Next question or null if quiz complete
   */
  function nextQuestion() {
    currentIndex++;
    clearTimeout(hesitationTimer);
    
    const question = getCurrentQuestion();
    
    if (!question) {
      EVENTS.emit(EVENT_NAMES.QUIZ_COMPLETE, getResults());
      return null;
    }
    
    // Start hesitation timer
    startHesitationTimer(question);
    
    return question;
  }

  /**
   * Request a hint for current question
   */
  function requestHint() {
  const question = getCurrentQuestion();
  if (!question || !question.hint) return null; // ← ADD THE !question.hint check
  
  hesitations++;
  
  EVENTS.emit(EVENT_NAMES.QUIZ_HINT, {
    hint: question.hint,
    hesitations: hesitations
  });
  
  return question.hint;
}

  /**
   * Start timer for automatic hint
   * @private
   */
function startHesitationTimer(question) {
  clearTimeout(hesitationTimer);
  console.log('[HINT] timer started, question:', question?.q, 'timeout:', HESITATION_TIMEOUT);
  hesitationTimer = setTimeout(() => {
    console.log('[HINT] timer fired, hint:', question?.hint);
    if (question && question.hint) {
      requestHint();
    }
  }, HESITATION_TIMEOUT);
}

  /**
   * Get full quiz results
   * @returns {Object} Results object
   */
  function getResults() {
    const total = questions.length;
    const duration = Math.round((Date.now() - startTime) / 1000);
    const percentage = Math.round((score / total) * 100);
    
    return {
      subject: subjectId,
      score: score,
      total: total,
      percentage: percentage,
      duration: duration,
      avgTimePerQuestion: Math.round(duration / total),
      hesitations: hesitations,
      questions: questions
    };
  }

  /**
   * Get current progress
   * @returns {Object} Progress object
   */
  function getProgress() {
    return {
      current: currentIndex,
      total: questions.length,
      score: score,
      percentage: Math.round((currentIndex / questions.length) * 100)
    };
  }

  /**
   * Fisher-Yates shuffle
   * @private
   */
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Reset quiz state
   */
  function reset() {
    clearTimeout(hesitationTimer);
    questions = [];
    currentIndex = 0;
    score = 0;
    hesitations = 0;
    startTime = 0;
    subjectId = null;
  }

  /**
   * Get performance grade
   * @returns {Object} Grade with icon, label, message
   */
  function getGrade() {
    const results = getResults();
    const pct = results.percentage;
    
    if (pct >= 90) return {
      icon: 'emoji_events',
      label: 'أداء استثنائي!',
      message: 'أداء مثالي! أنت متميز.',
      color: '#10b981'
    };
    if (pct >= 70) return {
      icon: 'star',
      label: 'ممتاز!',
      message: 'عمل رائع! استمر بهذا المستوى.',
      color: '#8b5cf6'
    };
    if (pct >= 50) return {
      icon: 'thumb_up',
      label: 'جيد!',
      message: 'نتيجة جيدة. استمر في التدريب.',
      color: '#fbbf24'
    };
    return {
      icon: 'fitness_center',
      label: 'استمر في المحاولة!',
      message: 'راجع المادة وحاول مرة أخرى.',
      color: '#f43f5e'
    };
  }

  return {
    start,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
    requestHint,
    getResults,
    getProgress,
    getGrade,
    reset
  };
})();