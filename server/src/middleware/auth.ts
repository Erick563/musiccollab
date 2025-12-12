import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../types/express';

export type { AuthRequest };

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Aceitar token do header Authorization ou query parameter (para streaming de áudio)
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.split(' ')[1];
    const queryToken = req.query.token as string;
    const token = headerToken || queryToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso necessário'
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const generateToken = (userId: string): string => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  const JWT_EXPIRES_IN = 100 * 60 * 60 * 24 * 7;
  
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
