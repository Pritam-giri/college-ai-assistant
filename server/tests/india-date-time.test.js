const test = require('node:test');
const assert = require('node:assert/strict');
const { TIME_ZONE, indiaDateParts, relativeIndiaDate, resolveDateTimeQuestion } = require('../utils/indiaDateTime');

test('date/time answers use Asia/Kolkata calendar and clock', () => {
  // This instant is still the previous day in UTC but already the next day in India.
  const now = new Date('2026-09-29T22:30:00.000Z');
  assert.equal(TIME_ZONE, 'Asia/Kolkata');
  assert.deepEqual(indiaDateParts(now), { year: 2026, month: 9, day: 30 });
  assert.deepEqual(relativeIndiaDate(-1, now), { year: 2026, month: 9, day: 29 });
  assert.deepEqual(relativeIndiaDate(1, now), { year: 2026, month: 10, day: 1 });
  assert.equal(resolveDateTimeQuestion('ajj ki date', now), 'Aaj ki date 30 September 2026 hai.');
  assert.equal(resolveDateTimeQuestion('आज की तारीख', now), 'आज की तारीख 30 सितंबर 2026 है।');
  assert.equal(resolveDateTimeQuestion("what is today's date?", now), 'Today is 30 September 2026.');
  assert.equal(resolveDateTimeQuestion("what was yesterday's date?", now), 'Yesterday was 29 September 2026.');
  assert.equal(resolveDateTimeQuestion("what is tomorrow's date?", now), 'Tomorrow is 1 October 2026.');
  assert.equal(resolveDateTimeQuestion('kal kya date thi?', now), 'Kal ki date 29 September 2026 hai.');
  assert.equal(resolveDateTimeQuestion('kal kya date hogi?', now), 'Aane wale kal ki date 1 October 2026 hai.');
});

test('current time is computed at request time in India', () => {
  const now = new Date('2026-09-30T10:05:00.000Z');
  assert.equal(resolveDateTimeQuestion('abhi kitna time hua hai?', now), 'Abhi India time 3:35 pm hai.');
  assert.equal(resolveDateTimeQuestion('what is the current time?', now), 'The current time in India is 3:35 pm.');
});

test('ambiguous bare Hindi kal is left to normal chat handling', () => {
  assert.equal(resolveDateTimeQuestion('kal ki date'), null);
});
