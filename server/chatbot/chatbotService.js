// chatbot/chatbotService.js

const { detectDepartment } = require('./departmentDetector');
const departmentService = require('../services/departmentService');
const Notice = require('../models/Notice');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const Syllabus = require('../models/Syllabus');
const FAQ = require('../models/FAQ');
const KnowledgeBase = require('../models/KnowledgeBase');
const Practical = require('../models/Practical');
const Assignment = require('../models/Assignment');
const Document = require('../models/Document');
const { generateAIResponse, generateCasualResponse } = require('../services/geminiService');
const { searchRelevantChunks } = require('../services/knowledgeRetrievalService');
const { hasEmbeddingApiKey } = require('../services/aiService');
const { containsPhrase } = require('../utils/text');

const INTENT_KEYWORDS = [
  ['HOD_LOOKUP', ['hod', 'h o d', 'h.o.d', 'h.o.d.', 'head of department', 'head of dept']],
  ['TIMETABLE', ['timetable', 'timetables', 'time table', 'time tables', 'class schedule', 'my schedule', 'my timetable', 'lecture schedule']],
  ['NOTICE', [
    'recent notices',
    'latest notices',
    'show recent notices',
    'show latest college notices',
    'what are the latest notices',
    'any new notices',
    'any new notice',
    'college notices',
    'notice',
    'notices',
    'circular',
    'circulars',
    'announcement',
    'announcements'
  ]],
  ['SYLLABUS', ['syllabus', 'syllabi', 'curriculum', 'course outline', 'my syllabus']],
  ['PRACTICAL', ['practical', 'practicals', 'my practical', 'my practicals', 'lab practical', 'lab practicals', 'lab practical', 'lab manual']],
  ['ASSIGNMENT', ['assignment', 'assignments', 'my assignment', 'my assignments', 'homework']],
  ['DOCUMENT', ['handbook', 'student handbook', 'documents', 'document', 'pdf', 'download form', 'guidelines document', 'prospectus', 'brochure']],
  ['FACULTY', ['faculty', 'faculties', 'professor', 'professors', 'teacher', 'teachers', 'who teaches', 'faculty directory', 'lecturer', 'lecturers']],
  ['FAQ', ['faq', 'faqs', 'frequently asked questions', 'college timing', 'college timings', 'opening time', 'closing time', 'admission procedure', 'hostel facility', 'canteen facility']],
];

function isGreeting(text) {
  const normalized = text.toLowerCase().trim();
  return [
    'hi',
    'hello',
    'hey',
    'hii',
    'hiii',
    'namaste',
    'good morning',
    'good afternoon',
    'good evening',
  ].some((greeting) => normalized === greeting);
}

function detectIntent(text) {
  const normalized = text.toLowerCase();

  for (const [intent, keywords] of INTENT_KEYWORDS) {
    if (keywords.some((keyword) => containsPhrase(normalized, keyword))) {
      return intent;
    }
  }

  return 'GENERAL_QUERY';
}

/**
 * College has ONLY 6 semesters (1 through 6).
 * Any semester > 6 is rejected and not matched.
 */
function detectSemester(text) {
  const normalized = text.toLowerCase();

  const numericPatterns = [
    /\b(?:semester|sem)\s*[-:]?\s*([1-6])\b/i,
    /\b([1-6])\s*(?:st|nd|rd|th)\s*semester\b/i,
  ];

  for (const pattern of numericPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  const wordSemesters = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
  };

  const wordPattern = /\b(first|second|third|fourth|fifth|sixth)\s*semester\b/i;
  const wordMatch = normalized.match(wordPattern);
  if (wordMatch) {
    return wordSemesters[wordMatch[1].toLowerCase()];
  }

  return null;
}

/**
 * There is NO SECTION system in this college application.
 * Returns null strictly.
 */
function detectSection() {
  return null;
}

async function askForDepartment(question) {
  const departments = await departmentService.getActiveDepartments();
  const choices = departments
    .filter((d) => d.code !== departmentService.ALL_CODE && !d.isAll)
    .map((d) => d.name)
    .join(', ');

  return {
    reply: `${question} Please specify the department (${choices}).`,
    department: departmentService.ALL_CODE,
    needsDepartment: true,
  };
}

function formatTimetable(rows, departmentCode, requestedSemester, dayFilter = null) {
  if (!rows || !rows.length) {
    return `I couldn't find a timetable for ${departmentCode}${requestedSemester ? ` Semester ${requestedSemester}` : ''}${dayFilter ? ` (${dayFilter})` : ''} in the college records yet. Please check with the college administration.`;
  }

  const dayMap = {
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
  };

  const lines = [
    `**${departmentCode} Timetable**${requestedSemester ? ` - Semester ${requestedSemester}` : ''}:`,
    '',
  ];

  for (const row of rows) {
    const dayName = dayMap[row.day] || row.day;
    lines.push(`### ${dayName}${!requestedSemester && row.semester ? ` (Semester ${row.semester})` : ''}`);

    if (!row.slots || row.slots.length === 0) {
      lines.push('_No class slots scheduled for this day._');
    } else {
      for (const slot of row.slots) {
        const timeStr = slot.time || 'Time TBD';
        const subjStr = slot.subject || 'Subject TBD';
        const facultyStr = slot.faculty?.name ? ` • *${slot.faculty.name}*` : '';
        const roomStr = slot.room ? ` [${slot.room}]` : '';

        lines.push(`- **${timeStr}**: ${subjStr}${facultyStr}${roomStr}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function formatNotices(notices, departmentCode) {
  if (!notices || !notices.length) {
    return 'No recent notices are currently available in the college records. Please check the college notice board or contact administration.';
  }

  const lines = [`**Recent Notices (${departmentCode})**:`, ''];

  notices.forEach((notice, index) => {
    const dateStr = notice.publishedAt || notice.createdAt
      ? new Date(notice.publishedAt || notice.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    lines.push(`**${index + 1}. ${notice.title}**`);
    if (notice.category || dateStr) {
      const meta = [notice.category, dateStr].filter(Boolean).join(' • ');
      lines.push(`_${meta}_`);
    }

    if (notice.body) {
      lines.push(notice.body);
    }
    if (notice.attachment?.url) {
      lines.push(`[${notice.attachment.originalName || 'Download attachment'}](${notice.attachment.url})`);
    }

    lines.push('');
  });

  return lines.join('\n').trim();
}

function formatSyllabus(rows, departmentCode, semester) {
  if (!rows || !rows.length) {
    return `No syllabus information is currently available for ${departmentCode}${semester ? ` Semester ${semester}` : ''} in the college records yet. Please check with the college administration.`;
  }

  const lines = [`**${departmentCode}${semester ? ` Semester ${semester}` : ''} Syllabus Details**:`, ''];

  for (const row of rows) {
    lines.push(`- **${row.subjectCode ? `${row.subjectCode} - ` : ''}${row.subjectName}** (Semester ${row.semester})`);

    if (row.topics && row.topics.length) {
      lines.push(`  - **Topics**: ${row.topics.join(', ')}`);
    }

    if (row.fileUrl) {
      lines.push(`  - **Syllabus Document**: [Download Syllabus](${row.fileUrl})`);
    }
  }

  return lines.join('\n').trim();
}

function formatPracticals(practicals, departmentCode, semester) {
  if (!practicals || !practicals.length) {
    return `I don't have any published practical information for your semester yet. Please check with the college administration.`;
  }

  const lines = [`**Published Practicals for ${departmentCode}${semester ? ` Semester ${semester}` : ''}**:`, ''];

  practicals.forEach((p, idx) => {
    lines.push(`${idx + 1}. **${p.title}** - ${p.subject}${p.subjectCode ? ` (${p.subjectCode})` : ''}`);

    if (p.dueDate) {
      const dateStr = new Date(p.dueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      lines.push(`   - **Date / Schedule**: ${dateStr}`);
    }

    if (p.totalMarks) {
      lines.push(`   - **Total Marks**: ${p.totalMarks}`);
    }

    if (p.instructions) {
      lines.push(`   - **Instructions**: ${p.instructions}`);
    }
    if (p.attachmentUrl) {
      lines.push(`   - [Download practical material](${p.attachmentUrl})`);
    }

    lines.push('');
  });

  return lines.join('\n').trim();
}

function formatAssignments(assignments, departmentCode, semester) {
  if (!assignments || !assignments.length) {
    return `No assignments are currently available for your semester in the college records.`;
  }

  const count = assignments.length;
  const lines = [
    `You currently have ${count} published assignment${count > 1 ? 's' : ''} for ${departmentCode}${semester ? ` Semester ${semester}` : ''}:`,
    '',
  ];

  assignments.forEach((a, idx) => {
    lines.push(`${idx + 1}. **${a.title}** - ${a.subject}${a.subjectCode ? ` (${a.subjectCode})` : ''}`);

    if (a.dueDate) {
      const dateStr = new Date(a.dueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      lines.push(`   - **Due Date**: ${dateStr}`);
    }

    if (a.totalMarks) {
      lines.push(`   - **Total Marks**: ${a.totalMarks}`);
    }

    if (a.instructions) {
      lines.push(`   - **Instructions**: ${a.instructions}`);
    }
    if (a.attachmentUrl) {
      lines.push(`   - [Download assignment material](${a.attachmentUrl})`);
    }

    lines.push('');
  });

  return lines.join('\n').trim();
}

function formatDocuments(docs, departmentCode) {
  if (!docs || !docs.length) {
    return `I don't have that document in the college records yet. Please check with the college administration.`;
  }

  const lines = [`**Available College Documents**:`, ''];

  docs.forEach((doc, idx) => {
    lines.push(`${idx + 1}. **${doc.title}**${doc.category ? ` (${doc.category})` : ''}`);
    if (doc.description) {
      lines.push(`   ${doc.description}`);
    }
    if (doc.fileUrl) {
      lines.push(`   - [Download Document](${doc.fileUrl})`);
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}

function sourceFromRecord(record, category, title, url) {
  const source = {
    title: title || record.title || record.question || 'College information',
    category: category || record.category || '',
    department: record.department || departmentService.ALL_CODE,
    uploadedAt: record.publishedAt || record.uploadedAt || record.createdAt || record.updatedAt || null,
  };
  const sourceUrl = url || record.fileUrl || record.attachment?.url || record.attachmentUrl;
  if (sourceUrl) source.url = sourceUrl;
  return source;
}

function asksForDocumentContent(message) {
  const asksForList = /\b(list|available|show|download|all|latest|recent)\b.*\b(pdf|documents?|handbooks?)\b/i.test(message);
  return !asksForList &&
    /\b(what|when|where|who|how|explain|summari[sz]e|tell me|does|do|is|are)\b/i.test(message) &&
    /\b(pdf|document|handbook|guidelines?|rules?|calendar|scholarship|admission|syllabus|examination|notice)\b/i.test(message);
}

/**
 * Checks if a question is college-specific.
 */
function isCollegeSpecific(message, detectedDept, intent, history = []) {
  if (intent !== 'GENERAL_QUERY') {
    return true;
  }

  if (detectedDept && detectedDept !== departmentService.ALL_CODE) {
    return true;
  }

  const lower = message.toLowerCase();

  const collegeKeywords = [
    'college', 'campus', 'polytechnic', 'unnao', 'gpunnao', 'principal', 'hod',
    'head of department', 'faculty', 'professor', 'teacher', 'teachers', 'sir',
    'madam', 'timetable', 'time table', 'schedule', 'class', 'classes', 'lecture',
    'lectures', 'syllabus', 'notices', 'notice', 'circular', 'practical', 'practicals',
    'lab', 'assignment', 'assignments', 'homework', 'semester', 'admissions',
    'admission', 'fee', 'fees', 'hostel', 'canteen', 'mess', 'library', 'holiday',
    'holidays', 'vacation', 'datesheet', 'exam', 'exams', 'examination', 'back paper',
    'attendance', 'handbook', 'bonafide', 'scholarship', 'scholarships',
    'who teaches', 'cse', 'electronics', 'mechanical', 'my department', 'my semester',
    'my roll number', 'my profile', 'my practicals', 'my assignments', 'my timetable'
  ];

  if (collegeKeywords.some((kw) => containsPhrase(lower, kw))) {
    return true;
  }

  // Follow-up context check
  if (history && history.length > 0) {
    const isFollowUpPronoun = /\b(he|she|his|her|they|their|him)\b/i.test(lower) ||
      /\bwhat (?:subjects?|classes?|courses?) does (?:he|she)\b/i.test(lower) ||
      /\bwhere is (?:his|her) (?:office|room)\b/i.test(lower);

    const isFollowUpSchedule = /\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(lower);

    if (isFollowUpPronoun || isFollowUpSchedule) {
      return true;
    }
  }

  return false;
}

/**
 * Handles student self-profile inquiries.
 */
function handleStudentProfileQuery(message, studentContext) {
  const lower = message.toLowerCase();

  const isSemester = /\b(?:what|which)\s+semester\b/i.test(lower) ||
    containsPhrase(lower, 'my semester');

  const isDept = /\b(?:what|which)\s+(?:department|branch)\b/i.test(lower) ||
    containsPhrase(lower, 'my department') ||
    containsPhrase(lower, 'my branch');

  const isRoll = /\b(?:what|which)\s+(?:roll number|roll no)\b/i.test(lower) ||
    containsPhrase(lower, 'my roll number') ||
    containsPhrase(lower, 'my roll no');

  const isWhoAmI = containsPhrase(lower, 'who am i') ||
    containsPhrase(lower, 'my profile') ||
    containsPhrase(lower, 'show my profile') ||
    containsPhrase(lower, 'my details');

  if (isSemester) {
    if (studentContext?.semester) {
      return `You are currently enrolled in **Semester ${studentContext.semester}**${studentContext.department ? ` (${studentContext.department})` : ''}.`;
    }
    return 'Your semester is not recorded in your profile yet. Please update your profile in settings.';
  }

  if (isDept) {
    if (studentContext?.department) {
      return `Your department is **${studentContext.department}** (Government Polytechnic Unnao).`;
    }
    return 'Your department is not recorded in your profile yet. Please update your profile in settings.';
  }

  if (isRoll) {
    if (studentContext?.rollNumber) {
      return `Your registered roll number is **${studentContext.rollNumber}**.`;
    }
    return 'Your roll number is not recorded in your profile yet. Please update your profile in settings.';
  }

  if (isWhoAmI) {
    return [
      `**Student Profile Information**:`,
      `- **Name**: ${studentContext?.name || 'Student'}`,
      `- **Department**: ${studentContext?.department || 'Not specified'}`,
      `- **Semester**: ${studentContext?.semester ? `Semester ${studentContext.semester}` : 'Not specified'}`,
      `- **Roll Number**: ${studentContext?.rollNumber || 'Not specified'}`,
      `- **Institution**: Government Polytechnic Unnao`,
    ].join('\n');
  }

  return null;
}

/**
 * Resolve pronoun follow-up references using conversation history.
 */
async function handlePronounFollowUp(message, history, departmentCode) {
  const lower = message.toLowerCase();

  // Search backwards in history for a faculty or HOD reference
  let mentionedFaculty = null;
  let mentionedDept = departmentCode;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const content = msg.content || '';

    // Check if previous message mentioned HOD
    const hodMatch = content.match(/Head of Department for ([A-Z]+)[^:]*:\s*([A-Za-z\s.]+)/i) ||
      content.match(/(?:HOD is|HOD:)\s*([A-Za-z\s.]+)/i);

    if (hodMatch) {
      mentionedFaculty = hodMatch[2].replace(/\(.*?\)/g, '').trim();
      if (hodMatch[1]) mentionedDept = hodMatch[1].trim().toUpperCase();
      break;
    }

    // Check if previous message was about HOD lookup
    if (/HOD/i.test(content) && mentionedDept) {
      const hodDoc = await Faculty.findOne({ department: mentionedDept, isHOD: true });
      if (hodDoc) {
        mentionedFaculty = hodDoc.name;
        break;
      }
    }
  }

  if (!mentionedFaculty && mentionedDept) {
    const hodDoc = await Faculty.findOne({ department: mentionedDept, isHOD: true });
    if (hodDoc) {
      mentionedFaculty = hodDoc.name;
    }
  }

  if (!mentionedFaculty) {
    return null;
  }

  // If asking "What subjects does he teach?"
  if (/\b(?:what|which)\s+(?:subjects?|courses?|classes?)\s+does\s+(?:he|she)\s+teach\b/i.test(lower) ||
      /\bwhat does (?:he|she) teach\b/i.test(lower)) {
    const facultyDoc = await Faculty.findOne({
      $or: [
        { name: new RegExp(mentionedFaculty.replace(/Dr\.\s*/i, ''), 'i') },
        { department: mentionedDept, isHOD: true },
      ],
    });

    if (facultyDoc) {
      const timetableSlots = await Timetable.find({
        'slots.faculty': facultyDoc._id,
      }).select('slots semester day department');

      const subjects = new Set();
      for (const t of timetableSlots) {
        for (const slot of t.slots || []) {
          if (slot.faculty?.toString() === facultyDoc._id.toString() && slot.subject) {
            subjects.add(slot.subject);
          }
        }
      }

      if (subjects.size > 0) {
        return `${facultyDoc.name} teaches **${Array.from(subjects).join(', ')}** in the ${facultyDoc.department} department according to the timetable records.`;
      }

      return `According to the college records, ${facultyDoc.name} is the Head of Department for ${facultyDoc.department}, but no specific teaching slots are listed for them in the current timetable yet. Please check with the department administration.`;
    }
  }

  // If asking about their office / contact
  if (/\bwhere is (?:his|her) office\b/i.test(lower) || /\b(?:his|her) (?:email|phone|contact)\b/i.test(lower)) {
    const facultyDoc = await Faculty.findOne({
      $or: [
        { name: new RegExp(mentionedFaculty.replace(/Dr\.\s*/i, ''), 'i') },
        { department: mentionedDept, isHOD: true },
      ],
    });

    if (facultyDoc) {
      const parts = [`Contact information for **${facultyDoc.name}** (${facultyDoc.department}):`];
      if (facultyDoc.designation) parts.push(`- **Designation**: ${facultyDoc.designation}`);
      if (facultyDoc.office) parts.push(`- **Office**: ${facultyDoc.office}`);
      if (facultyDoc.email) parts.push(`- **Email**: ${facultyDoc.email}`);
      if (facultyDoc.phone) parts.push(`- **Phone**: ${facultyDoc.phone}`);

      if (parts.length === 1) {
        return `I don't have office or contact details for ${facultyDoc.name} in the college records yet. Please check with the department administration.`;
      }
      return parts.join('\n');
    }
  }

  return null;
}

/**
 * Main chatbot handler.
 */
async function handleMessage(message, studentContext = null, conversationHistory = []) {
  // 1. Greetings
  if (isGreeting(message)) {
    const studentName = studentContext?.name;
    return {
      reply: studentName
        ? `Welcome back, ${studentName}. I am your College AI Assistant for Government Polytechnic Unnao. How can I help you today?`
        : 'Welcome to Government Polytechnic Unnao. I am your College AI Assistant. How can I help you today?',
      department: studentContext?.department || departmentService.ALL_CODE,
    };
  }

  // 2. Student self-profile questions
  const profileAnswer = handleStudentProfileQuery(message, studentContext);
  if (profileAnswer) {
    return {
      reply: profileAnswer,
      department: studentContext?.department || departmentService.ALL_CODE,
    };
  }

  // 3. Department detection
  const detectedDepartment = await detectDepartment(message);
  const departmentCode =
    detectedDepartment && detectedDepartment !== departmentService.ALL_CODE
      ? detectedDepartment
      : studentContext?.department || null;

  // 4. Intent detection
  let intent = detectIntent(message);

  // 5. Follow-up intent recovery
  if (intent === 'GENERAL_QUERY' && conversationHistory && conversationHistory.length > 0) {
    const lastUserMsg = [...conversationHistory].reverse().find((m) => m.role === 'user')?.content || '';
    const lastIntent = detectIntent(lastUserMsg);

    // If follow-up mentions schedule or day ("What about tomorrow?", "What about Friday?")
    if (/\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(message) &&
        (lastIntent === 'TIMETABLE' || /timetable/i.test(lastUserMsg))) {
      intent = 'TIMETABLE';
    }
  }

  // 6. Check if query is college-specific
  const isCollege = isCollegeSpecific(message, detectedDepartment, intent, conversationHistory);

  // -------------------------------------------------------------
  // NON-COLLEGE / GENERAL QUESTION → GEMINI DIRECTLY
  // -------------------------------------------------------------
  if (!isCollege) {
    const aiReply = await generateCasualResponse(message, studentContext, conversationHistory);

    return {
      reply: aiReply,
      department: departmentCode || departmentService.ALL_CODE,
    };
  }

  // -------------------------------------------------------------
  // COLLEGE-SPECIFIC QUESTION → VERIFIED RECORDS AND DOCUMENT RETRIEVAL
  // -------------------------------------------------------------
  try {
  const filter = departmentService.buildVisibilityFilter(departmentCode);
  const activeNoticeFilter = {
    ...filter,
    $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }],
  };

  const explicitDocumentQuestion = asksForDocumentContent(message);
  const shouldSearchPdfKnowledge = hasEmbeddingApiKey && (
    intent === 'GENERAL_QUERY' || intent === 'FAQ' || explicitDocumentQuestion
  );
  if (shouldSearchPdfKnowledge) {
    try {
      const retrievedChunks = await searchRelevantChunks(message, departmentCode);
      if (retrievedChunks.length) {
        const context = retrievedChunks
          .map((chunk) => `[Source: ${chunk.source.title}]\n${chunk.content}`)
          .join('\n\n');
        const reply = await generateAIResponse(message, context, studentContext, {
          isCollegeQuery: true,
          conversationHistory,
        });
        return {
          reply,
          department: departmentCode || departmentService.ALL_CODE,
          sources: [...new Map(retrievedChunks.map((chunk) => [`${chunk.source.title}|${chunk.source.url}`, chunk.source])).values()],
        };
      }
    } catch (error) {
      console.warn('PDF knowledge retrieval failed; continuing with database records.', {
        name: error?.name || 'Error',
      });
    }
  }

  if (explicitDocumentQuestion) {
    return {
      reply: 'I could not find relevant text in the uploaded college documents. Please contact the college administration for this information.',
      department: departmentCode || departmentService.ALL_CODE,
      sources: [],
    };
  }

  // Check for pronoun follow-up
  if (conversationHistory && conversationHistory.length > 0) {
    const pronounAnswer = await handlePronounFollowUp(message, conversationHistory, departmentCode);
    if (pronounAnswer) {
      return {
          reply: pronounAnswer,
          department: departmentCode || departmentService.ALL_CODE,
          sources: [],
      };
    }
  }

  switch (intent) {
    // -----------------------------------------------------------
    // 1. HOD LOOKUP
    // -----------------------------------------------------------
    case 'HOD_LOOKUP': {
      if (!departmentCode) {
        return askForDepartment("Which department's HOD would you like to know?");
      }

      const hod = await Faculty.findOne({
        department: departmentCode,
        isHOD: true,
      });

      if (!hod) {
        return {
          reply: `I don't have the ${departmentCode} HOD information in the college records yet. Please check with the college administration.`,
          department: departmentCode,
        };
      }

      const qualificationStr = hod.qualification ? ` (${hod.qualification})` : '';
      const officeStr = hod.office ? `, Office: ${hod.office}` : '';
      const emailStr = hod.email ? `, Email: ${hod.email}` : '';

      return {
        reply: `The Head of Department for ${departmentCode} is **${hod.name}**${qualificationStr}${officeStr}${emailStr}.`,
        department: departmentCode,
        sources: [sourceFromRecord(hod, 'faculty', `${hod.department} Faculty Directory`)],
      };
    }

    // -----------------------------------------------------------
    // 2. TIMETABLE
    // -----------------------------------------------------------
    case 'TIMETABLE': {
      if (!departmentCode) {
        return askForDepartment('Which department timetable would you like to view?');
      }

      const requestedSemester = detectSemester(message) || studentContext?.semester || null;
      const timetableFilter = {
        department: departmentCode,
      };

      if (requestedSemester) {
        timetableFilter.semester = requestedSemester;
      }

      // Check for day filters ("tomorrow", "today", "Monday", etc.)
      const lower = message.toLowerCase();
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      let targetDay = null;

      if (lower.includes('tomorrow')) {
        const tomorrowIdx = (new Date().getDay() + 1) % 7;
        targetDay = days[tomorrowIdx];
        if (targetDay === 'SUN') {
          return {
            reply: `Tomorrow is Sunday, which is a college holiday with no classes scheduled.`,
            department: departmentCode,
          };
        }
      } else if (lower.includes('today')) {
        const todayIdx = new Date().getDay();
        targetDay = days[todayIdx];
        if (targetDay === 'SUN') {
          return {
            reply: `Today is Sunday, which is a college holiday with no classes scheduled.`,
            department: departmentCode,
          };
        }
      } else {
        const dayMatch = lower.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b/i);
        if (dayMatch) {
          const map = {
            mon: 'MON', monday: 'MON',
            tue: 'TUE', tuesday: 'TUE',
            wed: 'WED', wednesday: 'WED',
            thu: 'THU', thursday: 'THU',
            fri: 'FRI', friday: 'FRI',
            sat: 'SAT', saturday: 'SAT',
          };
          targetDay = map[dayMatch[1].toLowerCase()];
        }
      }

      if (targetDay) {
        timetableFilter.day = targetDay;
      }

      const rows = await Timetable.find(timetableFilter)
        .populate('slots.faculty', 'name designation')
        .sort({ semester: 1, day: 1 })
        .limit(10);

      return {
        reply: formatTimetable(rows, departmentCode, requestedSemester, targetDay),
        department: departmentCode,
        sources: rows.map((row) => sourceFromRecord(row, 'timetable', `${row.department} Semester ${row.semester} Timetable`)),
      };
    }

    // -----------------------------------------------------------
    // 3. NOTICE
    // -----------------------------------------------------------
    case 'NOTICE': {
      const notices = await Notice.find(activeNoticeFilter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(5);

      return {
        reply: formatNotices(notices, departmentCode || departmentService.ALL_CODE),
        department: departmentCode || departmentService.ALL_CODE,
        sources: notices.map((notice) => sourceFromRecord(notice, 'notice', notice.title)),
      };
    }

    // -----------------------------------------------------------
    // 4. SYLLABUS
    // -----------------------------------------------------------
    case 'SYLLABUS': {
      if (!departmentCode) {
        return askForDepartment("Which department's syllabus would you like to view?");
      }

      const requestedSemester = detectSemester(message) || studentContext?.semester || null;
      const syllabusFilter = {
        department: departmentCode,
      };

      if (requestedSemester) {
        syllabusFilter.semester = requestedSemester;
      }

      const rows = await Syllabus.find(syllabusFilter).sort({
        semester: 1,
        subjectCode: 1,
      });

      return {
        reply: formatSyllabus(rows, departmentCode, requestedSemester),
        department: departmentCode,
        sources: rows.map((row) => sourceFromRecord(row, 'syllabus', `${row.subjectName} Syllabus`, row.fileUrl)),
      };
    }

    // -----------------------------------------------------------
    // 5. PRACTICAL
    // -----------------------------------------------------------
    case 'PRACTICAL': {
      const studentDept = departmentCode || studentContext?.department;
      if (!studentDept) {
        return askForDepartment('Which department practicals are you looking for?');
      }

      const requestedSemester = detectSemester(message) || studentContext?.semester;
      const practicalFilter = {
        department: { $in: [studentDept, 'ALL'] },
        status: 'published',
      };

      if (requestedSemester) {
        practicalFilter.semester = requestedSemester;
      }

      const practicals = await Practical.find(practicalFilter)
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(10);

      return {
        reply: formatPracticals(practicals, studentDept, requestedSemester),
        department: studentDept,
        sources: practicals.map((record) => sourceFromRecord(record, 'practical', record.title)),
      };
    }

    // -----------------------------------------------------------
    // 6. ASSIGNMENT
    // -----------------------------------------------------------
    case 'ASSIGNMENT': {
      const studentDept = departmentCode || studentContext?.department;
      if (!studentDept) {
        return askForDepartment('Which department assignments are you looking for?');
      }

      const requestedSemester = detectSemester(message) || studentContext?.semester;
      const assignmentFilter = {
        department: { $in: [studentDept, 'ALL'] },
        status: 'published',
      };

      if (requestedSemester) {
        assignmentFilter.semester = requestedSemester;
      }

      const assignments = await Assignment.find(assignmentFilter)
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(10);

      return {
        reply: formatAssignments(assignments, studentDept, requestedSemester),
        department: studentDept,
        sources: assignments.map((record) => sourceFromRecord(record, 'assignment', record.title)),
      };
    }

    // -----------------------------------------------------------
    // 7. FACULTY & TEACHERS
    // -----------------------------------------------------------
    case 'FACULTY': {
      const studentDept = departmentCode || studentContext?.department;

      // Check if user is asking who teaches a specific subject (e.g., "Who teaches Data Structures?")
      const lower = message.toLowerCase();
      const subjectMatch = lower.match(/(?:who teaches|who is teaching|teacher for|faculty for)\s+([^?.,]+)/i);

      if (subjectMatch && subjectMatch[1]) {
        const querySubj = subjectMatch[1].trim();
        const subjectFilter = { 'slots.subject': new RegExp(querySubj, 'i') };
        if (studentDept) subjectFilter.department = studentDept;
        const timetableMatch = await Timetable.findOne(subjectFilter).populate('slots.faculty', 'name designation');

        if (timetableMatch && timetableMatch.slots) {
          const matchingSlot = timetableMatch.slots.find(
            (s) => s.subject && new RegExp(querySubj, 'i').test(s.subject)
          );

          if (matchingSlot && matchingSlot.faculty?.name) {
            return {
              reply: `According to the college timetable records, **${matchingSlot.subject}** is taught by **${matchingSlot.faculty.name}**${matchingSlot.faculty.designation ? ` (${matchingSlot.faculty.designation})` : ''}.`,
              department: timetableMatch.department || studentDept,
              sources: [sourceFromRecord(timetableMatch, 'timetable', `${timetableMatch.department} Semester ${timetableMatch.semester} Timetable`)],
            };
          }
        }

        return {
          reply: `I don't have teaching assignment records for "${querySubj}" in the college database yet. Please check with the department administration.`,
          department: studentDept || departmentService.ALL_CODE,
        };
      }

      // General faculty list query
      if (!studentDept) {
        return askForDepartment('Which department faculty would you like to view?');
      }

      const facultyList = await Faculty.find({ department: studentDept })
        .sort({ isHOD: -1, name: 1 })
        .limit(10);

      if (!facultyList || !facultyList.length) {
        return {
          reply: `I don't have faculty records for the ${studentDept} department in the college database yet. Please check with the college administration.`,
          department: studentDept,
        };
      }

      const lines = [`**Faculty Directory for ${studentDept}**:`, ''];
      facultyList.forEach((f, idx) => {
        lines.push(`${idx + 1}. **${f.name}**${f.isHOD ? ' *(HOD)*' : ''}${f.designation ? ` - ${f.designation}` : ''}`);
        if (f.office) lines.push(`   - **Office**: ${f.office}`);
        if (f.email) lines.push(`   - **Email**: ${f.email}`);
      });

      return {
        reply: lines.join('\n'),
        department: studentDept,
        sources: facultyList.map((record) => sourceFromRecord(record, 'faculty', `${record.department} Faculty Directory`)),
      };
    }

    // -----------------------------------------------------------
    // 8. DOCUMENTS
    // -----------------------------------------------------------
    case 'DOCUMENT': {
      const studentDept = departmentCode || studentContext?.department || 'ALL';
      const docs = await Document.find({
        department: { $in: [studentDept, 'ALL'] },
      }).sort({ createdAt: -1 }).limit(5);

      return {
        reply: formatDocuments(docs, studentDept),
        department: studentDept,
        sources: docs.map((doc) => sourceFromRecord(doc, 'document', doc.title)),
      };
    }

    // -----------------------------------------------------------
    // 9. FAQ / POLICIES / HOLIDAYS / COLLEGE GENERAL
    // -----------------------------------------------------------
    default: {
      const lower = message.toLowerCase();

      // Holiday inquiries
      if (lower.includes('holiday') || lower.includes('vacation')) {
        const holidayNotices = await Notice.find({
          ...activeNoticeFilter,
          $and: [
            ...activeNoticeFilter.$and,
            { $or: [{ title: /holiday|vacation/i }, { body: /holiday|vacation/i }] },
          ],
        }).sort({ publishedAt: -1, createdAt: -1 }).limit(2);

        const holidayKb = await KnowledgeBase.find({
          ...filter,
          $or: [
            { title: /holiday|calendar|vacation/i },
            { content: /holiday|calendar|vacation/i },
            { keywords: /holiday/i },
          ],
        }).limit(2);

        if (holidayNotices.length > 0 || holidayKb.length > 0) {
          const records = [];
          holidayNotices.forEach((n) => records.push(`Notice: ${n.title} - ${n.body || ''}`));
          holidayKb.forEach((k) => records.push(`${k.title}: ${k.content}`));

          const aiReply = await generateAIResponse(
            message,
            records.join('\n\n'),
            studentContext,
            { isCollegeQuery: true, conversationHistory }
          );

          return {
            reply: aiReply,
            department: departmentCode || departmentService.ALL_CODE,
            sources: [
              ...holidayNotices.map((record) => sourceFromRecord(record, 'notice', record.title)),
              ...holidayKb.map((record) => sourceFromRecord(record, 'knowledge-base', record.title)),
            ],
          };
        }

        // NO holiday data exists -> DO NOT INVENT!
        return {
          reply: `I don't have current holiday information in the college records. Please check with the college administration for the latest update.`,
          department: departmentCode || departmentService.ALL_CODE,
        };
      }

      // General college policy / FAQ lookups
      let faqs = [];
      let kb = [];

      try {
        faqs = await FAQ.find({
          ...filter,
          $text: { $search: message },
        }).limit(3);
      } catch {
        faqs = await FAQ.find({
          ...filter,
          question: new RegExp(message.slice(0, 30), 'i'),
        }).limit(3);
      }

      try {
        kb = await KnowledgeBase.find({
          ...filter,
          $text: { $search: message },
        }).limit(3);
      } catch {
        kb = await KnowledgeBase.find({
          ...filter,
          title: new RegExp(message.slice(0, 30), 'i'),
        }).limit(3);
      }

      const hasCollegeData = (faqs && faqs.length > 0) || (kb && kb.length > 0);

      // If database has NO records for this college question:
      // STRICT RULE #4: DO NOT GUESS OR HALLUCINATE!
      if (!hasCollegeData) {
        return {
          reply: /\bfees?\b/i.test(message)
            ? "I don't have the official fee information available right now. Please check with the college administration."
            : `I don't have that information in the college records yet. Please check with the college administration for the latest information.`,
          department: departmentCode || departmentService.ALL_CODE,
        };
      }

      // Database has relevant records -> Ground Gemini response strictly in retrieved records
      const contextParts = [];
      if (faqs && faqs.length) {
        contextParts.push(`FAQs:\n${faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`);
      }
      if (kb && kb.length) {
        contextParts.push(`Knowledge Base:\n${kb.map((k) => `${k.title}: ${k.content}`).join('\n\n')}`);
      }
      const aiReply = await generateAIResponse(
        message,
        contextParts.join('\n\n'),
        studentContext,
        { isCollegeQuery: true, conversationHistory }
      );

      return {
        reply: aiReply,
        department: departmentCode || departmentService.ALL_CODE,
        sources: [
          ...faqs.map((record) => sourceFromRecord(record, 'faq', record.question)),
          ...kb.map((record) => sourceFromRecord(record, 'knowledge-base', record.title)),
        ],
      };
    }
  }
  } catch (error) {
    if (error?.isGeminiError || error?.isAIProviderError) throw error;

    console.error('College information lookup failed', { name: error?.name || 'Error' });
    return {
      reply: 'College information is temporarily unavailable. Please try again shortly or contact the college administration.',
      department: departmentCode || departmentService.ALL_CODE,
    };
  }
}

module.exports = {
  handleMessage,
  detectIntent,
  detectSemester,
  detectSection,
};
