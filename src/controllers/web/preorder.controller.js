"use strict";

const PreorderService = require("@/services/preOrder.service");
const { success, error } = require("@/utils/response");

const register = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // guestSessionMiddleware đã gắn req.guestSession
    const result = await PreorderService.register(
      req.body,
      req.user || null,
      ip,
      userAgent,
      req.guestSession
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to register preorder" });
  }
};

const getUpcomingCampaigns = async (req, res) => {
  try {
    const result = await PreorderService.getUpcomingCampaigns();
    return success(res, 200, result);
  } catch (err) {
    console.error("Error in getUpcomingCampaigns controller:", err);
    return error(res, err.status || 500, err.message, err.errors);
  }
};
const createCampaign = async (req, res) => {
  try {
    const { productId, startDate, endDate, tiers, note } = req.body;
    if (
      !productId ||
      !startDate ||
      !endDate ||
      !Array.isArray(tiers) ||
      tiers.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const campaign = await PreorderService.createCampaign({
      productId,
      startDate,
      endDate,
      tiersData: tiers,
      note,
    });

    return res.status(201).json({ message: "Campaign created", campaign });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await PreorderService.getActiveCampaigns();
    return res.json({ campaigns });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const getCampaignDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await PreorderService.getCampaignDetail(id);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    return res.json({ campaign });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { campaignId, tierId, quantity = 1, guestEmail = null } = req.body;
    // assume authentication middleware sets req.user
    const userId = req.user ? req.user.id : null;

    if (!campaignId || !tierId)
      return res.status(400).json({ message: "Missing campaignId or tierId" });

    const { order } = await PreorderService.placePreorder({
      userId,
      guestEmail,
      campaignId,
      tierId,
      quantity,
    });

    return res.status(201).json({ message: "Preorder placed", order });
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ message: err.message || "Cannot place preorder" });
  }
};

module.exports = {
  getUpcomingCampaigns,
  createCampaign,
  getCampaigns,
  getCampaignDetail,
  placeOrder,
  register,
};
