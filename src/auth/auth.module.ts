import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from 'src/common/strategy/jwt-stategies';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

@Module({
   imports: [
     ConfigModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy,AuthService],
  exports: [AuthService],
})
export class AuthModule {}
