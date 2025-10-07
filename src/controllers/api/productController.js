const productService = require("@/services/product.service");

exports.createProduct = async (req, res) => {
  try {
    const product = await productService.create(req.body);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  const products = await productService.findAll();
  res.json(products);
};
