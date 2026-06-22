import UserRepository, { User } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/hashingPassword';
import { NotFoundError, UnauthorizedError, ConflictError, ForbiddenError, ValidationError } from '../utils/error';

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
    if (isNaN(id)) {
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

  async updateUser(targetUserId: number, currentUserId: number, data: UpdateUserPayload): Promise<User> {
    this.validateId(targetUserId);
    if (targetUserId !== currentUserId) {
      throw new ForbiddenError('You are not allowed to update this user');
    }

    const currentUserData = await this.userRepository.findById(targetUserId);
    if (!currentUserData) {
      throw new NotFoundError('User not found');
    }

    const fullUserData = await this.userRepository.findEmailByPassword(currentUserData.email);
    if (!fullUserData) {
      throw new NotFoundError('User not found');
    }

    if (data.email && data.email !== currentUserData.email) {
      const emailExist = await this.userRepository.findByEmail(data.email);
      if (emailExist) {
        throw new ConflictError('Email already in use');
      }
    }

    const updatePaylaod: { name?: string, email?: string, password?: string } = {};
    if (data.name) updatePaylaod.name = data.name;
    if (data.email) updatePaylaod.email = data.email;

    if (data.password) {
      if (!data.currentPassword) {
        throw new ValidationError('Current password is required to set a new password');
      }

      const isPasswordMatch = await comparePassword(data.currentPassword, fullUserData.password);
      if (!isPasswordMatch) {
        throw new UnauthorizedError('Invalid current password');
      }

      updatePaylaod.password = await hashPassword(data.password);
    }

    return await this.userRepository.update(targetUserId, updatePaylaod);
  }
}

export default UserService;