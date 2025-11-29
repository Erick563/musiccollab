import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { User as PrismaUser } from '@prisma/client';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  name: string;
  email: string;
  password: string;
}

export interface IUserPublic {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {

  static async create(userData: IUserCreate): Promise<IUser> {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
      }
    });

    return {
      id: newUser.id,
      name: newUser.name || '',
      email: newUser.email,
      password: newUser.password,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async findById(id: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async validatePassword(user: IUser, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  static toPublic(user: IUser): IUserPublic {
    const { password, ...publicUser } = user;
    return publicUser;
  }

  static async updateProfile(id: string, updateData: Partial<IUserCreate>): Promise<IUser | null> {
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return null;
    }

    const dataToUpdate: any = {};
    
    if (updateData.name) {
      dataToUpdate.name = updateData.name;
    }
    
    if (updateData.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: id }
        }
      });
      
      if (emailExists) {
        throw new Error('Email já está em uso');
      }
      
      dataToUpdate.email = updateData.email;
    }
    
    if (updateData.password) {
      const saltRounds = 12;
      dataToUpdate.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name || '',
      email: updatedUser.email,
      password: updatedUser.password,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
