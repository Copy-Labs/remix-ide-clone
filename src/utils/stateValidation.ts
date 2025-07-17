import { debug, warn, error } from '@/services/loggerService';

/**
 * Type for validation rules
 */
export type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
  sanitize?: (value: T) => T;
};

/**
 * Type for validation schema
 */
export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

/**
 * Validates a state object against a schema
 * @param state The state object to validate
 * @param schema The validation schema
 * @returns An object with validation results
 */
export function validateState<T extends Record<string, any>>(
  state: T,
  schema: ValidationSchema<T>
): { isValid: boolean; errors: string[]; sanitizedState: T } {
  const errors: string[] = [];
  const sanitizedState = { ...state };

  // Check each field in the schema
  for (const field in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, field)) {
      const rules = schema[field] || [];
      const value = state[field];

      // Apply each rule to the field
      for (const rule of rules) {
        if (!rule.validate(value)) {
          errors.push(`${field}: ${rule.message}`);

          // Apply sanitization if available
          if (rule.sanitize) {
            sanitizedState[field] = rule.sanitize(value);
            debug('StateValidation', `Sanitized ${field} in state`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedState
  };
}

/**
 * Common validation rules
 */
export const rules = {
  required: <T>(message = 'Field is required'): ValidationRule<T> => ({
    validate: (value: T) => value !== undefined && value !== null,
    message
  }),

  string: {
    minLength: (min: number, message = `Must be at least ${min} characters`): ValidationRule<string> => ({
      validate: (value: string) => typeof value === 'string' && value.length >= min,
      message,
      sanitize: (value: string) => typeof value === 'string' ? value : ''
    }),

    maxLength: (max: number, message = `Must be at most ${max} characters`): ValidationRule<string> => ({
      validate: (value: string) => typeof value === 'string' && value.length <= max,
      message,
      sanitize: (value: string) => typeof value === 'string' ? value.slice(0, max) : ''
    }),

    pattern: (pattern: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
      validate: (value: string) => typeof value === 'string' && pattern.test(value),
      message
    })
  },

  number: {
    min: (min: number, message = `Must be at least ${min}`): ValidationRule<number> => ({
      validate: (value: number) => typeof value === 'number' && value >= min,
      message,
      sanitize: (value: number) => typeof value === 'number' ? Math.max(value, min) : min
    }),

    max: (max: number, message = `Must be at most ${max}`): ValidationRule<number> => ({
      validate: (value: number) => typeof value === 'number' && value <= max,
      message,
      sanitize: (value: number) => typeof value === 'number' ? Math.min(value, max) : max
    }),

    integer: (message = 'Must be an integer'): ValidationRule<number> => ({
      validate: (value: number) => typeof value === 'number' && Number.isInteger(value),
      message,
      sanitize: (value: number) => typeof value === 'number' ? Math.round(value) : 0
    })
  },

  array: {
    minLength: <T>(min: number, message = `Must have at least ${min} items`): ValidationRule<T[]> => ({
      validate: (value: T[]) => Array.isArray(value) && value.length >= min,
      message
    }),

    maxLength: <T>(max: number, message = `Must have at most ${max} items`): ValidationRule<T[]> => ({
      validate: (value: T[]) => Array.isArray(value) && value.length <= max,
      message,
      sanitize: (value: T[]) => Array.isArray(value) ? value.slice(0, max) : []
    })
  },

  boolean: {
    isBoolean: (message = 'Must be a boolean'): ValidationRule<boolean> => ({
      validate: (value: boolean) => typeof value === 'boolean',
      message,
      sanitize: (value: boolean) => Boolean(value)
    })
  }
};

/**
 * Higher-order function to add validation to a store
 * @param setState The setState function from a Zustand store
 * @param schema The validation schema
 * @returns A wrapped setState function with validation
 */
export function withValidation<T extends Record<string, any>>(
  setState: (fn: (state: T) => void) => void,
  schema: ValidationSchema<T>
) {
  return (fn: (state: T) => void) => {
    setState((state) => {
      // Create a copy of the state to apply the function
      const newState = { ...state };
      fn(newState);

      // Validate the new state
      const { isValid, errors, sanitizedState } = validateState(newState, schema);

      if (!isValid) {
        warn('StateValidation', 'State validation failed', errors);

        // Apply the sanitized state
        Object.assign(newState, sanitizedState);
      }

      // Apply the changes to the actual state
      Object.assign(state, newState);
    });
  };
}
