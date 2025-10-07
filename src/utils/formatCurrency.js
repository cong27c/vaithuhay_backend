const formatCurrency = (value) => {
  if (value == null) return null;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

module.exports = formatCurrency;
