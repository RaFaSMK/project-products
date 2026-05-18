import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      category,
      name,
      minPrice,
      maxPrice,
    } = query;

    const filter: any = { isDeleted: false };

    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .select('-__v'),
      this.productModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productModel.findOne({ _id: id, isDeleted: false }).select('-__v');
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return { success: true, data: product };
  }

  async create(createProductDto: CreateProductDto, userId: string) {
    const product = new this.productModel({
      ...createProductDto,
      createdBy: userId,
    });
    const saved = await product.save();
    const result = saved.toObject();
    delete result.__v;
    return { success: true, data: result };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateProductDto },
      { new: true },
    ).select('-__v');

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return { success: true, data: product };
  }

  async softDelete(id: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    ).select('-__v');

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return {
      success: true,
      message: 'Produto removido com sucesso',
      data: { _id: product._id, isDeleted: product.isDeleted, deletedAt: product.deletedAt },
    };
  }

  async restore(id: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false }, $unset: { deletedAt: '' } },
      { new: true },
    );

    if (!product) {
      throw new NotFoundException('Produto não encontrado ou não está deletado');
    }
    return { success: true, message: 'Produto restaurado com sucesso' };
  }

  async findDeleted(query: QueryProductDto) {
    const { page = 1, limit = 10, sort = 'deletedAt', order = 'desc' } = query;

    const filter: any = { isDeleted: true };

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .select('-__v'),
      this.productModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    };
  }
}
