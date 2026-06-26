import UserRepository, { type User } from '../repositories/user.repository';
import { ConflictError, UnauthorizedError } from '../utils/error';
import { comparePassword, hashPassword } from '../utils/hashingPassword';
import { signToken } from '../utils/jwt';

class AuthService {
  private readonly userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: { email: string; password: string; name: string }) {
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);
    const user: User = await this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
    });

    const token = signToken({ sub: String(user.id), email: user.email });
    return { user, token };
  }

  async login(data: { email: string; password: string }) {
    const userWithPassword = await this.userRepository.findEmailByPassword(data.email);

    if (!userWithPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await comparePassword(data.password, userWithPassword.password);

    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { password: _omit, ...user } = userWithPassword;
    const token = signToken({ sub: String(user.id), email: user.email });
    return { user, token };
  }

  async me(userId: number) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User no longer exist');
    }

    return {
      id: Number(user.id),
      email: user.email,
      name: user.name,
    };
  }
}

export default AuthService;
