/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "dark" | "milk" | "white" | "gifting";
  spec: string; // e.g., "Dark 75%", "Single Origin", "Hazelnut", "Bespoke"
  tag: string;  // e.g., "Single Origin", "Award Winning", "Limited Edition"
  imageUrl: string;
}

export interface CustomBar {
  id: string;
  base: "Dark 75%" | "Milk Velvet" | "White Silk";
  inclusions: string[]; // up to 3
  wrapperMessage: string;
  customName: string;
  price: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CartItem {
  id: string; // can be product.id or "custom-" + customBar.id
  type: "product" | "custom";
  product?: Product;
  customBar?: CustomBar;
  quantity: number;
}

export interface Order {
  id: string;
  name: string;
  email: string;
  address: string;
  specialInstructions?: string;
  items: CartItem[];
  subtotal: number;
  delivery: number;
  total: number;
  status: "Pending" | "Crafting" | "Dispatched" | "Delivered";
  createdAt: string;
}

export interface SommelierRequest {
  type: "product" | "custom";
  productId?: string;
  customBar?: Omit<CustomBar, "id" | "price">;
}

export interface SommelierResponse {
  aroma: string;
  palate: string;
  mouthfeel: string;
  pairingNotes: string;
  poem: string;
}
