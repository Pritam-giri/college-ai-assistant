const TIME_ZONE = 'Asia/Kolkata';

function indiaDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

function relativeIndiaDate(offset, now = new Date()) {
  const { year, month, day } = indiaDateParts(now);
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatDate(parts, locale) {
  // Use the calculated India-local calendar date, rather than converting a UTC
  // timestamp that could fall on a different local day.
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)));
}

function resolveDateTimeQuestion(message, now = new Date()) {
  const text = String(message || '').trim().toLowerCase();
  const hindiScript = /[\u0900-\u097f]/.test(text);
  const hinglish = !hindiScript && /\b(aaj|ajj|abhi|samay|waqt|kal|tarikh|tareekh|baje)\b/i.test(text);
  const locale = hindiScript ? 'hi-IN' : 'en-IN';
  const dateTerm = /\b(date|tarikh|tareekh)\b|तारीख/.test(text);
  const timeTerm = /\b(time|current time|what time|kitna time|samay|waqt|abhi|baje)\b|समय|वक्त|बजे/.test(text);

  if (timeTerm && (dateTerm || /\b(now|current time|what time|kitna time|abhi)\b|अभी|इस समय/.test(text))) {
    const time = new Intl.DateTimeFormat(locale, {
      timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(now);
    return hindiScript
      ? `अभी भारत में ${time} बजे हैं।`
      : hinglish ? `Abhi India time ${time} hai.` : `The current time in India is ${time}.`;
  }

  let offset = 0;
  let label = 'today';
  if (/\byesterday\b|\bbeete(?:\s+huye)?\s+kal\b|कल\s*(?:की\s*)?तारीख\s*(?:थी|थी\?)/.test(text) ||
      (/\bkal\b/.test(text) && /\b(thi|thii|tha|hua tha|date thi)\b/.test(text))) {
    offset = -1;
    label = 'yesterday';
  } else if (/\btomorrow\b|\baane\s+wala\s+kal\b|कल\s*(?:की\s*)?तारीख\s*(?:होगी|है\?)/.test(text) ||
      (/\bkal\b/.test(text) && /\b(hogi|hoga|will be|aayegi)\b/.test(text))) {
    offset = 1;
    label = 'tomorrow';
  } else if (!/\btoday\b|\btoday's\b|\baaj\b|\bajj\b|आज|आज की|आजकि/.test(text)) {
    // A bare “kal” is ambiguous in Hindi; leave it to the normal chat flow.
    return null;
  }
  if (!dateTerm) return null;

  const date = formatDate(relativeIndiaDate(offset, now), locale);
  if (hindiScript) {
    const hindiLabel = label === 'yesterday' ? 'कल' : label === 'tomorrow' ? 'कल' : 'आज';
    return `${hindiLabel} की तारीख ${date} है।`;
  }
  if (hinglish) {
    const hinglishLabel = label === 'yesterday' ? 'Kal' : label === 'tomorrow' ? 'Aane wale kal' : 'Aaj';
    return `${hinglishLabel} ki date ${date} hai.`;
  }
  const englishLabel = label === 'yesterday' ? 'Yesterday was' : label === 'tomorrow' ? 'Tomorrow is' : 'Today is';
  return `${englishLabel} ${date}.`;
}

module.exports = { TIME_ZONE, indiaDateParts, relativeIndiaDate, resolveDateTimeQuestion };
