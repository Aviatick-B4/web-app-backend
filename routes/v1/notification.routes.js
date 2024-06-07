const router = require('express').Router();
const { getAll, create } = require('../../controllers/notification.controller');
const {
  restrict,
  isAdmin,
  isUser,
} = require('../../middlewares/auth.middleware');

router.get('/', restrict, getAll);
router.post('/', restrict, isAdmin, create);

module.exports = router;
