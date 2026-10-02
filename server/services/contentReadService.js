const mongoose = require('mongoose');
const ContentRead = require('../models/ContentRead');
const Notice = require('../models/Notice');
const Assignment = require('../models/Assignment');
const Practical = require('../models/Practical');
const noticeService = require('./noticeService');
const ApiError = require('../utils/ApiError');

const CONTENT = {
  notice: Notice,
  assignment: Assignment,
  practical: Practical,
};

function visibleFilter(contentType, user) {
  if (contentType === 'notice') {
    return noticeService.buildNoticeFilter(user);
  }

  if (user?.role !== 'student') return {};
  if (!user.department || !user.semester) return null;

  return {
    department: { $in: [user.department.toUpperCase(), 'ALL'] },
    semester: Number(user.semester),
    status: 'published',
  };
}

async function countUnread(contentType, userId, filter) {
  if (!filter) return 0;
  const readIds = await ContentRead.distinct('contentId', { userId, contentType });
  return CONTENT[contentType].countDocuments({
    $and: [filter, { _id: { $nin: readIds } }],
  });
}

async function getUnreadCounts(user) {
  const entries = await Promise.all(
    Object.keys(CONTENT).map(async (contentType) => [
      contentType === 'notice' ? 'notices' : `${contentType}s`,
      await countUnread(contentType, user._id, visibleFilter(contentType, user)),
    ])
  );
  return Object.fromEntries(entries);
}

async function markRead(user, contentType, contentId) {
  if (!CONTENT[contentType]) throw new ApiError(400, 'Unsupported content type.');
  if (!mongoose.Types.ObjectId.isValid(contentId)) throw new ApiError(400, 'Invalid content id.');

  const filter = visibleFilter(contentType, user);
  const item = filter
    ? await CONTENT[contentType].exists({ $and: [{ _id: contentId }, filter] })
    : null;
  if (!item) throw new ApiError(404, 'Content not found.');

  const key = { userId: user._id, contentType, contentId };
  const existing = await ContentRead.exists(key);
  if (existing) return { alreadyRead: true };

  try {
    await ContentRead.create({ ...key, readAt: new Date() });
    return { alreadyRead: false };
  } catch (error) {
    // Concurrent clicks may race to create the same unique user/content row.
    if (error?.code === 11000 && await ContentRead.exists(key)) {
      return { alreadyRead: true };
    }
    throw error;
  }
}

module.exports = { getUnreadCounts, markRead };
