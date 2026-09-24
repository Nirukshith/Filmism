/**
 * Middleware factory that validates incoming request data using Zod schemas.
 * Replaces unvalidated data on req[source] with sanitized, type-cast data on success.
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      if (schema && (schema.shape?.body || schema.shape?.query || schema.shape?.params)) {
        // Multi-segment validation (e.g., body + params together)
        const parsed = schema.parse({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query;
        if (parsed.params) req.params = parsed.params;
      } else {
        const parsed = schema.parse(req[source]);
        req[source] = parsed;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { validateRequest };
