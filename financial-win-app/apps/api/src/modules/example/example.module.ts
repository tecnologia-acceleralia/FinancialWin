import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExampleService } from './example.service';
import { ExampleController } from './example.controller';
import { Example } from './entities/example.entity';

/**
 * Example Module
 *
 * This module demonstrates the standard structure for modules in this financial-win.
 *
 * Key patterns:
 * - TypeORM entity registration
 * - Service and Controller registration
 * - Module exports for reusability
 */
@Module({
  imports: [TypeOrmModule.forFeature([Example])],
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
