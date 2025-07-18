import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Camera,
  Gamepad2,
} from "lucide-react";

const categories = [
  {
    name: "Electronics",
    href: "/category/electronics",
    icon: Smartphone,
    color: "bg-blue-500",
    description: "Latest gadgets and devices",
  },
  {
    name: "Computers",
    href: "/category/computers",
    icon: Laptop,
    color: "bg-purple-500",
    description: "Laptops, desktops, and accessories",
  },
  {
    name: "Audio",
    href: "/category/audio",
    icon: Headphones,
    color: "bg-green-500",
    description: "Headphones, speakers, and more",
  },
  {
    name: "Wearables",
    href: "/category/wearables",
    icon: Watch,
    color: "bg-orange-500",
    description: "Smartwatches and fitness trackers",
  },
  {
    name: "Photography",
    href: "/category/photography",
    icon: Camera,
    color: "bg-red-500",
    description: "Cameras and photography gear",
  },
  {
    name: "Gaming",
    href: "/category/gaming",
    icon: Gamepad2,
    color: "bg-indigo-500",
    description: "Gaming consoles and accessories",
  },
];

export function CategoryGrid() {
  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
        <p className="text-muted-foreground mt-2">
          Find exactly what you're looking for
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.name} href={category.href}>
              <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
