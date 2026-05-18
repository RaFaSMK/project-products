import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 1, description: 'Página atual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Itens por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'price', description: 'Campo para ordenação', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], description: 'Direção da ordenação', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: string;

  @ApiPropertyOptional({ example: 'eletronicos', description: 'Filtrar por categoria' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'notebook', description: 'Buscar por nome (regex case-insensitive)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 50, description: 'Preço mínimo' })
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 200, description: 'Preço máximo' })
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;
}
