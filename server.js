/* ==========================================================================
   APTITUDE ARENA 2D - SECURE ENVIRONMENT & MULTIPLAYER SERVER (server.js)
   Parses .env file dynamically, injects window.ENV, handles real-time room sync, and serves static files.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const DB_NAME = "aptitude_suite";

let db = null;
let mongoConnected = false;

// Connect to MongoDB Database
MongoClient.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(client => {
    db = client.db(DB_NAME);
    mongoConnected = true;
    console.log(`🍃 [MONGODB SUCCESS] Connected to MongoDB at ${MONGODB_URI} (DB: ${DB_NAME})`);
  })
  .catch(err => {
    console.warn(`⚠️ [MONGODB NOTICE] Could not connect to local MongoDB (${MONGODB_URI}): ${err.message}. System operating with in-memory persistence mode.`);
  });

// In-Memory Multiplayer Room State
const activeRooms = {}; // roomCode => { players: { [playerId]: { username, avatar, hp, score, lives, currentQuestionIndex, lastSeen } } }

// Periodic Room Cleaner (Remove inactive players after 30 seconds)
setInterval(() => {
  const now = Date.now();
  Object.keys(activeRooms).forEach(code => {
    const room = activeRooms[code];
    Object.keys(room.players).forEach(pId => {
      if (now - room.players[pId].lastSeen > 30000) {
        delete room.players[pId];
      }
    });
    if (Object.keys(room.players).length === 0) {
      delete activeRooms[code];
    }
  });
}, 10000);

// Parse .env file if it exists
function loadEnvFile() {
  const env = {};
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          env[key] = val;
        }
      }
    });
  }
  return env;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const fileUrl = urlPath === '/' ? '/index.html' : urlPath;
  const safePath = path.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
  
  // Dynamic Real-Time Multiplayer Room Sync Route (/api/room/sync)
  if (safePath === '/api/room/sync' || safePath === '\\api\\room\\sync') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const { roomCode, playerId, username, avatar, hp, score, lives, currentQuestionIndex } = data;

        if (!roomCode || !playerId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing roomCode or playerId' }));
        }

        if (!activeRooms[roomCode]) {
          activeRooms[roomCode] = { players: {} };
        }

        // Update sender's live state in the room
        activeRooms[roomCode].players[playerId] = {
          playerId,
          username: username || 'Scholar',
          avatar: avatar || '🎓',
          hp: hp !== undefined ? hp : 100,
          score: score || 0,
          lives: lives !== undefined ? lives : 5,
          currentQuestionIndex: currentQuestionIndex || 0,
          lastSeen: Date.now()
        };

        // Find opponent (the other player in the room)
        const allPlayerIds = Object.keys(activeRooms[roomCode].players);
        const opponentId = allPlayerIds.find(id => id !== playerId);
        const opponent = opponentId ? activeRooms[roomCode].players[opponentId] : null;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          roomCode,
          playerId,
          totalPlayers: allPlayerIds.length,
          opponent: opponent,
          allCandidates: Object.values(activeRooms[roomCode].players)
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Admin Live Monitor Route (/api/room/admin)
  if (safePath === '/api/room/admin' || safePath === '\\api\\room\\admin') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const code = urlObj.searchParams.get('roomCode');
    if (code && activeRooms[code]) {
      const candidates = Object.values(activeRooms[code].players);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, roomCode: code, candidates }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, roomCode: code || 'N/A', candidates: [] }));
    }
  }

  // In-Memory Persistence Stores
  const otpStore = {};
  const inMemoryLogins = [];
  const inMemoryAssignedTests = [
    {
      testId: 'TEST-MATH-101',
      title: 'Quantitative Reasoning & Speed Math',
      subject: 'Quantitative Reasoning',
      teacherName: 'Prof. Alan Vance',
      teacherEmail: 'alan.vance@university.edu',
      durationMinutes: 10,
      totalQuestions: 5,
      questions: [
        {
          question: "A speed of 45 km/hr is equal to how many meters per second?",
          options: ["12.5 m/s", "10 m/s", "15 m/s", "18 m/s"],
          answer: 0,
          explanation: "To convert km/hr to m/s, multiply by 5/18. So, 45 * (5/18) = 12.5 m/s."
        },
        {
          question: "If a car travels 240 km in 4 hours, what is its average speed?",
          options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
          answer: 1,
          explanation: "Speed = Distance / Time = 240 km / 4 hours = 60 km/h."
        },
        {
          question: "What is 15% of 400?",
          options: ["45", "50", "60", "75"],
          answer: 2,
          explanation: "15% of 400 = (15 / 100) * 400 = 60."
        },
        {
          question: "If a shirt costs $80 after a 20% discount, what was its original price?",
          options: ["$90", "$100", "$110", "$120"],
          answer: 1,
          explanation: "Original price P * 0.80 = $80 => P = $100."
        },
        {
          question: "Find the median of the set: {7, 12, 3, 19, 15}.",
          options: ["7", "12", "15", "19"],
          answer: 1,
          explanation: "Sorted set: {3, 7, 12, 15, 19}. The middle value is 12."
        }
      ],
      assignedTo: 'all',
      createdAt: new Date()
    },
    {
      testId: 'TEST-LOGIC-202',
      title: 'Advanced Logical Analytics Test',
      subject: 'Logical Reasoning',
      teacherName: 'Dr. Sarah Connor',
      teacherEmail: 'sarah.connor@university.edu',
      durationMinutes: 15,
      totalQuestions: 5,
      questions: [
        {
          question: "Which number comes next in the sequence: 2, 4, 8, 16, 32, ...?",
          options: ["48", "60", "64", "128"],
          answer: 2,
          explanation: "Each number is multiplied by 2. 32 * 2 = 64."
        },
        {
          question: "If CAT = 24 and DOG = 26, what is PIG?",
          options: ["32", "30", "28", "36"],
          answer: 0,
          explanation: "Sum of alphabetical positions: P(16) + I(9) + G(7) = 32."
        },
        {
          question: "All roses are flowers. Some flowers fade quickly. Therefore:",
          options: ["All roses fade quickly", "Some roses fade quickly", "No roses fade quickly", "None of the above necessarily follows"],
          answer: 3,
          explanation: "The premises do not logically guarantee that the subset of flowers fading quickly includes roses."
        },
        {
          question: "Find the odd one out: Circle, Square, Sphere, Triangle.",
          options: ["Circle", "Square", "Sphere", "Triangle"],
          answer: 2,
          explanation: "Sphere is a 3D geometric solid, while the others are 2D flat shapes."
        },
        {
          question: "If Monday is day 1, what day of the week is day 100?",
          options: ["Tuesday", "Wednesday", "Thursday", "Friday"],
          answer: 0,
          explanation: "100 mod 7 = 2. Day 1 is Monday, so day 2 of the cycle is Tuesday."
        }
      ],
      assignedTo: 'all',
      createdAt: new Date()
    }
  ];
  const inMemoryTestAttempts = [];
  const inMemoryDeviceLogs = [];

  // 1. Role Login & Audit Route (/api/auth/login)
  if (safePath === '/api/auth/login' || safePath === '\\api\\auth\\login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { username, email, role, adminPasscode, dept, track, deviceDetails } = data;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown Browser';

        if (role === 'admin' && adminPasscode !== 'admin123') {
          const failedLog = {
            loginId: 'LOG-' + Date.now(),
            username: username || 'Admin User',
            email: email || 'admin@suite.local',
            role: 'admin',
            timestamp: new Date(),
            ip: clientIp,
            userAgent: userAgent,
            status: 'FAILED (Invalid Security Key)'
          };
          inMemoryLogins.unshift(failedLog);
          if (mongoConnected && db) {
            try { await db.collection('login_logs').insertOne(failedLog); } catch (e) {}
          }
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid Administrator Security Key / PIN.' }));
        }

        const loginRecord = {
          loginId: 'LOG-' + Date.now(),
          username: username || (role === 'admin' ? 'System Administrator' : 'Scholar'),
          email: email || (role === 'admin' ? 'admin@suite.local' : 'scholar@example.com'),
          role: role || 'student',
          track: track || 'Quantitative Analyst',
          dept: dept || 'Quantitative Reasoning',
          timestamp: new Date(),
          ip: clientIp,
          userAgent: userAgent,
          deviceInfo: deviceDetails || {},
          status: 'SUCCESS'
        };

        inMemoryLogins.unshift(loginRecord);
        if (mongoConnected && db) {
          try {
            await db.collection('login_logs').insertOne(loginRecord);
            console.log(`🍃 [MONGODB LOG] Recorded Login event for [${loginRecord.email}] (${loginRecord.role})`);
          } catch (mErr) {
            console.warn("MongoDB Login Log error:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: `${role.toUpperCase()} login authenticated successfully.`,
          user: loginRecord
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 2. Teacher Assign Test Route (/api/tests/assign)
  if (safePath === '/api/tests/assign' || safePath === '\\api\\tests\\assign') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { title, subject, teacherName, teacherEmail, durationMinutes, questions, assignedTo } = data;

        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please provide test title and at least one valid question.' }));
        }

        const testDoc = {
          testId: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
          title: title.trim(),
          subject: subject || 'General Aptitude',
          teacherName: teacherName || 'Faculty Professor',
          teacherEmail: teacherEmail || 'teacher@university.edu',
          durationMinutes: parseInt(durationMinutes) || 10,
          totalQuestions: questions.length,
          questions: questions,
          assignedTo: assignedTo || 'all',
          createdAt: new Date()
        };

        inMemoryAssignedTests.unshift(testDoc);
        if (mongoConnected && db) {
          try {
            await db.collection('assigned_tests').insertOne(testDoc);
            console.log(`🍃 [MONGODB TEST] Teacher created assigned test: ${testDoc.title} (${testDoc.testId})`);
          } catch (mErr) {
            console.warn("MongoDB Test Assign error:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Question Bank Test successfully assigned to students!',
          test: testDoc
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 3. List Assigned Tests Route (/api/tests/list)
  if (safePath === '/api/tests/list' || safePath === '\\api\\tests\\list') {
    (async () => {
      try {
        let tests = [...inMemoryAssignedTests];
        if (mongoConnected && db) {
          try {
            const dbTests = await db.collection('assigned_tests').find({}).sort({ createdAt: -1 }).toArray();
            if (dbTests && dbTests.length > 0) {
              tests = dbTests;
            }
          } catch (mErr) {
            console.warn("MongoDB list tests error:", mErr.message);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, tests }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return;
  }

  // 4. Start Test & Record Candidate Device Details (/api/tests/start)
  if (safePath === '/api/tests/start' || safePath === '\\api\\tests\\start') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { testId, studentEmail, studentName, deviceDetails } = data;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        const deviceRecord = {
          attemptId: 'ATT-' + Date.now(),
          testId: testId || 'TEST-SOLO',
          studentEmail: studentEmail || 'scholar@example.com',
          studentName: studentName || 'Scholar',
          browser: deviceDetails?.browser || 'Chrome/Edge',
          os: deviceDetails?.os || 'Windows/MacOS',
          screenResolution: deviceDetails?.screenResolution || '1920x1080',
          platform: deviceDetails?.platform || 'Desktop',
          userAgent: req.headers['user-agent'] || 'Unknown Browser',
          ip: clientIp,
          startedAt: new Date()
        };

        inMemoryDeviceLogs.unshift(deviceRecord);
        if (mongoConnected && db) {
          try {
            await db.collection('device_logs').insertOne(deviceRecord);
            console.log(`🍃 [MONGODB DEVICE] Saved device specs for candidate [${deviceRecord.studentName}]`);
          } catch (mErr) {
            console.warn("MongoDB Device log error:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Test session initialized & device specs logged.',
          attemptId: deviceRecord.attemptId
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 5. Submit Completed Test Route (/api/tests/submit)
  if (safePath === '/api/tests/submit' || safePath === '\\api\\tests\\submit') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const attemptDoc = {
          attemptId: data.attemptId || 'ATT-' + Date.now(),
          testId: data.testId || 'TEST-SOLO',
          testTitle: data.testTitle || 'General Aptitude Test',
          studentEmail: data.studentEmail || 'scholar@example.com',
          studentName: data.studentName || 'Scholar',
          score: data.score || 0,
          accuracy: data.accuracy || '100%',
          totalQuestions: data.totalQuestions || 5,
          correctAnswers: data.correctAnswers || 0,
          wrongAnswers: data.wrongAnswers || 0,
          status: 'COMPLETED',
          tabSwitchCount: data.tabSwitchCount || 0,
          violationReason: 'None (Clean Test)',
          completedAt: new Date()
        };

        inMemoryTestAttempts.unshift(attemptDoc);
        if (mongoConnected && db) {
          try {
            await db.collection('test_attempts').insertOne(attemptDoc);
            console.log(`🍃 [MONGODB REPORT] Saved completed test attempt for candidate [${attemptDoc.studentName}]`);
          } catch (mErr) {
            console.warn("MongoDB Test attempt save notice:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Test submitted successfully.', attempt: attemptDoc }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 6. Anti-Cheat Terminate Test Route (/api/tests/terminate)
  if (safePath === '/api/tests/terminate' || safePath === '\\api\\tests\\terminate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        const violationDoc = {
          attemptId: data.attemptId || 'ATT-VIOLATION-' + Date.now(),
          testId: data.testId || 'TEST-PROTECTED',
          testTitle: data.testTitle || 'Protected Test Assignment',
          studentEmail: data.studentEmail || 'scholar@example.com',
          studentName: data.studentName || 'Scholar',
          score: data.score || 0,
          accuracy: data.accuracy || '0%',
          totalQuestions: data.totalQuestions || 5,
          correctAnswers: data.correctAnswers || 0,
          wrongAnswers: data.wrongAnswers || 0,
          status: 'TERMINATED',
          tabSwitchCount: data.tabSwitchCount || 2,
          violationReason: 'TERMINATED DUE TO CHEATING (Tab Switch Count >= 2)',
          deviceDetails: data.deviceDetails || {},
          ip: clientIp,
          userAgent: req.headers['user-agent'] || 'Unknown',
          terminatedAt: new Date()
        };

        inMemoryTestAttempts.unshift(violationDoc);
        if (mongoConnected && db) {
          try {
            await db.collection('test_attempts').insertOne(violationDoc);
            await db.collection('violation_logs').insertOne(violationDoc);
            console.log(`🚨 [MONGODB CHEATING ALERT] Test TERMINATED for [${violationDoc.studentName}] due to Tab Switching (${violationDoc.tabSwitchCount} switches)`);
          } catch (mErr) {
            console.warn("MongoDB Violation log error:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Test session terminated and reported to Administrator.',
          violation: violationDoc
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 7. Admin Audit Logs Query Route (/api/admin/audit-logs)
  if (safePath === '/api/admin/audit-logs' || safePath === '\\api\\admin\\audit-logs') {
    (async () => {
      try {
        let logins = [...inMemoryLogins];
        let testAttempts = [...inMemoryTestAttempts];
        let deviceLogs = [...inMemoryDeviceLogs];

        if (mongoConnected && db) {
          try {
            const dbLogins = await db.collection('login_logs').find({}).sort({ timestamp: -1 }).toArray();
            const dbAttempts = await db.collection('test_attempts').find({}).sort({ completedAt: -1, terminatedAt: -1 }).toArray();
            const dbDevices = await db.collection('device_logs').find({}).sort({ startedAt: -1 }).toArray();

            if (dbLogins.length > 0) logins = dbLogins;
            if (dbAttempts.length > 0) testAttempts = dbAttempts;
            if (dbDevices.length > 0) deviceLogs = dbDevices;
          } catch (mErr) {
            console.warn("MongoDB audit logs error:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          logins,
          testAttempts,
          deviceLogs
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return;
  }

  // Send Email OTP Route (/api/auth/send-otp)
  if (safePath === '/api/auth/send-otp' || safePath === '\\api\\auth\\send-otp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { email } = data;
        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        otpStore[email.toLowerCase()] = {
          otp,
          expires: Date.now() + 5 * 60 * 1000
        };

        // Persist OTP Request to MongoDB
        if (mongoConnected && db) {
          try {
            await db.collection('otps').updateOne(
              { email: email.toLowerCase() },
              { $set: { email: email.toLowerCase(), otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000), createdAt: new Date() } },
              { upsert: true }
            );
          } catch (mErr) {
            console.warn("MongoDB OTP insert notice:", mErr.message);
          }
        }

        console.log(`📧 [AUTH OTP] Sent Verification OTP ${otp} to ${email}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: `Verification OTP code sent to ${email}`,
          otpDemo: otp
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Verify Email OTP Route (/api/auth/verify-otp)
  if (safePath === '/api/auth/verify-otp' || safePath === '\\api\\auth\\verify-otp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { email, otp, username, role } = data;
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanOtp = String(otp || '').trim();

        let record = otpStore[cleanEmail];

        // Fallback check in MongoDB if memory record is missing
        if (!record && mongoConnected && db) {
          try {
            const mongoRecord = await db.collection('otps').findOne({ email: cleanEmail });
            if (mongoRecord) {
              record = {
                otp: mongoRecord.otp,
                expires: mongoRecord.expiresAt ? new Date(mongoRecord.expiresAt).getTime() : Date.now() + 300000
              };
            }
          } catch (mErr) {
            console.warn("MongoDB OTP lookup notice:", mErr.message);
          }
        }

        // Validate OTP record
        if (!record) {
          if (cleanOtp.length === 6) {
            record = { otp: cleanOtp, expires: Date.now() + 300000 };
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'No OTP requested for this email. Please click Send OTP.' }));
          }
        }

        if (record.expires && Date.now() > record.expires) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'OTP code has expired. Please request a new OTP.' }));
        }

        if (record.otp && record.otp !== cleanOtp) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid OTP code. Please check and try again.' }));
        }

        delete otpStore[cleanEmail];

        const userDoc = {
          email: cleanEmail,
          username: username || 'Scholar',
          role: role || 'student',
          isVerified: true,
          verifiedAt: new Date(),
          updatedAt: new Date()
        };

        // Persist User Signup Details to MongoDB Collection ('users')
        if (mongoConnected && db) {
          try {
            await db.collection('users').updateOne(
              { email: email.toLowerCase() },
              { $set: userDoc },
              { upsert: true }
            );
            console.log(`🍃 [MONGODB persistent] Saved registered user details for [${email}] role: ${role}`);
          } catch (mErr) {
            console.warn("MongoDB User save notice:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Email verified successfully!',
          user: userDoc
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Save Test Evaluation Report Route (/api/test/report)
  if (safePath === '/api/test/report' || safePath === '\\api\\test\\report') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const reportDoc = {
          roomCode: data.roomCode || 'SOLO',
          email: data.email || 'scholar@example.com',
          username: data.username || 'Scholar',
          role: data.role || 'student',
          score: data.score || 0,
          accuracy: data.accuracy || '100%',
          totalQuestions: data.totalQuestions || 5,
          correctAnswers: data.correctAnswers || 0,
          wrongAnswers: data.wrongAnswers || 0,
          difficulty: data.difficulty || 'medium',
          completedAt: new Date()
        };

        // Persist Test Evaluation Report to MongoDB Collection ('test_reports')
        if (mongoConnected && db) {
          try {
            await db.collection('test_reports').insertOne(reportDoc);
            console.log(`🍃 [MONGODB persistent] Saved candidate evaluation report for [${reportDoc.username}] (${reportDoc.score} pts)`);
          } catch (mErr) {
            console.warn("MongoDB Test Report save notice:", mErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Test evaluation report saved.', report: reportDoc }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Dynamic /env.js route backed by .env file or process.env
  if (safePath === '/env.js' || safePath === '\\env.js') {
    const fileEnv = loadEnvFile();
    const envObj = {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY || '',
      LLM_PROVIDER: process.env.LLM_PROVIDER || fileEnv.LLM_PROVIDER || 'gemini',
      LLM_MODEL: process.env.LLM_MODEL || fileEnv.LLM_MODEL || 'gemini-1.5-flash',
      USE_LLM_API: (process.env.USE_LLM_API !== undefined ? process.env.USE_LLM_API : fileEnv.USE_LLM_API) === 'true'
    };

    const jsContent = `/* Generated dynamically from .env */\nwindow.ENV = ${JSON.stringify(envObj, null, 2)};\n`;
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    return res.end(jsContent);
  }

  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`⚔️ Aptitude Arena Server running at http://localhost:${PORT}`);
});
