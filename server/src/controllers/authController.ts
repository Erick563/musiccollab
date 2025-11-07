import { Request, Response } from 'express';
import { User, IUserCreate } from '../models/User';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {

  try {

    const { name, email, password }: IUserCreate = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user.id);

    const publicUser = User.toPublic(user);

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: publicUser,
      token
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email já está em uso') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const isValidPassword = await User.validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const token = generateToken(user.id);

    const publicUser = User.toPublic(user);

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: publicUser,
      token
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const publicUser = User.toPublic(user);

    return res.json({
      success: true,
      user: publicUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { name, email } = req.body;
    const updateData: Partial<IUserCreate> = {};

    if (name) updateData.name = name;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de email inválido'
        });
      }
      updateData.email = email;
    }

    const updatedUser = await User.updateProfile(req.user.id, updateData);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const publicUser = User.toPublic(updatedUser);

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: publicUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter pelo menos 6 caracteres'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const isValidPassword = await User.validatePassword(user, currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    await User.updateProfile(req.user.id, { password: newPassword });

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
