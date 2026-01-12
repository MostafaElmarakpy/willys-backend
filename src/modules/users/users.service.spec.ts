import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { UploadMediaService } from '../../services/upload-media/upload-media.service';
import { MailService } from '../../common/mail/mail.service';
import { UserRole } from '../../common/enums/UserRole';
import { UserStatus } from '../../common/enums/UserStatus';
import { UserProvider } from '../../common/enums/UserProvider';
import { UserGender } from '../../common/enums/UserGender';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let uploadMediaService: jest.Mocked<UploadMediaService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    password: 'hashed-password',
    fullName: 'Test User',
    phoneNumber: '1234567890',
    phoneNumberCountryCode: 'EG',
    role: UserRole.user,
    status: UserStatus.Online,
    provider: UserProvider.System,
    confirmAccount: false,
    avatar: 'https://example.com/avatar.jpg',
    birthday: new Date('1990-01-01'),
    joined: new Date(),
    gender: UserGender.Male,
    userLocale: 'ar',
    verificationCode: '1234',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    lastLogout: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: UploadMediaService,
          useValue: {
            saveOneFile: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    uploadMediaService = module.get(UploadMediaService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      registerMethod: 'email' as const,
      email: 'newuser@example.com',
      password: 'password123',
      fullName: 'New User',
      phoneNumber: '9876543210',
      phoneNumberCountryCode: 'EG' as any,
      gender: UserGender.Male,
      birthday: new Date('1990-01-01'),
      provider: UserProvider.System,
      userLocale: 'ar',
      callbackUrl: 'https://example.com/verify',
    };

    it('should register a new user with email successfully', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: 'https://example.com/avatar.jpg',
      } as any);
      usersRepository.save.mockResolvedValue(mockUser as User);
      jwtService.sign.mockReturnValue('verification-token');
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.register('email', registerDto, null);

      expect(result).toBeDefined();
      expect(usersRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it('should register a new user with phone number successfully', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.save.mockResolvedValue(mockUser as User);
      jwtService.sign.mockReturnValue('verification-token');

      const result = await service.register('phoneNumber', registerDto, null);

      expect(result).toBeDefined();
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.register('email', registerDto, null),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if phone number already exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.register('phoneNumber', registerDto, null),
      ).rejects.toThrow(ConflictException);
    });

    it('should upload avatar if provided', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;

      usersRepository.findOne.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: 'https://example.com/new-avatar.jpg',
      } as any);
      usersRepository.save.mockResolvedValue(mockUser as User);
      jwtService.sign.mockReturnValue('verification-token');
      mailService.sendMail.mockResolvedValue(undefined);

      await service.register('email', registerDto, mockFile);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        mockFile,
        'users',
        expect.any(String),
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const userWithPassword = { ...mockUser, password: 'plain-password' };
      usersRepository.findOne.mockResolvedValue(userWithPassword as User);

      const result = await service.validateUser(
        'test@example.com',
        'plain-password',
      );

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.validateUser('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUserToken', () => {
    it('should return user if token is valid', async () => {
      jwtService.verify.mockReturnValue({ email: 'test@example.com' });
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.validateUserToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      jwtService.verify.mockReturnValue({ email: 'nonexistent@example.com' });
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUserToken('valid-token');

      expect(result).toBeNull();
    });

    it('should throw if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.validateUserToken('invalid-token'),
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        fullName: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: UserRole.user,
        gender: UserGender.Male,
        status: UserStatus.Online,
        userLocale: 'ar',
      };

      usersRepository.create.mockReturnValue(mockUser as User);
      usersRepository.save.mockResolvedValue(mockUser as User);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        role: UserRole.user,
      });
      expect(usersRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByPhoneNumber', () => {
    it('should return user by phone number', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByPhoneNumber('1234567890');

      expect(result).toBeDefined();
      expect(result?.phoneNumber).toBe('1234567890');
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: '1234567890' },
      });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByPhoneNumber('0000000000');

      expect(result).toBeNull();
    });
  });

  describe('findByPhoneNumberAndCountryCode', () => {
    it('should return user by phone number and country code', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByPhoneNumberAndCountryCode(
        '1234567890',
        'EG',
      );

      expect(result).toBeDefined();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          phoneNumber: '1234567890',
          phoneNumberCountryCode: 'EG',
        },
      });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByPhoneNumberAndCountryCode(
        '0000000000',
        'US',
      );

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findOne(mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUserId);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        lastLogin: new Date(),
      } as User);

      const result = await service.updateLastLogin(mockUserId);

      expect(result).toBeDefined();
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLogin: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.updateLastLogin('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      } as User);

      const result = await service.updatePassword(
        'test@example.com',
        'new-password',
      );

      expect(result).toBeDefined();
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'new-password',
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePassword('nonexistent@example.com', 'new-password'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyUserEmail', () => {
    it('should verify user email', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        confirmAccount: true,
      } as User);

      const result = await service.verifyUserEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.confirmAccount).toBe(true);
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmAccount: true,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyUserEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('profile', () => {
    it('should return user profile', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.profile(mockUserId);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.profile('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto = {
      fullName: 'Updated Name',
    } as any;

    it('should update user profile', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce({
          ...mockUser,
          fullName: 'Updated Name',
        } as User);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateProfile(mockUserId, updateProfileDto);

      expect(result).toBeDefined();
      expect(usersRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          fullName: 'Updated Name',
        }),
      );
    });

    it('should update avatar if file provided', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;

      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce({
          ...mockUser,
          avatar: 'https://example.com/new-avatar.jpg',
        } as User);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: 'https://example.com/new-avatar.jpg',
      } as any);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateProfile(
        mockUserId,
        updateProfileDto,
        mockFile,
      );

      expect(result).toBeDefined();
      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        mockFile,
        'users',
        mockUserId,
      );
    });

    it('should keep existing avatar if no file provided', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce(mockUser as User);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateProfile(mockUserId, updateProfileDto);

      expect(usersRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          avatar: mockUser.avatar,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent-id', updateProfileDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
