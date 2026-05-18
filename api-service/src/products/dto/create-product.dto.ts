import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Notebook Pro', description: 'Nome do produto' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiPropertyOptional({ example: 'Notebook para desenvolvimento', description: 'Descrição do produto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 4999.99, description: 'Preço do produto' })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @Min(0, { message: 'Preço não pode ser negativo' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 'eletronicos', description: 'Categoria do produto' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 15, description: 'Quantidade em estoque' })
  @IsNumber({}, { message: 'Estoque deve ser um número' })
  @Min(0, { message: 'Estoque não pode ser negativo' })
  @IsOptional()
  @Type(() => Number)
  stock?: number;
}
