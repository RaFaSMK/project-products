import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @ApiProperty({ example: 'Notebook Pro' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiPropertyOptional({ example: 'Notebook para desenvolvimento' })
  @Prop()
  description: string;

  @ApiProperty({ example: 4999.99 })
  @Prop({ required: true, min: 0 })
  price: number;

  @ApiPropertyOptional({ example: 'eletronicos' })
  @Prop({ index: true })
  category: string;

  @ApiProperty({ example: 15 })
  @Prop({ default: 0, min: 0 })
  stock: number;

  @ApiProperty({ example: false })
  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @ApiPropertyOptional()
  @Prop()
  deletedAt: Date;

  @ApiPropertyOptional({ example: '664a...', description: 'ID do usuário que criou' })
  @Prop({ type: String })
  createdBy: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Índice composto para queries de listagem
ProductSchema.index({ isDeleted: 1, category: 1 });

// Índice de texto para busca por nome
ProductSchema.index({ name: 'text' });
