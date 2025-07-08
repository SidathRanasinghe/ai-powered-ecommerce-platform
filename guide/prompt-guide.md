Here's a comprehensive set of **step-by-step prompts** you can use with Claude.ai to develop the **AI-powered e-commerce platform** described in your README file — starting **from scratch** and assuming you know **nothing** about full-stack development. Each prompt builds on the previous one and aligns with the development phases described in your README.

---

### ✅ INITIAL SETUP & ENVIRONMENT

#### Prompt 1: Project Planning

> "Can you explain what each of these technologies in the stack is used for: Next.js, TypeScript, TailwindCSS, Node.js, Express, Python, MongoDB, Redis, React Native, AWS, Stripe? Please explain it simply assuming I'm a beginner."

#### Prompt 2: Development Environment Setup

> "Give me step-by-step instructions to install and configure Node.js (v18+), Python 3.9+, MongoDB, Redis, Docker, and Docker Compose on my operating system \[Windows/macOS/Linux]. Also, help me set up AWS CLI and a Stripe developer account."

---

### 🧱 MONOREPO PROJECT STRUCTURE

#### Prompt 3: Create Project Structure

> "Generate a monorepo project structure with folders for `frontend`, `backend`, `ml-service`, and `mobile-app`. Include instructions to initialize Git and configure TypeScript and ESLint in each package."

---

### 🔁 PHASE 1: BACKEND API DEVELOPMENT

#### Prompt 4: Database Design

> "Help me design MongoDB schemas for users, products, orders, reviews, and carts. Also explain how to use Redis for session management and caching."

#### Prompt 5: Express Server Setup

> "Guide me to set up an Express.js server with TypeScript. Include folder structure, config setup, and scripts."

#### Prompt 6: JWT Authentication

> "Help me implement secure JWT authentication with signup, login, logout, and token refresh features in the Express.js backend."

#### Prompt 7: RESTful APIs

> "Generate TypeScript-based Express.js routes/controllers for user management, product catalog, cart operations, and order creation."

#### Prompt 8: Stripe Integration

> "Walk me through integrating Stripe for payment processing. Include examples for handling payments, webhooks, and storing order status."

---

### 🤖 PHASE 2: AI RECOMMENDATION ENGINE

#### Prompt 9: ML Service with FastAPI

> "Help me set up a FastAPI service in Python to serve machine learning models. Use collaborative filtering and content-based filtering to recommend products."

#### Prompt 10: Integrating Backend + ML

> "Show me how to connect the Node.js backend with the FastAPI recommendation service via API calls. Include examples of request/response and caching strategies."

---

### 🎨 PHASE 3: FRONTEND DEVELOPMENT (Next.js)

#### Prompt 11: Frontend Setup

> "Generate a starter Next.js project with TypeScript and TailwindCSS. Include routing structure, layout components, and a base theme."

#### Prompt 12: Build Core Pages

> "Help me build these frontend pages: Home, Product Listing, Product Detail, Cart, Checkout, User Dashboard. Include React components, Tailwind styles, and data fetching from the backend."

#### Prompt 13: Advanced Frontend Features

> "How do I implement real-time inventory updates with WebSockets, product search with autocomplete, and a user review system in the Next.js frontend?"

---

### 📱 PHASE 4: MOBILE APP DEVELOPMENT

#### Prompt 14: React Native Setup

> "Guide me to set up a React Native project with TypeScript. Include navigation, state management, and folder structure."

#### Prompt 15: Core Mobile Features

> "Help me implement product browsing, cart operations, push notifications, and offline capabilities in the mobile app. Also show how to connect it with the existing backend APIs."

---

### 🚀 PHASE 5: DEVOPS & DEPLOYMENT

#### Prompt 16: Dockerization

> "Generate Dockerfiles and a Docker Compose file to containerize the backend, ML service, frontend, and mobile app emulator. Explain how to run the full app locally."

#### Prompt 17: AWS Deployment

> "Guide me to deploy this project to AWS using ECS or EC2. Include steps for setting up an S3 bucket for image uploads and configuring CloudFront as a CDN."

#### Prompt 18: Monitoring & Logs

> "How can I set up basic logging, monitoring, and alerting for this multi-service architecture using AWS or open-source tools?"

---

### 🧠 EXTRAS & OPTIMIZATION

#### Prompt 19: Admin Dashboard

> "Help me create an admin dashboard for inventory and user management. Include stats, charts, and CRUD functionality for products."

#### Prompt 20: Performance & Scalability

> "Give me suggestions and examples for optimizing performance (e.g., caching, indexing, lazy loading) and scaling the system to handle 1000+ users."

---

### ✅ FINAL TESTING & SUCCESS CRITERIA

#### Prompt 21: Final QA Testing

> "Help me test all functionalities of the platform. Include test cases or automated testing strategies for backend APIs, frontend UI, and mobile app."

#### Prompt 22: Metrics Verification

> "How do I measure and validate that the site meets these metrics: page load < 2s, 95%+ uptime, scalable to 1000+ users, cross-device mobile support?"

---
