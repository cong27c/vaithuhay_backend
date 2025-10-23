const {
  Cart,
  CartItem,
  PreorderRegistration,
  PreorderSlot,
  sequelize,
} = require("@/models");
const { Op } = require("sequelize");

const mergeGuestDataToCustomer = async (guestSessionId, customerId) => {
  const t = await sequelize.transaction();
  try {
    console.log(
      "🔄 Merging guestSession:",
      guestSessionId,
      "→ customer:",
      customerId
    );

    // 1️⃣ GỘP CART
    const guestCart = await Cart.findOne({
      where: { session_id: guestSessionId, status: "active" },
      include: [{ model: CartItem, as: "items" }],
      transaction: t,
    });

    if (guestCart) {
      // Tìm hoặc tạo cart của customer
      let customerCart = await Cart.findOne({
        where: { customer_id: customerId, status: "active" },
        include: [{ model: CartItem, as: "items" }],
        transaction: t,
      });

      if (!customerCart) {
        customerCart = await Cart.create(
          { customer_id: customerId, status: "active" },
          { transaction: t }
        );
      }

      // Gộp từng CartItem
      for (const item of guestCart.items) {
        // Kiểm tra nếu sản phẩm này đã có trong cart thật → cộng dồn quantity
        const existingItem = customerCart.items.find(
          (i) =>
            i.product_id === item.product_id &&
            i.variant_id === item.variant_id &&
            i.tier_id === item.tier_id &&
            i.preorder_slot_id === item.preorder_slot_id
        );

        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.total_price =
            parseFloat(existingItem.unit_price) * existingItem.quantity;
          await existingItem.save({ transaction: t });
        } else {
          await CartItem.create(
            {
              cart_id: customerCart.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              preorder_slot_id: item.preorder_slot_id,
              tier_id: item.tier_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            },
            { transaction: t }
          );
        }
      }

      // Xoá cart guest sau khi merge xong (nếu muốn dọn dẹp)
      await CartItem.destroy({
        where: { cart_id: guestCart.id },
        transaction: t,
      });
      await guestCart.destroy({ transaction: t });
    }

    // 2️⃣ GỘP PREORDER REGISTRATION
    const guestRegistrations = await PreorderRegistration.findAll({
      where: { guest_session_id: guestSessionId },
      transaction: t,
    });

    for (const reg of guestRegistrations) {
      // Kiểm tra xem customer này đã đăng ký preorder đó chưa
      const existing = await PreorderRegistration.findOne({
        where: {
          campaign_id: reg.campaign_id,
          product_id: reg.product_id,
          customer_id: customerId,
        },
        transaction: t,
      });

      if (existing) {
        // Nếu customer đã có preorder rồi → bỏ qua (tránh trùng)
        continue;
      }

      // Nếu chưa có → cập nhật guest → customer
      reg.customer_id = customerId;
      reg.guest_session_id = null;
      await reg.save({ transaction: t });

      // Gắn luôn slot liên quan
      await PreorderSlot.update(
        { status: "reserved" }, // có thể thêm cập nhật khác nếu cần
        { where: { registration_id: reg.id }, transaction: t }
      );
    }

    await t.commit();
    console.log("✅ Merge guest data → customer thành công");
  } catch (err) {
    await t.rollback();
    console.error("❌ mergeGuestDataToCustomer error:", err);
  }
};

module.exports = {
  mergeGuestDataToCustomer,
};
