const express = require("express");
const router = express.Router();
const Payment = require("../v1/payment.routes");

router.use("/api/v1/payments", Payment);

module.exports = router;
