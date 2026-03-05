import { Test, TestingModule } from '@nestjs/testing';
import { AppoinmentsResolver } from './appoinments.resolver';
import { AppoinmentsService } from './appoinments.service';

describe('AppoinmentsResolver', () => {
  let resolver: AppoinmentsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppoinmentsResolver, AppoinmentsService],
    }).compile();

    resolver = module.get<AppoinmentsResolver>(AppoinmentsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
