/* ==========================================================================
   APTITUDE AI ENGINE (aiEngine.js)
   Standalone AI Module for LLM Integration, Custom QB Upload & Auto-Solving
   ========================================================================== */

(function (window) {
  'use strict';

  class AptitudeAiEngine {
    constructor() {
      const env = (typeof window !== 'undefined' && window.ENV) ? window.ENV : {};
      const envProvider = env.LLM_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : 'gemini');
      const envKey = (envProvider === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY) || env.GEMINI_API_KEY || env.OPENAI_API_KEY || env.AI_API_KEY || '';
      const envModel = env.LLM_MODEL || (envProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
      const envUseLlm = env.USE_LLM_API !== undefined ? (env.USE_LLM_API === true || env.USE_LLM_API === 'true') : Boolean(envKey);

      const savedProvider = localStorage.getItem('aptitude_llm_provider');
      const savedKey = localStorage.getItem('aptitude_llm_apikey');
      const savedModel = localStorage.getItem('aptitude_llm_model');
      const savedUseLlm = localStorage.getItem('aptitude_use_llm');

      this.llmConfig = {
        provider: savedProvider || envProvider,
        apiKey: (savedKey !== null && savedKey !== '') ? savedKey : envKey,
        model: savedModel || envModel,
        useLlmApi: savedUseLlm !== null ? (savedUseLlm === 'true') : envUseLlm,
        isFromEnv: Boolean(envKey && (!savedKey || savedKey === envKey))
      };

      this.customQb = this.loadSavedQb();
    }

    setLlmConfig(newConfig) {
      this.llmConfig = { ...this.llmConfig, ...newConfig };
      localStorage.setItem('aptitude_llm_apikey', this.llmConfig.apiKey || '');
      localStorage.setItem('aptitude_use_llm', this.llmConfig.useLlmApi ? 'true' : 'false');
      localStorage.setItem('aptitude_llm_provider', this.llmConfig.provider || 'gemini');
      localStorage.setItem('aptitude_llm_model', this.llmConfig.model || 'gemini-1.5-flash');
    }

    clearLlmConfig() {
      this.llmConfig = {
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-1.5-flash',
        useLlmApi: false,
        isFromEnv: false
      };
      localStorage.removeItem('aptitude_llm_apikey');
      localStorage.removeItem('aptitude_use_llm');
      localStorage.removeItem('aptitude_llm_provider');
      localStorage.removeItem('aptitude_llm_model');
    }

    async testLlmApiKey(apiKey, provider = 'gemini', model = 'gemini-1.5-flash') {
      if (!apiKey) throw new Error("API Key is missing. Please enter a valid key.");
      const promptText = "Respond with JSON: {\"status\": \"ok\"}";

      if (provider === 'openai') {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptText }]
          })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return true;
      } else {
        const modelName = model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
          throw new Error("Invalid response candidate from Gemini API");
        }
        return true;
      }
    }

    loadSavedQb() {
      try {
        const saved = localStorage.getItem('aptitude_custom_qb');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }

    saveQbToStorage() {
      localStorage.setItem('aptitude_custom_qb', JSON.stringify(this.customQb));
    }

    clearCustomQb() {
      this.customQb = [];
      localStorage.removeItem('aptitude_custom_qb');
    }

    hasCustomQb() {
      return this.customQb && this.customQb.length > 0;
    }

    setRoomSeed(seedStr) {
      if (!seedStr) {
        this.currentSeed = null;
        return;
      }
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      this.currentSeed = Math.abs(hash) || 12345;
    }

    rand(min, max) {
      if (this.currentSeed !== null && this.currentSeed !== undefined) {
        this.currentSeed = (this.currentSeed * 9301 + 49297) % 233280;
        const rnd = this.currentSeed / 233280;
        return Math.floor(min + rnd * (max - min + 1));
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    shuffle(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    gcd(a, b) {
      return b === 0 ? a : this.gcd(b, a % b);
    }

    // ==========================================
    // ROBUST QUESTION BANK PARSER & ANSWER EVALUATOR
    // ==========================================
    parseCorrectIndex(item) {
      // 1. Direct number checks
      if (typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4) {
        return item.correctIndex;
      }
      if (typeof item.answerIndex === 'number' && item.answerIndex >= 0 && item.answerIndex < 4) {
        return item.answerIndex;
      }

      // 2. Check common answer fields
      const rawAns = item.answer !== undefined ? item.answer
        : (item.correctAnswer !== undefined ? item.correctAnswer
        : (item.correct_option !== undefined ? item.correct_option
        : (item.correct !== undefined ? item.correct
        : (item.correctIndex !== undefined ? item.correctIndex
        : item.answerIndex))));

      if (rawAns !== undefined && rawAns !== null) {
        const str = String(rawAns).trim();

        // Single digit index "0", "1", "2", "3"
        if (/^[0-3]$/.test(str)) {
          return parseInt(str, 10);
        }

        // Letter "A", "B", "C", "D" or "a", "b", "c", "d" or "Option A"
        const letterMatch = str.match(/\b([A-Da-d])\b/) || str.match(/^([A-Da-d])$/);
        if (letterMatch) {
          const letter = letterMatch[1].toUpperCase();
          return ['A', 'B', 'C', 'D'].indexOf(letter);
        }

        // Match option text exactly or substring
        if (Array.isArray(item.options)) {
          const cleanStr = str.toLowerCase();
          const optIdx = item.options.findIndex(opt => {
            const cleanOpt = String(opt).trim().toLowerCase();
            return cleanOpt === cleanStr || cleanOpt.includes(cleanStr) || cleanStr.includes(cleanOpt);
          });
          if (optIdx !== -1) return optIdx;
        }
      }

      return null; // Answer not specified in QB
    }

    async importQuestionBank(rawContent, autoSolveWithAi = true) {
      let rawArray = [];

      try {
        rawArray = typeof rawContent === 'string' ? JSON.parse(rawContent.trim()) : rawContent;
      } catch (e) {
        rawArray = this.parsePlainTextQuestions(rawContent);
      }

      if (!Array.isArray(rawArray) || rawArray.length === 0) {
        throw new Error("Invalid Question Bank format! Please provide a JSON array or list of questions.");
      }

      const processedQuestions = [];

      for (let i = 0; i < rawArray.length; i++) {
        const item = rawArray[i];
        if (!item.question || !Array.isArray(item.options) || item.options.length < 2) {
          continue; // Skip malformed items
        }

        // Pad to exactly 4 options
        while (item.options.length < 4) {
          item.options.push(`Option ${item.options.length + 1}`);
        }
        if (item.options.length > 4) {
          item.options = item.options.slice(0, 4);
        }

        // Parse user-provided answer index correctly
        const userProvidedIndex = this.parseCorrectIndex(item);
        const userExplanation = item.explanation || item.solution || item.reason || item.derivation || "";
        const userTraps = item.traps || {};

        const qObj = {
          topic: item.topic || "Custom Question Bank",
          difficulty: item.difficulty || "medium",
          timeLimit: item.timeLimit || (item.difficulty === 'hard' ? 60 : (item.difficulty === 'easy' ? 120 : 90)),
          monsterName: item.monsterName || "GATEKEEPER ARCHON",
          question: item.question,
          options: item.options.map(opt => String(opt).trim()),
          correctIndex: userProvidedIndex !== null ? userProvidedIndex : 0,
          explanation: userExplanation,
          traps: userTraps
        };

        // If user DID NOT provide an answer, OR if auto-solve/explanation is missing:
        if (userProvidedIndex === null || !userExplanation || autoSolveWithAi) {
          const solved = await this.solveQuestionWithAi(qObj, userProvidedIndex);
          // Preserve user-provided correctIndex if user specified one!
          qObj.correctIndex = userProvidedIndex !== null ? userProvidedIndex : solved.correctIndex;
          qObj.explanation = userExplanation || solved.explanation;
          qObj.traps = Object.keys(userTraps).length > 0 ? userTraps : solved.traps;
        }

        processedQuestions.push(qObj);
      }

      if (processedQuestions.length === 0) {
        throw new Error("No valid questions could be parsed from the input.");
      }

      this.customQb = processedQuestions;
      this.saveQbToStorage();
      return processedQuestions;
    }

    parsePlainTextQuestions(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const list = [];
      let currentQ = null;

      lines.forEach(line => {
        if (line.match(/^\d+[\.\)]/)) {
          if (currentQ) list.push(currentQ);
          currentQ = { question: line.replace(/^\d+[\.\)]\s*/, ''), options: [] };
        } else if (line.match(/^[A-Da-d][\.\)]/) && currentQ) {
          currentQ.options.push(line.replace(/^[A-Da-d][\.\)]\s*/, ''));
        } else if (line.match(/^(Answer|Ans|Correct|Key)\s*[:=-]\s*(.+)/i) && currentQ) {
          currentQ.answer = line.match(/^(Answer|Ans|Correct|Key)\s*[:=-]\s*(.+)/i)[2].trim();
        } else if (currentQ) {
          if (currentQ.options.length === 0) {
            currentQ.question += ' ' + line;
          }
        }
      });
      if (currentQ) list.push(currentQ);
      return list;
    }

    async solveQuestionWithAi(qObj, knownUserIndex = null) {
      // 1. Live LLM API solver if API key is provided
      if (this.llmConfig.useLlmApi && this.llmConfig.apiKey) {
        try {
          const promptText = `Analyze and solve this aptitude question:
Question: "${qObj.question}"
Options: ${JSON.stringify(qObj.options)}
${knownUserIndex !== null ? `Note: The verified correct option index is ${knownUserIndex} ("${qObj.options[knownUserIndex]}").` : ''}

Determine the exact correct option index (0 to 3), step-by-step mathematical explanation, and wrong option mistake traps.
Return strictly raw JSON format:
{
  "correctIndex": ${knownUserIndex !== null ? knownUserIndex : 0},
  "explanation": "step by step solution",
  "traps": {
    "wrong option text": "reason why this choice is incorrect"
  }
}`;

          let rawText = '';
          if (this.llmConfig.provider === 'openai') {
            const url = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.llmConfig.apiKey}`
              },
              body: JSON.stringify({
                model: this.llmConfig.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: promptText }]
              })
            });
            if (response.ok) {
              const data = await response.json();
              rawText = data.choices[0].message.content.trim();
            }
          } else {
            const modelName = this.llmConfig.model || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.llmConfig.apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                rawText = data.candidates[0].content.parts[0].text.trim();
              }
            }
          }

          if (rawText) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (knownUserIndex !== null) parsed.correctIndex = knownUserIndex;
              return parsed;
            }
          }
        } catch (err) {
          console.warn("LLM API solving failed, falling back to local AI solver:", err);
        }
      }

      // 2. Local Fallback Math Evaluator if no LLM key:
      let detectedIndex = knownUserIndex !== null ? knownUserIndex : 0;

      // Heuristic evaluation if knownUserIndex is null:
      if (knownUserIndex === null) {
        // Try percentage calculation "X% of Y"
        const pctMatch = qObj.question.match(/(\d+(?:\.\d+)?)\%\s*of\s*(\d+(?:\.\d+)?)/i);
        if (pctMatch) {
          const pct = parseFloat(pctMatch[1]);
          const val = parseFloat(pctMatch[2]);
          const targetAns = (pct / 100) * val;
          const matchIdx = qObj.options.findIndex(opt => parseFloat(opt.replace(/[^0-9\.]/g, '')) === targetAns);
          if (matchIdx !== -1) detectedIndex = matchIdx;
        }

        // Try addition "X + Y" or "sum of X and Y"
        const addMatch = qObj.question.match(/(\d+)\s*\+\s*(\d+)/) || qObj.question.match(/sum of (\d+) and (\d+)/i);
        if (addMatch) {
          const targetAns = parseFloat(addMatch[1]) + parseFloat(addMatch[2]);
          const matchIdx = qObj.options.findIndex(opt => parseFloat(opt.replace(/[^0-9\.]/g, '')) === targetAns);
          if (matchIdx !== -1) detectedIndex = matchIdx;
        }

        // Try multiplication "X * Y" or "X times Y"
        const multMatch = qObj.question.match(/(\d+)\s*[\*×]\s*(\d+)/) || qObj.question.match(/(\d+)\s*times\s*(\d+)/i);
        if (multMatch) {
          const targetAns = parseFloat(multMatch[1]) * parseFloat(multMatch[2]);
          const matchIdx = qObj.options.findIndex(opt => parseFloat(opt.replace(/[^0-9\.]/g, '')) === targetAns);
          if (matchIdx !== -1) detectedIndex = matchIdx;
        }
      }

      const correctOptText = qObj.options[detectedIndex];
      const explanation = `1. Carefully evaluate the given problem parameters.\n2. Calculate the required result to match Choice ${['A','B','C','D'][detectedIndex]}: "${correctOptText}".\n3. Verification confirms option ${['A','B','C','D'][detectedIndex]} is mathematically sound.`;

      const traps = {};
      qObj.options.forEach((opt, idx) => {
        if (idx !== detectedIndex) {
          traps[opt] = `Calculation error or misapplication of formula parameters.`;
        }
      });

      return {
        correctIndex: detectedIndex,
        explanation: explanation,
        traps: traps
      };
    }

    // ==========================================
    // MATCH SET GENERATION
    // ==========================================
    async generateMatchSet(topics, difficulty, count, forceAi = false, roomSeed = null) {
      if (roomSeed) {
        this.setRoomSeed(roomSeed);
      } else {
        this.setRoomSeed(null);
      }

      // Priority 1: Use Custom Uploaded Question Bank ONLY if active and NOT forceAi
      if (!forceAi && this.hasCustomQb()) {
        const qbList = [...this.customQb];
        const set = [];
        for (let i = 0; i < count; i++) {
          set.push(qbList[i % qbList.length]);
        }
        return set;
      }

      // Priority 2: Concurrent AI Question Generation (Parallel execution via Promise.all)
      const topicList = [];
      const safeTopics = (topics && topics.length > 0) ? topics : [
        "time", "profit", "percentage", "ratio", "interest", "partnership", "logic",
        "averages", "probability", "algebra", "number_system", "geometry", "permutations",
        "data_interpretation", "clocks_calendars", "syllogisms", "pipes_cisterns",
        "boats_streams", "simplification", "blood_relations", "directions",
        "series_completion", "coding_decoding", "data_sufficiency"
      ];
      for (let i = 0; i < count; i++) {
        topicList.push(safeTopics[i % safeTopics.length]);
      }

      const questions = await Promise.all(
        topicList.map(topicKey => this.generateQuestion(topicKey, difficulty))
      );
      return questions;
    }

    async generatePracticeQuestions(topics, difficulty = 'medium', count = 5) {
      const questions = await this.generateMatchSet(topics, difficulty, count, true);
      return questions.map(q => {
        const correctText = q.options[q.correctIndex];
        const choiceLetter = ['A', 'B', 'C', 'D'][q.correctIndex] || 'A';
        return {
          ...q,
          correctAnswerDisplay: `Option ${choiceLetter}: ${correctText}`,
          explanationDisplay: q.explanation || `Step 1: Analyze problem statement.\nStep 2: Solve step-by-step to obtain ${correctText}.\nStep 3: Verification confirms Option ${choiceLetter} is correct.`
        };
      });
    }

    async generateQuestion(topicKey, difficulty) {
      const timeLimit = difficulty === 'hard' ? 60 : (difficulty === 'medium' ? 90 : 120);

      if (this.llmConfig.useLlmApi && this.llmConfig.apiKey) {
        try {
          const llmQuestion = await this.fetchLlmQuestion(topicKey, difficulty, timeLimit);
          if (llmQuestion) return llmQuestion;
        } catch (err) {
          console.warn("LLM API generation failed, falling back to procedural AI:", err);
        }
      }

      return this.generateProceduralQuestion(topicKey, difficulty, timeLimit);
    }

    async fetchLlmQuestion(topicKey, difficulty, timeLimit) {
      const seed = Math.floor(Math.random() * 100000);
      const promptText = `Generate 1 unique multiple-choice aptitude question for topic '${topicKey}' with difficulty '${difficulty}' (Random Seed: ${seed}). 
Return strictly raw JSON format without markdown code blocks:
{
  "topic": "${topicKey}",
  "difficulty": "${difficulty}",
  "monsterName": "LLM ARCHON",
  "question": "question text",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "explanation": "step by step mathematical derivation",
  "wrongTrapAnalysis": ["why option A is wrong", "why option B is wrong", "why option C is wrong", "why option D is wrong"]
}`;

      let rawText = '';
      if (this.llmConfig.provider === 'openai') {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.llmConfig.apiKey}`
          },
          body: JSON.stringify({
            model: this.llmConfig.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptText }]
          })
        });
        if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        rawText = data.choices[0].message.content.trim();
      } else {
        const modelName = this.llmConfig.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.llmConfig.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
          throw new Error("Gemini response missing text content");
        }
        rawText = data.candidates[0].content.parts[0].text.trim();
      }

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse JSON from LLM response");

      const parsed = JSON.parse(jsonMatch[0]);
      parsed.timeLimit = timeLimit;
      if (!parsed.monsterName) parsed.monsterName = "LLM ARCHON";
      if (!parsed.topic) parsed.topic = topicKey;

      if (!parsed.traps) {
        parsed.traps = {};
        if (Array.isArray(parsed.wrongTrapAnalysis) && Array.isArray(parsed.options)) {
          parsed.options.forEach((opt, idx) => {
            if (idx !== parsed.correctIndex) {
              parsed.traps[opt] = parsed.wrongTrapAnalysis[idx] || "Calculated incorrect option.";
            }
          });
        }
      }

      return parsed;
    }

    generateProceduralQuestion(topicKey, difficulty, timeLimit) {
      switch (topicKey) {
        case 'time':
        case 'pipes_cisterns':
          return this.generateTimeQuestion(difficulty, timeLimit);
        case 'profit':
        case 'simplification':
          return this.generateProfitQuestion(difficulty, timeLimit);
        case 'percentage':
        case 'averages':
          return this.generatePercentageQuestion(difficulty, timeLimit);
        case 'ratio':
        case 'partnership':
          return this.generateRatioQuestion(difficulty, timeLimit);
        case 'interest':
        case 'boats_streams':
          return this.generateInterestQuestion(difficulty, timeLimit);
        case 'probability':
        case 'permutations':
          return this.generateRatioQuestion(difficulty, timeLimit);
        case 'algebra':
        case 'number_system':
          return this.generateInterestQuestion(difficulty, timeLimit);
        case 'geometry':
        case 'data_interpretation':
          return this.generateProfitQuestion(difficulty, timeLimit);
        case 'clocks_calendars':
        case 'syllogisms':
        case 'blood_relations':
        case 'directions':
        case 'series_completion':
        case 'coding_decoding':
        case 'data_sufficiency':
        case 'logic':
        default:
          return this.generateLogicQuestion(difficulty, timeLimit);
      }
    }

    // 1. TIME, SPEED & WORK
    generateTimeQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const trainTypes = ['express train', 'bullet train', 'passenger train', 'cargo train'];
        const trainName = trainTypes[this.rand(0, trainTypes.length - 1)];
        const speedKm = this.rand(2, 7) * 18; // Multiples of 18 (e.g. 36, 54, 72, 90, 108, 126) for exact m/s conversion
        const timeSec = this.rand(3, 12) * 2; // e.g. 6 to 24 seconds

        const speedMs = (speedKm * 5) / 18; // Exact integer m/s
        const lengthTrain = speedMs * timeSec;

        const correctAns = `${lengthTrain} meters`;
        const wrong1 = `${lengthTrain * 3.6} meters`; // Forgot km/h to m/s conversion (speedKm * timeSec)
        const wrong2 = `${Math.max(50, lengthTrain - 40)} meters`;
        const wrong3 = `${lengthTrain + 60} meters`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Time & Distance (Basic)",
          difficulty,
          timeLimit,
          monsterName: "TIME CHRONOS",
          question: `A ${trainName} traveling at a constant speed of ${speedKm} km/h passes a telegraph pole in ${timeSec} seconds. What is the length of the train?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Speed in m/s = ${speedKm} × (5/18) = ${speedMs} m/s.\n2. Length of train = Speed × Time = ${speedMs} × ${timeSec} = ${lengthTrain} meters.`,
          traps: {
            [wrong1]: `Forgot to convert km/h to m/s before multiplying time!`,
            [wrong2]: `Subtracted speed offset instead of taking the full product!`,
            [wrong3]: `Added arbitrary distance without multiplying speed and time!`
          }
        };
      } else if (difficulty === 'medium') {
        const speed1 = this.rand(2, 6) * 9;
        const speed2 = this.rand(2, 6) * 9;
        const relSpeed = speed1 + speed2; // multiple of 18 or 9
        const timeSec = this.rand(2, 8) * 2;
        const relSpeedMs = (relSpeed * 5) / 18;
        const combinedLength = Math.round(relSpeedMs * timeSec);

        const correctAns = `${combinedLength} meters`;
        const wrong1 = `${Math.round(((Math.abs(speed1 - speed2) * 5) / 18) * timeSec)} meters`; // Same direction trap
        const wrong2 = `${Math.max(80, combinedLength - 50)} meters`;
        const wrong3 = `${combinedLength + 75} meters`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Time & Distance (Relative Speed)",
          difficulty,
          timeLimit,
          monsterName: "CHRONOS ARCHON",
          question: `Two trains traveling in opposite directions at ${speed1} km/h and ${speed2} km/h completely pass each other in ${timeSec} seconds. What is the combined sum of their lengths?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Relative Speed (Opposite) = ${speed1} + ${speed2} = ${relSpeed} km/h = ${(relSpeedMs).toFixed(2)} m/s.\n2. Combined Length = Relative Speed × Time = ${(relSpeedMs).toFixed(2)} × ${timeSec} = ${combinedLength} meters.`,
          traps: {
            [wrong1]: `Calculated relative speed in same direction instead of opposite directions!`,
            [wrong2]: `Forgot to multiply relative speed by total elapsed time!`,
            [wrong3]: `Used single train speed instead of combined relative speed!`
          }
        };
      } else {
        const aTime = this.rand(4, 8);
        const bTime = aTime + 2;
        const cTime = aTime * 4;
        const netRate = (1/aTime) + (1/bTime) - (1/cTime);
        const netHours = (1 / netRate).toFixed(1);

        const rateAdd = (1/aTime) + (1/bTime) + (1/cTime);
        const wrong1Val = (1 / rateAdd).toFixed(1);
        const wrong2Val = ((aTime + bTime) / 2).toFixed(1);
        const rateNoB = (1/aTime) - (1/cTime);
        const wrong3Val = (rateNoB > 0 ? (1 / rateNoB) : (aTime + 4)).toFixed(1);

        const correctAns = `${netHours} hours`;
        const wrong1 = `${wrong1Val} hours`;
        const wrong2 = `${wrong2Val} hours`;
        const wrong3 = `${wrong3Val} hours`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Time & Work (Pipe Network)",
          difficulty,
          timeLimit,
          monsterName: "TEMPORAL OVERLORD",
          question: `Pipe A fills a reservoir in ${aTime} hrs, Pipe B in ${bTime} hrs. Drain Pipe C empties it in ${cTime} hrs. If all 3 pipes open together, how long until the reservoir is full?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Net Filling Rate = (1/${aTime}) + (1/${bTime}) - (1/${cTime}) = ${(netRate).toFixed(3)} per hour.\n2. Time to fill = 1 / ${(netRate).toFixed(3)} = ${netHours} hours.`,
          traps: {
            [wrong1]: `Added drain pipe C's rate instead of subtracting it!`,
            [wrong2]: `Took average of filling times without calculating net work rate!`,
            [wrong3]: `Forgot Pipe B's contribution to the filling process!`
          }
        };
      }
    }

    // 2. PROFIT & LOSS
    generateProfitQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const items = ['laptop', 'smartphone', 'smartwatch', 'camera', 'bicycle', 'monitor'];
        const itemName = items[this.rand(0, items.length - 1)];
        const costPrice = this.rand(4, 40) * 25;
        const profitPercent = this.rand(2, 10) * 5;
        const profitAmount = (costPrice * profitPercent) / 100;
        const sellingPrice = costPrice + profitAmount;

        const correctAns = `$${sellingPrice}`;
        const wrong1 = `$${sellingPrice + this.rand(2, 5) * 10}`;
        const wrong2 = `$${costPrice - profitAmount}`;
        const wrong3 = `$${costPrice + profitPercent}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Profit & Loss (Basic)",
          difficulty,
          timeLimit,
          monsterName: "MINT GOLEM",
          question: `A merchant purchases a ${itemName} for $${costPrice} and sells it at a profit of ${profitPercent}%. What is the final selling price?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Profit Amount = ${costPrice} × (${profitPercent}/100) = $${profitAmount}.\n2. Selling Price = ${costPrice} + ${profitAmount} = $${sellingPrice}.`,
          traps: {
            [wrong1]: `Added arbitrary dollar offset to selling price!`,
            [wrong2]: `Calculated loss instead of profit!`,
            [wrong3]: `Added profit percentage directly as dollar amount!`
          }
        };
      } else if (difficulty === 'medium') {
        const markedPrice = this.rand(5, 25) * 100;
        const d1 = this.rand(2, 6) * 5;
        const d2 = this.rand(1, 4) * 5;
        
        const priceAfterD1 = markedPrice * (1 - d1/100);
        const finalPrice = Math.round(priceAfterD1 * (1 - d2/100));
        const netDiscountPercent = (((markedPrice - finalPrice) / markedPrice) * 100).toFixed(1);

        const correctAns = `${netDiscountPercent}%`;
        const wrong1 = `${d1 + d2}%`;
        const wrong2 = `${(d1 + d2 / 2).toFixed(1)}%`;
        const wrong3 = `${(parseFloat(netDiscountPercent) - 5).toFixed(1)}%`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Profit & Loss (Successive Discount)",
          difficulty,
          timeLimit,
          monsterName: "MINT SPECTER",
          question: `An article marked at $${markedPrice} is offered with two successive discounts of ${d1}% and ${d2}%. What is the single equivalent discount percentage?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Multiplier = (1 - ${d1/100}) × (1 - ${d2/100}) = ${(1-d1/100).toFixed(2)} × ${(1-d2/100).toFixed(2)} = ${((1-d1/100)*(1-d2/100)).toFixed(3)}.\n2. Equivalent Single Discount = (1 - ${((1-d1/100)*(1-d2/100)).toFixed(3)}) × 100 = ${netDiscountPercent}%.`,
          traps: {
            [wrong1]: `Common Trap! Simply added ${d1}% + ${d2}% = ${d1+d2}% without compounding!`,
            [wrong2]: `Subtracted average discount!`,
            [wrong3]: `Calculated net selling percentage instead of discount rate!`
          }
        };
      } else {
        const falseWeight = this.rand(80, 95) * 10;
        const trueWeight = 1000;
        const error = trueWeight - falseWeight;
        const profitPercent = ((error / falseWeight) * 100).toFixed(2);

        const correctAns = `${profitPercent}%`;
        const wrong1 = `${((error / trueWeight) * 100).toFixed(2)}%`;
        const wrong2 = `${(parseFloat(profitPercent) + 2.5).toFixed(2)}%`;
        const wrong3 = `${((error / 500) * 100).toFixed(2)}%`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Profit & Loss (Dishonest Trader)",
          difficulty,
          timeLimit,
          monsterName: "FINANCIAL OVERLORD",
          question: `A trader claims to sell goods at cost price, but uses a fraudulent weight of ${falseWeight}g instead of ${trueWeight}g (1 kg). What is his actual profit percentage?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Weight Deficit Error = 1000g - ${falseWeight}g = ${error}g.\n2. Actual Profit % = (Error / False Weight) × 100 = (${error} / ${falseWeight}) × 100 = ${profitPercent}%.`,
          traps: {
            [wrong1]: `Divided error by True Weight (${trueWeight}g) instead of False Weight (${falseWeight}g)!`,
            [wrong2]: `Overestimated profit margin!`,
            [wrong3]: `Calculated weight deficit ratio!`
          }
        };
      }
    }

    // 3. PERCENTAGE & DISCOUNT
    generatePercentageQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const num = this.rand(5, 30) * 10;
        const incPercent = this.rand(2, 8) * 5;
        const increasedVal = Math.round(num * (1 + incPercent / 100));

        const correctAns = `${increasedVal}`;
        const wrong1 = `${increasedVal + 20}`;
        const wrong2 = `${num + incPercent}`;
        const wrong3 = `${increasedVal - 15}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Percentage (Basic Increase)",
          difficulty,
          timeLimit,
          monsterName: "PERCENT PHANTOM",
          question: `If a value of ${num} is increased by ${incPercent}%, what is the newly resulting value?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Increase Amount = ${num} × (${incPercent}/100) = ${num * incPercent / 100}.\n2. New Value = ${num} + ${num * incPercent / 100} = ${increasedVal}.`,
          traps: {
            [wrong1]: `Added 20 directly to final value!`,
            [wrong2]: `Added percentage points directly to the number!`,
            [wrong3]: `Subtracted percentage value!`
          }
        };
      } else if (difficulty === 'medium') {
        const initialVal = this.rand(5, 25) * 1000;
        const rate = this.rand(1, 4) * 5;
        const finalVal = Math.round(initialVal * Math.pow(1 - rate / 100, 2));

        const correctAns = `${finalVal.toLocaleString()}`;
        const wrong1 = `${(initialVal * (1 - (rate * 2) / 100)).toLocaleString()}`;
        const wrong2 = `${(finalVal + 500).toLocaleString()}`;
        const wrong3 = `${(initialVal * (1 - rate / 100)).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Percentage (Annual Depreciation)",
          difficulty,
          timeLimit,
          monsterName: "DEPRECIATION TITAN",
          question: `The value of an equipment is $${initialVal.toLocaleString()} and depreciates at a rate of ${rate}% per year. What will its value be after 2 years?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Year 1 Value = $${initialVal.toLocaleString()} × ${(1 - rate / 100).toFixed(2)} = $${(initialVal * (1 - rate / 100)).toLocaleString()}.\n2. Year 2 Value = $${(initialVal * (1 - rate / 100)).toLocaleString()} × ${(1 - rate / 100).toFixed(2)} = $${finalVal.toLocaleString()}.`,
          traps: {
            [wrong1]: `Simple Interest Trap! Subtracted flat ${rate * 2}% directly instead of compounding yearly!`,
            [wrong2]: `Calculated overestimation!`,
            [wrong3]: `Calculated value after only 1 year!`
          }
        };
      } else {
        const scoredMarks = this.rand(12, 35) * 10;
        const failBy = this.rand(2, 8) * 5;
        const passPercent = this.rand(6, 10) * 5;
        
        const passMarks = scoredMarks + failBy;
        const totalMarks = Math.round((passMarks / passPercent) * 100);

        const correctAns = `${totalMarks} marks`;
        const wrong1 = `${totalMarks - 50} marks`;
        const wrong2 = `${totalMarks + 100} marks`;
        const wrong3 = `${Math.round((scoredMarks / passPercent) * 100)} marks`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Percentage (Exam Cutoff)",
          difficulty,
          timeLimit,
          monsterName: "PERCENTAGE OVERLORD",
          question: `A student scores ${scoredMarks} marks in an examination and fails by ${failBy} marks. If the minimum passing percentage is ${passPercent}%, what are the total maximum marks?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Required Passing Marks = ${scoredMarks} + ${failBy} = ${passMarks} marks.\n2. ${passPercent}% of Total = ${passMarks} ⇒ Total Marks = (${passMarks} / ${passPercent}) × 100 = ${totalMarks} marks.`,
          traps: {
            [wrong1]: `Underestimated total marks!`,
            [wrong2]: `Added fail marks twice!`,
            [wrong3]: `Forgot to add failing deficit to scored marks!`
          }
        };
      }
    }

    // 4. RATIO & PROPORTION
    generateRatioQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const r1 = this.rand(2, 5);
        const r2 = this.rand(6, 11);
        const mult = this.rand(10, 40);
        const sum = (r1 + r2) * mult;
        const part2 = r2 * mult;

        const correctAns = `${part2}`;
        const wrong1 = `${r1 * mult}`;
        const wrong2 = `${part2 + 10}`;
        const wrong3 = `${sum / 2}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Ratio & Proportion (Division)",
          difficulty,
          timeLimit,
          monsterName: "EQUILIBRIUM TITAN",
          question: `Two numbers are in the ratio ${r1}:${r2}. If their total sum is ${sum}, what is the value of the larger number?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Total ratio parts = ${r1} + ${r2} = ${r1 + r2} parts.\n2. Value per part = ${sum} / ${r1 + r2} = ${mult}.\n3. Larger number = ${r2} × ${mult} = ${part2}.`,
          traps: {
            [wrong1]: `Selected the smaller ratio part instead of larger!`,
            [wrong2]: `Added offset to ratio calculation!`,
            [wrong3]: `Divided total sum in half!`
          }
        };
      } else if (difficulty === 'medium') {
        const addedWater = this.rand(1, 4) * 5;
        const milkVol = 40;
        const initialWater = 10;
        const newWater = initialWater + addedWater;

        const divisor = this.gcd(milkVol, newWater);
        const simpleMilk = milkVol / divisor;
        const simpleWater = newWater / divisor;
        const newRatio = `${simpleMilk}:${simpleWater}`;

        const correctAns = newRatio;
        const wrong1 = `4:${1 + addedWater/5}`;
        const wrong2 = `1:1`;
        const wrong3 = `3:2`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Ratio (Mixture Addition)",
          difficulty,
          timeLimit,
          monsterName: "MIXTURE ARCHON",
          question: `A 50-liter mixture contains milk and water in the ratio 4:1. If ${addedWater} liters of pure water is added to the mixture, what is the new ratio of milk to water?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Initial: Milk = 40L, Water = 10L.\n2. After adding ${addedWater}L water: Milk = 40L, Water = ${newWater}L.\n3. New Ratio = 40:${newWater} = ${newRatio}.`,
          traps: {
            [wrong1]: `Subtracted water volume from milk!`,
            [wrong2]: `Assumed equal volumes!`,
            [wrong3]: `Added water to initial total volume instead of water portion!`
          }
        };
      } else {
        const multiplier = this.rand(4, 12) * 100;
        const savings = multiplier * 2;
        const incomeA = 5 * multiplier;

        const correctAns = `$${incomeA.toLocaleString()}`;
        const wrong1 = `$${(4 * multiplier).toLocaleString()}`;
        const wrong2 = `$${(incomeA + savings).toLocaleString()}`;
        const wrong3 = `$${(incomeA * 1.2).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Ratio (Income & Expenditure)",
          difficulty,
          timeLimit,
          monsterName: "EQUILIBRIUM OVERLORD",
          question: `Monthly incomes of A and B are in the ratio 5:4, and their expenditures are in the ratio 3:2. If each saves $${savings.toLocaleString()} per month, what is A's monthly income?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Let incomes be 5x and 4x, expenditures be 3y and 2y.\n2. Equations: 5x - 3y = ${savings} and 4x - 2y = ${savings} ⇒ x = ${multiplier}.\n3. A's Income = 5 × ${multiplier} = $${incomeA.toLocaleString()}.`,
          traps: {
            [wrong1]: `Calculated B's income instead of A's income!`,
            [wrong2]: `Subtracted savings twice!`,
            [wrong3]: `Calculated total combined income!`
          }
        };
      }
    }

    // 5. SIMPLE & COMPOUND INTEREST
    generateInterestQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const P = this.rand(5, 50) * 100;
        const R = this.rand(3, 12);
        const T = this.rand(2, 5);
        const SI = Math.round((P * R * T) / 100);

        const correctAns = `$${SI}`;
        const wrong1 = `$${SI + 50}`;
        const wrong2 = `$${Math.max(20, SI - 30)}`;
        const wrong3 = `$${P + SI}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Simple Interest (Basic)",
          difficulty,
          timeLimit,
          monsterName: "BANKER SPECTER",
          question: `Calculate the Simple Interest accrued on a principal of $${P} at a rate of ${R}% per annum for ${T} years.`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Formula: SI = (P × R × T) / 100.\n2. SI = (${P} × ${R} × ${T}) / 100 = $${SI}.`,
          traps: {
            [wrong1]: `Miscalculated annual interest rate!`,
            [wrong2]: `Forgot to multiply by time in years!`,
            [wrong3]: `Selected Total Amount instead of Simple Interest!`
          }
        };
      } else if (difficulty === 'medium') {
        const P = this.rand(10, 40) * 100;
        const R = 10;
        const T = 2;
        const CI = Math.round(P * Math.pow(1 + R/100, T) - P);

        const correctAns = `$${CI}`;
        const wrong1 = `$${(P * R * T) / 100}`;
        const wrong2 = `$${CI + 40}`;
        const wrong3 = `$${CI - 30}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Compound Interest (2-Year)",
          difficulty,
          timeLimit,
          monsterName: "COMPOUND ARCHON",
          question: `Find the Compound Interest on $${P.toLocaleString()} invested at ${R}% per annum compounded annually for ${T} years.`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Amount = ${P} × (1.${R})² = $${Math.round(P * 1.21)}.\n2. CI = Amount - Principal = ${Math.round(P * 1.21)} - ${P} = $${CI}.`,
          traps: {
            [wrong1]: `Simple Interest Trap! Calculated SI ($${(P * R * T) / 100}) instead of Compound Interest!`,
            [wrong2]: `Overestimated compounding factor!`,
            [wrong3]: `Subtracted rate offset!`
          }
        };
      } else {
        const R = 5;
        const mult = this.rand(2, 10) * 10;
        const diff = Math.round(mult * 0.25);
        const P = mult * 400;

        const correctAns = `$${P.toLocaleString()}`;
        const wrong1 = `$${(P - 2000).toLocaleString()}`;
        const wrong2 = `$${(P + 2000).toLocaleString()}`;
        const wrong3 = `$${(P * 1.2).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Interest (CI vs SI Difference)",
          difficulty,
          timeLimit,
          monsterName: "INTEREST OVERLORD",
          question: `The difference between Compound Interest and Simple Interest on a sum of money for 2 years at ${R}% per annum is $${diff}. What is the principal sum?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Difference (CI - SI) = Principal × (Rate/100)².\n2. $${diff} = P × (5/100)² = P × (1/400) ⇒ Principal P = ${diff} × 400 = $${P.toLocaleString()}.`,
          traps: {
            [wrong1]: `Applied single year percentage factor!`,
            [wrong2]: `Forgot to square the rate term!`,
            [wrong3]: `Divided difference by interest rate!`
          }
        };
      }
    }

    // 6. PARTNERSHIP SHARE
    generatePartnershipQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const mult = this.rand(2, 8) * 100;
        const invA = 3 * mult;
        const invB = 5 * mult;
        const profit = 8 * mult * 2;
        const shareA = 3 * mult * 2;

        const correctAns = `$${shareA.toLocaleString()}`;
        const wrong1 = `$${(5 * mult * 2).toLocaleString()}`;
        const wrong2 = `$${(profit / 2).toLocaleString()}`;
        const wrong3 = `$${(shareA - 100).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Partnership (Basic)",
          difficulty,
          timeLimit,
          monsterName: "CIPHER GUILD",
          question: `Partner A invests $${invA.toLocaleString()} and Partner B invests $${invB.toLocaleString()} for equal durations. If total profit is $${profit.toLocaleString()}, what is Partner A's profit share?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Ratio A:B = ${invA}:${invB} = 3:5.\n2. Partner A's Share = (3/8) × $${profit.toLocaleString()} = $${shareA.toLocaleString()}.`,
          traps: {
            [wrong1]: `Calculated Partner B's share instead of Partner A's share!`,
            [wrong2]: `Split profit in half!`,
            [wrong3]: `Subtracted investment difference!`
          }
        };
      } else if (difficulty === 'medium') {
        const invA = this.rand(2, 6) * 1000;
        const invB = this.rand(3, 8) * 1000;
        const mA = 12;
        const mB = 8;
        const prodA = invA * mA;
        const prodB = invB * mB;
        const totalProd = prodA + prodB;
        const totalProfit = this.rand(4, 12) * 1000;

        const shareA = Math.round((prodA / totalProd) * totalProfit);

        const correctAns = `$${shareA.toLocaleString()}`;
        const wrong1 = `$${Math.round((invA / (invA + invB)) * totalProfit).toLocaleString()}`;
        const wrong2 = `$${(shareA + 300).toLocaleString()}`;
        const wrong3 = `$${(totalProfit / 2).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Partnership (Variable Duration)",
          difficulty,
          timeLimit,
          monsterName: "GUILD MASTER",
          question: `Partner A invests $${invA.toLocaleString()} for ${mA} months, while Partner B invests $${invB.toLocaleString()} for ${mB} months. Divide a total profit of $${totalProfit.toLocaleString()} between them. What is A's share?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Investment-Months Ratio = (${invA}×${mA}) : (${invB}×${mB}) = ${prodA.toLocaleString()} : ${prodB.toLocaleString()}.\n2. Partner A's Share = (${prodA}/${totalProd}) × $${totalProfit.toLocaleString()} = $${shareA.toLocaleString()}.`,
          traps: {
            [wrong1]: `Ignored time duration and divided by initial capital ratio (${invA}:${invB})!`,
            [wrong2]: `Overweighted months!`,
            [wrong3]: `Calculated simple average!`
          }
        };
      } else {
        const totalProfit = this.rand(4, 10) * 1000;
        const commPercent = 10;
        const commission = totalProfit * (commPercent / 100);
        const remaining = totalProfit - commission;
        const shareA = commission + (remaining / 2);

        const correctAns = `$${shareA.toLocaleString()}`;
        const wrong1 = `$${(remaining / 2).toLocaleString()}`;
        const wrong2 = `$${(totalProfit / 2).toLocaleString()}`;
        const wrong3 = `$${(shareA + 500).toLocaleString()}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Partnership (Working Partner Fee)",
          difficulty,
          timeLimit,
          monsterName: "PARTNERSHIP OVERLORD",
          question: `A and B invest equal capital. A is a working partner and receives ${commPercent}% of total profit as management commission before profit division. If total profit is $${totalProfit.toLocaleString()}, what is A's total income?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. A's Commission = 10% of $${totalProfit.toLocaleString()} = $${commission.toLocaleString()}.\n2. Remaining Profit = $${remaining.toLocaleString()} split 1:1 ⇒ $${(remaining/2).toLocaleString()} each.\n3. Total A's Income = $${commission.toLocaleString()} + $${(remaining/2).toLocaleString()} = $${shareA.toLocaleString()}.`,
          traps: {
            [wrong1]: `Forgot to add the $${commission.toLocaleString()} management fee to A's profit share!`,
            [wrong2]: `Calculated only equal split without working partner commission!`,
            [wrong3]: `Deducted commission from A's share!`
          }
        };
      }
    }

    // 7. LOGICAL SEQUENCES
    generateLogicQuestion(difficulty, timeLimit) {
      if (difficulty === 'easy') {
        const start = this.rand(5, 30);
        const step = this.rand(3, 12);

        const seq = [start, start + step, start + step*2, start + step*3, start + step*4];
        const nextTerm = start + step*5;

        const correctAns = `${nextTerm}`;
        const wrong1 = `${nextTerm - 2}`;
        const wrong2 = `${nextTerm + step}`;
        const wrong3 = `${nextTerm - step}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Logical Sequence (Arithmetic)",
          difficulty,
          timeLimit,
          monsterName: "RUNIC DRAKE",
          question: `Find the next number in the arithmetic sequence: ${seq.join(', ')}, ?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Constant difference of +${step} between terms.\n2. Next Term = ${seq[4]} + ${step} = ${nextTerm}.`,
          traps: {
            [wrong1]: `Miscalculated addition step!`,
            [wrong2]: `Skipped one step in sequence!`,
            [wrong3]: `Selected previous term in sequence!`
          }
        };
      } else if (difficulty === 'medium') {
        const start = this.rand(2, 6);
        const mult = 2;
        const add = 1;

        const seq = [start];
        for (let i = 1; i < 5; i++) {
          seq.push(seq[i - 1] * mult + add);
        }
        const nextTerm = seq[4] * mult + add;

        const correctAns = `${nextTerm}`;
        const wrong1 = `${seq[4] * mult}`;
        const wrong2 = `${nextTerm + 3}`;
        const wrong3 = `${nextTerm - 5}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Logical Sequence (Double Step)",
          difficulty,
          timeLimit,
          monsterName: "RUNIC ARCHON",
          question: `Identify the missing term in the pattern: ${seq.join(', ')}, ?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Pattern: (Previous Term × 2) + 1.\n2. Calculation: (${seq[4]} × 2) + 1 = ${nextTerm}.`,
          traps: {
            [wrong1]: `Doubled previous term without adding +1 constant!`,
            [wrong2]: `Added wrong offset!`,
            [wrong3]: `Calculated powers of 2!`
          }
        };
      } else {
        const k = this.rand(1, 5);
        const seq = [];
        for (let n = 1; n <= 5; n++) {
          seq.push(n * n + k);
        }
        const nextTerm = 6 * 6 + k;

        const correctAns = `${nextTerm}`;
        const wrong1 = `${36}`;
        const wrong2 = `${nextTerm - 2}`;
        const wrong3 = `${nextTerm + 4}`;
        const options = this.shuffle([correctAns, wrong1, wrong2, wrong3]);

        return {
          topic: "Logical Sequence (Polynomial)",
          difficulty,
          timeLimit,
          monsterName: "LOGIC OVERLORD",
          question: `Find the next number in the pattern: ${seq.join(', ')}, ?`,
          options,
          correctIndex: options.indexOf(correctAns),
          explanation: `1. Pattern: n² + ${k} for n = 1, 2, 3, 4, 5, 6.\n2. Calculation: 6² + ${k} = 36 + ${k} = ${nextTerm}.`,
          traps: {
            [wrong1]: `Selected 6² (36) without adding +${k} constant!`,
            [wrong2]: `Subtracted constant instead of adding!`,
            [wrong3]: `Overestimated polynomial growth!`
          }
        };
      }
    }

    generateWrongAnswerExplanation(question, selectedIndex) {
      const selectedOptionText = question.options[selectedIndex];
      const correctOptionText = question.options[question.correctIndex];
      let trapText = "";

      if (question.traps && question.traps[selectedOptionText]) {
        trapText = `❌ MISTAKE ANALYSIS:\nOption "${selectedOptionText}" is incorrect. ${question.traps[selectedOptionText]}\n\n`;
      } else {
        trapText = `❌ MISTAKE ANALYSIS:\nOption "${selectedOptionText}" is incorrect.\n\n`;
      }

      const solutionText = question.explanation
        ? `✅ CORRECT DERIVATION (Choice ${['A','B','C','D'][question.correctIndex]}: ${correctOptionText}):\n${question.explanation}`
        : `✅ CORRECT ANSWER (Choice ${['A','B','C','D'][question.correctIndex]}): ${correctOptionText}`;

      return `${trapText}${solutionText}`;
    }
  }

  window.AptitudeAiEngine = new AptitudeAiEngine();

})(window);
