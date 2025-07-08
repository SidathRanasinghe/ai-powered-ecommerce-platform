# E-commerce Platform Setup Guide - Phase 0

## Prerequisites and Environment Setup

### Step 1: Install Required Software

#### 1.1 Install Node.js (Version 18+)

```bash
# Download from https://nodejs.org/
# Or use version manager (recommended)

# Install nvm (Node Version Manager) - Linux/Mac
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install nvm - Windows
# Download from: https://github.com/coreybutler/nvm-windows

# Restart terminal, then:
nvm install 18
nvm use 18
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

#### 1.2 Install Python 3.9+

```bash
# Download from https://python.org/downloads/
# Or use package manager

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install python3.9 python3.9-pip python3.9-venv

# Mac (using Homebrew)
brew install python@3.9

# Windows - Download from python.org

# Verify installation
python3 --version  # Should show 3.9.x
pip3 --version
```

#### 1.3 Install MongoDB

```bash
# Linux (Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Mac
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Windows - Download MongoDB Community Server from mongodb.com
# Or use MongoDB Atlas (cloud) for easier setup
```

#### 1.4 Install Redis

```bash
# Linux (Ubuntu)
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Mac
brew install redis
brew services start redis

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker (recommended for Windows)
```

#### 1.5 Install Docker and Docker Compose

```bash
# Linux (Ubuntu)
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Mac
# Download Docker Desktop from docker.com

# Windows
# Download Docker Desktop from docker.com

# Verify installation
docker --version
docker-compose --version
```

#### 1.6 Install Git

```bash
# Linux
sudo apt install git

# Mac
brew install git

# Windows
# Download from git-scm.com

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 2: Create Cloud Accounts

#### 2.1 AWS Account Setup

1. Go to https://aws.amazon.com/
2. Create a new account or sign in
3. Set up billing alerts
4. Create IAM user with programmatic access
5. Install AWS CLI:

```bash
# Linux/Mac
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter: Access Key, Secret Key, Region (e.g., us-west-2), Output format (json)
```

#### 2.2 Stripe Account Setup

1. Go to https://stripe.com/
2. Create developer account
3. Get API keys from Dashboard > Developers > API keys
4. Note down: Publishable key and Secret key

### Step 3: Project Structure Setup

#### 3.1 Create Main Project Directory

```bash
# Create main project folder
mkdir ai-ecommerce-platform
cd ai-ecommerce-platform

# Initialize Git repository
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo ".DS_Store" >> .gitignore
```

#### 3.2 Create Monorepo Structure

```bash
# Create folder structure
mkdir -p {backend,frontend,ml-service,mobile-app,docker,docs,scripts}

# Create additional subfolders
mkdir -p backend/{src,tests,config}
mkdir -p frontend/{src,public,components,pages,styles}
mkdir -p ml-service/{src,models,data,tests}
mkdir -p mobile-app/{src,assets}
mkdir -p docker/{development,production}
mkdir -p docs/{api,deployment,user-guide}
```

#### 3.3 Create Root Package.json

```bash
# In root directory
cat > package.json << 'EOF'
{
  "name": "ai-ecommerce-platform",
  "version": "1.0.0",
  "description": "AI-powered e-commerce platform with Next.js, Node.js, Python ML, and React Native",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "mobile-app"
  ],
  "scripts": {
    "install:all": "npm install && npm run install:backend && npm run install:frontend && npm run install:mobile",
    "install:backend": "cd backend && npm install",
    "install:frontend": "cd frontend && npm install",
    "install:mobile": "cd mobile-app && npm install",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:ml": "cd ml-service && python -m uvicorn src.main:app --reload --port 8001",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "docker:dev": "docker-compose -f docker/development/docker-compose.yml up",
    "docker:prod": "docker-compose -f docker/production/docker-compose.yml up"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  },
  "keywords": [
    "ecommerce",
    "ai",
    "nextjs",
    "nodejs",
    "python",
    "machine-learning",
    "react-native"
  ],
  "author": "Your Name",
  "license": "MIT"
}
EOF
```

#### 3.4 Create Environment Template

```bash
# Create environment template
cat > .env.example << 'EOF'
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecommerce
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-ecommerce-bucket

# API URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8001

# Email Configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Development/Production
NODE_ENV=development
PORT=3001
EOF

# Copy to actual .env file
cp .env.example .env
```

#### 3.5 Create Docker Development Setup

```bash
# Create Docker Compose for development
cat > docker/development/docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: ecommerce-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: ecommerce
    volumes:
      - mongodb_data:/data/db
    networks:
      - ecommerce-network

  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - ecommerce-network

  backend:
    build:
      context: ../../backend
      dockerfile: Dockerfile.dev
    container_name: ecommerce-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://admin:password123@mongodb:27017/ecommerce?authSource=admin
      - REDIS_URL=redis://redis:6379
    volumes:
      - ../../backend:/app
      - /app/node_modules
    depends_on:
      - mongodb
      - redis
    networks:
      - ecommerce-network

  frontend:
    build:
      context: ../../frontend
      dockerfile: Dockerfile.dev
    container_name: ecommerce-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    volumes:
      - ../../frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - ecommerce-network

  ml-service:
    build:
      context: ../../ml-service
      dockerfile: Dockerfile.dev
    container_name: ecommerce-ml
    restart: unless-stopped
    ports:
      - "8001:8001"
    volumes:
      - ../../ml-service:/app
    networks:
      - ecommerce-network

volumes:
  mongodb_data:
  redis_data:

networks:
  ecommerce-network:
    driver: bridge
EOF
```

#### 3.6 Create Global TypeScript Configuration

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/backend/*": ["./backend/src/*"],
      "@/frontend/*": ["./frontend/src/*"],
      "@/mobile/*": ["./mobile-app/src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
EOF
```

#### 3.7 Create Global ESLint Configuration

```bash
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.js'
  ],
};
EOF
```

#### 3.8 Install Root Dependencies

```bash
# Install root level dependencies
npm install concurrently --save-dev

# Install global development tools
npm install -g typescript ts-node nodemon @types/node eslint
```

### Step 4: Verification

#### 4.1 Verify All Services

```bash
# Check Node.js
node --version
npm --version

# Check Python
python3 --version
pip3 --version

# Check MongoDB
mongosh --version
# Or check if service is running: sudo systemctl status mongod

# Check Redis
redis-cli ping
# Should return: PONG

# Check Docker
docker --version
docker-compose --version

# Check Git
git --version

# Check AWS CLI
aws --version
```

#### 4.2 Test Database Connections

```bash
# Test MongoDB connection
mongosh
# In MongoDB shell:
# show dbs
# exit

# Test Redis connection
redis-cli
# In Redis CLI:
# ping
# exit
```

## Next Steps

After completing this setup:

1. ✅ **Environment Setup Complete**
2. ✅ **Project Structure Created**
3. ✅ **Configuration Files Ready**
4. ✅ **Development Tools Installed**

**Ready for Phase 1**: Backend API Development

The next phase will cover:

- Database schema design
- Express.js server setup with TypeScript
- Authentication middleware
- RESTful API development
- Payment integration setup

All configuration files are ready, and you have a solid foundation to start building the e-commerce platform!

## Troubleshooting Common Issues

### MongoDB Issues

- **Connection refused**: Check if MongoDB service is running
- **Permission denied**: Run `sudo systemctl start mongod`
- **Port conflict**: Change port in configuration if 27017 is occupied

### Redis Issues

- **Connection refused**: Check if Redis service is running
- **Permission issues**: Run `sudo systemctl start redis-server`

### Docker Issues

- **Permission denied**: Add user to docker group: `sudo usermod -aG docker $USER`
- **Port conflicts**: Check if ports 3000, 3001, 27017, 6379 are available

### Node.js Issues

- **Version conflicts**: Use nvm to manage Node.js versions
- **Permission issues**: Avoid using `sudo` with npm, use nvm instead
