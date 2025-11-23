# 🔐 Node.js Authentication System

A modular, production-ready authentication system built using **Node.js**, **Express**, **MongoDB**, **JWT**, **Joi validation**, and **Nodemailer (SMTP)**.  
This project includes secure **user registration**, **login**, **email verification**, **protected routes**, **refresh token rotation**, and follows best practices for clean, scalable backend development.

---

## 🚀 Features

- User Signup & Login  
- Email Verification via Nodemailer + SMTP  
- JWT Access Token + Refresh Token Authentication  
- Protected Routes  
- Secure Password Hashing (bcrypt)  
- Input Validation using Joi  
- Centralized Error Handling  
- Modular Scalable Folder Architecture  
- Environment-based Configuration  

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (Access + Refresh Tokens) |
| Validation | Joi |
| Emailing | Nodemailer + SMTP |
| Environment | dotenv |

---

## 📁 Folder Structure
src/
┣ controllers/
┣ routes/
┣ middleware/
┃ ┣ auth.middleware.js
┃ ┗ validate.middleware.js
┣ validations/
┣ models/
┣ services/
┣ utils/
┣ config/
┗ server.js


---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```sh
git clone https://github.com/Seva-me/node-auth-system
cd node-auth-system


Create a .env file in root directory

PORT=5000
MONGO_URI=your_mongodb_connection_string

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

BASE_URL=http://localhost:5000

