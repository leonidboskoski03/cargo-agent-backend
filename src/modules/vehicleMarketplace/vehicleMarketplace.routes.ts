import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createVehicleMarketplaceInquiry,
  createVehicleMarketplaceListing,
  deleteVehicleMarketplaceListing,
  getVehicleMarketplaceListing,
  listMyVehicleMarketplaceListings,
  listVehicleMarketplaceInquiries,
  listVehicleMarketplaceListings,
  restoreVehicleMarketplaceListing,
  updateVehicleMarketplaceInquiry,
  updateVehicleMarketplaceListing,
} from "./vehicleMarketplace.controller.js";
import {
  createListingInquirySchema,
  createListingSchema,
  deleteListingSchema,
  getListingSchema,
  listInquiriesSchema,
  listListingsSchema,
  restoreListingSchema,
  updateInquirySchema,
  updateListingSchema,
} from "./vehicleMarketplace.validator.js";

export const vehicleMarketplaceRouter = Router();

vehicleMarketplaceRouter.get("/", requireAuth, validate(listListingsSchema), asyncRoute(listVehicleMarketplaceListings));
vehicleMarketplaceRouter.get("/mine", requireAuth, validate(listListingsSchema), asyncRoute(listMyVehicleMarketplaceListings));
vehicleMarketplaceRouter.get("/inquiries", requireAuth, validate(listInquiriesSchema), asyncRoute(listVehicleMarketplaceInquiries));
vehicleMarketplaceRouter.patch(
  "/inquiries/:inquiryId",
  requireAuth,
  validate(updateInquirySchema),
  asyncRoute(updateVehicleMarketplaceInquiry),
);
vehicleMarketplaceRouter.post("/", requireAuth, validate(createListingSchema), asyncRoute(createVehicleMarketplaceListing));
vehicleMarketplaceRouter.get("/:listingId", requireAuth, validate(getListingSchema), asyncRoute(getVehicleMarketplaceListing));
vehicleMarketplaceRouter.patch(
  "/:listingId",
  requireAuth,
  validate(updateListingSchema),
  asyncRoute(updateVehicleMarketplaceListing),
);
vehicleMarketplaceRouter.delete(
  "/:listingId",
  requireAuth,
  validate(deleteListingSchema),
  asyncRoute(deleteVehicleMarketplaceListing),
);
vehicleMarketplaceRouter.post(
  "/:listingId/restore",
  requireAuth,
  validate(restoreListingSchema),
  asyncRoute(restoreVehicleMarketplaceListing),
);
vehicleMarketplaceRouter.post(
  "/:listingId/inquiries",
  requireAuth,
  validate(createListingInquirySchema),
  asyncRoute(createVehicleMarketplaceInquiry),
);
