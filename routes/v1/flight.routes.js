const router = require('express').Router();
const {
  favoriteDestinations,
} = require('../../controllers/flight.controllers');

router.get('/favorite', favoriteDestinations);

module.exports = router;
