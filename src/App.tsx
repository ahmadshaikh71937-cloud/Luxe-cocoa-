/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, FormEvent } from "react";
import { 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Sparkles, 
  Send, 
  Truck, 
  CheckCircle, 
  Clock, 
  Award, 
  ArrowRight,
  Sparkle,
  Phone,
  Mail,
  Instagram,
  MessageCircle,
  Share2,
  LogOut
} from "lucide-react";
import { Product, CustomBar, Review, CartItem, Order, SommelierResponse } from "./types";
import CustomBarVisual from "./components/CustomBarVisual";
import SommelierModal from "./components/SommelierModal";

// Firebase imports
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logoutUser, 
  handleFirestoreError, 
  OperationType,
  loginWithEmail,
  registerWithEmail
} from "./firebase";

export default function App() {
  // --- STATE DECLARATIONS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const cached = localStorage.getItem("luxe_cocoa_cart");
    return cached ? JSON.parse(cached) : [];
  });

  // User auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email & Password Auth Modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [authModalLoading, setAuthModalLoading] = useState(false);

  // UI Panels / Views
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<Order | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => {
    const cached = localStorage.getItem("luxe_cocoa_order_history");
    return cached ? JSON.parse(cached) : [];
  });
  const [historyLookupEmail, setHistoryLookupEmail] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySuccessMsg, setHistorySuccessMsg] = useState("");

  // Admin Panel states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminUpdatingOrderId, setAdminUpdatingOrderId] = useState<string | null>(null);

  const ADMIN_EMAILS = ["ahmadshaikh71937@gmail.com", "saleemshaikh3010@gmail.com"];
  const isUserAdmin = !!(currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()));

  // Sommelier Suite API triggers
  const [sommelierModalOpen, setSommelierModalOpen] = useState(false);
  const [sommelierLoading, setSommelierLoading] = useState(false);
  const [sommelierTitle, setSommelierTitle] = useState("");
  const [sommelierSubtitle, setSommelierSubtitle] = useState("");
  const [sommelierResponse, setSommelierResponse] = useState<SommelierResponse | null>(null);

  // Craft Station customized bar state
  const [customBase, setCustomBase] = useState<"Dark 75%" | "Milk Velvet" | "White Silk">("Dark 75%");
  const [customInclusions, setCustomInclusions] = useState<string[]>([]);
  const [customWrapperMessage, setCustomWrapperMessage] = useState("");
  const [customBarName, setCustomBarName] = useState("");

  // Customer Review form state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [lastSubmittedReview, setLastSubmittedReview] = useState<Review | null>(null);

  // Checkout Form state
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutInstructions, setCheckoutInstructions] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem("luxe_cocoa_cart", JSON.stringify(cart));
  }, [cart]);

  // --- FIREBASE AUTHENTICATION LISTENER & BACKEND SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setAuthLoading(false);
      if (usr) {
        setCheckoutName(usr.displayName || "");
        setCheckoutEmail(usr.email || "");
        syncHistoryFromFirestore(usr);
      }
    });
    return unsubscribe;
  }, []);

  const syncHistoryFromFirestore = async (usr: FirebaseUser) => {
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", usr.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOrders.push(doc.data() as Order);
      });
      fetchedOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setOrderHistory(fetchedOrders);
      localStorage.setItem("luxe_cocoa_order_history", JSON.stringify(fetchedOrders));
    } catch (error) {
      console.error("Error syncing history from Firestore:", error);
    }
  };

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthModalError("Please enter both email and password.");
      return;
    }
    try {
      setAuthModalError(null);
      setAuthModalLoading(true);
      const usr = await loginWithEmail(authEmail, authPassword);
      setCurrentUser(usr);
      setCheckoutEmail(usr.email || "");
      setCheckoutName(usr.displayName || "");
      setAuthModalOpen(false);
      setAuthModalLoading(false);
      // Reset inputs
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Email sign-in failed:", err);
      let errMsg = err?.message || String(err);
      if (err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        errMsg = "Incorect email or password. Please try again or create a new account.";
      }
      setAuthModalError(errMsg);
      setAuthModalLoading(false);
    }
  };

  const handleEmailRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authName) {
      setAuthModalError("Please enter your name, email, and password.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthModalError("Password must be at least 6 characters long.");
      return;
    }
    try {
      setAuthModalError(null);
      setAuthModalLoading(true);
      const usr = await registerWithEmail(authEmail, authPassword, authName);
      setCurrentUser(usr);
      setCheckoutEmail(usr.email || "");
      setCheckoutName(usr.displayName || "");
      setAuthModalOpen(false);
      setAuthModalLoading(false);
      // Reset inputs
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      console.error("Email registration failed:", err);
      let errMsg = err?.message || String(err);
      if (err?.code === "auth/email-already-in-use") {
        errMsg = "An account with this email address already exists.";
      }
      setAuthModalError(errMsg);
      setAuthModalLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setAuthLoading(true);
      const loggedUser = await loginWithGoogle();
      setCurrentUser(loggedUser);
      setCheckoutEmail(loggedUser.email || "");
      setCheckoutName(loggedUser.displayName || "");
      setAuthLoading(false);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      const errorMessage = err?.message || String(err);
      setAuthError(errorMessage);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setOrderHistory([]);
      localStorage.removeItem("luxe_cocoa_order_history");
      setCheckoutName("");
      setCheckoutEmail("");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // --- DATA LOADING ON MOUNT ---
  useEffect(() => {
    // Load products
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Error loading products:", err));

    // Load reviews
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((data) => setReviews(data))
      .catch((err) => console.error("Error loading reviews:", err));
  }, []);

  // --- BUSINESS LOGIC ---

  // Add standard product to bag
  const handleAddProductToBag = (product: Product) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.type === "product" && item.product?.id === product.id);
      if (existingIdx > -1) {
        const nextCart = [...prevCart];
        nextCart[existingIdx].quantity += 1;
        return nextCart;
      } else {
        return [...prevCart, { id: product.id, type: "product", product, quantity: 1 }];
      }
    });

    // Elegant toast or indicator trigger can happen here
    setIsCartOpen(true);
  };

  // Add customized bar to bag
  const handleAddCustomBarToBag = () => {
    // Calculate custom bar price: Base is $10 for milk/white, $12 for dark
    let basePrice = customBase === "Dark 75%" ? 12 : 10;
    
    // Add $2 per topping/inclusion
    const inclusionPrice = customInclusions.length * 2;
    const finalPrice = basePrice + inclusionPrice;

    const bespokeBar: CustomBar = {
      id: `custom-${Date.now()}`,
      base: customBase,
      inclusions: [...customInclusions],
      wrapperMessage: customWrapperMessage.trim(),
      customName: customBarName.trim() || "Bespoke Creation",
      price: finalPrice
    };

    setCart((prevCart) => {
      return [...prevCart, { id: bespokeBar.id, type: "custom", customBar: bespokeBar, quantity: 1 }];
    });

    // Reset craft station inputs for freshness
    setCustomInclusions([]);
    setCustomWrapperMessage("");
    setCustomBarName("");
    setIsCartOpen(true);
  };

  // Adjust cart items quantity
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  // Toggle dynamic inclusion selection
  const handleToggleInclusion = (inc: string) => {
    setCustomInclusions((prev) => {
      if (prev.includes(inc)) {
        return prev.filter((i) => i !== inc);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 toppings
      }
      return [...prev, inc];
    });
  };

  // Trigger server-side AI Sommelier Pairing
  const handleTriggerSommelier = (type: "product" | "custom", item?: any) => {
    setSommelierResponse(null);
    setSommelierLoading(true);
    setSommelierModalOpen(true);

    let payload: any = { type };
    if (type === "product" && item) {
      payload.productId = item.id;
      setSommelierTitle(item.name);
      setSommelierSubtitle(item.spec);
    } else if (type === "custom") {
      // Create mockup custom bar description
      const tempBar = {
        base: customBase,
        inclusions: customInclusions,
        wrapperMessage: customWrapperMessage,
        customName: customBarName || "Bespoke Creation"
      };
      payload.customBar = tempBar;
      setSommelierTitle(tempBar.customName);
      setSommelierSubtitle(`${tempBar.base} with ${tempBar.inclusions.length} Inclusions`);
    }

    fetch("/api/sommelier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        setSommelierResponse(data);
        setSommelierLoading(false);
      })
      .catch((err) => {
        console.error("Sommelier API error:", err);
        setSommelierLoading(false);
      });
  };

  // Submit Review to backend
  const handleSubmitReview = (e: FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim()
      })
    })
      .then((res) => res.json())
      .then((newReview) => {
        setReviews((prev) => [newReview, ...prev]);
        setLastSubmittedReview(newReview);
        setReviewName("");
        setReviewRating(5);
        setReviewComment("");
        setSubmittingReview(false);
      })
      .catch((err) => {
        console.error("Error submitting review:", err);
        setSubmittingReview(false);
      });
  };

  // Place Order checkout
  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in with Google to place an order.");
      return;
    }
    if (!checkoutName.trim() || !checkoutEmail.trim() || !checkoutAddress.trim() || cart.length === 0) return;

    setCheckoutLoading(true);

    const subtotal = calculateSubtotal();
    const delivery = subtotal >= 50 ? 0 : 5;
    const total = subtotal + delivery;

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: checkoutName.trim(),
        email: checkoutEmail.trim(),
        address: checkoutAddress.trim(),
        specialInstructions: checkoutInstructions.trim(),
        items: cart,
        subtotal,
        delivery,
        total
      })
    })
      .then((res) => res.json())
      .then(async (completedOrder) => {
        // Build robust order including the authenticated user's ID
        const firestoreOrder: Order = {
          ...completedOrder,
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        };

        try {
          const orderDocRef = doc(db, "orders", completedOrder.id);
          await setDoc(orderDocRef, firestoreOrder);
          console.log("Order saved to Firestore successfully!");
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `orders/${completedOrder.id}`);
        }

        setCheckoutSuccessOrder(firestoreOrder);
        setOrderHistory((prev) => {
          const updated = [firestoreOrder, ...prev];
          localStorage.setItem("luxe_cocoa_order_history", JSON.stringify(updated));
          return updated;
        });
        setCart([]); // Clear cart
        setIsCartOpen(false);
        setCheckoutName(currentUser.displayName || "");
        setCheckoutEmail(currentUser.email || "");
        setCheckoutAddress("");
        setCheckoutInstructions("");
        setCheckoutLoading(false);
      })
      .catch((err) => {
        console.error("Checkout order placement failed:", err);
        setCheckoutLoading(false);
      });
  };

  const handleFetchHistoryFromServer = (e: FormEvent) => {
    e.preventDefault();
    const email = historyLookupEmail.trim().toLowerCase();
    if (!email) return;

    setHistoryLoading(true);
    setHistorySuccessMsg("");

    fetch(`/api/orders/customer/${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve orders.");
        return res.json();
      })
      .then((serverOrders: Order[]) => {
        if (serverOrders.length === 0) {
          setHistorySuccessMsg("No orders found for this email on our server.");
          setHistoryLoading(false);
          return;
        }

        setOrderHistory((prev) => {
          // Merge lists and remove duplicates based on order ID
          const existingIds = new Set(prev.map((o) => o.id));
          const newUniqueOrders = serverOrders.filter((o) => !existingIds.has(o.id));
          const merged = [...newUniqueOrders, ...prev];
          
          merged.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          localStorage.setItem("luxe_cocoa_order_history", JSON.stringify(merged));
          return merged;
        });

        setHistorySuccessMsg(`Successfully restored ${serverOrders.length} order(s) from our server!`);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.error("Failed to retrieve server history:", err);
        setHistorySuccessMsg("Error connecting to the server. Please try again.");
        setHistoryLoading(false);
      });
  };

  // --- ADMIN PANEL HANDLERS ---
  const handleFetchAdminOrders = () => {
    setAdminLoading(true);
    setAdminError(null);
    fetch("/api/admin/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load orders from server.");
        return res.json();
      })
      .then((data) => {
        setAdminOrders(data);
        setAdminLoading(false);
      })
      .catch((err) => {
        console.error("Admin orders load failed:", err);
        setAdminError(err.message || "An error occurred while loading orders.");
        setAdminLoading(false);
      });
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    setAdminUpdatingOrderId(orderId);
    setAdminError(null);
    fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update status on server.");
        return res.json();
      })
      .then(async (updatedOrder: Order) => {
        setAdminOrders((prev) => prev.map((o) => o.id === orderId ? updatedOrder : o));
        
        // Update user order history if this order belongs to them
        setOrderHistory((prev) => prev.map((o) => o.id === orderId ? { ...o, status: updatedOrder.status } : o));

        // Sync with Firestore directly
        try {
          const orderDocRef = doc(db, "orders", orderId);
          await setDoc(orderDocRef, { status: updatedOrder.status }, { merge: true });
        } catch (fErr) {
          console.warn("Could not sync order status to Firestore directly:", fErr);
        }

        setAdminUpdatingOrderId(null);
      })
      .catch((err) => {
        console.error("Status update failed:", err);
        setAdminError(err.message || "Could not update status.");
        setAdminUpdatingOrderId(null);
      });
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this guestbook review?")) return;
    setAdminError(null);
    fetch(`/api/admin/reviews/${reviewId}`, {
      method: "DELETE"
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete review on server.");
        return res.json();
      })
      .then(() => {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      })
      .catch((err) => {
        console.error("Failed to delete review:", err);
        setAdminError(err.message || "Could not delete review.");
      });
  };

  // --- WHATSAPP INTEGRATION HELPERS ---
  const handleSendOrderToWhatsApp = (order: Order) => {
    let message = `📦 *Luxe Cocoa - New Order Confirmation* 📦\n\n`;
    message += `Hello Luxe Cocoa! I have successfully placed an order online and would like to confirm on WhatsApp:\n\n`;
    message += `*Order ID:* ${order.id}\n`;
    message += `*Customer Name:* ${order.name}\n`;
    message += `*Email:* ${order.email}\n`;
    message += `*Delivery Address:* ${order.address}\n`;
    if (order.specialInstructions) {
      message += `*Special Instructions:* _"${order.specialInstructions}"_\n`;
    }
    message += `\n*Ordered Indulgences:*\n`;
    
    order.items.forEach((item, index) => {
      const isCustom = item.type === "custom";
      const name = isCustom ? item.customBar!.customName : item.product!.name;
      const spec = isCustom ? `${item.customBar!.base} custom bar` : item.product!.spec;
      const price = isCustom ? item.customBar!.price : item.product!.price;
      message += `• *${item.quantity}x ${name}* (${spec}) — $${price * item.quantity}\n`;
      if (isCustom && item.customBar?.inclusions) {
        message += `  _Toppings: ${item.customBar.inclusions.join(", ")}_\n`;
        if (item.customBar.wrapperMessage) {
          message += `  _Engraving: "${item.customBar.wrapperMessage}"_\n`;
        }
      }
    });

    message += `\n*Subtotal:* $${order.subtotal}\n`;
    message += `*Logistics:* $${order.delivery === 0 ? "FREE" : `$${order.delivery}`}\n`;
    message += `*Total Bill:* *$${order.total}*\n\n`;
    message += `Please confirm processing status and dispatch estimated times. Thank you! ✨`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919130646860?text=${encoded}`, "_blank");
  };

  const handleSendCartToWhatsApp = () => {
    if (cart.length === 0) return;
    let message = `🛒 *Luxe Cocoa - Quick WhatsApp Order* 🛒\n\n`;
    message += `Hello! I would like to purchase the following items from my shopping bag directly:\n\n`;

    cart.forEach((item, index) => {
      const isCustom = item.type === "custom";
      const name = isCustom ? item.customBar!.customName : item.product!.name;
      const spec = isCustom ? `${item.customBar!.base} custom bar` : item.product!.spec;
      const price = isCustom ? item.customBar!.price : item.product!.price;
      message += `• *${item.quantity}x ${name}* (${spec}) — $${price * item.quantity}\n`;
      if (isCustom && item.customBar?.inclusions) {
        message += `  _Toppings: ${item.customBar.inclusions.join(", ")}_\n`;
        if (item.customBar.wrapperMessage) {
          message += `  _Engraving: "${item.customBar.wrapperMessage}"_\n`;
        }
      }
    });

    message += `\n*Estimated Subtotal:* $${subtotal}\n`;
    message += `*Premium Delivery:* $${delivery === 0 ? "FREE" : `$${delivery}`}\n`;
    message += `*Total Bill:* *$${total}*\n\n`;
    message += `My Delivery details:\n`;
    message += `- *Name:* [Your Name]\n`;
    message += `- *Address:* [Your Address]\n\n`;
    message += `Kindly confirm if you can ship this today. Thanks! ✨`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919130646860?text=${encoded}`, "_blank");
  };

  const handleSendCustomBarToWhatsApp = () => {
    let basePrice = customBase === "Dark 75%" ? 12 : 10;
    const inclusionPrice = customInclusions.length * 2;
    const finalPrice = basePrice + inclusionPrice;
    const name = customBarName.trim() || "Bespoke Creation";

    let message = `🍫 *Luxe Cocoa - Custom Bar Design Inquiry* 🍫\n\n`;
    message += `Hello! I just designed a bespoke chocolate bar on your website and would love to order it directly over WhatsApp:\n\n`;
    message += `*Bar Name:* "${name}"\n`;
    message += `*Base Chocolate:* ${customBase}\n`;
    message += `*Toppings / Inclusions:* ${customInclusions.length > 0 ? customInclusions.join(", ") : "Plain & pure"}\n`;
    if (customWrapperMessage.trim()) {
      message += `*Engraved Gold Message:* "${customWrapperMessage.trim()}"\n`;
    }
    message += `*Total Crafted Cost:* $${finalPrice}\n\n`;
    message += `Can you please craft this custom bar for me? Let me know the billing process. Thanks! ✨`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919130646860?text=${encoded}`, "_blank");
  };

  const handleSendReviewToWhatsApp = (rev: Review) => {
    let message = `⭐️ *Luxe Cocoa - New Guestbook Review* ⭐️\n\n`;
    message += `*Reviewer:* ${rev.name}\n`;
    message += `*Rating:* ${"★".repeat(rev.rating)}${"☆".repeat(5 - rev.rating)}\n`;
    message += `*Feedback:* _"${rev.comment}"_\n\n`;
    message += `Submitted via Luxe Cocoa online registry. Thank you! ✨`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919130646860?text=${encoded}`, "_blank");
  };

  // Financial calculations
  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => {
      const price = item.type === "product" ? item.product!.price : item.customBar!.price;
      return acc + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const delivery = subtotal >= 50 ? 0 : (subtotal > 0 ? 5 : 0);
  const total = subtotal + delivery;
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Scroll Helper
  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-secondary-container selection:text-on-secondary-container font-sans antialiased">
      
      {/* --- HEADER NAVIGATION BAR --- */}
      <nav className="fixed top-0 w-full z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm h-20 transition-all">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-12 h-full">
          {/* Logo */}
          <div 
            onClick={() => scrollToSection("hero")}
            className="font-serif text-2xl md:text-3xl font-black text-primary tracking-tighter cursor-pointer active:scale-95 transition-transform"
          >
            LUXE COCOA
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 lg:gap-12">
            <button 
              onClick={() => scrollToSection("collections")} 
              className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-on-surface-variant hover:text-primary border-b border-transparent hover:border-primary pb-1 transition-all"
            >
              Collections
            </button>
            <button 
              onClick={() => scrollToSection("craft-station")} 
              className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-on-surface-variant hover:text-primary border-b border-transparent hover:border-primary pb-1 transition-all"
            >
              Craft Station
            </button>
            <button 
              onClick={() => scrollToSection("story")} 
              className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-on-surface-variant hover:text-primary border-b border-transparent hover:border-primary pb-1 transition-all"
            >
              Our Story
            </button>
            <button 
              onClick={() => scrollToSection("reviews")} 
              className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-on-surface-variant hover:text-primary border-b border-transparent hover:border-primary pb-1 transition-all"
            >
              Guestbook
            </button>
          </div>

          {/* Right Nav Utilities */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Shopping Bag Button */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:scale-95 p-2 rounded-full hover:bg-surface-container"
              aria-label="View shopping bag"
            >
              <ShoppingBag className="w-5.5 h-5.5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Order History Button */}
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="relative text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:scale-95 p-2 rounded-full hover:bg-surface-container flex items-center justify-center"
              aria-label="View order history"
              title="View Order History"
            >
              <User className="w-5.5 h-5.5" />
              {orderHistory.length > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-[#735c00] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-background">
                  {orderHistory.length}
                </span>
              )}
            </button>

            {/* Admin Badge/Link */}
            {isUserAdmin && (
              <button 
                onClick={() => {
                  setIsAdminOpen(true);
                  handleFetchAdminOrders();
                }}
                className="hidden md:flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-700/60 hover:bg-amber-900/40 text-[9px] font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full transition-all active:scale-95 cursor-pointer"
                title="Open Admin Panel"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Admin Panel
              </button>
            )}

            {/* Google Auth Status / Actions */}
            {currentUser ? (
              <div className="hidden md:flex items-center gap-3 bg-surface-container/40 pl-3 pr-1 py-1 rounded-full border border-outline-variant/20">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-primary font-sans leading-none truncate max-w-[100px]">{currentUser.displayName || "Gourmet Guest"}</span>
                  <span className="text-[8px] text-on-surface-variant/70 font-sans mt-0.5 truncate max-w-[100px]">{currentUser.email}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-full transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 border border-[#735c00] hover:bg-[#735c00]/5 text-[#735c00] text-[10px] font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full transition-all active:scale-95 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#735c00]" />
                Sign In
              </button>
            )}

            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-on-surface-variant hover:text-primary p-2"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-surface border-b border-outline-variant/30 shadow-lg py-4 px-6 flex flex-col space-y-4 animate-fade-in z-30">
            <button 
              onClick={() => scrollToSection("collections")} 
              className="text-left font-sans text-xs uppercase tracking-widest font-semibold py-2 text-on-surface-variant hover:text-primary"
            >
              Collections
            </button>
            <button 
              onClick={() => scrollToSection("craft-station")} 
              className="text-left font-sans text-xs uppercase tracking-widest font-semibold py-2 text-on-surface-variant hover:text-primary"
            >
              Craft Station
            </button>
            <button 
              onClick={() => scrollToSection("story")} 
              className="text-left font-sans text-xs uppercase tracking-widest font-semibold py-2 text-on-surface-variant hover:text-primary"
            >
              Our Story
            </button>
            <button 
              onClick={() => scrollToSection("reviews")} 
              className="text-left font-sans text-xs uppercase tracking-widest font-semibold py-2 text-on-surface-variant hover:text-primary"
            >
              Guestbook
            </button>
             <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsHistoryOpen(true);
              }} 
              className="text-left font-sans text-xs uppercase tracking-widest font-bold py-2 text-[#735c00] hover:text-[#2c160c] border-t border-outline-variant/30 mt-1 pt-3 flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Order History ({orderHistory.length})
            </button>

            {isUserAdmin && (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAdminOpen(true);
                  handleFetchAdminOrders();
                }} 
                className="text-left font-sans text-xs uppercase tracking-widest font-bold py-2 text-amber-800 hover:text-amber-950 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Admin Panel Control
              </button>
            )}

            {currentUser ? (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }} 
                className="text-left font-sans text-xs uppercase tracking-widest font-bold py-2 text-red-600 hover:text-red-800 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({currentUser.displayName?.split(" ")[0] || "Guest"})
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setAuthModalOpen(true);
                }} 
                className="text-left font-sans text-xs uppercase tracking-widest font-bold py-2 text-primary hover:text-[#2c160c] flex items-center gap-1.5"
              >
                <User className="w-4 h-4" />
                Sign In / Register
              </button>
            )}
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-surface">
        {/* Decorative ambient background shape */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-surface-container rounded-full filter blur-3xl opacity-40 select-none pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
          
          {/* Hero Left Panel: Content */}
          <div className="space-y-6 md:space-y-8 max-w-xl text-center lg:text-left">
            {/* Limited Edition Announcement Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container text-primary-fixed font-sans text-xs font-bold uppercase tracking-widest mx-auto lg:mx-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
              Limited Edition Fall Release
            </div>

            {/* Display Heading */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-black text-primary leading-[1.1] tracking-tight">
              The Art of <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-800 to-secondary">Pure Indulgence</span>
            </h1>

            {/* Subtext description */}
            <p className="font-sans text-base md:text-lg text-on-surface-variant max-w-md mx-auto lg:mx-0 leading-relaxed">
              Experience handcrafted single-origin truffles and customizable artisanal chocolate bars. Ethically sourced and tailored perfectly to your sensory palate.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <button 
                onClick={() => scrollToSection("craft-station")}
                className="bg-primary-container text-primary-fixed px-8 py-4.5 rounded-lg font-sans text-xs uppercase tracking-[0.2em] font-bold hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300 cocoa-shadow cursor-pointer flex items-center justify-center gap-2 group"
              >
                Craft Bespoke Bar
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button 
                onClick={() => scrollToSection("collections")}
                className="border border-outline text-primary px-8 py-4.5 rounded-lg font-sans text-xs uppercase tracking-[0.2em] font-bold hover:bg-surface-container transition-all duration-300 cursor-pointer"
              >
                Discover Flavors
              </button>
            </div>
          </div>

          {/* Hero Right Panel: Interactive Premium Animated Photo Showcase */}
          <div className="relative h-[320px] sm:h-[450px] lg:h-[550px] flex items-center justify-center">
            {/* Absolute background blurring circles */}
            <div className="absolute w-80 h-80 rounded-full bg-amber-900/10 blur-3xl select-none pointer-events-none" />
            <div className="absolute w-56 h-56 rounded-full bg-amber-600/10 blur-3xl select-none pointer-events-none" />
            
            {/* Premium Photo Showcase */}
            <div className="relative w-full max-w-sm sm:max-w-md aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(44,22,12,0.35)] border-4 border-amber-950/20 group hover:border-amber-950/40 transition-all duration-700 animate-float">
              {/* Inner ambient shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent z-10 pointer-events-none" />
              
              {/* Generated Luxury Image */}
              <img 
                src="/src/assets/images/luxe_chocolates_1782664389375.jpg"
                alt="Luxury Hand-crafted Chocolates with gold leaf toppings"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-1000 select-none"
              />
              
              {/* Overlay Interactive Badge */}
              <div className="absolute bottom-6 left-6 right-6 z-20 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold block">Exclusive Collection</span>
                  <span className="text-white font-serif font-bold text-sm">Tempered Grand Cru Selection</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Sparkle className="w-4 h-4 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Micro floating cards for ultimate premium touch */}
            <div className="absolute top-10 -right-2 sm:-right-4 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-amber-900/10 flex items-center gap-2 transform hover:scale-105 transition-all duration-300 select-none animate-float-delayed">
              <span className="text-lg">✨</span>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">Craftsmanship</span>
                <span className="text-[11px] font-serif font-bold text-primary block">Gold Leaf Infused</span>
              </div>
            </div>

            <div className="absolute bottom-10 -left-2 sm:-left-4 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-amber-900/10 flex items-center gap-2 transform hover:scale-105 transition-all duration-300 select-none animate-float-slow">
              <span className="text-lg">🌱</span>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">100% Organic</span>
                <span className="text-[11px] font-serif font-bold text-primary block">Ecuadorian Origin</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- PREMIUM COLLECTIONS SECTION --- */}
      <section id="collections" className="py-24 bg-background border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          {/* Header Block */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 gap-4">
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-secondary font-sans block">
                Exquisite Assortments
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-black text-primary tracking-tight">Our Collections</h2>
              <p className="font-sans text-on-surface-variant max-w-xl leading-relaxed">
                From silk-smooth hazelnut pralinés to intense single-origin dark chocolates, explore curated selections refined by master chocolatiers.
              </p>
            </div>
            
            <button 
              onClick={() => scrollToSection("craft-station")}
              className="text-xs uppercase tracking-[0.15em] font-bold text-secondary border-b border-secondary/30 pb-1 hover:border-secondary transition-all text-left flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkle className="w-3.5 h-3.5" />
              Craft Custom chocolate instead
            </button>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <div 
                key={product.id}
                className="group bg-surface-container-low rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-outline-variant/20 hover:border-outline-variant/50 transition-all duration-300 flex flex-col h-full"
              >
                {/* Image Container with peaking gold overlay */}
                <div className="relative overflow-hidden aspect-[4/3] bg-surface-container">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Absolute Tag Overlay */}
                  <span className="absolute top-4 left-4 bg-primary text-primary-fixed text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                    {product.tag}
                  </span>
                </div>

                {/* Content Block */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-[#735c00] uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                        {product.spec}
                      </span>
                      <span className="font-serif text-lg font-black text-primary">${product.price}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-primary tracking-tight leading-snug group-hover:text-secondary transition-colors">
                      {product.name}
                    </h3>
                    <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Dual Actions Footer */}
                  <div className="flex gap-2.5 pt-2">
                    {/* Sommelier Pairing notes popup */}
                    <button 
                      onClick={() => handleTriggerSommelier("product", product)}
                      className="flex-1 border border-outline/30 hover:border-outline text-on-surface-variant font-sans text-[10px] uppercase tracking-widest font-bold py-3 rounded-lg hover:bg-surface-container transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
                      Tasting notes
                    </button>
                    {/* Add to Cart */}
                    <button 
                      onClick={() => handleAddProductToBag(product)}
                      className="bg-[#2c160c] hover:bg-[#3d1c10] text-white font-sans text-[10px] uppercase tracking-widest font-bold px-4 py-3 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Add To Bag
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* --- CRAFT STATION (BESPOKE CHOCOLATE CREATOR) --- */}
      <section id="craft-station" className="py-24 bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          {/* Header Block */}
          <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary font-sans block">
              Sensory Laboratory
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-black text-primary tracking-tight">
              Artisanal Craft Station
            </h2>
            <p className="font-sans text-on-surface-variant leading-relaxed">
              Design your signature chocolate bar. Select your base blend, scatter gourmet inclusions, and engrave a personalized gold-foil message on the sleeve.
            </p>
          </div>

          {/* Interactive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch bg-background p-6 md:p-10 rounded-3xl shadow-xl border border-outline-variant/20">
            
            {/* Left Workspace: Selectors (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              
              {/* Step 1: Base Cocoa Blend */}
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#3d1c10] text-amber-200 text-xs font-mono font-bold flex items-center justify-center">1</span>
                  Select Cocoa Base
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Dark */}
                  <button 
                    onClick={() => setCustomBase("Dark 75%")}
                    className={`p-4 rounded-xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between h-28 ${customBase === "Dark 75%" ? "border-[#230801] bg-[#230801]/5" : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"}`}
                  >
                    <span className="font-serif font-bold text-[#230801] text-base">Dark 75%</span>
                    <p className="text-[10px] text-on-surface-variant font-sans leading-snug">Rich, single-origin organic cocoa with subtle fruity undertones.</p>
                    <span className="font-serif font-black text-[#230801] text-xs">$12</span>
                  </button>

                  {/* Milk */}
                  <button 
                    onClick={() => setCustomBase("Milk Velvet")}
                    className={`p-4 rounded-xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between h-28 ${customBase === "Milk Velvet" ? "border-amber-800 bg-amber-800/5" : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"}`}
                  >
                    <span className="font-serif font-bold text-amber-900 text-base">Milk Velvet</span>
                    <p className="text-[10px] text-on-surface-variant font-sans leading-snug">Caramelized Swiss Alpine milk chocolate with velvety density.</p>
                    <span className="font-serif font-black text-amber-900 text-xs">$10</span>
                  </button>

                  {/* White */}
                  <button 
                    onClick={() => setCustomBase("White Silk")}
                    className={`p-4 rounded-xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between h-28 ${customBase === "White Silk" ? "border-amber-600 bg-amber-600/5" : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"}`}
                  >
                    <span className="font-serif font-bold text-amber-800 text-base">White Silk</span>
                    <p className="text-[10px] text-on-surface-variant font-sans leading-snug">Pure organic cocoa butter infused with Bourbon vanilla bean pods.</p>
                    <span className="font-serif font-black text-amber-800 text-xs">$10</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Inclusions / Toppings (up to 3) */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#3d1c10] text-amber-200 text-xs font-mono font-bold flex items-center justify-center">2</span>
                    Gourmet Inclusions
                  </h3>
                  <span className="text-[11px] font-sans text-on-surface-variant italic font-medium">
                    {customInclusions.length} of 3 selected
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: "24K Gold Flakes (+$3.5)", desc: "Edible shimmer", icon: "✨" },
                    { name: "Fleur de Sel (+$1.5)", desc: "Flaky sea salt", icon: "🧂" },
                    { name: "Caramelized Hazelnuts (+$2.0)", desc: "Roasted nuts", icon: "🌰" },
                    { name: "Freeze-Dried Raspberries (+$2.5)", desc: "Sour sweet punch", icon: "🍓" },
                    { name: "Crushed Wild Pistachios (+$2.0)", desc: "Nutty crunch", icon: "🥑" },
                    { name: "Spicy Chili Flakes (+$1.0)", desc: "Bold warm heat", icon: "🌶️" }
                  ].map((inc) => {
                    const isSelected = customInclusions.includes(inc.name);
                    const isMaxReached = customInclusions.length >= 3;
                    const disabled = !isSelected && isMaxReached;

                    return (
                      <button
                        key={inc.name}
                        disabled={disabled}
                        onClick={() => handleToggleInclusion(inc.name)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer h-16 select-none ${
                          isSelected 
                            ? "border-secondary bg-secondary-container/10 text-on-secondary-container shadow-sm" 
                            : disabled 
                              ? "opacity-40 cursor-not-allowed bg-surface-container" 
                              : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"
                        }`}
                      >
                        <span className="text-xl pt-0.5">{inc.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs font-bold leading-tight truncate">{inc.name.split(" (+$")[0]}</p>
                          <p className="font-sans text-[10px] text-on-surface-variant leading-normal">{inc.name.includes("+$") ? `+$${inc.name.split("+$")[1].replace(")", "")}` : inc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Wrapper Engraving Message */}
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#3d1c10] text-amber-200 text-xs font-mono font-bold flex items-center justify-center">3</span>
                  Wrapper Customization
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans">Bar Signature Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Midnight Passion"
                      value={customBarName}
                      onChange={(e) => setCustomBarName(e.target.value.substring(0, 24))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/40"
                    />
                  </div>
                  {/* Inscription field */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans">Gold Embossed Inscription</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Crafted with love"
                      value={customWrapperMessage}
                      onChange={(e) => setCustomWrapperMessage(e.target.value.substring(0, 40))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/40"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                {/* AI sommelier review of the customized bar prior to purchase */}
                <button 
                  onClick={() => handleTriggerSommelier("custom")}
                  className="flex-1 border border-outline/30 hover:border-outline text-on-surface text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] py-4 rounded-xl hover:bg-surface-container transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
                  AI Analysis
                </button>
                <button 
                  onClick={handleAddCustomBarToBag}
                  className="flex-1 bg-[#2c160c] hover:bg-[#3d1c10] text-white text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] py-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Add to Bag
                </button>
                <button 
                  onClick={handleSendCustomBarToWhatsApp}
                  className="flex-1 bg-[#128c7e] hover:bg-[#075e54] text-white text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] py-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  WhatsApp Order
                </button>
              </div>

            </div>

            {/* Right Workspace: Live visualizer rendering (5 cols) */}
            <div className="order-first lg:order-last lg:col-span-5 bg-surface-container-low rounded-2xl flex flex-col items-center justify-center min-h-[400px] py-8 lg:py-0 border border-outline-variant/10">
              <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 font-sans mb-2 block">
                Live Interactive Rendering
              </span>
              <CustomBarVisual 
                base={customBase}
                inclusions={customInclusions}
                wrapperMessage={customWrapperMessage}
                customName={customBarName}
              />
            </div>

          </div>

        </div>
      </section>

      {/* --- REVIEWS / GUESTBOOK SECTION --- */}
      <section id="reviews" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          {/* Header Block */}
          <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary font-sans block">
              Guest Indulgence Reports
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-black text-primary tracking-tight">
              The Luxe Guestbook
            </h2>
            <p className="font-sans text-on-surface-variant leading-relaxed">
              Read sensory experiences submitted by other chocolate aficionados, or pen your own detailed review below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Panel: Submit Form (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-low p-6 md:p-8 rounded-2xl border border-outline-variant/30 space-y-6">
              <h3 className="font-serif text-2xl font-bold text-primary">Pen Your Report</h3>
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                Describe your sensory experience. Acidity levels, aroma profiles, texture snap, and pairing ideas are highly appreciated.
              </p>

              {lastSubmittedReview && (
                <div className="bg-emerald-50 border border-emerald-500/20 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-start gap-2 text-emerald-800 text-xs font-sans leading-normal">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-900">Indulgence Report published!</span> Thank you for sharing your experience. You can also send this review directly to our WhatsApp support line.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleSendReviewToWhatsApp(lastSubmittedReview);
                        setLastSubmittedReview(null);
                      }}
                      className="flex-1 bg-[#128c7e] hover:bg-[#075e54] text-white font-sans text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Send to WhatsApp
                    </button>
                    <button
                      onClick={() => setLastSubmittedReview(null)}
                      className="border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant font-sans text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Guest name */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Sophia Vance"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30"
                  />
                </div>

                {/* Rating selection (Stars) */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans block">Acidity & Palate Rating</label>
                  <div className="flex gap-2.5 pt-1">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        type="button"
                        key={stars}
                        onClick={() => setReviewRating(stars)}
                        className={`text-2xl transition-all cursor-pointer transform hover:scale-110 active:scale-95 select-none ${stars <= reviewRating ? "text-[#735c00]" : "text-outline-variant/40"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment box */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-[#735c00] font-sans">Sensory Review Description</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe the melt rate, aroma notes, and your final impressions..."
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30 resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-[#2c160c] hover:bg-[#3d1c10] text-white text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {submittingReview ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Publish Indulgence Report
                </button>
              </form>
            </div>

            {/* Right Panel: Reviews Timeline (7 cols) */}
            <div className="lg:col-span-7 space-y-6 max-h-[560px] overflow-y-auto pr-2">
              {reviews.map((rev) => (
                <div 
                  key={rev.id}
                  className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-all flex flex-col space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif font-bold text-primary text-lg">{rev.name}</h4>
                      <p className="text-[10px] text-on-surface-variant/60 font-mono">{rev.date}</p>
                    </div>
                    <div className="flex text-[#735c00]">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-lg">
                          {i < rev.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed italic whitespace-pre-line">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* --- BRAND STORY TEASER SECTION --- */}
      <section id="story" className="py-24 bg-surface-container-low overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Visual Frame */}
            <div className="relative">
              <div className="absolute -top-12 -left-12 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl select-none pointer-events-none" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20">
                <img 
                  className="w-full aspect-square object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0XrxIjlfL1lHeB6jm02igMzc3S25C1wYX7JWqC70_4GbTMaxYEVSrl8WsLRS1yPn6g7mfAZbypHVGsjBiiPDX7A4QTDfPfFAdpZK10sl2OmzKoQo9zvTnIfJ4HOp03meDzKGQS2Rwqziu1W1iw5Zf2lL804ZOmOvYtUjxcW7FbLv753BDIpPUzhR5jLJxXOvwybFnX0ZBbzlZ9rnwxAxyufqjbAE8dz3SG8mY43eaLrKJlt2x0LwtiKuuH_zpCy2mXNgDzOB1go0"
                  alt="Master chocolatier tempering pure liquid chocolate on cooling marble slab"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 p-6 bg-white rounded-xl shadow-lg max-w-xs border border-outline-variant/30 hidden sm:block">
                <p className="font-serif text-[#2c160c] text-base leading-tight italic">
                  "Each bar represents an alignment of fair agriculture, perfect molecular roasting, and artisan devotion."
                </p>
                <p className="mt-3 font-sans text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                  — Master Chocolatier
                </p>
              </div>
            </div>

            {/* Narrative Story */}
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-secondary font-sans block">
                  Ethical Craft & Passion
                </span>
                <h2 className="font-serif text-4xl md:text-5xl font-black text-primary tracking-tight">
                  The Story of Origin
                </h2>
              </div>
              
              <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed font-sans">
                <p>
                  At Luxe Cocoa, we believe that chocolate is not merely a confection, but a medium of deep artistic expression. Our journey begins directly on small-scale cooperative estate farms in the volcanic soil of Ecuador and the organic groves of Madagascar.
                </p>
                <p>
                  By skipping industrial middlemen, we pay premium rates directly to our farming partners, promoting regenerative agriculture, fair wages, and biodiversity. Once harvested, our beans are micro-roasted in small batches to preserve their delicate floral and earthy profiles.
                </p>
                <p>
                  Every truffle, block, and customizable piece is hand-finished in our luxury workshop, offering our guests a pristine sensory journey that traces all the way back to the nutrient-rich soils of the farm.
                </p>
              </div>

              {/* Sourcing badges list */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🌿</span>
                  <div>
                    <h5 className="font-serif text-sm font-bold text-primary">Regenerative Sourcing</h5>
                    <p className="text-[11px] text-on-surface-variant">Promoting biodiverse crops & pure soil ecosystems.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🤝</span>
                  <div>
                    <h5 className="font-serif text-sm font-bold text-primary">Direct Farmer Trade</h5>
                    <p className="text-[11px] text-on-surface-variant">Paying up to 60% above fair-trade standard baselines.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER ORNAMENT --- */}
      <footer className="bg-[#230801] text-[#fff8f6] py-16 border-t border-amber-950">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 items-start">
          
          {/* Brand Intro */}
          <div className="space-y-4">
            <h4 className="font-serif text-2xl font-black text-white tracking-tighter">LUXE COCOA</h4>
            <p className="text-xs text-[#d6c2bd] leading-relaxed max-w-sm">
              Crafting premium, ethically harvested chocolates with customizable gold-foil packaging and server-side AI pairing intelligence.
            </p>
            <div className="text-[10px] text-[#83746f] font-mono">
              EST. 2026 • ALL RIGHTS RESERVED
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h5 className="font-serif text-base font-bold text-amber-300">Indulgences</h5>
            <div className="flex flex-col space-y-2 text-xs text-[#d6c2bd]">
              <button onClick={() => scrollToSection("collections")} className="text-left hover:text-white transition-colors cursor-pointer">Noir Truffle Series</button>
              <button onClick={() => scrollToSection("collections")} className="text-left hover:text-white transition-colors cursor-pointer">Creamy Velvet Pralinés</button>
              <button onClick={() => scrollToSection("craft-station")} className="text-left hover:text-white transition-colors cursor-pointer">Bespoke Inscription Bars</button>
              <button onClick={() => scrollToSection("reviews")} className="text-left hover:text-white transition-colors cursor-pointer">Afficionado Guestbook</button>
            </div>
          </div>

          {/* Sourcing location disclosures */}
          <div className="space-y-4">
            <h5 className="font-serif text-base font-bold text-amber-300">Boutique Locations</h5>
            <p className="text-xs text-[#d6c2bd] leading-relaxed">
              Main atelier: Rue de l'Aurore, Geneva, Switzerland.<br/>
              Sourcing cooperations: Cotopaxi Estate, Ecuador & Sambirano Valley, Madagascar.
            </p>
            <p className="text-[11px] text-[#83746f]">
              Direct communication: concierge@luxecocoa.com
            </p>
          </div>

          {/* Direct Concierge Support (Real Contacts) */}
          <div className="space-y-4">
            <h5 className="font-serif text-base font-bold text-amber-300">Direct Inquiries</h5>
            <div className="flex flex-col space-y-3 text-xs text-[#d6c2bd]">
              {/* Direct call action */}
              <a 
                href="tel:+919130646860"
                className="flex items-center gap-2.5 hover:text-white transition-all group"
                title="Call directly"
              >
                <div className="p-1.5 rounded bg-amber-950/60 text-amber-400 group-hover:bg-amber-900 group-hover:text-white transition-all">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#83746f] block font-mono">Direct Voice Line</span>
                  <span className="font-sans font-medium">+91 9130646860</span>
                </div>
              </a>

              {/* Direct WhatsApp chat action */}
              <a 
                href="https://wa.me/919130646860" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-white transition-all group"
                title="WhatsApp Direct Chat"
              >
                <div className="p-1.5 rounded bg-amber-950/60 text-emerald-400 group-hover:bg-emerald-900 group-hover:text-white transition-all">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.011 2C6.48 2 2 6.48 2 12.01c0 1.91.53 3.69 1.46 5.21L2 22l4.94-1.39c1.47.8 3.14 1.25 4.91 1.25 5.53 0 10.01-4.48 10.01-10.01C21.86 6.48 17.38 2 12.011 2zm0 18.21c-1.6 0-3.11-.44-4.43-1.22l-.32-.19-2.93.82.84-2.86-.21-.34c-.84-1.35-1.29-2.92-1.29-4.54 0-4.63 3.77-8.4 8.4-8.4 4.63 0 8.4 3.77 8.4 8.4-.01 4.63-3.78 8.4-8.41 8.4zm4.72-6.43c-.26-.13-1.53-.76-1.77-.84-.23-.09-.4-.13-.57.13-.17.26-.66.84-.81.99-.15.17-.3.19-.56.06-.26-.13-1.1-.41-2.1-1.3-1-1-1.36-1.63-1.47-1.89s0-.36.08-.49c.07-.12.18-.21.28-.31.1-.1.14-.17.2-.29.07-.12.03-.23-.01-.32-.05-.09-.4-.98-.56-1.35-.15-.37-.32-.32-.44-.33h-.37c-.13 0-.34.05-.52.24-.18.19-.69.67-.69 1.63 0 .96.7 1.89.8 2.02.1.13 1.38 2.11 3.34 2.96.47.2.83.32 1.12.41.47.15.9.13 1.24.08.38-.06 1.17-.48 1.33-.94.17-.46.17-.86.12-.94-.05-.08-.18-.13-.44-.26z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#83746f] block font-mono">Instant Message</span>
                  <span className="font-sans font-medium">WhatsApp Live chat</span>
                </div>
              </a>

              {/* Direct Instagram Action */}
              <a 
                href="https://instagram.com/shaikh_salman_2012" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-white transition-all group"
                title="Instagram Profile"
              >
                <div className="p-1.5 rounded bg-amber-950/60 text-pink-400 group-hover:bg-pink-900 group-hover:text-white transition-all">
                  <Instagram className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#83746f] block font-mono">Instagram Hub</span>
                  <span className="font-sans font-medium">@shaikh_salman_2012</span>
                </div>
              </a>

              {/* Direct Gmail mailto action */}
              <a 
                href="mailto:saleemshaikh3010@gmail.com"
                className="flex items-center gap-2.5 hover:text-white transition-all group"
                title="Send an Email"
              >
                <div className="p-1.5 rounded bg-amber-950/60 text-[#fed65b] group-hover:bg-yellow-900 group-hover:text-white transition-all">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#83746f] block font-mono">Email Registry</span>
                  <span className="font-sans font-medium">saleemshaikh3010@gmail.com</span>
                </div>
              </a>
            </div>
          </div>

        </div>
      </footer>

      {/* --- SHOPPING BAG DRAWERS / SLIDING CART --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end" onClick={() => setIsCartOpen(false)}>
          
          {/* The Cart Sidebar Panel */}
          <div 
            className="w-full max-w-md bg-[#fff8f6] h-full shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-bold text-primary">Your Shopping Bag</h3>
                <span className="text-xs bg-primary-container text-primary-fixed rounded-full px-2.5 py-0.5 font-bold font-sans">
                  {cartItemCount}
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <span className="text-4xl">👜</span>
                  <div className="space-y-1.5">
                    <p className="font-serif text-lg font-bold text-primary">Bag is empty</p>
                    <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                      Explore our collections or head to the sensory lab to create a customized bar!
                    </p>
                  </div>
                  <button 
                    onClick={() => { setIsCartOpen(false); scrollToSection("craft-station"); }}
                    className="bg-[#2c160c] hover:bg-[#3d1c10] text-white text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-lg active:scale-95 cursor-pointer"
                  >
                    Open Craft Station
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Item Cards list */}
                  {cart.map((item) => {
                    const isCustom = item.type === "custom";
                    const title = isCustom ? item.customBar!.customName : item.product!.name;
                    const subtitle = isCustom ? `${item.customBar!.base} custom bar` : item.product!.spec;
                    const price = isCustom ? item.customBar!.price : item.product!.price;

                    return (
                      <div 
                        key={item.id}
                        className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 flex gap-4 hover:shadow-sm transition-all"
                      >
                        {/* Image/Visual thumbnail */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 relative border border-outline-variant/20">
                          {isCustom ? (
                            /* Miniature custom bar visual */
                            <div className="w-full h-full flex items-center justify-center bg-[#2c160c] relative">
                              <span className="text-xs text-amber-400 font-mono">🍫</span>
                              {item.customBar?.inclusions.length && item.customBar.inclusions.length > 0 && (
                                <span className="absolute bottom-1 right-1 text-[8px]">✨</span>
                              )}
                            </div>
                          ) : (
                            <img 
                              src={item.product!.imageUrl} 
                              alt={title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Title, spec, adjustments */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-2">
                              <h4 className="font-serif text-sm font-bold text-primary truncate leading-tight">
                                {title}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant font-sans truncate leading-normal">
                                {subtitle}
                              </p>
                              {isCustom && item.customBar?.wrapperMessage && (
                                <p className="text-[9px] text-[#735c00] font-sans truncate leading-normal italic mt-0.5">
                                  "{item.customBar.wrapperMessage}"
                                </p>
                              )}
                            </div>
                            <span className="font-serif text-xs font-bold text-primary flex-shrink-0">${price * item.quantity}</span>
                          </div>

                          {/* Adjustment Row */}
                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                              <button 
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="text-on-surface-variant hover:text-primary"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-bold w-4 text-center text-primary">{item.quantity}</span>
                              <button 
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="text-on-surface-variant hover:text-primary"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button 
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="text-on-surface-variant/40 hover:text-red-600 p-1 rounded-full transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer & Checkout Form */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-outline-variant/30 bg-surface-container-low space-y-5">
                
                {/* Financial Summary */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Delivery Charge</span>
                    {delivery === 0 ? (
                      <span className="text-green-700 font-bold uppercase text-[10px] tracking-wider">Free Shipping</span>
                    ) : (
                      <span>${delivery}</span>
                    )}
                  </div>
                  {delivery > 0 && (
                    <p className="text-[10px] text-[#735c00] italic font-sans">
                      Add ${50 - subtotal} more to unlock complimentary premium delivery!
                    </p>
                  )}
                  <div className="h-[1px] bg-outline-variant/30 my-2" />
                  <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Total Bill</span>
                    <span>${total}</span>
                  </div>
                </div>

                 {/* Checkout Fields Form */}
                {currentUser ? (
                  <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#735c00] font-sans block">
                      Secured Premium Checkout
                    </span>
                    
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Receiver's Full Name"
                        required
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30"
                      />
                      <input 
                        type="email" 
                        placeholder="Receiver's Email Address"
                        required
                        disabled
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs focus:outline-none font-sans placeholder-on-surface-variant/30 opacity-70 cursor-not-allowed text-on-surface-variant"
                        title="Linked to your authenticated Google account"
                      />
                      <input 
                        type="text" 
                        placeholder="Full Delivery Address (Street, City, Zip)"
                        required
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30"
                      />
                      <input 
                        type="text" 
                        placeholder="Special delivery directives (Optional)"
                        value={checkoutInstructions}
                        onChange={(e) => setCheckoutInstructions(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={checkoutLoading}
                        className="w-full bg-primary-container text-primary-fixed text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {checkoutLoading ? (
                          <span className="w-4 h-4 border-2 border-primary-fixed/20 border-t-primary-fixed rounded-full animate-spin" />
                        ) : (
                          <Truck className="w-4 h-4 text-amber-300 animate-pulse" />
                        )}
                        Place Order & Authorize
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSendCartToWhatsApp}
                        className="w-full bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-300" />
                        Checkout on WhatsApp
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-[#fff9f3] border border-[#f0ded2] p-5 rounded-xl text-center space-y-4">
                    <div className="space-y-1">
                      <p className="font-serif font-bold text-sm text-[#2c160c]">Authentication Required</p>
                      <p className="text-[10px] text-on-surface-variant/80 font-sans max-w-xs mx-auto leading-normal">
                        Please sign in or create an account to authorize your chocolate order and ensure your bespoke designs and purchases are permanently secured in our cloud archives.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="w-full bg-[#2c160c] hover:bg-[#3d1c10] text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4 text-amber-400" />
                      Sign In / Register
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

      {/* --- ORDER RECEIPT SUCCESS MODAL (RECEIPT PAGE) --- */}
      {checkoutSuccessOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#fff8f6] text-[#2c160c] rounded-2xl shadow-2xl border border-[#ffe9e2] overflow-hidden animate-fade-in relative max-h-[92vh] flex flex-col">
            
            {/* Header border */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400" />
            
            <button 
              onClick={() => setCheckoutSuccessOrder(null)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Receipt Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              
              {/* Receipt Success Badge */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-black text-primary tracking-tight">Order Received</h3>
                <p className="text-xs text-on-surface-variant/70 font-mono">ID: {checkoutSuccessOrder.id}</p>
              </div>

              {/* Status Interactive Progress Bar */}
              <div className="bg-emerald-50 border border-emerald-500/10 rounded-2xl p-4 space-y-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-800 font-sans block">
                  Current Artisan Processing Status
                </span>
                
                <div className="flex justify-between items-center gap-1.5 text-[10px] font-sans font-bold text-[#2c160c]">
                  <div className="flex items-center gap-1 text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ordered</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-emerald-500/30" />
                  <div className="opacity-45">Crafting</div>
                  <div className="h-0.5 flex-1 bg-emerald-500/30" />
                  <div className="opacity-45">Dispatched</div>
                  <div className="h-0.5 flex-1 bg-emerald-500/30" />
                  <div className="opacity-45">Delivered</div>
                </div>

                <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full animate-pulse" style={{ width: "25%" }} />
                </div>
                
                <p className="text-[11px] text-emerald-800/80 leading-normal font-sans italic">
                  Our master chocolatiers are currently validating the ingredients in your cart to begin precise temperature tempering and custom packaging.
                </p>
              </div>

              {/* Order Breakdown */}
              <div className="space-y-3 font-sans">
                <h4 className="font-serif text-sm font-bold text-primary border-b border-outline-variant/30 pb-1.5">
                  Ordered Indulgences
                </h4>
                <div className="space-y-2">
                  {checkoutSuccessOrder.items.map((item) => {
                    const isCustom = item.type === "custom";
                    const name = isCustom ? item.customBar!.customName : item.product!.name;
                    const spec = isCustom ? `${item.customBar!.base} custom bar` : item.product!.spec;
                    const price = isCustom ? item.customBar!.price : item.product!.price;

                    return (
                      <div key={item.id} className="flex justify-between items-start text-xs text-on-surface">
                        <div>
                          <span className="font-bold text-primary">{item.quantity}x </span>
                          <span>{name}</span>
                          <span className="text-[10px] text-on-surface-variant block">({spec})</span>
                        </div>
                        <span className="font-mono font-bold">${price * item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Details card */}
              <div className="bg-surface-container p-4 rounded-xl space-y-2 text-xs font-sans">
                <h5 className="font-serif font-bold text-primary text-sm">Premium Delivery Directives</h5>
                <p><strong className="text-on-surface-variant">Consignee:</strong> {checkoutSuccessOrder.name}</p>
                <p><strong className="text-on-surface-variant">Email:</strong> {checkoutSuccessOrder.email}</p>
                <p><strong className="text-on-surface-variant">Destination:</strong> {checkoutSuccessOrder.address}</p>
                {checkoutSuccessOrder.specialInstructions && (
                  <p className="italic text-[11px] text-on-surface-variant mt-2 border-t border-outline-variant/30 pt-2">
                    " {checkoutSuccessOrder.specialInstructions} "
                  </p>
                )}
              </div>

              {/* Receipt Financial Totals */}
              <div className="space-y-1.5 text-xs font-sans">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>${checkoutSuccessOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Premium Logistics</span>
                  <span>${checkoutSuccessOrder.delivery}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary pt-1.5 border-t border-outline-variant/30">
                  <span>Total Bill Authorized</span>
                  <span>${checkoutSuccessOrder.total}</span>
                </div>
              </div>

            </div>

            {/* Receipt Modal Footer */}
            <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex justify-end gap-3">
              <button
                onClick={() => handleSendOrderToWhatsApp(checkoutSuccessOrder)}
                className="bg-[#128c7e] hover:bg-[#075e54] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                Send to WhatsApp
              </button>
              <button
                onClick={() => setCheckoutSuccessOrder(null)}
                className="bg-[#2c160c] hover:bg-[#3d1c10] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- PREMIUM ORDER HISTORY ARCHIVE MODAL --- */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#fff8f6] text-[#2c160c] rounded-2xl shadow-2xl border border-[#ffe9e2] overflow-hidden animate-fade-in relative max-h-[90vh] flex flex-col">
            
            {/* Header branding band */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-800 via-yellow-600 to-amber-900" />
            
            {/* Close Button */}
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container"
              title="Close Archive"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Scrollable Content */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-black text-primary tracking-tight">Indulgence Archive</h3>
                <p className="text-xs text-on-surface-variant/70 font-sans">View your historic custom chocolate creations & curated selections</p>
              </div>

              {/* Server retrieval widget (To guarantee history is NEVER lost) */}
              <div className="bg-amber-100/40 border border-amber-900/10 p-4 rounded-xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-serif text-[#2c160c] flex items-center gap-1.5">
                    <Sparkle className="w-3.5 h-3.5 text-[#735c00] animate-pulse" />
                    Restore From Server Registry
                  </h4>
                  <p className="text-[10px] text-on-surface-variant/80 font-sans mt-0.5">
                    History cleared? Sync the server database registry using your email to restore your entire profile.
                  </p>
                </div>
                
                <form onSubmit={handleFetchHistoryFromServer} className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Enter your registered email address"
                    required
                    value={historyLookupEmail}
                    onChange={(e) => setHistoryLookupEmail(e.target.value)}
                    className="flex-1 bg-white/80 border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-secondary font-sans placeholder-on-surface-variant/30 text-on-surface"
                  />
                  <button 
                    type="submit"
                    disabled={historyLoading}
                    className="bg-[#2c160c] hover:bg-[#3d1c10] text-white px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    {historyLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Restore Registry"
                    )}
                  </button>
                </form>

                {historySuccessMsg && (
                  <p className="text-[10px] font-sans font-bold text-[#735c00] bg-[#fffbf0] px-2.5 py-1 rounded border border-yellow-200/40 animate-fade-in">
                    {historySuccessMsg}
                  </p>
                )}
              </div>

              {/* Order History List */}
              <div className="space-y-4">
                <h4 className="font-serif text-sm font-bold text-primary border-b border-outline-variant/30 pb-1.5 flex justify-between items-center">
                  <span>Your Recorded Orders ({orderHistory.length})</span>
                  <span className="text-[10px] font-mono font-normal uppercase text-on-surface-variant/55">Device + Cloud Sync Active</span>
                </h4>

                {orderHistory.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3 bg-surface-container/25 rounded-2xl border border-dashed border-outline-variant/30">
                    <div className="w-10 h-10 bg-[#ffe9e2] text-primary rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif font-bold text-sm text-primary">No chocolate orders recorded on this device yet</p>
                      <p className="text-[10px] text-on-surface-variant/70 max-w-xs mx-auto">
                        Once you checkout or use the email restoration tool above, your delicious history will automatically persist here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                    {orderHistory.map((order) => {
                      const orderDate = order.createdAt 
                        ? new Date(order.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "Prior Purchase";

                      return (
                        <div key={order.id} className="bg-white/60 hover:bg-white border border-[#ffe9e2] hover:border-amber-900/10 rounded-xl p-4 transition-all duration-300 space-y-3 relative group text-left">
                          
                          {/* Order metadata line */}
                          <div className="flex flex-wrap justify-between items-start gap-1">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-primary block leading-none">{order.id}</span>
                              <span className="text-[9px] text-on-surface-variant/70 font-sans block mt-1">{orderDate}</span>
                            </div>
                            
                            {/* Status tag */}
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-emerald-50 text-emerald-800 border border-emerald-500/15">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {order.status || "Pending"}
                              </span>
                              <span className="font-mono text-xs font-black text-primary">${order.total}</span>
                            </div>
                          </div>

                          {/* Order items list */}
                          <div className="border-t border-[#ffe9e2]/60 pt-2.5 space-y-1.5">
                            {order.items.map((it) => {
                              const isCustom = it.type === "custom";
                              const name = isCustom ? it.customBar!.customName : it.product!.name;
                              const spec = isCustom ? `${it.customBar!.base} custom bar` : it.product!.spec;
                              const price = isCustom ? it.customBar!.price : it.product!.price;

                              return (
                                <div key={it.id} className="flex justify-between items-start text-[11px] font-sans">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <span className="font-bold text-primary">{it.quantity}x </span>
                                    <span>{name}</span>
                                    <span className="text-[9px] text-on-surface-variant/70 block">({spec})</span>
                                    {isCustom && it.customBar?.inclusions && (
                                      <span className="text-[9px] text-[#735c00] block italic mt-0.5">
                                        Toppings: {it.customBar.inclusions.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-on-surface-variant">${price * it.quantity}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick delivery details snippet */}
                          <div className="bg-[#fffcfb] p-2.5 rounded-lg border border-[#ffe9e2]/30 text-[10px] text-on-surface-variant font-sans space-y-0.5">
                            <p><strong className="text-primary font-serif">Recipient:</strong> {order.name} ({order.email})</p>
                            <p><strong className="text-primary font-serif">Address:</strong> {order.address}</p>
                          </div>

                          {/* Direct WhatsApp checkup action */}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleSendOrderToWhatsApp(order)}
                              className="bg-[#128c7e]/10 hover:bg-[#128c7e] text-[#0f6c61] hover:text-white px-3 py-1 rounded text-[10px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border-0"
                              title="Chat about this order"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Query Order via WhatsApp
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="bg-[#2c160c] hover:bg-[#3d1c10] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Close Archive
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- AI SOMMELIER SENSORY CARD DIALOGUE POPUP --- */}
      <SommelierModal 
        isOpen={sommelierModalOpen}
        onClose={() => setSommelierModalOpen(false)}
        isLoading={sommelierLoading}
        title={sommelierTitle}
        subtitle={sommelierSubtitle}
        response={sommelierResponse}
      />

      {/* --- EMAIL & PASSWORD AUTHENTICATION MODAL --- */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#fffdfb] text-[#2c160c] rounded-2xl shadow-2xl border border-[#f0ded2] overflow-hidden animate-fade-in relative max-h-[92vh] flex flex-col">
            
            {/* Header border */}
            <div className="h-1.5 w-full bg-[#2c160c]" />
            
            <button 
              onClick={() => {
                setAuthModalOpen(false);
                setAuthModalError(null);
              }}
              className="absolute top-4 right-4 text-[#8c4f2b] hover:text-[#2c160c] p-1.5 rounded-full hover:bg-amber-100/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="text-center space-y-1">
                <h3 className="font-serif text-2xl font-black text-primary tracking-tight">Artisan Cocoa Lounge</h3>
                <p className="text-xs text-on-surface-variant/80">Authorize orders, custom designs and secures your chocolate history.</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-outline-variant/30 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthModalError(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    authTab === "login" 
                      ? "border-[#2c160c] text-[#2c160c]" 
                      : "border-transparent text-on-surface-variant/60 hover:text-[#2c160c]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("register");
                    setAuthModalError(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    authTab === "register" 
                      ? "border-[#2c160c] text-[#2c160c]" 
                      : "border-transparent text-on-surface-variant/60 hover:text-[#2c160c]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form Content */}
              <form 
                onSubmit={authTab === "login" ? handleEmailSignIn : handleEmailRegister} 
                className="space-y-4 font-sans"
              >
                {authModalError && (
                  <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg text-xs leading-normal font-sans">
                    {authModalError}
                  </div>
                )}

                <div className="space-y-3">
                  {authTab === "register" && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#735c00]">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jean-Paul Chocolatier"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-white border border-outline-variant/40 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2c160c]"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#735c00]">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="gourmet@luxecocoa.com"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white border border-outline-variant/40 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2c160c]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#735c00]">Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-white border border-outline-variant/40 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2c160c]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authModalLoading}
                  className="w-full bg-[#2c160c] hover:bg-[#3d1c10] text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  {authModalLoading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{authTab === "login" ? "Sign In & Enter" : "Create Artisan Account"}</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2 font-sans">
                <div className="h-[1px] flex-1 bg-outline-variant/25" />
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">Or authenticate with</span>
                <div className="h-[1px] flex-1 bg-outline-variant/25" />
              </div>

              {/* Google OAuth fallback option */}
              <div className="space-y-2 font-sans">
                <button
                  type="button"
                  onClick={async () => {
                    setAuthModalOpen(false);
                    await handleGoogleSignIn();
                  }}
                  className="w-full bg-white hover:bg-amber-50/20 text-[#2c160c] border border-outline-variant/50 text-xs font-bold uppercase tracking-wider py-3 rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-[#735c00]" />
                  Google Sign-In (Requires Setup)
                </button>
                <p className="text-[9px] text-[#735c00]/85 italic text-center leading-normal">
                  *Tip: If Google auth fails, Email & Password works instantly with zero setup!
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- FIREBASE AUTHENTICATION DOMAIN ERROR GUIDANCE MODAL --- */}
      {authError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#fffdfb] text-[#2c160c] rounded-2xl shadow-2xl border border-red-200 overflow-hidden animate-fade-in relative max-h-[90vh] flex flex-col">
            
            {/* Header branding band - alarm colors */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-red-500 to-amber-800" />
            
            {/* Close Button */}
            <button 
              onClick={() => setAuthError(null)}
              className="absolute top-5 right-5 text-[#8c4f2b] hover:text-[#2c160c] p-1.5 rounded-full hover:bg-amber-100/30"
              title="Close Notification"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-5 flex-1 text-left">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center shrink-0">
                  <Sparkle className="w-5 h-5 animate-pulse text-amber-600" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-primary tracking-tight">Firebase Setup Required</h3>
                  <p className="text-[10px] text-red-600 font-mono">auth/unauthorized-domain</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-on-surface-variant leading-relaxed">
                <div className="bg-[#fff9f3] border-l-4 border-amber-600 p-3 rounded-r-lg space-y-1">
                  <p className="font-bold text-xs text-[#735c00]">⚠️ Action Required (कदम उठाएं):</p>
                  <p className="text-[11px] text-on-surface-variant">
                    Aapka Firebase login request block ho gaya hai kyunki yeh live preview domain aapke Firebase project (<code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">luxe-cocoa</code>) mein authorized nahi hai.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold font-serif text-[#2c160c]">How to authorize this domain (डोमेन अधिकृत कैसे करें):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                    <li>
                      Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-800 font-bold underline hover:text-amber-900">Firebase Console</a>.
                    </li>
                    <li>Select your project <strong>luxe-cocoa</strong>.</li>
                    <li>Go to <strong>Build</strong> &gt; <strong>Authentication</strong> from the left menu.</li>
                    <li>Click on the <strong>Settings</strong> tab at the top.</li>
                    <li>Click on <strong>Authorized Domains</strong> in the sub-menu.</li>
                    <li>Click <strong>Add domain</strong> and add these exact values:</li>
                  </ol>
                </div>

                <div className="bg-[#fffdfb] border border-[#ffe9e2] p-3 rounded-xl space-y-2.5 font-mono text-[10px] text-primary">
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                    <span className="select-all font-semibold">{window.location.hostname}</span>
                    <span className="text-[9px] text-[#735c00] font-sans uppercase font-bold">Current Domain</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                    <span className="select-all font-semibold">localhost</span>
                    <span className="text-[9px] text-[#735c00] font-sans uppercase font-bold">Local development</span>
                  </div>
                </div>

                <p className="text-[10px] text-[#735c00] italic">
                  *Note: Saving these domains in your Firebase authorized domains list resolves this issue instantly. Try logging in again once added!
                </p>

                {authError && !authError.includes("unauthorized-domain") && (
                  <div className="border border-red-100 bg-red-50/50 p-2.5 rounded text-[10.5px] text-red-800">
                    <strong>Error Log:</strong> {authError}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setAuthError(null)}
                className="bg-[#2c160c] hover:bg-[#3d1c10] text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Understood / Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- ADMIN PANEL MODAL --- */}
      {isAdminOpen && isUserAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[#fffdfb] text-[#2c160c] rounded-3xl shadow-2xl border border-[#ffe9e2] overflow-hidden animate-fade-in relative max-h-[92vh] flex flex-col">
            
            {/* Top gold bar */}
            <div className="h-2 w-full bg-[#2c160c]" />
            
            {/* Close button */}
            <button 
              onClick={() => {
                setIsAdminOpen(false);
                setAdminError(null);
              }}
              className="absolute top-5 right-5 text-[#8c4f2b] hover:text-[#2c160c] p-2 rounded-full hover:bg-amber-100/30 transition-colors z-10"
              title="Close Panel"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="p-6 md:p-8 border-b border-outline-variant/30 text-left bg-surface-container-low">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:8s]" />
                    Artisan Control Room
                  </div>
                  <h3 className="font-serif text-3xl font-black text-primary tracking-tight">Luxe Cocoa Head Office</h3>
                  <p className="text-xs text-on-surface-variant/80">Logged in as: <strong className="text-amber-800">{currentUser?.email}</strong></p>
                </div>
                
                {/* Refresh button */}
                <button
                  onClick={handleFetchAdminOrders}
                  disabled={adminLoading}
                  className="bg-[#2c160c] hover:bg-[#3d1c10] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm self-start md:self-center"
                >
                  {adminLoading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : "Sync Live Orders"}
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/70 border border-[#ffe9e2] p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">Total Revenue</span>
                  <p className="font-serif text-2xl font-black text-[#2c160c] mt-1">
                    ${adminOrders.reduce((sum, o) => sum + (o.total || 0), 0)}
                  </p>
                  <span className="text-[9px] text-on-surface-variant/60">From {adminOrders.length} bookings</span>
                </div>

                <div className="bg-white/70 border border-[#ffe9e2] p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">Active Pending</span>
                  <p className="font-serif text-2xl font-black text-amber-800 mt-1">
                    {adminOrders.filter(o => o.status === "Pending" || !o.status).length}
                  </p>
                  <span className="text-[9px] text-on-surface-variant/60">Awaiting kitchen prep</span>
                </div>

                <div className="bg-white/70 border border-[#ffe9e2] p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">Crafting Mode</span>
                  <p className="font-serif text-2xl font-black text-[#735c00] mt-1">
                    {adminOrders.filter(o => o.status === "Crafting").length}
                  </p>
                  <span className="text-[9px] text-on-surface-variant/60">In progress at station</span>
                </div>

                <div className="bg-white/70 border border-[#ffe9e2] p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00] font-sans block">Total Dispatch</span>
                  <p className="font-serif text-2xl font-black text-emerald-800 mt-1">
                    {adminOrders.filter(o => o.status === "Dispatched" || o.status === "Delivered").length}
                  </p>
                  <span className="text-[9px] text-on-surface-variant/60">Dispatched/Delivered</span>
                </div>
              </div>
            </div>

            {/* Error view */}
            {adminError && (
              <div className="bg-red-50 border-y border-red-100 text-red-800 px-6 py-3 text-xs flex justify-between items-center font-sans">
                <span><strong>Error:</strong> {adminError}</span>
                <button onClick={() => setAdminError(null)} className="text-red-950 font-bold hover:underline">Dismiss</button>
              </div>
            )}

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 bg-gradient-to-b from-[#fffcf9] to-[#fffaf6] text-left text-[#2c160c]">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                  <h4 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-700" />
                    Incoming Guest Bookings & Orders ({adminOrders.length})
                  </h4>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00]">Live Status Console</span>
                </div>

                {adminLoading && adminOrders.length === 0 ? (
                  <div className="text-center py-16 space-y-3 font-sans">
                    <span className="inline-block w-8 h-8 border-4 border-amber-900/10 border-t-amber-800 rounded-full animate-spin" />
                    <p className="text-xs text-on-surface-variant/70">Connecting to the Artisan Vault...</p>
                  </div>
                ) : adminOrders.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-[#ffe9e2] rounded-2xl space-y-2 bg-white/40">
                    <ShoppingBag className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
                    <p className="font-serif font-bold text-sm text-primary">No orders received on server yet</p>
                    <p className="text-[10px] text-on-surface-variant/70 max-w-xs mx-auto">
                      Any custom chocolate combinations or product logs will show up here the instant they click Checkout!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {adminOrders.map((order) => {
                      const orderDate = order.createdAt 
                        ? new Date(order.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "Prior Purchase";

                      return (
                        <div key={order.id} className="bg-white border border-[#ffe9e2] rounded-2xl p-5 hover:shadow-md transition-all duration-300 space-y-4 relative">
                          
                          {/* Order Header info */}
                          <div className="flex flex-wrap justify-between items-start gap-3 pb-3 border-b border-[#ffe9e2]/50">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-[#2c160c] bg-amber-500/10 border border-amber-700/20 px-2 py-0.5 rounded-lg">{order.id}</span>
                                <span className="text-[10px] text-on-surface-variant/70">{orderDate}</span>
                              </div>
                              <p className="text-xs font-sans mt-1">
                                <strong className="text-primary font-serif font-black">{order.name}</strong> 
                                <span className="text-on-surface-variant/75"> ({order.email})</span>
                              </p>
                              <p className="text-[11px] font-sans text-on-surface-variant/90 mt-0.5">
                                <strong>Delivery Address:</strong> {order.address}
                              </p>
                              {order.specialInstructions && (
                                <p className="text-[11px] font-sans text-amber-800 bg-amber-50/65 border border-amber-100/40 p-2 rounded-lg italic mt-1.5">
                                  <strong>Special request:</strong> "{order.specialInstructions}"
                                </p>
                              )}
                            </div>

                            {/* Status controls */}
                            <div className="space-y-2 text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00] font-sans">Status:</span>
                                {adminUpdatingOrderId === order.id ? (
                                  <span className="w-3 h-3 border-2 border-[#2c160c]/20 border-t-[#2c160c] rounded-full animate-spin inline-block" />
                                ) : (
                                  <select
                                    value={order.status || "Pending"}
                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                    className={`text-[10px] font-bold font-sans rounded-full px-2.5 py-1 outline-none border transition-all ${
                                      order.status === "Pending" ? "bg-amber-50 border-amber-500/40 text-amber-800" :
                                      order.status === "Crafting" ? "bg-blue-50 border-blue-500/40 text-blue-800" :
                                      order.status === "Dispatched" ? "bg-purple-50 border-purple-500/40 text-purple-800" :
                                      "bg-emerald-50 border-emerald-500/40 text-emerald-800"
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Crafting">Crafting</option>
                                    <option value="Dispatched">Dispatched</option>
                                    <option value="Delivered">Delivered</option>
                                  </select>
                                )}
                              </div>
                              <p className="font-mono text-sm font-black text-primary">${order.total}</p>
                            </div>
                          </div>

                          {/* Ordered items detail */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[#735c00]">Items Ordered:</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {order.items.map((it) => {
                                const isCustom = it.type === "custom";
                                const name = isCustom ? it.customBar!.customName : it.product!.name;
                                const spec = isCustom ? `${it.customBar!.base} custom bar` : it.product!.spec;
                                const price = isCustom ? it.customBar!.price : it.product!.price;

                                return (
                                  <div key={it.id} className="bg-surface-container-low/35 border border-[#ffe9e2]/30 p-2.5 rounded-xl text-xs flex justify-between items-start">
                                    <div>
                                      <span className="font-bold text-[#2c160c]">{it.quantity}x </span>
                                      <span className="font-serif font-bold text-primary">{name}</span>
                                      <span className="text-[9px] text-on-surface-variant/70 block mt-0.5">({spec})</span>
                                      {isCustom && it.customBar?.inclusions && (
                                        <div className="mt-1 space-y-0.5">
                                          <p className="text-[9px] text-[#735c00]">
                                            <strong>Toppings:</strong> {it.customBar.inclusions.join(", ")}
                                          </p>
                                          {it.customBar.wrapperMessage && (
                                            <p className="text-[9px] text-[#8c4f2b] font-mono italic">
                                              <strong>Message Engraving:</strong> "{it.customBar.wrapperMessage}"
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-mono text-[11px] text-[#2c160c]/80">${price * it.quantity}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Guestbook section inside Admin */}
              <div className="space-y-4 pt-6 border-t border-outline-variant/30">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-amber-700" />
                    Guestbook Review Moderation
                  </h4>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#735c00]">Afficionado Reviews</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-[#ffe9e2] rounded-xl p-4 flex justify-between items-start gap-4">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-xs text-primary">{rev.name}</span>
                          <span className="text-[9px] text-on-surface-variant/60">({rev.date})</span>
                        </div>
                        <p className="text-[10px] text-[#735c00] font-sans">★ {rev.rating}/5 rating</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">"{rev.comment}"</p>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="bg-red-50 hover:bg-red-500 hover:text-white text-red-700 p-2 rounded-xl transition-all border border-red-200/50 cursor-pointer self-start"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 bg-surface-container border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => {
                  setIsAdminOpen(false);
                  setAdminError(null);
                }}
                className="bg-[#2c160c] hover:bg-[#3d1c10] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Close Control Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
