import { Expose, Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums';

@Exclude()
export class MembershipResponseDto {
  @Expose()
  id!: number;

  @Expose()
  name!: string;

  @Expose()
  duration_months!: number;

  @Expose({ groups: [UserRole.ADMIN, UserRole.RECEPTIONIST] })
  price!: number;

  @Expose()
  pt_sessions!: number;

  @Expose()
  access_hours!: string;

  @Expose()
  status!: string;

  @Expose()
  created_at!: Date;

  @Expose()
  updated_at!: Date;
}
