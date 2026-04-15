import { Expose, Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums';

@Exclude()
export class TrainerResponseDto {
  @Expose()
  id!: number;

  @Expose()
  user_id!: number;

  @Expose()
  specialization!: string;

  @Expose()
  session_rate!: number;

  @Expose({ groups: [UserRole.ADMIN] })
  commission_rate!: number;

  @Expose()
  shift_start!: string | null;

  @Expose()
  shift_end!: string | null;

  @Expose()
  status!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string;
}
