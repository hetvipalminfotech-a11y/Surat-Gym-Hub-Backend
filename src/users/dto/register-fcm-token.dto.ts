import { IsString, IsEnum, IsOptional } from 'class-validator';

export class RegisterFcmTokenDto {

  @IsString()
  fcmToken!: string;

  @IsOptional()
  @IsEnum(['android', 'ios', 'web'])
  platform?: 'android' | 'ios' | 'web';

  @IsString()
  deviceId!: string;
}
