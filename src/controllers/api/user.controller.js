const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const userService = require("@/services/user.service");

const getAll = async (req, res) => {
  try {
    const result = await userService.getAll();
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const getById = async (req, res) => {
  try {
    const result = await userService.getById(req.params.id);
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const create = async (req, res) => {
  try {
    const result = await userService.create(req.body);
    return success(res, 201, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const update = async (req, res) => {
  try {
    const result = await userService.update(req.params.id, req.body);
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const remove = async (req, res) => {
  try {
    const result = await userService.delete(req.params.id);
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
