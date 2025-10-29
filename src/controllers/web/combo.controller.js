const ComboService = require("@/services/combo.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

class ComboController {
  static async getCombosDetail(req, res) {
    try {
      const comboDetails = await ComboService.getAllCombosWithDetails();

      if (!comboDetails) {
        throwError(404, "Combo not found");
      }

      return success(res, 200, comboDetails);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  static async getAllCombos(req, res) {
    try {
      const combos = await ComboService.getAllCombos();

      return success(res, 200, {
        combos,
        count: combos.length,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  static async getActiveCombos(req, res) {
    try {
      const { page = 1, limit = 10, author, style } = req.query;

      const result = await ComboService.getActiveCombos({
        page: parseInt(page),
        limit: parseInt(limit),
        author,
        style,
      });

      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  static async getComboProducts(req, res) {
    try {
      const { comboId } = req.params;

      if (!comboId) {
        return res.status(400).json({
          success: false,
          message: "Combo ID is required",
        });
      }

      const result = await ComboService.getProductsByCombo(comboId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = ComboController;
