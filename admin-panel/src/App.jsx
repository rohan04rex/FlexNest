import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = 'http://localhost:3000/api';

// Data Mocks
const chartData = [
  { name: 'Mon', sales: 4000, orders: 240 },
  { name: 'Tue', sales: 3000, orders: 139 },
  { name: 'Wed', sales: 5000, orders: 380 },
  { name: 'Thu', sales: 2780, orders: 190 },
  { name: 'Fri', sales: 6890, orders: 480 },
  { name: 'Sat', sales: 8390, orders: 580 },
  { name: 'Sun', sales: 7490, orders: 430 },
];

const productTypesByGender = {
  Men: ['Tshirt', 'Shirt', 'Pants', 'Outerwear'],
  Women: ['Tops', 'Pants', 'Dresses', 'Outerwear', 'Traditional'],
  Both: ['Tshirt', 'Shirt', 'Pants', 'Outerwear', 'Tops', 'Dresses', 'Traditional']
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // State for modules
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dashboard Stats Computed State
  const [displayChartData, setDisplayChartData] = useState(chartData);
  const [dashboardStats, setDashboardStats] = useState({
    revenue: 37540,
    ordersCount: 1248,
    customersCount: 842
  });
  
  // Modal & Edit State
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  
  // Form state
  const [productForm, setProductForm] = useState({ 
    name: '', brand: '', price: '', stock: '', gender: 'Men', subcategory: '', image: '', description: '' 
  });

  // Fetch data
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders/admin/all`);
      const formattedOrders = res.data.map(order => ({
        ...order,
        date: new Date(order.date).toLocaleString()
      }));
      setOrders(formattedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    // Check auth on mount
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          setIsLoggedIn(true);
          setAdminUser(user);
        }
      } catch(e) {
        console.error("Auth check failed", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      fetchOrders();
    }
  }, [isLoggedIn]);

  // Combine Real Data with Mocks
  useEffect(() => {
    let realRevenue = 0;
    let realCustomers = new Set();
    const newChartData = JSON.parse(JSON.stringify(chartData));
    const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };

    orders.forEach(order => {
      const orderTotal = Number(order.total) || 0;
      realRevenue += orderTotal;
      if (order.user_id) realCustomers.add(order.user_id);
      if (order.customer) realCustomers.add(order.customer);

      const d = new Date(order.date);
      if (!isNaN(d.getTime())) {
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayMap[dayStr] !== undefined) {
          newChartData[dayMap[dayStr]].sales += orderTotal;
          newChartData[dayMap[dayStr]].orders += 1;
        }
      }
    });

    setDashboardStats({
      revenue: 37540 + realRevenue,
      ordersCount: 1248 + orders.length,
      customersCount: 842 + realCustomers.size
    });
    setDisplayChartData(newChartData);
  }, [orders]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });
      
      if (res.data.user.role !== 'admin') {
        setLoginError('Access denied: Administrator privileges required.');
      } else {
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('adminUser', JSON.stringify(res.data.user));
        setAdminUser(res.data.user);
        setIsLoggedIn(true);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsLoggedIn(false);
    setAdminUser(null);
    setActiveTab('dashboard');
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setProductForm({ name: '', brand: '', price: '', stock: '', gender: 'Men', subcategory: '', image: '', description: '' });
    setShowProductModal(true);
  };

  const handleOpenEditModal = (product) => {
    setIsEditing(true);
    setEditProductId(product.id || product._id);
    setProductForm({
      name: product.name,
      brand: product.brand,
      price: product.price,
      stock: product.stock,
      gender: product.gender,
      subcategory: product.subcategory,
      image: product.image || '',
      description: product.description || ''
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        status: parseInt(productForm.stock) === 0 ? 'Out of Stock' : 'Available'
      };

      if (isEditing) {
        await axios.put(`${API_BASE_URL}/products/${editProductId}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/products`, payload);
      }
      
      setShowProductModal(false);
      fetchProducts(); // Refresh list
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Failed to save product.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!id) {
        alert("Product ID is missing. Cannot delete.");
        return;
    }
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`${API_BASE_URL}/products/${id}`);
        fetchProducts(); // Refresh list
      } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product.");
      }
    }
  };

  const handleGenderChange = (gender) => {
    setProductForm({...productForm, gender: gender, subcategory: ''});
  };
  
  const updateStockQuickly = async (productId, newStock) => {
    try {
      const product = products.find(p => (p.id || p._id) === productId);
      const stockVal = parseInt(newStock);
      const status = stockVal === 0 ? 'Out of Stock' : 'Available';
      
      await axios.put(`${API_BASE_URL}/products/${productId}`, {
        ...product,
        stock: stockVal,
        status: status
      });
      
      setProducts(products.map(p => (p.id || p._id) === productId ? { ...p, stock: stockVal, status } : p));
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      await axios.put(`${API_BASE_URL}/orders/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update order status.");
      fetchOrders();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-logo">FLEXNEST</div>
          <div className="login-subtitle">Admin Dashboard</div>
          
          {loginError && (
            <div style={{
              padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--danger)', borderRadius: '0.75rem', 
              marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Administrator Email</label>
              <input 
                type="email" 
                required 
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
                placeholder="admin@flexnest.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                required 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem', padding: '1rem'}} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          FLEXNEST
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Products
          </div>
          <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Orders
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content glass-panel">
        <header className="topbar">
          <div className="topbar-title">
            {activeTab === 'dashboard' && 'Overview'}
            {activeTab === 'products' && 'Product Management'}
            {activeTab === 'orders' && 'Order Management'}
          </div>
          <div className="topbar-actions">
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2}}>
              <span style={{fontWeight: 600}}>{adminUser?.name || 'Admin'}</span>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{adminUser?.email}</span>
            </div>
            <div className="avatar">{adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}</div>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary" style={{marginLeft: '1rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <div className="content-area">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <>
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-title">Total Revenue</div>
                  <div className="stat-value">${dashboardStats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500}}>+12.5% from last week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Orders</div>
                  <div className="stat-value">{dashboardStats.ordersCount.toLocaleString()}</div>
                  <div style={{color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500}}>+5.2% from last week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Active Customers</div>
                  <div className="stat-value">{dashboardStats.customersCount.toLocaleString()}</div>
                  <div style={{color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500}}>-1.1% from last week</div>
                </div>
              </div>

              <div className="chart-section">
                <div className="section-header">
                  <h2 className="section-title">Sales Analytics</h2>
                  <select defaultValue="7" style={{width: 'auto', padding: '0.25rem 2rem 0.25rem 1rem', fontSize: '0.875rem'}}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                </div>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="#1a1a1a" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <>
              <div className="section-header">
                <div>
                  <h2 className="section-title">Inventory</h2>
                  <p className="stat-title" style={{marginBottom: '1rem'}}>Manage your store's products and stock levels.</p>
                  
                  <div style={{position: 'relative', width: '300px', marginTop: '1rem'}}>
                    <input 
                      type="text" 
                      placeholder="Search products or brands..." 
                      style={{paddingLeft: '3rem', fontSize: '0.9rem'}}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg 
                      style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} 
                      width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddModal}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th>Gender</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(product => (
                      <tr key={product.id || product._id}>
                        <td style={{fontWeight: 500}}>{product.name}</td>
                        <td style={{color: 'var(--text-muted)'}}>{product.brand}</td>
                        <td><span className="badge badge-primary">{product.gender || '—'}</span></td>
                        <td style={{color: 'var(--text-muted)'}}>{product.subcategory || '—'}</td>
                        <td>${Number(product.price).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${
                            product.status === 'Available' ? 'badge-success' : 
                            (product.stock < 10 && product.stock > 0) ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {product.status} ({product.stock})
                          </span>
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEditModal(product)}>Modify</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteProduct(product.id || product._id)}>Remove</button>
                            <div style={{display: 'flex', gap: '0.25rem', alignItems: 'center', marginLeft: '0.5rem'}}>
                                <input 
                                  type="number" 
                                  style={{width: '60px', padding: '0.3rem'}} 
                                  defaultValue={product.stock}
                                  onBlur={(e) => updateStockQuickly(product.id || product._id, e.target.value)}
                                />
                                <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Stock</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <>
              <div className="section-header">
                <div>
                  <h2 className="section-title">Recent Orders</h2>
                  <p className="stat-title" style={{marginBottom: 0}}>View and manage customer orders.</p>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td style={{fontWeight: 600}}>{order.id}</td>
                        <td style={{color: 'var(--text-muted)'}}>{order.date}</td>
                        <td>{order.customer}</td>
                        <td style={{fontWeight: 500}}>${Number(order.total).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${
                            order.status === 'Delivered' ? 'badge-success' : 
                            order.status === 'Pending' ? 'badge-warning' : 
                            order.status === 'Processing' ? 'badge-primary' : 'badge-primary'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <select 
                            style={{width: '130px', padding: '0.4rem', fontSize: '0.875rem'}}
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Product Modal (Add/Edit) */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Modify Product' : 'Add New Product'}</h3>
              <button className="close-btn" onClick={() => setShowProductModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  required 
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  placeholder="e.g. CLASSIC TOTE"
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input 
                  type="text" 
                  required 
                  value={productForm.brand}
                  onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                  placeholder="e.g. FLEXNEST"
                />
              </div>
              <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                <div style={{flex: 1}}>
                  <label>Gender</label>
                  <select
                    required
                    value={productForm.gender}
                    onChange={(e) => handleGenderChange(e.target.value)}
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Both">Both (Men & Women)</option>
                  </select>
                </div>
                <div style={{flex: 1}}>
                  <label>Product Type</label>
                  <select
                    required
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm({...productForm, subcategory: e.target.value})}
                  >
                    <option value="">Select type...</option>
                    {(productTypesByGender[productForm.gender] || []).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                <div style={{flex: 1}}>
                  <label>Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div style={{flex: 1}}>
                  <label>Stock</label>
                  <input 
                    type="number" 
                    required 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input 
                  type="text" 
                  value={productForm.image}
                  onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                {isEditing ? (
                  <button type="button" className="btn btn-danger" onClick={() => {
                    handleDeleteProduct(editProductId);
                    setShowProductModal(false);
                  }}>Delete Product</button>
                ) : <div />}
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{isEditing ? 'Update Changes' : 'Save Product'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
