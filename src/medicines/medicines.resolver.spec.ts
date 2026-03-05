import { Test, TestingModule } from '@nestjs/testing';
import { MedicinesResolver } from './medicines.resolver';
import { MedicinesService } from './medicines.service';

describe('MedicinesResolver', () => {
  let resolver: MedicinesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicinesResolver, MedicinesService],
    }).compile();

    resolver = module.get<MedicinesResolver>(MedicinesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
