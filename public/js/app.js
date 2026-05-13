const productForm = document.querySelector('#productForm');
const productTable = document.querySelector('#productTable');
const formMessage = document.querySelector('#formMessage');
const formTitle = document.querySelector('#formTitle');
const cancelEdit = document.querySelector('#cancelEdit');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#search');
const categoryFilter = document.querySelector('#categoryFilter');
const statusFilter = document.querySelector('#statusFilter');

const fields = {
  id: document.querySelector('#productId'),
  name: document.querySelector('#name'),
  category: document.querySelector('#category'),
  quantity: document.querySelector('#quantity'),
  price: document.querySelector('#price'),
  description: document.querySelector('#description')
};

let allProducts = [];

async function loadProducts() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
  if (categoryFilter.value !== 'All') params.append('category', categoryFilter.value);
  if (statusFilter.value !== 'all') params.append('status', statusFilter.value);

  const response = await fetch(`/api/products?${params.toString()}`);
  const products = await response.json();
  renderProducts(products);
  await loadStats();
  await loadCategories();
}

async function loadCategories() {
  const response = await fetch('/api/products');
  allProducts = await response.json();
  const selected = categoryFilter.value;
  const categories = [...new Set(allProducts.map((p) => p.category))].sort();
  categoryFilter.innerHTML = '<option value="All">All Categories</option>' + categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  categoryFilter.value = categories.includes(selected) ? selected : 'All';
}

async function loadStats() {
  const response = await fetch('/api/stats');
  const stats = await response.json();
  document.querySelector('#totalProducts').textContent = stats.totalProducts;
  document.querySelector('#totalUnits').textContent = stats.totalUnits;
  document.querySelector('#totalValue').textContent = formatCurrency(stats.totalValue);
  document.querySelector('#heroValue').textContent = formatCurrency(stats.totalValue);
  document.querySelector('#lowStock').textContent = stats.lowStock;
}

function renderProducts(products) {
  emptyState.style.display = products.length ? 'none' : 'block';
  productTable.innerHTML = products.map((product) => `
    <tr>
      <td>
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-description">${escapeHtml(product.description || 'No description added')}</div>
      </td>
      <td>${escapeHtml(product.category)}</td>
      <td>${product.quantity <= 5 ? '⚠️ ' : ''}${product.quantity}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>
        <div class="action-buttons">
          <button class="small-btn" onclick='editProduct(${JSON.stringify(product)})'>Edit</button>
          <button class="small-btn" onclick='deleteProduct("${product.id}")'>Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const product = {
    name: fields.name.value,
    category: fields.category.value,
    quantity: fields.quantity.value,
    price: fields.price.value,
    description: fields.description.value
  };

  const isEditing = Boolean(fields.id.value);
  const url = isEditing ? `/api/products/${fields.id.value}` : '/api/products';
  const method = isEditing ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });

  const result = await response.json();
  if (!response.ok) {
    formMessage.textContent = result.message || 'Something went wrong.';
    return;
  }

  formMessage.textContent = isEditing ? 'Product updated successfully.' : 'Product added successfully.';
  resetForm();
  await loadProducts();
});

window.editProduct = function(product) {
  fields.id.value = product.id;
  fields.name.value = product.name;
  fields.category.value = product.category;
  fields.quantity.value = product.quantity;
  fields.price.value = product.price;
  fields.description.value = product.description || '';
  formTitle.textContent = 'Edit Product';
  formMessage.textContent = 'Editing selected product.';
  window.scrollTo({ top: document.querySelector('#inventory').offsetTop, behavior: 'smooth' });
};

window.deleteProduct = async function(id) {
  const confirmed = confirm('Are you sure you want to delete this product?');
  if (!confirmed) return;
  await fetch(`/api/products/${id}`, { method: 'DELETE' });
  await loadProducts();
};

function resetForm() {
  productForm.reset();
  fields.id.value = '';
  formTitle.textContent = 'Add New Product';
}

cancelEdit.addEventListener('click', () => {
  resetForm();
  formMessage.textContent = '';
});

[searchInput, categoryFilter, statusFilter].forEach((input) => {
  input.addEventListener('input', loadProducts);
  input.addEventListener('change', loadProducts);
});

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

loadProducts();
