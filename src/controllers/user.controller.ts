import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import UserService from '../services/user.service';
import { ValidationError } from '../utils/error';

const userService = new UserService();

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = Number(req.params.id);
    if (Number.isNaN(targetId)) {
      throw new ValidationError('Invalid ID format');
    }

    const user = await userService.getUserById(targetId);

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetId = Number(req.params.id);

    if (Number.isNaN(targetId)) {
      throw new ValidationError('Invalid ID format');
    }

    const currentUserId = req.user!.id;
    const updatedUser = await userService.updateUser(targetId, currentUserId, req.body);

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
}
