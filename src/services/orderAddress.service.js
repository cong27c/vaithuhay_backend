// services/orderAddressService.js
const { OrderAddress } = require("@/models");

const createOrderAddress = async (orderId, data) => {
  try {
    const requiredFields = ["full_name", "phone", "street_address"];
    const missing = requiredFields.filter((f) => !data[f]);
    if (missing.length) {
      return {
        success: false,
        message: `Missing fields: ${missing.join(", ")}`,
      };
    }

    const addressData = {
      order_id: orderId,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      province: data.province,
      district: data.district,
      ward: data.ward,
      street_address: data.street_address,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const orderAddress = await OrderAddress.create(addressData);
    return { success: true, data: orderAddress };
  } catch (error) {
    console.error("Error creating order address:", error);
    return { success: false, message: error.message };
  }
};

module.exports = { createOrderAddress };
