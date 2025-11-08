import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

interface ValidationErrorItem {
  message: string;
  path?: string;
  value?: unknown;
}

interface ValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, ValidationErrorItem>;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err);

  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado';
    error = { message, statusCode: 404 } as AppError;
  }

  if (err.name === 'ValidationError') {
    const validationErr = err as ValidationError;
    const message = Object.values(validationErr.errors)
      .map((val: ValidationErrorItem) => val.message)
      .join(', ');
    error = { message, statusCode: 400 } as AppError;
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = { message, statusCode: 401 } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = { message, statusCode: 401 } as AppError;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
