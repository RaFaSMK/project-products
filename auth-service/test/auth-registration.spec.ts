import 'reflect-metadata';
import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UsersService } from '../src/users/users.service';

// Exercise real HTTP validation, registration, JWT signing and guards. Only the
// persistence boundary is replaced: this suite never connects to a database.
@Controller('test-admin')
class AdminOnlyController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  read() {
    return { ok: true };
  }
}

describe('Public registration and authentication', () => {
  let app: INestApplication;
  let service: AuthService;
  let jwt: JwtService;
  let users: Map<string, any>;
  const password = 'OnlyForTests-123!';
  let passwordHash: string;
  const payload = { name: 'Test User', email: 'user@example.test', password };
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  function storedUser(data: Record<string, unknown>, id: string) {
    const record = { _id: id, ...data, email: String(data.email), role: data.role ?? 'user', password: passwordHash, __v: 0 };
    return { ...record, toObject: () => ({ ...record }) };
  }

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
    // Match the secret read by the real Passport strategy without mutating the
    // process environment or connecting to the application's production module.
    const secret = process.env.JWT_SECRET || 'default_secret';
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret, signOptions: { expiresIn: '5m' } }),
      ],
      controllers: [AuthController, AdminOnlyController],
      providers: [AuthService, JwtStrategy, { provide: UsersService, useValue: usersService }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    service = app.get(AuthService);
    jwt = app.get(JwtService);
  });

  beforeEach(() => {
    users = new Map();
    usersService.create.mockImplementation(async data => {
      const user = storedUser(data, String(users.size + 1));
      users.set(user.email as string, user);
      return user;
    });
    usersService.findByEmail.mockImplementation(async email => users.get(email) || null);
    usersService.findById.mockImplementation(async id => [...users.values()].find(user => user._id === id) || null);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates an ordinary account and does not expose its password hash', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);
    expect(response.body.data.role).toBe('user');
    expect(response.body.data.email).toBe(payload.email);
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('__v');
  });

  it('ignores a requested admin role through registration, login and protected access', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register').send({ ...payload, role: 'admin' }).expect(201);
    expect(response.body.data.role).toBe('user');
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: payload.email, password }).expect(200);
    expect(jwt.verify(login.body.access_token).role).toBe('user');
    await request(app.getHttpServer()).get('/test-admin')
      .set('Authorization', `Bearer ${login.body.access_token}`).expect(403);
    const profile = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`).expect(200);
    expect(profile.body.data.role).toBe('user');
    expect(profile.body.data).not.toHaveProperty('password');
  });

  it('enforces the ordinary role even if registration is invoked without the HTTP validation pipe', async () => {
    const result = await service.register({ ...payload, role: 'admin' } as RegisterDto);
    expect(result.data.role).toBe('user');
    expect(usersService.create).toHaveBeenCalledWith({ ...payload, role: 'user' });
  });

  it('preserves login and authorization for an administrator provisioned outside public registration', async () => {
    users.set('admin@example.test', storedUser({ name: 'Admin', email: 'admin@example.test', role: 'admin' }, 'admin-1'));
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@example.test', password }).expect(200);
    expect(jwt.verify(login.body.access_token).role).toBe('admin');
    await request(app.getHttpServer()).get('/test-admin')
      .set('Authorization', `Bearer ${login.body.access_token}`).expect(200, { ok: true });
  });

  it.each([
    { name: 'Test', email: 'invalid', password },
    { name: 'Test', email: 'valid@example.test' },
    { email: 'valid@example.test', password },
  ])('rejects invalid registration data without persisting it: %j', async body => {
    await request(app.getHttpServer()).post('/auth/register').send(body).expect(400);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it.each(['missing@example.test', payload.email])('rejects invalid credentials for %s', async email => {
    users.set(payload.email, storedUser({ ...payload, role: 'user' }, 'user-1'));
    await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'incorrect-password' }).expect(401);
  });

  it('requires authentication for profiles and administrator routes', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/test-admin').expect(401);
  });

  it('does not advertise a client-controlled role in the registration schema', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const schema = document.components.schemas.RegisterDto as { properties: Record<string, unknown> };
    expect(schema.properties).not.toHaveProperty('role');
  });
});
