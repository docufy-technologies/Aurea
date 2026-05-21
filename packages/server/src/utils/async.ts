import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an asynchronous Express handler to automatically catch rejected promises
 * and pass them to the next error handling middleware.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
