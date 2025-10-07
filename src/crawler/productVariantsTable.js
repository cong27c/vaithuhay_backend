const { initBrowser } = require("@/utils/puppeteer");
const { productVariantElement, productDetailUrl } = require("@/config/crawler");
const {
  Product,
  ProductVariant,
  AttributeValue,
  Attribute,
  VariantAttribute,
} = require("@/models");

// Hàm xác định display_order dựa trên tên attribute
function getDisplayOrder(attributeName) {
  const name = attributeName.toLowerCase();

  if (name.includes("màu") || name.includes("color")) return 4;
  if (name.includes("kiểu dáng") && name.includes("phụ kiện")) return 1;
  if (name.includes("kích thước") || name.includes("size")) return 3;
  if (name.includes("tiêu đề")) return 5;
  if (name.includes("kiểu dáng") && name.includes("kích thước")) return 2;

  return 0; // Mặc định
}

// Hàm getImageUrl đơn giản hóa
async function getImageUrl(page) {
  try {
    return await page.evaluate(() => {
      const activeSlide = document.querySelector(
        ".slick-slide.slick-current.slick-active"
      );

      if (!activeSlide) return "";

      const img = activeSlide.querySelector("img");
      if (!img) return "";

      let src = img.getAttribute("srcset") || img.getAttribute("src") || "";

      if (src.includes(",")) {
        src = src.split(",")[0].trim().split(" ")[0];
      }
      if (src && src.startsWith("//")) {
        src = "https:" + src;
      }

      return src;
    });
  } catch (error) {
    console.log("Không thể lấy ảnh:", error.message);
    return "";
  }
}

// Hàm hỗ trợ parse price
function parsePrice(priceString) {
  if (!priceString) return 0;
  const numericString = priceString.replace(/[^\d]/g, "");
  return parseInt(numericString) || 0;
}

// Hàm hỗ trợ generate SKU
function generateSKU(productId, variantName) {
  const timestamp = Date.now().toString().slice(-6);
  const nameAbbr = variantName
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return `SKU-${productId}-${nameAbbr}-${timestamp}`;
}

// Hàm hỗ trợ tạo combinations
function generateCombinations(attributes) {
  if (attributes.length === 0) return [{}];

  const currentAttribute = attributes[0];
  const remainingAttributes = attributes.slice(1);
  const remainingCombinations = generateCombinations(remainingAttributes);

  const combinations = [];

  for (const value of currentAttribute.values) {
    for (const combination of remainingCombinations) {
      combinations.push({
        [currentAttribute.name]: value.attributeValue.value,
        ...combination,
      });
    }
  }

  return combinations;
}

// Hàm lấy thông tin variant
async function getVariantInfo(page, selectors) {
  try {
    // Lấy giá
    const price = await page
      .$eval(selectors.price, (el) => {
        const priceText = el.textContent.trim();
        return priceText.replace(/[^\d]/g, "") || "0";
      })
      .catch(() => "0");

    // Lấy ảnh
    const image = await getImageUrl(page);

    return {
      price: parsePrice(price),
      image: image || "",
    };
  } catch (error) {
    console.log("Lỗi khi lấy thông tin variant:", error.message);
    return null;
  }
}

// Hàm click an toàn sử dụng evaluate
async function safeClick(page, element, value) {
  return await page.evaluate(
    (el, val) => {
      try {
        const button = el.querySelector(
          `.btn.btn-variant[data-value="${val}"]`
        );
        if (
          button &&
          button.offsetWidth > 0 &&
          button.offsetHeight > 0 &&
          !button.classList.contains("hide-variant") &&
          !button.disabled &&
          window.getComputedStyle(button).display !== "none" &&
          window.getComputedStyle(button).visibility !== "hidden"
        ) {
          button.click();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },
    element,
    value
  );
}

async function crawlProductVariants() {
  const { browser, page } = await initBrowser();

  // Thêm các setting để tăng timeout và handle lỗi tốt hơn
  await page.setDefaultNavigationTimeout(60000);
  await page.setDefaultTimeout(40000);
  await page.setViewport({ width: 1920, height: 1080 });

  const products = await Product.findAll({
    attributes: ["id", "slug", "name"],
  });

  for (const product of products) {
    try {
      console.log(
        `\n=== Đang crawl variants cho sản phẩm: ${product.slug} ===`
      );

      // 1. Vào trang chi tiết sản phẩm với retry mechanism
      const url = `${productDetailUrl}/${product.slug}`;
      console.log(`Truy cập URL: ${url}`);

      await page.goto(url, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 2. Tìm variant container và option container
      const variantContainer = await page.$(
        productVariantElement.variantContainer
      );
      if (!variantContainer) {
        console.log(
          `Không tìm thấy variant container cho sản phẩm: ${product.slug}`
        );
        continue;
      }

      const optionContainer = await variantContainer.$(
        productVariantElement.optionContainer
      );
      if (!optionContainer) {
        console.log(
          `Không tìm thấy option container cho sản phẩm: ${product.slug}`
        );
        continue;
      }

      // 3. Lấy tất cả các children divs của optionContainer
      const attributeDivs = await optionContainer.$$(":scope > div");
      console.log(`Tìm thấy ${attributeDivs.length} attribute groups`);

      if (attributeDivs.length === 0) {
        console.log(
          `Không tìm thấy attribute nào cho sản phẩm: ${product.slug}`
        );
        continue;
      }

      // 4. Lấy thông tin từng attribute và các giá trị của nó
      const validAttributesData = [];
      const allAttributeValues = [];

      for (let i = 0; i < attributeDivs.length; i++) {
        const attributeDiv = attributeDivs[i];

        // Lấy tên attribute từ selector attribute
        const attributeName = await page.evaluate(
          (el, selector) => {
            const attributeElement = el.querySelector(selector);
            return attributeElement ? attributeElement.textContent.trim() : "";
          },
          attributeDiv,
          productVariantElement.attribute
        );

        if (!attributeName) {
          console.log(`Attribute thứ ${i + 1} không có tên, bỏ qua`);
          continue;
        }

        console.log(`Attribute ${i + 1}: ${attributeName}`);

        // Lấy các giá trị attribute
        const attributeValues = await attributeDiv.$$eval(
          `.btn.btn-variant, [data-value]`,
          (buttons) => {
            return buttons
              .map((btn) => {
                const value = btn.getAttribute("data-value") || "";
                const displayValue = btn.querySelector("span")
                  ? btn.querySelector("span").textContent.trim()
                  : value;
                const isSelected = btn.classList.contains("selected");
                const isHidden = btn.classList.contains("hide-variant");
                return { value, displayValue, isSelected, isHidden };
              })
              .filter((item) => item.value);
          }
        );

        console.log(
          `- Tìm thấy ${attributeValues.length} giá trị:`,
          attributeValues.map((av) => av.value)
        );

        // CHỈ thêm vào danh sách xử lý nếu có giá trị
        if (attributeValues.length === 0) {
          console.log(
            `- Bỏ qua attribute "${attributeName}" vì không có giá trị`
          );
          continue;
        }

        // Tìm hoặc tạo attribute trong database
        let attributeRecord = await Attribute.findOne({
          where: { name: attributeName },
        });
        if (!attributeRecord) {
          const displayOrder = getDisplayOrder(attributeName);
          attributeRecord = await Attribute.create({
            name: attributeName,
            display_order: displayOrder,
          });
          console.log(
            `Đã tạo attribute mới: ${attributeName} với display_order: ${displayOrder}`
          );
        }

        // Tìm hoặc tạo attribute values
        const attributeValueRecords = [];
        for (const attrValue of attributeValues) {
          let valueRecord = await AttributeValue.findOne({
            where: {
              value: attrValue.value,
              attribute_id: attributeRecord.id,
            },
          });

          if (!valueRecord) {
            valueRecord = await AttributeValue.create({
              value: attrValue.value,
              display_value: attrValue.displayValue,
              attribute_id: attributeRecord.id,
            });
            console.log(`Đã tạo attribute value mới: ${attrValue.value}`);
          }

          attributeValueRecords.push({
            attributeValue: attrValue,
            dbRecord: valueRecord,
          });
        }

        validAttributesData.push({
          name: attributeName,
          dbRecord: attributeRecord,
          values: attributeValueRecords,
          element: attributeDiv,
          isPrimary: validAttributesData.length === 0,
        });

        allAttributeValues.push(
          ...attributeValueRecords.map((av) => av.dbRecord)
        );
      }

      // Sử dụng validAttributesData thay cho attributesData
      const attributesData = validAttributesData;
      if (attributesData.length === 0) {
        console.log(
          `Không có attribute nào hợp lệ cho sản phẩm: ${product.slug}`
        );
        continue;
      }

      // 5. Xác định attribute chính (đầu tiên)
      const primaryAttribute = attributesData[0];
      console.log(`Attribute chính: ${primaryAttribute.name}`);

      // 6. Lặp qua các giá trị của attribute chính và click để load giao diện
      const variants = [];

      for (const primaryValue of primaryAttribute.values) {
        try {
          console.log(
            `\nĐang xử lý attribute chính: ${primaryValue.attributeValue.value}`
          );

          // Click vào nút của attribute chính sử dụng safeClick
          const clickSuccess = await safeClick(
            page,
            primaryAttribute.element,
            primaryValue.attributeValue.value
          );

          if (!clickSuccess) {
            console.log(
              `Không thể click giá trị: ${primaryValue.attributeValue.value}`
            );
            continue;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));

          // 7. Tạo combinations từ các attribute còn lại
          const otherAttributes = attributesData.slice(1);
          const combinations = generateCombinations(otherAttributes);

          console.log(
            `Tạo được ${combinations.length} combinations từ ${otherAttributes.length} attribute phụ`
          );

          // 8. Xử lý từng combination
          for (const combination of combinations) {
            try {
              // Click vào các attribute value trong combination
              let combinationName = `${product.name} - ${primaryValue.attributeValue.value}`;
              let allAttributesSelected = true;

              for (const [attrName, attrValue] of Object.entries(combination)) {
                const attribute = otherAttributes.find(
                  (attr) => attr.name === attrName
                );
                if (!attribute) {
                  console.log(`Không tìm thấy attribute: ${attrName}`);
                  allAttributesSelected = false;
                  continue;
                }

                // Sử dụng safeClick để click an toàn
                const clickSuccess = await safeClick(
                  page,
                  attribute.element,
                  attrValue
                );

                if (clickSuccess) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  combinationName += ` - ${attrValue}`;
                  console.log(`✅ Đã click: ${attrName} = ${attrValue}`);
                } else {
                  console.log(`❌ Không thể click: ${attrName} = ${attrValue}`);
                  allAttributesSelected = false;
                }
              }

              if (!allAttributesSelected) {
                console.log(`⏭️ Bỏ qua combination vì không thể chọn đầy đủ`);
                continue;
              }

              // Chờ giao diện ổn định
              await new Promise((resolve) => setTimeout(resolve, 1500));

              // 9. Lấy thông tin variant
              const variantInfo = await getVariantInfo(
                page,
                productVariantElement
              );

              if (variantInfo) {
                const variantData = {
                  name: combinationName,
                  price: variantInfo.price,
                  image: variantInfo.image,
                  attributes: [
                    { attribute: primaryAttribute, value: primaryValue },
                    ...Object.entries(combination).map(
                      ([attrName, attrValue]) => {
                        const attribute = otherAttributes.find(
                          (attr) => attr.name === attrName
                        );
                        const value = attribute.values.find(
                          (v) => v.attributeValue.value === attrValue
                        );
                        return { attribute, value };
                      }
                    ),
                  ],
                };
                variants.push(variantData);
                console.log(
                  `✅ Đã thu thập variant: ${combinationName} - Giá: ${variantInfo.price}`
                );
              }
            } catch (combinationError) {
              console.log(
                `Lỗi khi xử lý combination:`,
                combinationError.message
              );
            }
          }
        } catch (primaryValueError) {
          console.log(
            `Lỗi khi xử lý giá trị chính ${primaryValue.attributeValue.value}:`,
            primaryValueError.message
          );
        }
      }

      // 10. Lưu dữ liệu vào database
      console.log(`\nĐang lưu ${variants.length} variants vào database...`);

      for (const variant of variants) {
        try {
          // Tạo ProductVariant
          const productVariant = await ProductVariant.create({
            product_id: product.id,
            name: variant.name,
            price: variant.price,
            image: variant.image,
            sku: generateSKU(product.id, variant.name),
          });

          console.log(`Đã tạo ProductVariant: ${variant.name}`);

          // Tạo VariantAttribute records
          for (const attrData of variant.attributes) {
            if (attrData.attribute && attrData.value) {
              await VariantAttribute.create({
                variant_id: productVariant.id,
                attribute_value_id: attrData.value.dbRecord.id,
              });
            }
          }

          console.log(
            `Đã tạo ${variant.attributes.length} VariantAttribute records`
          );
        } catch (saveError) {
          console.log(
            `Lỗi khi lưu variant ${variant.name}:`,
            saveError.message
          );
        }
      }

      console.log(
        `\n✅ Hoàn thành crawl variants cho sản phẩm: ${product.slug}`
      );
      console.log(`📊 Tổng số variants: ${variants.length}`);
    } catch (error) {
      console.log(`❌ Lỗi khi crawl sản phẩm ${product.slug}:`, error.message);
    }
  }

  await browser.close();
  console.log("\n=== HOÀN THÀNH CRAWL TẤT CẢ SẢN PHẨM ===");
}

module.exports = { crawlProductVariants };
