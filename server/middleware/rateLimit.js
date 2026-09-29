// Process-local abuse control for this single-process deployment.
// If the API is scaled across instances, replace the store with a shared store.
function createRateLimiter({ windowMs, max, keyGenerator = (req) => req.ip || req.socket?.remoteAddress || 'unknown' }) {
  const buckets = new Map();
  const maxKeys = 20000;

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = String(keyGenerator(req));
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxKeys && !bucket) {
        for (const [storedKey, storedBucket] of buckets) {
          if (storedBucket.resetAt <= now) buckets.delete(storedKey);
        }
        if (buckets.size >= maxKeys) {
          return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
        }
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    next();
  };
}

module.exports = { createRateLimiter };
