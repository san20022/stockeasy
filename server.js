const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
  }
}

async function readProducts() {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(data || '[]');
}

async function writeProducts(products) {
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2));
}

function validateProduct(product) {
  const errors = [];
  if (!product.name || product.name.trim().length < 2) errors.push('Product name must be at least 2 characters.');
  if (!product.category || product.category.trim().length < 2) errors.push('Category is required.');
  if (Number.isNaN(Number(product.quantity)) || Number(product.quantity) < 0) errors.push('Quantity must be 0 or greater.');
  if (Number.isNaN(Number(product.price)) || Number(product.price) < 0) errors.push('Price must be 0 or greater.');
  return errors;
}

app.get('/api/products', async (req, res) => {
  try {
    let products = await readProducts();
    const { search, category, status } = req.query;

    if (search) {
      const term = search.toLowerCase();
      products = products.filter((p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
      );
    }

    if (category && category !== 'All') {
      products = products.filter((p) => p.category === category);
    }

    if (status === 'low') {
      products = products.filter((p) => Number(p.quantity) <= 5);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Unable to read products.' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const products = await readProducts();
    const newProduct = {
      id: cryptoRandomId(),
      name: req.body.name.trim(),
      category: req.body.category.trim(),
      quantity: Number(req.body.quantity),
      price: Number(req.body.price),
      description: (req.body.description || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    products.push(newProduct);
    await writeProducts(products);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create product.' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const products = await readProducts();
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Product not found.' });

    products[index] = {
      ...products[index],
      name: req.body.name.trim(),
      category: req.body.category.trim(),
      quantity: Number(req.body.quantity),
      price: Number(req.body.price),
      description: (req.body.description || '').trim(),
      updatedAt: new Date().toISOString()
    };

    await writeProducts(products);
    res.json(products[index]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update product.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const products = await readProducts();
    const filteredProducts = products.filter((p) => p.id !== req.params.id);
    if (products.length === filteredProducts.length) return res.status(404).json({ message: 'Product not found.' });
    await writeProducts(filteredProducts);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete product.' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const products = await readProducts();
    const totalProducts = products.length;
    const totalUnits = products.reduce((sum, p) => sum + Number(p.quantity), 0);
    const totalValue = products.reduce((sum, p) => sum + Number(p.quantity) * Number(p.price), 0);
    const lowStock = products.filter((p) => Number(p.quantity) <= 5).length;
    res.json({ totalProducts, totalUnits, totalValue, lowStock });
  } catch {
    res.status(500).json({ message: 'Unable to calculate stats.' });
  }
});

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

app.listen(PORT, () => {
  console.log(`StockEasy is running at http://localhost:${PORT}`);
});
