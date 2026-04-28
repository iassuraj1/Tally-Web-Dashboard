const express = require('express');
const router = express.Router();
const { getProducts, getProduct, seedProducts } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/seed', seedProducts);
router.get('/:id', getProduct);

module.exports = router;
