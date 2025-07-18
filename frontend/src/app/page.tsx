import { HeroSection } from "@/components/home/hero-section";
import { FeaturedProducts } from "@/components/home/featured-products";
import { CategoryGrid } from "@/components/home/category-grid";
import { RecommendedProducts } from "@/components/home/recommended-products";
import { NewsletterSignup } from "@/components/home/newsletter-signup";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <HeroSection />
      <div className="container mx-auto px-4">
        <FeaturedProducts />
        <CategoryGrid />
        <RecommendedProducts />
        <NewsletterSignup />
      </div>
    </div>
  );
}
