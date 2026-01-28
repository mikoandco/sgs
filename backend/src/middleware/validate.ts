import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware factory that runs the supplied express-validator chains and,
 * if any validation errors are found, responds with 400 and the error details.
 *
 * Usage:
 * ```ts
 * router.post(
 *   '/prospects',
 *   validate([
 *     body('firstName').trim().notEmpty().withMessage('First name is required'),
 *     body('email').isEmail().withMessage('Valid email is required'),
 *   ]),
 *   prospectController.create,
 * );
 * ```
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run every validation chain in parallel
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: {
          errors: errors.array().map((err) => ({
            field: 'path' in err ? err.path : undefined,
            message: err.msg,
          })),
        },
      });
      return;
    }

    next();
  };
}
