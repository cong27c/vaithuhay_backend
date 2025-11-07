const { Op } = require("sequelize");
const throwError = require("@/utils/throwError");
const {
  Product,
  ProductDetail,
  ProductDiscount,
  ProductImage,
  ProductVariant,
  Collection,
  AttributeValue,
  Attribute,
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

      const productData = product.toJSON();

      // Tách ảnh chính và ảnh phụ
      const mainImage = productData.images?.find((img) => img.is_main);
      const subImages = productData.images?.filter((img) => !img.is_main) || [];

      // Format highlights nếu là string (JSON)
      let highlights = productData.detail?.highlights;
      if (typeof highlights === "string") {
        try {
          highlights = JSON.parse(highlights);
        } catch {
          highlights = { img: "", highlights_html: [] };
        }
      }

      const transformedProduct = {
        id: productData.id,
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: parseFloat(productData.price) || 0,
        stock: parseInt(productData.stock) || 0,
        weight: parseFloat(productData.weight) || 0,
        release_date: productData.release_date,
        status: productData.status,
        brand_id: productData.brand_id,

        // ✅ Cấu trúc chuẩn FE mong muốn
        main_image: mainImage
          ? {
              id: mainImage.id,
              image_url: mainImage.image_url,
            }
          : null,

        sub_images: subImages.map((img) => ({
          id: img.id,
          image_url: img.image_url,
        })),

        // Giữ nguyên các field khác
        images: productData.images || [],
        variants: productData.variants || [],
        collections: productData.collections || [],
        detail: productData.detail || null,
      };

      return transformedProduct;
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
        price,
        stock,
        weight,
        release_date,
        status,
        brand_id,
        detail,
      } = productData;

      // Create main product - SỬA: không truyền description
      const product = await Product.create(
        {
          name,
          slug: slug || this.generateSlug(name),
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
            title: detail.title,
            long_description: detail.long_description,
            specifications: detail.specifications,
            highlights: detail.highlights, // ✅ Giữ nguyên structure
            care_instructions: detail.care_instructions,
            origin: detail.origin,
            material: detail.material,
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Return complete product with relations
      return await this.getProductById(product.id);
    } catch (error) {
      await transaction.rollback();
      console.log("Error creating product:", error);

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

      const { detail, ...productUpdateData } = productData;

      // Update main product
      await product.update(productUpdateData, { transaction });

      // Update or create product detail
      if (detail) {
        const existingDetail = await ProductDetail.findOne({
          where: { product_id: id },
        });

        if (existingDetail) {
          await existingDetail.update(
            {
              title: detail.title,
              long_description: detail.long_description,
              specifications: detail.specifications,
              highlights: detail.highlights,
              care_instructions: detail.care_instructions,
              origin: detail.origin,
              material: detail.material,
            },
            { transaction }
          );
        } else {
          await ProductDetail.create(
            {
              product_id: id,
              title: detail.title,
              long_description: detail.long_description,
              specifications: detail.specifications,
              highlights: detail.highlights,
              care_instructions: detail.care_instructions,
              origin: detail.origin,
              material: detail.material,
            },
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

  async getProductVariantsByProduct(productId, options = {}) {
    try {
      const { includeAttributes = true, includeProduct = false } = options;

      const includeConfig = [];

      if (includeAttributes) {
        includeConfig.push({
          model: AttributeValue,
          as: "attribute_values",
          include: [
            {
              model: Attribute,
              as: "attribute",
              attributes: ["id", "name", "display_order"],
            },
          ],
          attributes: ["id", "value", "display_order", "attribute_id"],
          through: { attributes: [] },
        });
      }

      if (includeProduct) {
        includeConfig.push({
          model: Product,
          as: "Product",
          attributes: ["id", "name", "description", "category_id"],
        });
      }

      const variants = await ProductVariant.findAll({
        where: { product_id: productId },
        include: includeConfig,
        attributes: {
          exclude: ["created_at", "updated_at"],
          // Giữ lại variant_type, variant_value nếu cần cho backward compatibility
        },
        order: [
          ["id", "ASC"],
          [
            {
              model: AttributeValue,
              as: "attribute_values",
            },
            {
              model: Attribute,
              as: "attribute",
            },
            "display_order",
            "ASC",
          ],
        ],
      });

      if (!variants.length) {
        throw throwError("No product variants found for this product", 404);
      }

      // Transform data
      const transformedVariants = variants.map((variant) =>
        this.transformVariantDataWithAttributes(variant)
      );

      return transformedVariants;
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to get product variants", 500, error);
    }
  }

  async getProductVariant(variantId, options = {}) {
    try {
      const { includeAttributes = true, includeProduct = false } = options;

      const includeConfig = [];

      if (includeAttributes) {
        includeConfig.push({
          model: AttributeValue,
          as: "attribute_values",
          include: [
            {
              model: Attribute,
              as: "attribute",
              attributes: ["id", "name", "display_order"],
            },
          ],
          attributes: ["id", "value", "display_order", "attribute_id"],
          through: { attributes: [] },
        });
      }

      if (includeProduct) {
        includeConfig.push({
          model: Product,
          as: "Product",
          attributes: ["id", "name", "description", "category_id"],
        });
      }

      const variant = await ProductVariant.findByPk(variantId, {
        include: includeConfig,
        attributes: {
          exclude: ["created_at", "updated_at"],
        },
      });

      if (!variant) {
        throw throwError("Product variant not found", 404);
      }

      // Sử dụng transform function mới
      return this.transformVariantDataWithAttributes(variant);
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to get product variant", 500, error);
    }
  }
  async createProductVariant(productId, variantData) {
    try {
      const product = await Product.findByPk(productId);
      if (!product) {
        throw throwError("Product not found", 404);
      }

      console.log("variantData", variantData);

      // Tách attributes nếu có để xử lý riêng
      const { variant_attributes, ...variantMainData } = variantData;
      console.log("variant_attributes", variant_attributes);
      console.log("variantMainData", variantMainData);

      const variant = await ProductVariant.create({
        product_id: productId,
        ...variantMainData,
      });

      // Xử lý liên kết attribute_values nếu có
      if (variant_attributes && variant_attributes.length > 0) {
        // TẠO MỚI ATTRIBUTE VALUES CHO BIẾN THỂ
        const attributeValueIds = await Promise.all(
          variant_attributes.map(async (attr) => {
            // Tạo mới attribute value cho biến thể
            const attributeValue = await AttributeValue.create({
              value: attr.attribute_value, // Giá trị mới (VD: "Đỏ")
              attribute_id: attr.attribute_type, // ID attribute đã có (VD: 1 = "Màu sắc")
              display_order: 0, // Có thể set mặc định
            });

            console.log(
              `✅ Created new attribute_value: ${attributeValue.id} - ${attributeValue.value}`
            );
            return attributeValue.id; // Trả về ID của attribute value mới tạo
          })
        );

        console.log("attributeValueIds", attributeValueIds);

        // Liên kết variant với các attribute values mới tạo
        await variant.setAttribute_values(attributeValueIds);

        // Lấy lại variant với đầy đủ thông tin attributes để transform
        const fullVariant = await ProductVariant.findByPk(variant.id, {
          include: [
            {
              model: AttributeValue,
              as: "attribute_values",
              include: [
                {
                  model: Attribute,
                  as: "attribute",
                  attributes: ["id", "name", "display_order"],
                },
              ],
              attributes: ["id", "value", "display_order", "attribute_id"],
              through: { attributes: [] },
            },
          ],
        });

        return this.transformVariantDataWithAttributes(fullVariant);
      }

      return this.transformVariantDataWithAttributes(variant);
    } catch (error) {
      console.log("❌ createProductVariant ERROR:", error);
      if (error.status === 404) throw error;
      throw throwError("Failed to create product variant", 500, error);
    }
  }
  async updateProductVariant(variantId, variantData) {
    try {
      const variant = await ProductVariant.findByPk(variantId, {
        include: [
          {
            model: AttributeValue,
            as: "attribute_values",
            include: [
              {
                model: Attribute,
                as: "attribute",
                attributes: ["id", "name", "display_order"],
              },
            ],
            attributes: ["id", "value", "display_order", "attribute_id"],
            through: { attributes: [] },
          },
        ],
      });

      if (!variant) {
        throw throwError("Product variant not found", 404);
      }

      // Tách attributes để xử lý riêng
      const { attribute_values, ...variantMainData } = variantData;

      // Cập nhật thông tin chính
      await variant.update(variantMainData);

      // Cập nhật attributes nếu có
      if (attribute_values !== undefined) {
        await variant.setAttribute_values(attribute_values);
      }

      // Lấy lại variant mới nhất với đầy đủ thông tin
      const updatedVariant = await ProductVariant.findByPk(variantId, {
        include: [
          {
            model: AttributeValue,
            as: "attribute_values",
            include: [
              {
                model: Attribute,
                as: "attribute",
                attributes: ["id", "name", "display_order"],
              },
            ],
            attributes: ["id", "value", "display_order", "attribute_id"],
            through: { attributes: [] },
          },
        ],
      });

      return this.transformVariantDataWithAttributes(updatedVariant);
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

      return {
        message: "Product variant deleted successfully",
        deletedVariantId: variantId,
      };
    } catch (error) {
      if (error.status === 404) throw error;
      throw throwError("Failed to delete product variant", 500, error);
    }
  }

  transformVariantDataWithAttributes(variant) {
    const variantData = variant.get({ plain: true });

    // Reset variant_type và variant_value từ relational data
    variantData.variant_type = [];
    variantData.variant_value = [];

    if (
      variantData.attribute_values &&
      variantData.attribute_values.length > 0
    ) {
      // Sắp xếp theo display_order của Attribute
      const sortedAttributes = [...variantData.attribute_values].sort(
        (a, b) => {
          const orderA = a.attribute?.display_order ?? 0;
          const orderB = b.attribute?.display_order ?? 0;
          return orderA - orderB;
        }
      );

      // Extract variant_type từ Attribute.name và variant_value từ AttributeValue.value
      sortedAttributes.forEach((attrValue) => {
        if (attrValue.attribute) {
          variantData.variant_type.push(attrValue.attribute.name);
          variantData.variant_value.push(attrValue.value);
        }
      });

      // Auto-generate name nếu cần
      if (!variantData.name && variantData.variant_value.length > 0) {
        variantData.name = variantData.variant_value.join(" / ");
      }
    }

    return variantData;
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
