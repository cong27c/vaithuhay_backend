const { Address } = require("@/models");
const createAddress = async (data) => {
  try {
    // Validate required fields - SỬA THEO DATA THỰC TẾ
    const requiredFields = ["fullName", "phone", "address", "customerId"];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    // If this address is default, set all other addresses of customer to non-default
    if (data.is_default) {
      await Address.update(
        { is_default: false },
        {
          where: {
            customer_id: data.customerId,
          },
        }
      );
    }

    // Tạo địa chỉ với field mapping chính xác
    const addressData = {
      full_name: data.fullName,
      phone: data.phone,
      email: data.email || null,
      street_address: data.address, // Địa chỉ cụ thể
      province: data.province, // Mã tỉnh '14'
      district: data.district, // Mã huyện '124'
      ward: data.ward, // Mã xã '04075'
      is_default: data.is_default || data.isDefault || false,
      address_type: data.type || data.address_type || "home", // Dùng 'type' từ data
      customer_id: data.customerId, // Dùng 'customerId' từ data
    };

    console.log("Creating address with:", addressData); // Debug

    const address = await Address.create(addressData);

    return {
      success: true,
      message: "Address created successfully",
      data: address,
    };
  } catch (error) {
    console.log("Error creating address:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};
const getAddressesByCustomer = async (customerId) => {
  try {
    const addresses = await Address.findAll({
      where: { customer_id: customerId },
      order: [
        ["is_default", "DESC"],
        ["created_at", "DESC"],
      ],
    });
    return {
      success: true,
      data: addresses,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

const updateAddress = async (id, data) => {
  try {
    // Validate required fields
    if (!data.fullName || !data.phone || !data.address) {
      return {
        success: false,
        message: "Missing required fields: fullName, phone, address",
      };
    }

    const address = await Address.findByPk(id);
    if (!address) {
      return {
        success: false,
        message: "Address not found",
      };
    }
    console.log(address);
    // If updating to default, set all other addresses to non-default
    if (data.is_default) {
      await Address.update(
        { is_default: false },
        { where: { customer_id: address.customer_id } }
      );
    }

    await address.update(data);
    return {
      success: true,
      message: "Address updated successfully",
      data: address,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const deleteAddress = async (id) => {
  try {
    const address = await Address.findByPk(id);
    if (!address) {
      return {
        success: false,
        message: "Ko tìm thấy địa chỉ này",
      };
    }

    await address.destroy();
    return {
      success: true,
      message: "Xóa địa chỉ thành công",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = {
  createAddress,
  getAddressesByCustomer,
  updateAddress,
  deleteAddress,
};
