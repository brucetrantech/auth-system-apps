import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '@/types';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw new ValidationError(errorMessages.join(', '));
  }

  next();
};

/**
 * Wrapper to run validation chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => {
        if ('msg' in error) {
          return error.msg;
        }
        return 'Validation error';
      });

      return next(new ValidationError(errorMessages.join(', ')));
    }

    next();
  };
};

export default {
  handleValidationErrors,
  validate,
};
