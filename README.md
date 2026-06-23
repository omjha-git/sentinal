# 🚀 Sentinal AI IDE

An AI-powered full-stack development workspace that helps developers create, manage, edit, and improve projects with intelligent assistance.

![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen)
![Gemini](https://img.shields.io/badge/Google-Gemini-orange)

---

## 🌐 Live Demo

🔗 https://sentinal-ochre.vercel.app

## 📂 GitHub Repository

🔗 https://github.com/omjha-git/sentinal

---

## ✨ Features

### 🤖 AI Assistant

* AI-powered coding help
* Code explanation
* Code refactoring
* Project-wide modifications
* Smart suggestions

### 💻 Development Workspace

* Multi-tab code editor
* File & folder explorer
* Project management dashboard
* Live application preview
* Integrated terminal

### 📦 Project Management

* Create projects
* Delete projects
* Rename projects
* Save project files
* Persistent storage

### 🔗 GitHub Integration

* Import repositories
* Browse imported files
* Project file hierarchy generation

### 🔐 Authentication

* Sign Up / Sign In
* Secure user sessions
* User-specific projects

### ☁️ Cloud Deployment

* Frontend deployed on Vercel
* Backend deployed on Render
* MongoDB Atlas database

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* Zustand
* Framer Motion
* React Resizable Panels
* Monaco/CodeMirror Editor
* Clerk Authentication

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose

### AI

* Google Gemini API
* Groq API (Fallback)

### External Services

* Firecrawl
* GitHub API
* Inngest

### Deployment

* Vercel
* Render
* MongoDB Atlas

---

## 🏗️ Architecture

```text
Frontend (React + Vite)
        │
        ▼
Express Backend API
        │
 ┌──────┼──────┐
 ▼      ▼      ▼
MongoDB Gemini GitHub
        │
        ▼
   AI Features
```

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone https://github.com/omjha-git/sentinal.git
cd sentinal
```

### Install Dependencies

```bash
npm install
```

### Create .env

```env
MONGO_URL=your_mongodb_url

CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

GROQ_API_KEY=your_groq_key

FIRECRAWL_API_KEY=your_firecrawl_key
```

### Run Backend

```bash
nodemon app.js
```

### Run Frontend

```bash
cd client
npm install
npm run dev
```

---

## 📸 Screenshots

### Dashboard

* Project creation
* Project management
* Repository import

### IDE Workspace

* Code editor
* AI assistant
* Terminal
* Preview

### AI Features

* Generate code
* Modify projects
* Explain code
* Refactor code

---

## 📈 Future Improvements

* AI Agent Workflows
* Git Commit Integration
* Multi-file Refactoring
* Team Collaboration
* AI Debugger
* Deployment Automation
* VS Code Extension
* Advanced Code Completion

---

## 👨‍💻 Developer

**Om Jha**

🎓 B.Tech CSE (AI & ML), VIT Chennai

🎓 BS Data Analytics, IIT Patna

🔗 LinkedIn: https://www.linkedin.com/in/om-jha--/

🔗 GitHub: https://github.com/omjha-git

---

## ⭐ Support

If you found this project interesting, consider giving it a star ⭐ on GitHub.

It helps support the project and motivates future development.

---

### Built with ❤️ using React, Node.js, MongoDB, and AI.
