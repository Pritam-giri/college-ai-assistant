const User = require('../models/User');
const Notification = require('../models/Notification');

function buildRecipientFilter({ department = 'ALL', semester = 'ALL' } = {}) {
  const filter = { role: 'student', active: true };
  const targetDepartment = String(department || 'ALL').trim().toUpperCase();
  if (targetDepartment !== 'ALL') filter.department = targetDepartment;

  const targetSemester = String(semester ?? 'ALL').trim().toUpperCase();
  if (targetSemester !== 'ALL') filter.semester = Number(targetSemester);
  return filter;
}

async function createNotificationsForTarget({
  department,
  semester,
  type,
  title,
  message = '',
  referenceId,
  referenceType = type,
}) {
  const recipients = await User.find(buildRecipientFilter({ department, semester }))
    .select('_id')
    .lean();
  if (!recipients.length) return 0;

  const operations = recipients.map(({ _id }) => ({
    updateOne: {
      filter: { recipient: _id, referenceType, referenceId },
      update: {
        $setOnInsert: {
          recipient: _id,
          type,
          title: String(title || 'New college update').slice(0, 200),
          message: String(message || '').slice(0, 400),
          referenceId,
          referenceType,
          isRead: false,
          readAt: null,
        },
      },
      upsert: true,
    },
  }));

  for (let offset = 0; offset < operations.length; offset += 500) {
    try {
      await Notification.bulkWrite(operations.slice(offset, offset + 500), { ordered: false });
    } catch (error) {
      if (error?.code !== 11000 && error?.writeErrors?.some((item) => item.code !== 11000)) throw error;
    }
  }
  return recipients.length;
}

async function notifyPublishedRecord(record, type, message = '') {
  if (!record || (record.status && record.status !== 'published')) return 0;
  try {
    return await createNotificationsForTarget({
      department: record.department || 'ALL',
      semester: record.semester ?? 'ALL',
      type,
      referenceType: type,
      referenceId: record._id,
      title: record.title,
      message,
    });
  } catch (error) {
    console.error('[Notifications] publication fan-out failed', { type, name: error?.name || 'Error' });
    return null;
  }
}

function getUserNotifications(userId, limit = 20) {
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.min(50, Math.max(1, Number(limit) || 20)))
    .lean();
}

function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}

function markNotificationRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
}

function markAllNotificationsRead(userId) {
  return Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
}

module.exports = {
  buildRecipientFilter,
  createNotificationsForTarget,
  notifyPublishedRecord,
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
