const { Op } = require("sequelize");
const throwError = require("@/utils/throwError");
const {
  Product,
  ProductDetail,
  ProductDiscount,
  ProductImage,
  ProductVariant,
  Collection,
} = require("@/models");

class ProductService {
  // 📦 Get all products with pagination and filtering
  async getAllProducts({ page, limit, search, status, category }) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search by name or description
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ProductImage,
            as: "images",
            attributes: ["id", "image_url", "is_main"],
          },
          {
            model: ProductImage,
            as: "mainImage",
            attributes: ["id", "image_url", "is_main"],
          },
          {
            model: ProductDiscount,
            as: "discount",
            attributes: [
              "id",
              "discount_type",
              "discount_value",
              "start_date",
              "end_date",
              "status",
            ],
          },
          {
            model: ProductVariant,
            as: "variants",
            attributes: ["id", "name", "sku", "price", "stock", "image_url"],
          },
        ],
        limit,
        offset,
        order: [["created_at", "DESC"]],
      });

      return {
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      throw throwError("Failed to retrieve products", 500, error);
    }
  }

  // 🔍 Get product by ID with all relations
  async getProductById(id) {
    try {
      const product = await Product.findByPk(id, {
        include: [
          {
            model: ProductDetail,
            as: "detail",
            attributes: [
              "id",
              "title",
              "long_description",
              "specifications",
              "highlights",
              "care_instructions",
              "origin",
              "material",
            ],
          },
          {
            model: ProductImage,
            as: "images",
            attributes: ["id", "image_url", "is_main"],
          },
          {
            model: ProductDiscount,
            as: "discount",
            attributes: [
              "id",
              "discount_type",
              "discount_value",
              "start_date",
              "end_date",
              "status",
            ],
          },
          {
            model: ProductVariant,
            as: "variants",
            include: ["attribute_values"],
          },
          {
            model: Collection,
            as: "collections",
            through: { attributes: [] },
          },
        ],
      });

      if (!product) {
        throw throwError("Product not found", 404);
      }

      return product;
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to retrieve product", 500, error);
    }
  }

  // ➕ Create new product with details, images, and variants
  async createProduct(productData) {
    const transaction = await Product.sequelize.transaction();

    try {
      const {
        name,
        slug,
        description,
        price,
        stock,
        weight,
        release_date,
        status,
        brand_id,
        detail,
        images,
        discount,
        variants,
      } = productData;

      // Create main product
      const product = await Product.create(
        {
          name,
          slug: slug || this.generateSlug(name),
          description,
          price,
          stock,
          weight,
          release_date,
          status: status || "coming_soon",
          brand_id,
        },
        { transaction }
      );

      // Create product detail if provided
      if (detail) {
        await ProductDetail.create(
          {
            product_id: product.id,
            ...detail,
          },
          { transaction }
        );
      }

      // Create product images if provided
      if (images && images.length > 0) {
        const imagePromises = images.map((image) =>
          ProductImage.create(
            {
              product_id: product.id,
              ...image,
            },
            { transaction }
          )
        );
        await Promise.all(imagePromises);
      }

      // Create discount if provided
      if (discount) {
        await ProductDiscount.create(
          {
            product_id: product.id,
            ...discount,
          },
          { transaction }
        );
      }

      // Create variants if provided
      if (variants && variants.length > 0) {
        const variantPromises = variants.map((variant) =>
          ProductVariant.create(
            {
              product_id: product.id,
              ...variant,
            },
            { transaction }
          )
        );
        await Promise.all(variantPromises);
      }

      await transaction.commit();

      // Return complete product with relations
      return await this.getProductById(product.id);
    } catch (error) {
      await transaction.rollback();

      if (error.name === "SequelizeUniqueConstraintError") {
        throw throwError("Product slug already exists", 400, error);
      }
      throw throwError("Failed to create product", 500, error);
    }
  }

  // ✏️ Update product
  async updateProduct(id, productData) {
    const transaction = await Product.sequelize.transaction();

    try {
      const product = await Product.findByPk(id);
      if (!product) {
        throw throwError("Product not found", 404);
      }

      const { detail, images, discount, variants, ...productUpdateData } =
        productData;

      // Update main product
      await product.update(productUpdateData, { transaction });

      // Update or create product detail
      if (detail) {
        const existingDetail = await ProductDetail.findOne({
          where: { product_id: id },
        });
        if (existingDetail) {
          await existingDetail.update(detail, { transaction });
        } else {
          await ProductDetail.create(
            { product_id: id, ...detail },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return await this.getProductById(id);
    } catch (error) {
      await transaction.rollback();
      if (error.status === 404) throw error;
      throw throwError("Failed to update product", 500, error);
    }
  }

  // 🗑️ Delete product
  async deleteProduct(id) {
    const transaction = await Product.sequelize.transaction();

    try {
      const product = await Product.findByPk(id);
      if (!product) {
        throw throwError("Product not found", 404);
      }

      // Delete related records
      await Promise.all([
        ProductDetail.destroy({ where: { product_id: id }, transaction }),
        ProductImage.destroy({ where: { product_id: id }, transaction }),
        ProductDiscount.destroy({ where: { product_id: id }, transaction }),
        ProductVariant.destroy({ where: { product_id: id }, transaction }),
      ]);

      await product.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      if (error.status === 404) throw error;
      throw throwError("Failed to delete product", 500, error);
    }
  }

  // 🔄 Variant Management
  async createProductVariant(productId, variantData) {
    try {
      const product = await Product.findByPk(productId);
      if (!product) {
        throw throwError("Product not found", 404);
      }

      const variant = await ProductVariant.create({
        product_id: productId,
        ...variantData,
      });

      return variant;
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to create product variant", 500, error);
    }
  }

  async updateProductVariant(variantId, variantData) {
    try {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) {
        throw throwError("Product variant not found", 404);
      }

      await variant.update(variantData);
      return variant;
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to update product variant", 500, error);
    }
  }

  async deleteProductVariant(variantId) {
    try {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) {
        throw throwError("Product variant not found", 404);
      }

      await variant.destroy();
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to delete product variant", 500, error);
    }
  }

  // 🔧 Utility function
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  }
}

module.exports = new ProductService();
