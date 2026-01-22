const express = require("express");
const router = express.Router();

const { semanticSearch } = require("../controllers/SearchController");

router.get("/semantic", semanticSearch);

module.exports = router;
