"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = exports.removeReview = exports.updateMyReview = exports.addReview = exports.getReviews = void 0;
const review_service_1 = require("./review.service");
const getReviews = async (req, res) => {
    try {
        const reviews = await (0, review_service_1.listReviews)(req.query);
        res.json(reviews);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getReviews = getReviews;
const addReview = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const review = await (0, review_service_1.createReview)(req.userId, req.body);
        res.status(201).json({ review });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.addReview = addReview;
const updateMyReview = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const review = await (0, review_service_1.updateReview)(req.userId, req.params.id, req.body);
        res.json({ review });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateMyReview = updateMyReview;
const removeReview = async (req, res) => {
    try {
        await (0, review_service_1.deleteReviewByAdmin)(req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.removeReview = removeReview;
const getSummary = async (req, res) => {
    try {
        const summary = await (0, review_service_1.getRatingSummary)(req.query.product_id || "");
        res.json({ summary });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getSummary = getSummary;
