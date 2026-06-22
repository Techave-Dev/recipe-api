import { Router } from 'express';
import { getUser, updateUser } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth';

const userRouter = Router();

userRouter.get('/:id', getUser);
userRouter.patch('/:id', requireAuth, updateUser);

export default userRouter;