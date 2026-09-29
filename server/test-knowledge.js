const http = require('http');

const data = JSON.stringify({
  title: 'CSE Department',
  content:
    'The Computer Science and Engineering CSE department provides academic information related to CSE students, including subjects, timetable, faculty, syllabus, notices, examinations, and other department-related activities.',
  keywords: [
    'CSE',
    'Computer Science',
    'department',
    'subjects',
    'timetable',
    'faculty',
    'syllabus',
    'examination'
  ],
  department: 'CSE'
});

const req = http.request(
  'http://localhost:5000/api/knowledge',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.TOKEN
    }
  },
  (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log(`Knowledge API response received (${res.statusCode}).`);
    });
  }
);

req.on('error', (error) => {
  console.error('Knowledge API request failed', { name: error?.name || 'Error', code: error?.code || 'unknown' });
});

req.write(data);
req.end();
