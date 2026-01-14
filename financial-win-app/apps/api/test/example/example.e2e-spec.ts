import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtTestHelper } from '../utils/jwt-helper';

describe('ExampleController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for testing
    const jwtHelper = new JwtTestHelper();
    const testUser = {
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      company_id: 'test-company-id',
    };
    authToken = jwtHelper.generateToken(testUser);
    companyId = testUser.company_id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/example (POST)', () => {
    it('should create an example', () => {
      return request(app.getHttpServer())
        .post('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Example',
          description: 'Test Description',
          status: 'active',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Example');
          expect(res.body.company_id).toBe(companyId);
        });
    });

    it('should reject invalid data', () => {
      return request(app.getHttpServer())
        .post('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty string
          status: 'invalid_status', // Invalid: not in enum
        })
        .expect(400);
    });
  });

  describe('/example (GET)', () => {
    it('should return paginated examples', () => {
      return request(app.getHttpServer())
        .get('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10, status: 'active' })
        .expect(200);
    });
  });

  describe('/example/:id (GET)', () => {
    let exampleId: string;

    beforeAll(async () => {
      // Create an example first
      const response = await request(app.getHttpServer())
        .post('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Example for GET',
          status: 'active',
        });
      exampleId = response.body.id;
    });

    it('should return an example by ID', () => {
      return request(app.getHttpServer())
        .get(`/example/${exampleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(exampleId);
          expect(res.body.company_id).toBe(companyId);
        });
    });

    it('should return 404 for non-existent example', () => {
      return request(app.getHttpServer())
        .get('/example/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/example/:id (PATCH)', () => {
    let exampleId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Example for UPDATE',
          status: 'active',
        });
      exampleId = response.body.id;
    });

    it('should update an example', () => {
      return request(app.getHttpServer())
        .patch(`/example/${exampleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          status: 'inactive',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.status).toBe('inactive');
        });
    });
  });

  describe('/example/:id (DELETE)', () => {
    let exampleId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/example')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Example for DELETE',
          status: 'active',
        });
      exampleId = response.body.id;
    });

    it('should soft delete an example', () => {
      return request(app.getHttpServer())
        .delete(`/example/${exampleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's soft deleted (should return 404)
      return request(app.getHttpServer())
        .get(`/example/${exampleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

