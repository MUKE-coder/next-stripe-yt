import { CartItem } from "@/store/slices/cartSlice";
import { NextRequest, NextResponse } from "next/server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function getActiveStripeProducts() {
  const products = await stripe.products.list();
  const activeProducts = products.data.filter(
    (item: any) => item.active === true
  );

  return activeProducts;
}

export async function POST(request: NextRequest) {
  try {
    //Receive the Checkout products from the Client
    const { products } = await request.json();
    const checkoutProducts: CartItem[] = products;

    //Get a list of active Stripe Products
    let activeStripeProducts = await getActiveStripeProducts();
    console.log(activeStripeProducts);
    //Create the Item in the Stripe dashboard if it doesnt exist
    for (const product of checkoutProducts) {
      const stripeProduct = activeStripeProducts.find(
        (item: any) => item.name.toLowerCase() === product.name.toLowerCase()
      );
      if (!stripeProduct) {
        //Create the Stripe Product
        try {
          const newStripeProduct = await stripe.products.create({
            name: product.name,
            default_price_data: {
              unit_amount: Math.round(product.price * 100),
              currency: "usd",
            },
            images: [product.image],
          });
          // console.log(newStripeProduct);
        } catch (error) {
          console.log(error);
        }
      }
    }

    activeStripeProducts = await getActiveStripeProducts();
    let stripeCheckoutProducts: any = [];
    for (const product of checkoutProducts) {
      const existingStripeProduct = activeStripeProducts.find(
        (item: any) => item.name.toLowerCase() === product.name.toLowerCase()
      );

      if (existingStripeProduct) {
        //Add it the stripe Checkout products
        stripeCheckoutProducts.push({
          price: existingStripeProduct.default_price,
          quantity: product.qty,
        });
      }
    }
    //Create onOrder to the DB AND oRDER ID
    ///order-confirmation/6673959e27246a87e2793d3a

    //Create the Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const session = await stripe.checkout.sessions.create({
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      line_items: stripeCheckoutProducts,
      mode: "payment",
    });
    console.log(session);
    return NextResponse.json({ url: session?.url });
  } catch (error) {
    console.log(error);
  }
}
