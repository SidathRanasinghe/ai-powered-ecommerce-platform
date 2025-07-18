# Frontend Directory Structure

```
frontend/
├── public/
│   ├── icons/
│   │   ├── favicon.ico
│   │   ├── apple-touch-icon.png
│   │   └── android-chrome-192x192.png
│   ├── images/
│   │   ├── hero-banner.jpg
│   │   ├── logo.png
│   │   └── placeholder-product.jpg
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── category/
│   │   │       └── [category]/
│   │   │           └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── checkout/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   ├── orders/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── products/
│   │       │   ├── page.tsx
│   │       │   ├── create/
│   │       │   │   └── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       ├── orders/
│   │       │   └── page.tsx
│   │       └── users/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── toast.tsx
│   │   │   └── dropdown.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductImages.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── ProductReviews.tsx
│   │   │   └── RecommendedProducts.tsx
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── CartDrawer.tsx
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── ShippingForm.tsx
│   │   │   └── OrderSummary.tsx
│   │   ├── orders/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderList.tsx
│   │   │   └── OrderStatus.tsx
│   │   └── common/
│   │       ├── SearchBar.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── Rating.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   ├── useOrders.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   └── useToast.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   ├── validations.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── cart.ts
│   │   │   ├── orders.ts
│   │   │   └── users.ts
│   │   ├── storage.ts
│   │   └── recommendations.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── authSlice.ts
│   │   ├── cartSlice.ts
│   │   ├── productsSlice.ts
│   │   └── uiSlice.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.css
│   └── types/
│       ├── auth.ts
│       ├── product.ts
│       ├── cart.ts
│       ├── order.ts
│       └── api.ts
├── .env.local
├── .env.example
├── .gitignore
├── .eslintrc.json
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Key Features Implemented

### 1. **Next.js 13+ App Router Structure**

- Modern file-based routing with `app/` directory
- Server and client components optimization
- Built-in loading and error handling

### 2. **TypeScript Integration**

- Full type safety across all components
- Shared types with backend API
- Proper interface definitions

### 3. **TailwindCSS Styling**

- Responsive design system
- Custom component styles
- Dark mode support ready

### 4. **State Management**

- Redux Toolkit for global state
- Local state with React hooks
- Persistent cart and auth state

### 5. **API Integration**

- Axios-based API client
- Request/response interceptors
- Error handling and retry logic

### 6. **Authentication System**

- JWT token management
- Protected routes
- Role-based access control

### 7. **E-commerce Features**

- Product catalog with search/filter
- Shopping cart functionality
- Checkout process
- Order management
- User profiles

### 8. **Performance Optimizations**

- Image optimization
- Lazy loading
- Caching strategies
- SEO optimization

### 9. **UI Components**

- Reusable component library
- Consistent design system
- Accessibility support

### 10. **Development Tools**

- ESLint configuration
- TypeScript strict mode
- Environment management

---

// package.json
{
"name": "ai-ecommerce-frontend",
"version": "1.0.0",
"private": true,
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"lint:fix": "next lint --fix",
"type-check": "tsc --noEmit"
},
"dependencies": {
"next": "^14.0.0",
"react": "^18.0.0",
"react-dom": "^18.0.0",
"@reduxjs/toolkit": "^1.9.7",
"react-redux": "^8.1.3",
"axios": "^1.6.0",
"react-hook-form": "^7.47.0",
"@hookform/resolvers": "^3.3.2",
"zod": "^3.22.4",
"clsx": "^2.0.0",
"tailwind-merge": "^2.0.0",
"class-variance-authority": "^0.7.0",
"lucide-react": "^0.294.0",
"react-hot-toast": "^2.4.1",
"js-cookie": "^3.0.5",
"stripe": "^14.5.0",
"@stripe/stripe-js": "^2.1.11",
"react-intersection-observer": "^9.5.2",
"swiper": "^11.0.0",
"embla-carousel-react": "^8.0.0"
},
"devDependencies": {
"typescript": "^5.0.0",
"@types/node": "^20.0.0",
"@types/react": "^18.0.0",
"@types/react-dom": "^18.0.0",
"@types/js-cookie": "^3.0.6",
"tailwindcss": "^3.3.0",
"postcss": "^8.0.0",
"autoprefixer": "^10.0.0",
"eslint": "^8.0.0",
"eslint-config-next": "^14.0.0",
"@typescript-eslint/eslint-plugin": "^6.0.0",
"@typescript-eslint/parser": "^6.0.0",
"prettier": "^3.0.0",
"prettier-plugin-tailwindcss": "^0.5.0"
}
}

// next.config.js
/** @type {import('next').NextConfig} \*/
const nextConfig = {
experimental: {
appDir: true,
},
images: {
domains: [
'localhost',
process.env.AWS_CLOUDFRONT_DOMAIN?.replace('https://', '') || '',
process.env.AWS_S3_BUCKET + '.s3.amazonaws.com',
].filter(Boolean),
remotePatterns: [
{
protocol: 'https',
hostname: '**.amazonaws.com',
port: '',
pathname: '/\*_',
},
],
},
env: {
NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
},
async rewrites() {
return [
{
source: '/api/:path_',
destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
},
];
},
};

module.exports = nextConfig;

// tailwind.config.js
/** @type {import('tailwindcss').Config} \*/
module.exports = {
content: [
'./src/pages/**/_.{js,ts,jsx,tsx,mdx}',
'./src/components/\*\*/_.{js,ts,jsx,tsx,mdx}',
'./src/app/\*_/_.{js,ts,jsx,tsx,mdx}',
],
theme: {
extend: {
colors: {
primary: {
50: '#f0f9ff',
100: '#e0f2fe',
200: '#bae6fd',
300: '#7dd3fc',
400: '#38bdf8',
500: '#0ea5e9',
600: '#0284c7',
700: '#0369a1',
800: '#075985',
900: '#0c4a6e',
},
secondary: {
50: '#fafafa',
100: '#f4f4f5',
200: '#e4e4e7',
300: '#d4d4d8',
400: '#a1a1aa',
500: '#71717a',
600: '#52525b',
700: '#3f3f46',
800: '#27272a',
900: '#18181b',
},
success: {
50: '#f0fdf4',
500: '#22c55e',
600: '#16a34a',
},
warning: {
50: '#fffbeb',
500: '#f59e0b',
600: '#d97706',
},
error: {
50: '#fef2f2',
500: '#ef4444',
600: '#dc2626',
},
},
fontFamily: {
sans: ['Inter', 'system-ui', 'sans-serif'],
display: ['Inter', 'system-ui', 'sans-serif'],
},
screens: {
'xs': '475px',
},
container: {
center: true,
padding: {
DEFAULT: '1rem',
sm: '2rem',
lg: '4rem',
xl: '5rem',
'2xl': '6rem',
},
},
animation: {
'fade-in': 'fadeIn 0.5s ease-in-out',
'slide-in': 'slideIn 0.3s ease-out',
'pulse-slow': 'pulse 3s infinite',
},
keyframes: {
fadeIn: {
'0%': { opacity: '0' },
'100%': { opacity: '1' },
},
slideIn: {
'0%': { transform: 'translateY(-10px)', opacity: '0' },
'100%': { transform: 'translateY(0)', opacity: '1' },
},
},
},
},
plugins: [
require('@tailwindcss/forms'),
require('@tailwindcss/typography'),
require('@tailwindcss/aspect-ratio'),
],
};

// tsconfig.json
{
"compilerOptions": {
"target": "es5",
"lib": ["dom", "dom.iterable", "esnext"],
"allowJs": true,
"skipLibCheck": true,
"strict": true,
"noEmit": true,
"esModuleInterop": true,
"module": "esnext",
"moduleResolution": "bundler",
"resolveJsonModule": true,
"isolatedModules": true,
"jsx": "preserve",
"incremental": true,
"plugins": [
{
"name": "next"
}
],
"baseUrl": ".",
"paths": {
"@/_": ["./src/_"],
"@/components/_": ["./src/components/_"],
"@/lib/_": ["./src/lib/_"],
"@/hooks/_": ["./src/hooks/_"],
"@/services/_": ["./src/services/_"],
"@/store/_": ["./src/store/_"],
"@/types/_": ["./src/types/_"],
"@/styles/_": ["./src/styles/_"]
}
},
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
"exclude": ["node_modules"]
}

// .env.example

# Frontend Environment Variables

NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Optional: Analytics

NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=

# Optional: Third-party Services

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=

// .eslintrc.json
{
"extends": [
"next/core-web-vitals",
"@typescript-eslint/recommended"
],
"parser": "@typescript-eslint/parser",
"plugins": ["@typescript-eslint"],
"rules": {
"@typescript-eslint/no-unused-vars": "error",
"@typescript-eslint/no-explicit-any": "warn",
"prefer-const": "error",
"no-var": "error"
}
}

// src/types/auth.ts
export interface User {
id: string;
firstName: string;
lastName: string;
email: string;
phone?: string;
role: 'user' | 'admin';
isEmailVerified: boolean;
lastLogin?: Date;
createdAt: Date;
updatedAt: Date;
}

export interface AuthState {
user: User | null;
accessToken: string | null;
refreshToken: string | null;
isLoading: boolean;
isAuthenticated: boolean;
}

export interface LoginCredentials {
email: string;
password: string;
}

export interface RegisterData {
firstName: string;
lastName: string;
email: string;
password: string;
phone?: string;
}

export interface AuthResponse {
success: boolean;
message: string;
data: {
user: User;
accessToken: string;
refreshToken: string;
};
}

// src/types/product.ts
export interface ProductImage {
url: string;
alt?: string;
}

export interface ProductDimensions {
length?: number;
width?: number;
height?: number;
}

export interface ProductVariant {
name: string;
value: string;
price?: number;
stock?: number;
}

export interface ProductReview {
id: string;
userId: string;
user: {
firstName: string;
lastName: string;
};
rating: number;
comment: string;
createdAt: Date;
updatedAt: Date;
}

export interface ReviewSummary {
averageRating: number;
totalReviews: number;
ratingDistribution: {
5: number;
4: number;
3: number;
2: number;
1: number;
};
}

export interface Product {
id: string;
name: string;
description: string;
price: number;
category: string;
brand?: string;
sku: string;
stock: number;
images: ProductImage[];
weight?: number;
dimensions?: ProductDimensions;
tags?: string[];
specifications?: Record<string, any>;
variants?: ProductVariant[];
isActive: boolean;
reviews?: ReviewSummary;
createdAt: Date;
updatedAt: Date;
}

export interface ProductsResponse {
success: boolean;
data: {
products: Product[];
pagination: {
currentPage: number;
totalPages: number;
totalProducts: number;
hasNext: boolean;
hasPrev: boolean;
};
};
}

export interface ProductFilters {
category?: string;
minPrice?: number;
maxPrice?: number;
sortBy?: string;
sortOrder?: 'asc' | 'desc';
page?: number;
limit?: number;
}

export interface SearchFilters extends ProductFilters {
q?: string;
}

// src/types/cart.ts
export interface CartItem {
id: string;
product: Product;
quantity: number;
variant?: ProductVariant;
addedAt: Date;
}

export interface CartState {
items: CartItem[];
totalItems: number;
totalPrice: number;
isLoading: boolean;
}

export interface AddToCartData {
productId: string;
quantity: number;
variant?: ProductVariant;
}

// src/types/order.ts
export interface ShippingAddress {
firstName: string;
lastName: string;
address: string;
city: string;
state: string;
postalCode: string;
country: string;
phone?: string;
}

export interface OrderItem {
id: string;
productId: string;
product: Product;
quantity: number;
price: number;
variant?: ProductVariant;
}

export interface Order {
id: string;
userId: string;
items: OrderItem[];
shippingAddress: ShippingAddress;
paymentMethod: string;
paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
subtotal: number;
tax: number;
shipping: number;
total: number;
stripePaymentIntentId?: string;
trackingNumber?: string;
createdAt: Date;
updatedAt: Date;
}

// src/types/api.ts
export interface ApiResponse<T = any> {
success: boolean;
message?: string;
data?: T;
errors?: Array<{
field?: string;
message: string;
}>;
}

export interface PaginationMeta {
currentPage: number;
totalPages: number;
totalItems: number;
hasNext: boolean;
hasPrev: boolean;
}

export interface ApiError {
message: string;
status?: number;
errors?: Array<{
field?: string;
message: string;
}>;
}

// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
return new Intl.NumberFormat('en-US', {
style: 'currency',
currency: 'USD',
}).format(price);
}

export function formatDate(date: Date | string): string {
return new Intl.DateTimeFormat('en-US', {
year: 'numeric',
month: 'long',
day: 'numeric',
}).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
return new Intl.DateTimeFormat('en-US', {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
}).format(new Date(date));
}

export function truncateText(text: string, maxLength: number): string {
if (text.length <= maxLength) return text;
return text.substring(0, maxLength) + '...';
}

export function generateSku(): string {
return Math.random().toString(36).substring(2, 15).toUpperCase();
}

export function debounce<T extends (...args: any[]) => any>(
func: T,
delay: number
): (...args: Parameters<T>) => void {
let timeoutId: NodeJS.Timeout;
return (...args: Parameters<T>) => {
clearTimeout(timeoutId);
timeoutId = setTimeout(() => func(...args), delay);
};
}

export function isValidEmail(email: string): boolean {
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return emailRegex.test(email);
}

export function capitalize(str: string): string {
return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
return str
.toLowerCase()
.replace(/[^\w\s-]/g, '')
.replace(/[\s_-]+/g, '-')
.replace(/^-+|-+$/g, '');
}

export function getImageUrl(imagePath: string): string {
if (imagePath.startsWith('http')) {
return imagePath;
}
return `${process.env.NEXT_PUBLIC_API_URL}/uploads/${imagePath}`;
}

export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
return Math.round(((originalPrice - salePrice) / originalPrice) \* 100);
}

// src/lib/constants.ts
export const PRODUCT_CATEGORIES = [
'Electronics',
'Clothing',
'Books',
'Home & Garden',
'Sports',
'Beauty',
'Health',
'Toys',
'Automotive',
'Food & Beverage',
] as const;

export const SORT_OPTIONS = [
{ value: 'createdAt', label: 'Newest First', order: 'desc' },
{ value: 'price', label: 'Price: Low to High', order: 'asc' },
{ value: 'price', label: 'Price: High to Low', order: 'desc' },
{ value: 'name', label: 'Name: A to Z', order: 'asc' },
{ value: 'name', label: 'Name: Z to A', order: 'desc' },
] as const;

export const ORDER_STATUS_COLORS = {
pending: 'bg-yellow-100 text-yellow-800',
processing: 'bg-blue-100 text-blue-800',
shipped: 'bg-purple-100 text-purple-800',
delivered: 'bg-green-100 text-green-800',
cancelled: 'bg-red-100 text-red-800',
} as const;

export const PAYMENT_STATUS_COLORS = {
pending: 'bg-yellow-100 text-yellow-800',
paid: 'bg-green-100 text-green-800',
failed: 'bg-red-100 text-red-800',
refunded: 'bg-gray-100 text-gray-800',
} as const;

export const ITEMS_PER_PAGE = 12;
export const REVIEWS_PER_PAGE = 10;

export const API_ENDPOINTS = {
AUTH: {
LOGIN: '/auth/login',
REGISTER: '/auth/register',
LOGOUT: '/auth/logout',
REFRESH: '/auth/refresh-token',
FORGOT_PASSWORD: '/auth/forgot-password',
RESET_PASSWORD: '/auth/reset-password',
VERIFY_EMAIL: '/auth/verify-email',
},
PRODUCTS: {
LIST: '/products',
DETAIL: '/products',
SEARCH: '/products/search',
CATEGORY: '/products/category',
REVIEWS: '/products/:id/reviews',
},
CART: {
GET: '/cart',
ADD: '/cart/add',
UPDATE: '/cart/update',
REMOVE: '/cart/remove',
CLEAR: '/cart/clear',
},
ORDERS: {
LIST: '/orders',
DETAIL: '/orders',
CREATE: '/orders',
},
USERS: {
PROFILE: '/users/profile',
UPDATE: '/users/profile',
},
} as const;

// src/lib/api.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from '@/types/api';
import { toast } from 'react-hot-toast';

// Create axios instance
const api: AxiosInstance = axios.create({
baseURL: process.env.NEXT_PUBLIC_API_URL,
timeout: 10000,
headers: {
'Content-Type': 'application/json',
},
});

// Request interceptor
api.interceptors.request.use(
(config) => {
// Add auth token if available
const token = localStorage.getItem('accessToken');
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
},
(error) => {
return Promise.reject(error);
}
);

// Response interceptor
api.interceptors.response.use(
(response: AxiosResponse) => {
return response;
},
async (error: AxiosError) => {
const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await api.post('/auth/refresh-token', {
          token: localStorage.getItem('refreshToken'),
        });

        localStorage.setItem('accessToken', response.data.accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${response.data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);

}
);

export default api;
