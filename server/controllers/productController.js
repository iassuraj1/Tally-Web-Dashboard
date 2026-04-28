const Product = require('../models/Product');

const getProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    const products = await Product.find(filter).sort({ isPopular: -1, createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const seedProducts = async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = [
      {
        name: 'TallyPrime',
        tagline: 'Business Management Software',
        description: 'TallyPrime is a complete business management software that helps you manage accounting, inventory, banking, payroll, and more.',
        features: ['Accounting', 'Inventory Management', 'GST Billing', 'Payroll', 'Banking', 'MIS Reports'],
        price: 'Contact for pricing',
        category: 'accounting',
        isPopular: true,
      },
      {
        name: 'TallyPrime Edit Log',
        tagline: 'Audit Trail Solution',
        description: 'Track every change made to your financial data with TallyPrime Edit Log - the comprehensive audit trail solution.',
        features: ['Edit Log', 'Audit Trail', 'Compliance', 'Security', 'Change History'],
        price: 'Contact for pricing',
        category: 'accounting',
        isPopular: false,
      },
      {
        name: 'Shoper 9',
        tagline: 'Retail Management Software',
        description: 'Shoper 9 is a comprehensive retail management solution for single and multi-store operations.',
        features: ['POS Billing', 'Inventory', 'Customer Management', 'Loyalty Programs', 'Reports'],
        price: 'Contact for pricing',
        category: 'inventory',
        isPopular: false,
      },
      {
        name: 'TallyPrime Server',
        tagline: 'Enterprise Solution',
        description: 'TallyPrime Server is the ideal solution for large enterprises that need concurrent data access with high performance.',
        features: ['Multi-user Access', 'High Performance', 'Data Security', 'Concurrent Access', 'Scalable'],
        price: 'Contact for pricing',
        category: 'accounting',
        isPopular: false,
      },
    ];
    await Product.insertMany(products);
    res.json({ success: true, message: 'Products seeded successfully.', count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getProducts, getProduct, seedProducts };
