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

      // 🎯 TRANSFORM DATA ĐỂ ĐỒNG BỘ VỚI FE
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

      // Transform data theo cấu trúc FE mong đợi
      const transformedProduct = {
        id: productData.id,
        name: productData.name,
        slug: productData.slug,
        price: parseFloat(productData.price) || 0,
        stock: parseInt(productData.stock) || 0,
        weight: parseFloat(productData.weight) || 0,
        release_date: productData.release_date,
        status: productData.status,

        // Detail info - ĐỒNG BỘ VỚI FE
        detail: {
          id: productData.detail?.id,
          title: productData.detail?.title || productData.name,
          long_description: productData.detail?.long_description || "",
          specifications: productData.detail?.specifications || "",
          highlights: highlights || { img: "", highlights_html: [] },
          care_instructions: productData.detail?.care_instructions || "",
          origin: productData.detail?.origin || "",
          material: productData.detail?.material || "",
        },

        // Images - ĐỒNG BỘ VỚI FE
        main_image: mainImage
          ? {
              id: mainImage.id,
              image_url: mainImage.image_url,
              is_main: true,
            }
          : null,

        sub_images: subImages?.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          is_main: false,
        })),

        // Variants - ĐỒNG BỘ VỚI FE
        variants:
          productData.variants?.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            price: parseFloat(variant.price) || 0,
            stock: parseInt(variant.stock) || 0,
            weight: parseFloat(variant.weight) || 0,
            status: variant.status,
            attribute_values:
              variant.attribute_values?.map((attr) => ({
                id: attr.id,
                value: attr.value,
                attribute_id: attr.attribute_id,
                attribute_name: attr.attribute?.name,
              })) || [],
          })) || [],

        // Collections
        collections:
          productData.collections?.map((collection) => ({
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
          })) || [],

        // Metadata
        created_at: productData.created_at,
        updated_at: productData.updated_at,
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

      console.log("Creating product with:", { name, slug, price, detail }); // Debug

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

      console.log("Updating product with:", productUpdateData); // Debug
      console.log("Detail data:", detail); // Debug

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
