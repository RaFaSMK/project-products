import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @ApiProperty({ example: 'João Silva' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @ApiProperty({ example: 'user', enum: ['admin', 'user'] })
  @Prop({ enum: ['admin', 'user'], default: 'user' })
  role: string;

  @ApiProperty({ example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash da senha antes de salvar (salt rounds = 12)
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Índice unique em email
UserSchema.index({ email: 1 }, { unique: true });
