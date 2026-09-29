const express = require("express");

const {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
  deleteConversation,
} = require("../controllers/conversationController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", createConversation);

router.get("/", getConversations);

router.get("/:id", getConversation);

router.put("/:id", updateConversation);

router.delete("/:id", deleteConversation);

module.exports = router;