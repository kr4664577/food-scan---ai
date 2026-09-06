import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, dietaryGoals, allergies } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email, password, and full name are required.', statusCode: 400 }
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email address is already registered.', statusCode: 409 }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        dietaryGoals: dietaryGoals || '',
        allergies: {
          create: Array.isArray(allergies) ? allergies.map((a: string) => ({ allergen: a })) : []
        }
      },
      include: { allergies: true }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          dietaryGoals: user.dietaryGoals,
          allergies: user.allergies.map(a => a.allergen)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required.', statusCode: 400 }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { allergies: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials.', statusCode: 401 }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials.', statusCode: 401 }
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          dietaryGoals: user.dietaryGoals,
          allergies: user.allergies.map(a => a.allergen)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { allergies: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found', statusCode: 404 } });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        dietaryGoals: user.dietaryGoals,
        allergies: user.allergies.map(a => a.allergen)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { fullName, dietaryGoals, allergies } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (Array.isArray(allergies)) {
        await tx.userAllergy.deleteMany({ where: { userId } });
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          fullName: fullName !== undefined ? fullName : undefined,
          dietaryGoals: dietaryGoals !== undefined ? dietaryGoals : undefined,
          allergies: Array.isArray(allergies)
            ? { create: allergies.map((a: string) => ({ allergen: a })) }
            : undefined
        },
        include: { allergies: true }
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        dietaryGoals: updatedUser.dietaryGoals,
        allergies: updatedUser.allergies.map(a => a.allergen)
      }
    });
  } catch (error) {
    next(error);
  }
};
