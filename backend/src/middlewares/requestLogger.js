export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.socket?.remoteAddress || '-';
    const statusCode = res.statusCode;
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${duration}ms - ${ip}`);
  });

  next();
}
