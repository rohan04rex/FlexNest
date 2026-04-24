# FlexNest - E-Commerce Platform

FlexNest is a premium, modern e-commerce web application featuring a sleek customer-facing storefront and a powerful React-based Admin dashboard. This project is built using a decoupled architecture with an AngularJS frontend, a React admin panel, and a Node.js/Express backend powered by a MySQL database.

## 🚀 Features & Functionalities

### 🛍️ Customer Website (Frontend)
The customer website is designed with a premium, minimalist aesthetic (glassmorphism, clean typography) tailored for fashion and lifestyle products.
* **Modern UI/UX**: Built with HTML5, Vanilla CSS, and Bootstrap 5 for responsiveness.
* **Authentication**: User registration and secure login.
* **Dynamic Shop & Filtering**: Browse products, search dynamically, and filter clothing by Gender (Men/Women/Both) and Type (Tops, Pants, Outerwear, etc.).
* **Cart & Wishlist System**: Add products to cart, increment/decrement quantities, and save items to a wishlist.
* **Checkout Flow**: Seamless checkout process connected to the backend order management system.
* **Contact Us**: Dedicated contact page with form validation. Messages are sent securely to the admin panel.
* **Optimized Performance**: Smooth native CSS scrolling and intersection observers for dynamic reveal animations without heavy libraries.

### 🛡️ Admin Panel (React Dashboard)
A secure admin interface for store owners to manage inventory, sales, and customer engagement.
* **Dashboard Analytics**: Top-level metrics for revenue, active orders, and customer count, alongside a responsive sales area chart.
* **Product Management**: Full CRUD (Create, Read, Update, Delete) capability. Admins can upload new items, modify pricing, and quickly update stock levels.
* **Stock Monitoring**: Automatic badging based on stock status ("Available", "Low Stock Warning", or "Out of Stock").
* **Order Tracking**: View all incoming orders and sequentially update their fulfillment status (Pending -> Processing -> Shipped -> Delivered).
* **Customer Messages**: A dedicated inbox tab to review user inquiries submitted through the frontend "Contact Us" form.

### ⚙️ Backend (Node.js API)
A robust Express.js REST API handling cross-origin traffic from both the admin panel and the customer website.
* **Database**: MySQL relational database holding users, products, orders, cart states, and contact messages.
* **Security**: JWT-based token generation for admin authentication and protected routes.

---

## 🛠️ Project Structure

```text
FlexNest/
├── admin-panel/        # React + Vite application for store management
├── backend/            # Node.js + Express API server (Main API)
├── customer-website/   # AngularJS + Bootstrap 5 storefront (Client)
├── php-api/            # Legacy/Alternative PHP API modules
├── flexnest_db.sql     # Database schema and mock data
└── run_servers.bat     # Windows batch script to launch services
```

---

## 💻 Installation & Setup

To run this project locally, you will need **Node.js**, **npm**, and a local MySQL server (like **XAMPP**).

### 1. Database Setup
1. Open your MySQL client (e.g., via XAMPP phpMyAdmin).
2. Create a new database named `flexnest_db`.
3. Import the `backend/flexnest_db.sql` file into this database to create all necessary tables.

### 2. Install Node Dependencies
Because this project utilizes Node.js and React, you **must download the dependencies for both the backend and the admin panel** before launching the application.

Open your terminal and run the following commands:

**For the Backend:**
```bash
cd backend
npm install
```

**For the Admin Panel:**
```bash
cd admin-panel
npm install
```

### 3. Environment Variables
Create a `.env` file inside the `backend/` directory with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=flexnest_db
PORT=3000
```

### 4. Running the Application
You can start the backend and the React frontend simultaneously using the included batch script (Windows only), or run them manually:

* **Start Backend**: `cd backend && npm start` (Runs on `http://localhost:3000`)
* **Start Admin Panel**: `cd admin-panel && npm run dev` (Runs on `http://localhost:5173`)
* **Customer Website**: Because it uses standard HTML/JS, simply host the `customer-website/` folder on a local server (e.g., Apache via XAMPP, or VSCode Live Server) and open `index.html`.
