const { User, Customer, Cart } = require("@/models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const queue = require("@/utils/queue");

const saltRounds = 10;

class UserService {
  // ✅ Lấy tất cả user
  async getAll() {
    try {
      const users = await User.findAll({ order: [["id", "DESC"]] });
      return { success: true, data: users };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Lỗi khi lấy danh sách user",
      };
    }
  }

  // ✅ Lấy user theo id
  async getById(id) {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: "User không tồn tại" };
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Lỗi khi lấy thông tin user",
      };
    }
  }

  // ✅ Tạo mới user (có hash mật khẩu)
  async create(data) {
    try {
      const existed = await User.findOne({
        where: {
          [Op.or]: [{ email: data.email }, { username: data.username }],
        },
      });

      if (existed)
        return { success: false, message: "Email hoặc username đã tồn tại" };

      // 🔒 Hash mật khẩu
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      // 🎯 Xác định loại user
      let verifiedAt = null;
      if (["admin", "staff"].includes(data.role)) {
        verifiedAt = new Date(); // auto verify cho nội bộ
      }

      // 🧩 Tạo user
      const user = await User.create({
        ...data,
        verified_at: verifiedAt,
      });
      if (!user?.id) {
        throw new Error("Không thể tạo người dùng.");
      }

      const newCustomer = await Customer.create({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      });

      if (!newCustomer?.id) {
        throw new Error("Không thể tạo customer.");
      }

      // 3️⃣ Tạo cart cho customer
      const newCart = await Cart.create({
        customer_id: newCustomer.id,
        // Có thể thêm các trường mặc định khác nếu cần
        status: "active",
        total_amount: 0,
      });

      // ✉️ Nếu là customer thì gửi email verify
      if (!verifiedAt) {
        queue.dispatch("sendVerifyEmailJob", {
          userId: user.id,
          type: "verify",
        });
      }

      return { success: true, data: user };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.message || "Lỗi khi tạo user" };
    }
  }

  // ✅ Cập nhật user (chỉ hash khi password mới được nhập)
  async update(id, data) {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: "User không tồn tại" };

      // ⚡ Nếu không có trường password => không đổi mật khẩu
      if (!data.password || data.password === "") {
        delete data.password;
      } else {
        // 🔒 Nếu có password mới => hash lại
        data.password = await bcrypt.hash(data.password, saltRounds);
      }

      await user.update(data);
      return { success: true, data: user };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: error.message || "Lỗi khi cập nhật user",
      };
    }
  }

  // ✅ Xóa user
  async delete(id) {
    try {
      const user = await User.findByPk(id);
      if (!user) return { success: false, message: "User không tồn tại" };

      await user.destroy();
      return { success: true, message: "Xóa user thành công" };
    } catch (error) {
      return { success: false, message: error.message || "Lỗi khi xóa user" };
    }
  }
}

module.exports = new UserService();
