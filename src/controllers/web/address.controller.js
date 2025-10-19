const addressService = require("@/services/address.service");

const createAddress = async (req, res) => {
  try {
    const customerId = req.user?.customerId;
    const result = await addressService.createAddress({
      ...req.body,
      customerId,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getAddresses = async (req, res) => {
  try {
    const customerId = req.user?.customerId;
    const result = await addressService.getAddressesByCustomer(customerId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.customerId;
    const result = await addressService.updateAddress(id, {
      ...req.body,
      customerId,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await addressService.deleteAddress(id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
};
