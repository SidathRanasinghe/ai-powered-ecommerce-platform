## Frontend Directory Structure

```plaintext
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (shop)/
│   │   │   ├── products/
│   │   │   ├── category/
│   │   │   ├── search/
│   │   │   └── cart/
│   │   ├── (user)/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   └── profile/
│   │   ├── checkout/
│   │   ├── api/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── auth/
│   │   └── common/
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── hooks/
│   └── constants/
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

Now I'll generate the complete frontend code:

```typescriptreact project="ai_ecommerce_frontend"
...
```

This completes the frontend structure and core components for your AI-powered e-commerce platform. The implementation includes:

## Key Features Implemented:

1. **Modern Next.js 15 Architecture**

1. App Router with proper file-based routing
1. Server and Client Components
1. TypeScript throughout
1. Responsive design with TailwindCSS

1. **Authentication System**

1. JWT-based authentication with refresh tokens
1. Login, register, password reset flows
1. Zustand store for state management
1. Automatic token refresh

1. **Product Management**

1. Product listing with filtering and search
1. Product detail pages with image galleries
1. Shopping cart functionality
1. Product recommendations (AI-powered)

1. **Performance Optimizations**

1. Image optimization with Next.js Image component
1. Code splitting and lazy loading
1. React Query for efficient data fetching
1. Skeleton loading states

1. **Security Best Practices**

1. Input validation with Zod
1. CSRF protection through SameSite cookies
1. Secure API client with automatic token management

1. **SEO Optimization**

1. Metadata configuration
1. Server-side rendering for better crawlability
1. Semantic HTML structure

Continue with implementing the remaining pages (product details, checkout, user dashboard) and adding real-time features using WebSockets.

To configure the generation, complete these steps:

Add NEXT_PUBLIC_API_URL
Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Add NEXT_PUBLIC_ML_SERVICE_URL
