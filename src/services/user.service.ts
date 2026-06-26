import UserRepository, { type User } from '../repositories/user.repository';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/error';
import { comparePassword, hashPassword } from '../utils/hashingPassword';

interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
}

class UserService {
  private readonly userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  private validateId(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new ValidationError('Invalid ID format');
    }
  }

  async getUserById(id: number): Promise<User> {
    this.validateId(id);
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async updateUser(
    targetUserId: number,
    currentUserId: number,
    data: UpdateUserPayload,
  ): Promise<User> {
    this.validateId(targetUserId);
    if (targetUserId !== currentUserId) {
      throw new ForbiddenError('You are not allowed to update this user');
    }

    const currentUserData = await this.userRepository.findByIdWithPassword(targetUserId);
    if (!currentUserData) {
      throw new NotFoundError('User not found');
    }

    if (data.email && data.email !== currentUserData.email) {
      const emailExist = await this.userRepository.findByEmail(data.email);
      if (emailExist) {
        throw new ConflictError('Email already in use');
      }
    }

    const updatePayload: { name?: string; email?: string; password?: string } = {};
    if (data.name) updatePayload.name = data.name;
    if (data.email) updatePayload.email = data.email;

    if (data.password) {
      if (!data.currentPassword) {
        throw new ValidationError('Current password is required to set a new password');
      }

      const isPasswordMatch = await comparePassword(data.currentPassword, currentUserData.password);
      if (!isPasswordMatch) {
        throw new UnauthorizedError('Invalid current password');
      }

      updatePayload.password = await hashPassword(data.password);
    }

    return await this.userRepository.update(targetUserId, updatePayload);
  }
}

export default UserService;
