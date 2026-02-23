import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * Database Module.
 * Provides PrismaService globally.
 *
 * Part of the infrastructure layer - provides database access.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
