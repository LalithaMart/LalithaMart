# Lalitha Mart - Full-Stack E-commerce Grocery Website

This project is a complete full-stack e-commerce website with three separate portals: Admin, Customer, and Delivery.

## Architecture
- **Backend**: Node.js, Express, MongoDB
- **Frontend**: React (Vite), Tailwind CSS, Zustand, React Router

## Project Structure
- `backend/`: Contains all server-side code (models, controllers, routes, middleware).
- `frontend/`: Contains all client-side code (React application).

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` directory.
2. Run `npm install` to install all dependencies.
3. Copy `.env.example` to `.env` and update the `MONGO_URI` if necessary.
4. Run `node seed.js` to seed the database with an initial Admin profile (Phone: 9999999999, Password: adminpassword).
5. Run `npm run dev` to start the backend server on `http://localhost:5000`.

### 2. Frontend Setup
1. Open a separate terminal and navigate to the `frontend` directory.
2. Run `npm install` to install all dependencies.
3. Run `npm run dev` to start the Vite development server.
4. Access the application in your browser (usually at `http://localhost:3000` or `http://localhost:5173`).

## Current Implementation Status
- **Backend**: Fully implemented (Authentication, Admin routes, Customer routes, Delivery routes).
- **Frontend Foundation**: Layouts, Routing, Auth Store, Axios instance implemented.
- **Authentication UI**: Login and Register pages are functional.
- **Pending**: Admin CRUD screens, Customer shopping flow, Delivery tracking interface.
